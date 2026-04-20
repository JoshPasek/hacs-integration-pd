# Phase 3: Realtime push — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Source:** Synthesized from PROJECT.md + REQUIREMENTS.md + Phase 2 delivered state + backend WS contract extracted from `ava-organization/party-dispenser/party-dispenser-main:backend/app/ws/*`

<domain>
## Phase Boundary

Phase 3 adds WebSocket-driven realtime updates to the integration. When a user places an order from the dispenser frontend or any other client, HA entities must reflect the queue change sub-second via WebSocket broadcast, NOT wait up to 30s for the next poll tick. Connection lifecycle is observable as `binary_sensor.party_dispenser_connected` and resilient to drops via exponential backoff, with polling as a fallback.

**In scope:**
- `websocket.py` — new module with `PartyDispenserWebSocketClient` owning an aiohttp WS connection
- Wire the WS client into `__init__.py::async_setup_entry` so one WS task runs per config entry
- Event → coordinator adapter: on `queue_updated` (or any `*_updated`) signal, call `coordinator.async_request_refresh()` (HA's built-in debouncer coalesces rapid signals)
- `binary_sensor.py` — new platform — single `ConnectivityBinaryEntity` reflecting WS connection state, device_class = CONNECTIVITY
- Reconnect with exponential backoff: base 0.5s, factor 2, max 30s. Reset to base on successful reconnect.
- Polling stays at configured `scan_interval` regardless of WS state (simpler; polls serve as fallback safety net for missed signals during WS drops)
- `manifest.json`: flip `iot_class: local_polling → local_push`, bump `version: 0.3.0`
- Tests: `test_websocket.py` covering connection lifecycle (connect, receive event, refresh coord, disconnect, reconnect with backoff, cancel on unload) using `aioresponses` and/or custom WS mock
- Update `test_integration_manifest.py` override test (rename + assertions flip to `iot_class: local_push`, `version: 0.3.0`) in the same commit that flips the manifest

**Out of scope:**
- Custom Lovelace card (Phase 4)
- GitHub mirror CI (Phase 5)
- Real hassfest (Phase 5)
- WS auth (backend doesn't require or accept JWT on WS endpoint today — documented as known gap; follow-up in v2/phase-5 once backend adds WS auth)
- Multi-WS per dispenser / multi-dispenser (v2)
- Differential queue diffs (backend only sends `{"type": "X_updated"}` signals, no payloads — integration does a full REST refresh on signal)

</domain>

<decisions>
## Implementation Decisions

### Backend WebSocket contract (LOCKED — verified 2026-04-20 from backend source)

- **Endpoint:** `GET {scheme}://{host}:{port}/ws` — WebSocket upgrade. `scheme` is `ws` when `use_tls=false`, `wss` when `use_tls=true`.
- **Auth:** **NONE** currently. The backend's `@ws_router.websocket("/ws")` handler does not check a token. Our WS client connects without JWT. **Document as known gap** in the integration — Phase 5 or v2 should add WS auth once backend supports it.
- **Hello:** Server sends `{"type": "hello"}` immediately after accept. Integration uses this as "connection ready" signal.
- **Events (server → client):** Signal-only; NO payloads. Our handler switches on `type`:
  - `"queue_updated"` → call `coordinator.async_request_refresh()` (full refresh of recipes + queue)
  - `"controller_status_updated"` with `controller_uid: str` → log; no entity update needed in Phase 3 (controllers are v2 scope)
  - `"pump_status_updated"` with `controller_uid: str` → log; no entity update needed in Phase 3
  - `"hello"` → log at debug; no action
  - Any other type → log at debug; no action
- **Client → server:** Keep-alive only. Backend reads text messages and ignores them. Our client does NOT need to send; aiohttp's `autoping=True` handles WS PING/PONG frames automatically. Keep autoping default.
- **Disconnect:** On `WebSocketDisconnect` or any exception on `ws.receive()`, consider the connection dead and enter reconnect loop.

### WebSocket client API (LOCKED)

```python
class PartyDispenserWebSocketClient:
    def __init__(self, hass: HomeAssistant, base_url_ws: str, coordinator: PartyDispenserCoordinator) -> None: ...
    async def start(self) -> None:  # Spawns background task via hass.loop.create_task
    async def stop(self) -> None:   # Cancels task, closes session if owned
    @property
    def connected(self) -> bool: ...
    @property
    def connection_changed(self) -> Signal:  # HA Signal or an async listeners list
```

- Uses `aiohttp_client.async_get_clientsession(hass)` (HA-provided shared session)
- Background loop: `while not cancelled: try connect + receive forever; except drop → await asyncio.sleep(backoff); backoff *= 2`
- On each event, call `coordinator.async_request_refresh()` (non-blocking, coalesces)
- On connect state change, fire callbacks registered by the binary_sensor

### Connection state change signaling (LOCKED)

- Integration uses HA's `async_dispatcher_send` / `async_dispatcher_connect` with signal `f"{DOMAIN}_ws_connected_{entry_id}"`.
- `binary_sensor.party_dispenser_connected` subscribes via `async_dispatcher_connect` in `async_added_to_hass` and unsubscribes in `async_will_remove_from_hass`.
- Entity's `is_on` returns `self._connected` (updated in the dispatcher callback). Device class = `BinarySensorDeviceClass.CONNECTIVITY`.

### Reconnect / Backoff (LOCKED)

- Base delay: 0.5s. Factor: 2.0. Cap: 30s.
- Successful connection (received hello) resets backoff to base 0.5s.
- Jitter: add `random.uniform(0, 0.25 * current_delay)` to avoid thundering herd if multiple dispensers (future-proof for v2).
- On permanent-sounding errors (401, 403, 404, TLS handshake failure), log warning and increase cap to 60s for backoff. These shouldn't happen in Phase 3 (no auth + stable endpoint), but defensive.

### Polling interaction (LOCKED — simple path)

- Keep coordinator's `update_interval = scan_interval` constant — no dynamic speed-up/slow-down based on WS state.
- Rationale: simplicity + polls as safety net. Worst case: stale by `scan_interval` seconds during WS drops. With 30s default, acceptable for a dispenser context.
- Future (v2): could speed up polling to 10s during disconnects and relax to 60s during good connection. Phase 3 explicitly doesn't optimize this.

### Binary sensor (LOCKED)

```python
class PartyDispenserConnectedBinarySensor(PartyDispenserEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_has_entity_name = True
    _attr_translation_key = "connected"
    _attr_entity_category = EntityCategory.DIAGNOSTIC  # diagnostic UX — hidden from default dashboard
    _attr_unique_id = f"{entry.entry_id}_connected"
```

- `is_on` returns current connection state (bool)
- Subscribes to dispatcher signal to receive updates
- State starts False; transitions to True on first hello received, back to False on drop

### Wire-up in `__init__.py::async_setup_entry` (LOCKED)

After coordinator first-refresh:
1. Construct WS client with base URL from config entry + coordinator reference
2. Stash on `entry.runtime_data.ws_client`
3. Call `ws_client.start()` — starts background task
4. Add `async_on_unload(ws_client.stop)` so stop happens on config-entry unload

Extend `PartyDispenserData` dataclass to include `ws_client: PartyDispenserWebSocketClient`.

### Platforms list (LOCKED)

`PLATFORMS = (Platform.SENSOR, Platform.BINARY_SENSOR)` — bumped from Phase 2's `(Platform.SENSOR,)`.

### Version bump (LOCKED)

- `manifest.json`: `"version": "0.3.0"`, `"iot_class": "local_push"`
- `const.py`: `VERSION = "0.3.0"`
- `pyproject.toml`: `version = "0.3.0"`
- Tag `v0.3.0` at phase completion

### `test_integration_manifest.py` update (LOCKED)

Must update `test_manifest_phase2_overrides` (currently asserts `iot_class == "local_polling"` + `version == "0.2.0"`) in the SAME commit that flips manifest. Rename to `test_manifest_phase3_overrides`; assertions become `iot_class == "local_push"` and `version == "0.3.0"`. Otherwise CI fails mid-phase.

### Lessons from Phases 1 + 2 (LOCKED — apply to all plans)

- `ruff format .` + `ruff check .` before every commit
- Manifest + test_integration_manifest.py update in same atomic commit
- pytest-HA-custom: use `hass` fixture, `enable_custom_integrations`; mock the aiohttp WS via a custom async mock or `aioresponses` extension
- Coverage target: ≥ 80% on `websocket.py`
- Python 3.13 stays (Phase 2 bumped; no change needed)
- CI stays at 2 stages (lint + test); tests add `test_websocket.py`, `test_binary_sensor.py`

### Claude's Discretion
- Whether `websocket.py` exposes a `Signal` object or uses HA's dispatcher directly (prefer dispatcher — it's the HA idiom)
- Whether to cap jitter at 0.25×delay or use a different factor
- Whether to log `pump_status_updated` / `controller_status_updated` at debug vs info (debug — they're currently ignored)
- Exact error classification for backoff cap increase (just log and use same backoff if simpler; defensive 60s cap is nice-to-have)
- Whether to add a `LOGGER = logging.getLogger(__name__)` to the new modules or reuse from `const.py` (follow existing convention in the repo)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context (internal)
- `.planning/PROJECT.md` — Vision, core value
- `.planning/REQUIREMENTS.md` — Phase 3 covers RT-01, RT-02, RT-03, RT-04, QA-02
- `.planning/ROADMAP.md` — Phase 3 goal + 5 success criteria
- `.planning/phases/02-integration-core/02-04-SUMMARY.md` — Phase 2 close-out with deviations + CI `editable_mode=compat` note
- `custom_components/party_dispenser/__init__.py` — current Phase 2 `async_setup_entry` (you'll EXTEND it to also start WS client)
- `custom_components/party_dispenser/coordinator.py` — coordinator to trigger refresh from WS events
- `custom_components/party_dispenser/entity.py` — base class for binary_sensor to inherit
- `custom_components/party_dispenser/manifest.json` — current `iot_class: local_polling` / `version: 0.2.0` to be flipped
- `custom_components/party_dispenser/const.py` — add WS URL suffix, connectivity sensor key, dispatcher signal format
- `tests/test_integration_manifest.py` — Phase 2 override test to rename + flip assertions

### Backend WS contract (external, verified 2026-04-20)
- `ava-organization/party-dispenser/party-dispenser-main:backend/app/ws/router.py` — WS endpoint at `/ws`, no auth, sends `{"type": "hello"}` on connect
- `ava-organization/party-dispenser/party-dispenser-main:backend/app/ws/events.py` — broadcast shapes: `queue_updated`, `controller_status_updated`, `pump_status_updated` (signal-only, no payloads)
- `ava-organization/party-dispenser/party-dispenser-main:backend/app/ws/manager.py` — ConnectionManager (no-subscribe broadcast)

### HA reference docs (external)
- `aiohttp_client.async_get_clientsession` — https://developers.home-assistant.io/docs/api/native_app_integration/
- Dispatcher helper — https://developers.home-assistant.io/docs/core/async_dispatcher
- Background tasks in integrations — https://developers.home-assistant.io/docs/integration_async_api (tasks owned by entry; `async_on_unload` pattern)
- `BinarySensorDeviceClass.CONNECTIVITY` — https://www.home-assistant.io/integrations/binary_sensor/#device-class
- `EntityCategory.DIAGNOSTIC` — https://developers.home-assistant.io/docs/core/entity#generic-properties
- pytest-HA-custom WebSocket test patterns — see MatthewFlamm/pytest-homeassistant-custom-component tests for reference

### Phase 2 summaries (quick recap of pertinent Phase 2 artifacts)
- `.planning/phases/02-integration-core/02-02-SUMMARY.md` — api.py, coordinator.py, entity.py, __init__.py shape
- `.planning/phases/02-integration-core/02-04-SUMMARY.md` — services.py, test infrastructure, CI shape, `editable_mode=compat` documented

</canonical_refs>

<specifics>
## Specific Ideas

**Requirement mapping for Phase 3:**
- RT-01: WS subscribe on setup → `__init__.py::async_setup_entry` + `websocket.py::start()`
- RT-02: Queue events update HA entities within 1s → WS event handler calls `coordinator.async_request_refresh()`
- RT-03: `binary_sensor.party_dispenser_connected` → new `binary_sensor.py` platform
- RT-04: Reconnect/backoff + polling fallback → `websocket.py` background task
- QA-02: WS tests → `tests/test_websocket.py` (connection lifecycle, backoff timing, event handling)

**File layout:**
```
custom_components/party_dispenser/
├── __init__.py              (EXTEND: add WS client lifecycle)
├── manifest.json            (MODIFY: iot_class→local_push, version→0.3.0)
├── const.py                 (EXTEND: WS_PATH, SIGNAL_WS_CONNECTED fmt)
├── websocket.py             (NEW)
├── binary_sensor.py         (NEW)
└── translations/en.json     (EXTEND: add entity.binary_sensor.connected.name)

tests/
├── test_websocket.py        (NEW)
├── test_binary_sensor.py    (NEW)
└── test_integration_manifest.py (MODIFY: test_manifest_phase2_overrides → phase3)
```

**pyproject.toml version bump:** `version = "0.3.0"`

**CI impact:** Minimal. No new deps. Tests add ~0.5s. CI time stays ~2 min.

**Suggested plan shape (per ROADMAP — 2 plans):**
- **03-01:** websocket.py (client + event handler + reconnect/backoff) + binary_sensor.py + __init__.py wiring + const.py/manifest.json/translations.en.json/test_integration_manifest.py updates — the bulk of implementation + atomic manifest/test update
- **03-02:** tests/test_websocket.py + tests/test_binary_sensor.py + coverage verification + v0.3.0 tag

**Backoff jitter formula:**
```python
base = 0.5
max_backoff = 30.0
current = base
while not cancelled:
    try:
        await _run_once()  # connects, receives, raises on drop
        current = base      # reset on clean run
    except Exception:
        jittered = current + random.uniform(0, 0.25 * current)
        await asyncio.sleep(jittered)
        current = min(current * 2, max_backoff)
```

**Integration testing approach:**
- For WS: use a real local aiohttp server in a pytest fixture (start/stop in fixture scope) OR a hand-rolled async WS mock that matches aiohttp's WS interface. The real-server approach is more robust but slower (~200ms vs ~5ms per test).
- Recommendation: hand-rolled async mock; real server only for one "full lifecycle" smoke test.

**Known gap to document in README (Phase 6):** "WebSocket endpoint currently has no auth; the integration connects anonymously. Once the backend adds WS auth (v2 scope), the integration will pass the same JWT used for REST."

</specifics>

<deferred>
## Deferred Ideas

- WS auth (backend adds first) → v2 / post-Phase-5
- Custom Lovelace card → Phase 4
- GitHub mirror CI + real hassfest → Phase 5
- Differential queue diffs (backend sends payloads not signals) → backend-side v2 change
- Controller / pump status entities → v2 scope (MULTI-01 adjacent)
- Dynamic polling speed based on WS state → v2 optimization
- WS-level heartbeat/ping intervals beyond aiohttp defaults → nice-to-have
- Integration-quality-scale silver tier (needs translation completeness + reconfigure flow) → Phase 6

---

*Phase: 03-realtime-push*
*Context gathered: 2026-04-20*
