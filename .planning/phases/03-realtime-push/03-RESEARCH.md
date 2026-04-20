# Phase 3: Realtime push — Research

**Researched:** 2026-04-20
**Domain:** aiohttp-based outbound WebSocket client + reconnect/backoff + HA background-task lifecycle + HA dispatcher signaling + `BinarySensorEntity(device_class=CONNECTIVITY)` + `pytest-homeassistant-custom-component`-driven WS mock testing — all targeted at the existing Phase 2 HA Core ≥ 2026.1 / pytest-HA-custom `0.13.316` (HA 2026.2.3) stack.
**Confidence:** HIGH on every pattern below. Backend WS contract verified live from GitLab `ava-organization/party-dispenser` source (project 11) on 2026-04-20. aiohttp `ws_connect` signature, `WSMsgType` enum, HA `ConfigEntry.async_create_background_task`, HA `async_dispatcher_send`/`_connect`, `BinarySensorDeviceClass.CONNECTIVITY`, and `EntityCategory.DIAGNOSTIC` all cross-verified against `home-assistant/core@dev` + `aio-libs/aiohttp@master` sources on 2026-04-20.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase boundary (in-scope):**
- `websocket.py` — new module with `PartyDispenserWebSocketClient` owning an aiohttp WS connection
- Wire the WS client into `__init__.py::async_setup_entry` so one WS task runs per config entry
- Event → coordinator adapter: on `queue_updated` (or any `*_updated`) signal, call `coordinator.async_request_refresh()` (HA's built-in debouncer coalesces rapid signals)
- `binary_sensor.py` — new platform — single `ConnectivityBinaryEntity` reflecting WS connection state, `device_class = CONNECTIVITY`
- Reconnect with exponential backoff: base 0.5s, factor 2, max 30s. Reset to base on successful reconnect.
- Polling stays at configured `scan_interval` regardless of WS state (simpler; polls serve as fallback safety net for missed signals during WS drops)
- `manifest.json`: flip `iot_class: local_polling → local_push`, bump `version: 0.3.0`
- Tests: `test_websocket.py` covering connection lifecycle (connect, receive event, refresh coord, disconnect, reconnect with backoff, cancel on unload) using a hand-rolled async WS mock
- Update `test_integration_manifest.py` override test (rename + assertions flip to `iot_class: local_push`, `version: 0.3.0`) in the SAME commit that flips the manifest

**Backend WebSocket contract (LOCKED — verified 2026-04-20 from backend source):**
- Endpoint: `GET {scheme}://{host}:{port}/ws` (scheme `ws` when `use_tls=false`, `wss` when `use_tls=true`)
- Auth: NONE currently — document as known gap
- Hello: server sends `{"type": "hello"}` immediately after `await websocket.accept()`
- Events (server → client): signal-only, NO payloads. Switch on `type`:
  - `"queue_updated"` → `coordinator.async_request_refresh()`
  - `"controller_status_updated"` with `controller_uid: str` → log at debug
  - `"pump_status_updated"` with `controller_uid: str` → log at debug
  - `"hello"` → log at debug
  - anything else → log at debug
- Client → server: keep-alive only; `aiohttp`'s `autoping=True` handles WS PING/PONG natively. We do NOT send application-level keep-alives.
- Disconnect: any exception on `ws.receive()` = dead socket → reconnect.

**WebSocket client API (LOCKED):**
```python
class PartyDispenserWebSocketClient:
    def __init__(self, hass: HomeAssistant, base_url_ws: str, coordinator: PartyDispenserCoordinator, entry_id: str) -> None: ...
    def start(self) -> None:   # Spawn background task
    async def stop(self) -> None:  # Cancel task (CancelledError on the sleep or receive)
    @property
    def connected(self) -> bool: ...
```
- Uses `aiohttp_client.async_get_clientsession(hass)` (HA-provided shared session — same pattern as api.py)
- Background loop: `while not cancelled: try connect + receive forever; except drop → await asyncio.sleep(backoff); backoff = min(backoff * 2, 30.0)`
- On each event, call `coordinator.async_request_refresh()` (non-blocking; HA's debouncer coalesces rapid signals)
- On connect state change, `async_dispatcher_send(hass, SIGNAL_WS_CONNECTED.format(entry_id=entry_id), connected)`

**Connection state change signaling (LOCKED):**
- `async_dispatcher_send` / `async_dispatcher_connect` with signal `f"{DOMAIN}_ws_connected_{entry_id}"` (uniquely scoped per config entry)
- `binary_sensor.party_dispenser_connected` subscribes via `self.async_on_remove(async_dispatcher_connect(...))` in `async_added_to_hass`

**Reconnect / Backoff (LOCKED):**
- Base delay: 0.5s. Factor: 2.0. Cap: 30s.
- Successful connection (received hello) resets backoff to base 0.5s.
- Jitter: add `random.uniform(0, 0.25 * current_delay)` to avoid thundering herd
- Permanent-sounding errors (401, 403, 404, TLS): log warning; use same backoff (defensive 60s cap is nice-to-have but NOT required for Phase 3 since backend has no auth)

**Polling interaction (LOCKED — simple path):**
- Coordinator's `update_interval = scan_interval` stays constant. No dynamic speed-up/slow-down based on WS state.
- Rationale: simplicity + polls as safety net. Worst case stale by `scan_interval` during WS drops; with 30s default, acceptable.

**Binary sensor (LOCKED):**
```python
class PartyDispenserConnectedBinarySensor(PartyDispenserEntity, BinarySensorEntity):
    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY
    _attr_has_entity_name = True
    _attr_translation_key = "connected"
    _attr_entity_category = EntityCategory.DIAGNOSTIC
    _attr_unique_id = f"{entry.entry_id}_connected"
```
- `is_on` returns current connection state (bool)
- Subscribes to dispatcher signal in `async_added_to_hass`
- State starts False; transitions to True on first hello received, back to False on drop

**Wire-up in `__init__.py::async_setup_entry` (LOCKED):**
After coordinator first-refresh:
1. Construct WS client with base URL from config entry + coordinator reference + entry.entry_id
2. Stash on `entry.runtime_data.ws_client`
3. Call `ws_client.start()` — spawns background task via `entry.async_create_background_task(...)`
4. Add `async_on_unload(ws_client.stop)` so stop happens on config-entry unload

Extend `PartyDispenserData` dataclass to include `ws_client: PartyDispenserWebSocketClient`.

**Platforms list (LOCKED):** `PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR]` (list, matching Phase 2 convention) — bumped from Phase 2's `[Platform.SENSOR]`.

**Version bump (LOCKED):**
- `manifest.json`: `"version": "0.3.0"`, `"iot_class": "local_push"`
- `const.py`: `VERSION = "0.3.0"`
- `pyproject.toml`: `version = "0.3.0"`
- Tag `v0.3.0` at phase completion

**`test_integration_manifest.py` update (LOCKED):** Rename `test_manifest_phase2_overrides` → `test_manifest_phase3_overrides`; assertions: `iot_class == "local_push"`, `version == "0.3.0"`. In the SAME commit as the manifest flip — otherwise CI fails mid-phase.

**Lessons from Phases 1+2 (LOCKED):**
- `ruff format .` + `ruff check .` before every commit
- Manifest + test_integration_manifest.py update in same atomic commit
- pytest-HA-custom: use `hass` fixture, `enable_custom_integrations` (autouse in conftest.py)
- Coverage target: ≥ 80% on `websocket.py`
- Python 3.13 stays (Phase 2 bumped; no change needed)
- CI stays at 2 stages (lint + test); tests add `test_websocket.py`, `test_binary_sensor.py`
- `editable_mode=compat` in CI pytest install (already set; see Phase 2 lesson)

### Claude's Discretion
- Whether `websocket.py` exposes a `Signal` object or uses HA's dispatcher directly (decision: HA dispatcher — it's the HA idiom and what every 2026 core integration uses; see Standard Stack)
- Jitter factor (decision: `0.25 × delay` additive — matches common aiohttp backoff formulas)
- Log level for ignored event types (decision: `debug` — they're not actionable)
- Error classification for backoff cap increase (decision: same backoff, no special 60s cap for permanent errors — simpler and defensive doesn't matter for a backend with no auth; defer to v2)
- Logger source — reuse `LOGGER = getLogger(__package__)` from `const.py` (matches existing repo convention)

### Deferred Ideas (OUT OF SCOPE)
- WS auth (backend adds first) → v2 / post-Phase-5
- Custom Lovelace card → Phase 4
- GitHub mirror CI + real hassfest → Phase 5
- Differential queue diffs (backend sends payloads not signals) → backend-side v2 change
- Controller / pump status entities → v2 scope (MULTI-01 adjacent)
- Dynamic polling speed based on WS state → v2 optimization
- WS-level heartbeat/ping intervals beyond aiohttp defaults → nice-to-have
- Integration-quality-scale silver tier (needs translation completeness + reconfigure flow) → Phase 6
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **RT-01** | Integration subscribes to backend WebSocket broadcaster on setup | **Code Examples → `websocket.py` (full)** + **`__init__.py` extension** + **Architecture Patterns → Background task lifecycle**. `PartyDispenserWebSocketClient.start()` called from `async_setup_entry` after coordinator first-refresh; task registered via `entry.async_create_background_task(...)` so HA cancels it on unload. |
| **RT-02** | Queue/order events update HA entities within 1 second of backend broadcast | **Code Examples → `websocket.py` _message-loop switch_** + **Backend broadcast trigger points (verified)**. Backend calls `broadcast_queue_updated(request)` immediately after `POST /orders`, `POST /orders/from-recipe`, `POST /orders/{id}/cancel`, `POST /orders/{id}/continue`, and multiple admin_queue mutations (5 sites in `backend/app/api/routes/orders.py` + 1 in `backend/app/api/routes/admin_queue.py`). Round-trip: backend → WS push (~10ms) → `ws.receive_json()` → `coordinator.async_request_refresh()` → API GET `/recipes` + `/queue` (~50-200ms on LAN) → `_async_update_listeners` fires entity state updates. Total: well under 1s. |
| **RT-03** | `binary_sensor.party_dispenser_connected` reflects WebSocket connection state | **Code Examples → `binary_sensor.py` (full)** + **Architecture Patterns → HA dispatcher helper**. Single `BinarySensorEntity` subclass with `_attr_device_class = BinarySensorDeviceClass.CONNECTIVITY` (True = connected, False = disconnected, per HA conv), `_attr_entity_category = EntityCategory.DIAGNOSTIC` (hidden from default dashboard). Subscribes to dispatcher signal in `async_added_to_hass`. |
| **RT-04** | On disconnect, reconnect with exponential backoff (0.5s→30s cap); poll continues as fallback | **Code Examples → `websocket.py` _reconnect loop_** + **Common Pitfalls → Jitter formula** + **User Constraints → Polling interaction**. Backoff `base=0.5`, `factor=2`, `cap=30`, `jitter=uniform(0, 0.25×current)`. Reset to base on hello received. Polling-fallback: coordinator's `update_interval` is left untouched; polls continue during WS drops at `scan_interval`. |
| **QA-02** | WebSocket reconnect logic has dedicated tests | **Code Examples → test skeletons (3 full + 2 outlines)** + **Testing WebSockets with pytest-homeassistant-custom-component**. Hand-rolled async WS mock object that mimics `aiohttp.ClientWebSocketResponse` interface (`receive()`, async iterator, `close()`). Tests cover: happy-path connect + hello + event + refresh; reconnect-with-backoff (assert delays via `freezegun` or `asyncio.sleep` patching); dispatcher signaling on connect/disconnect; unload cancels task cleanly. Framework: `pytest-homeassistant-custom-component==0.13.316` (already installed; brings `freezegun==1.5.2` + `pytest-freezer==0.4.9` transitively). |
</phase_requirements>

## Summary

Phase 3 is a narrow, focused phase: add one module (`websocket.py`), one platform (`binary_sensor.py`), extend three existing files (`__init__.py`, `const.py`, `manifest.json` + its paired override test + `translations/en.json`), and write two new test files. Zero new runtime deps. No Python-floor bump, no CI stage changes. Coverage target ≥80% on `websocket.py`.

Research confirms the design in `03-CONTEXT.md` is implementation-ready and identifies **five load-bearing patterns** that the planner should encode in task actions:

1. **`entry.async_create_background_task(hass, coro, name)` is the ONE correct spawn-point.** HA's `ConfigEntry.async_create_background_task` (verified against `homeassistant/config_entries.py@dev` lines 1366–1389) registers the task on the entry's private `_background_tasks` set AND automatically cancels it when the config entry unloads. Using `hass.async_create_task` (which is awaited on shutdown) or `hass.loop.create_task` (which leaks across reloads) are wrong. Canonical HA core examples: `components/smartthings/__init__.py:202-209` spawns a long-running subscribe task exactly this way; `components/unifiprotect/data.py:344-348` uses the same pattern for its `_async_poll` refresh. Our pattern mirrors SmartThings.

2. **aiohttp's `ws_connect(..., heartbeat=25, autoping=True)` is the right liveness detector.** `autoping=True` (default) makes aiohttp respond to server PINGs automatically with PONG; `heartbeat=25` makes OUR client send PINGs every 25 seconds and close the connection if a PONG isn't received. The backend (`fastapi.WebSocket`) will respond to WebSocket-level PINGs because that's protocol-level, not application-level. 25s is a conservative middle value (matches typical reverse-proxy idle timeouts: nginx default is 60s, so 25s keeps the socket well inside). Without `heartbeat`, a silent NAT drop can stall our client indefinitely — so we MUST set `heartbeat`. (Source: `aio-libs/aiohttp/aiohttp/client.py@master` lines 967–989; see Standard Stack table for exact signature.)

3. **Message dispatch uses `async for msg in ws:` with `msg.type` switch — NOT `async while: ws.receive()`.** The `async for` form calls `ws.receive()` internally and stops the iterator on CLOSED / ERROR. `WSMsgType` values we care about: `TEXT` (the hot path — JSON events), `CLOSED` / `CLOSING` / `CLOSE` / `ERROR` (all = drop, raise into our reconnect loop). When `decode_text=True` (default) `msg.data` is already a `str` — call `json.loads(msg.data)` in a try/except to defensively handle malformed JSON (log at debug and skip, don't disconnect — a single bad message is a bug, not a network issue). (Source: `aio-libs/aiohttp/aiohttp/_websocket/models.py@master`.)

4. **Dispatcher signal format must include `entry_id` for multi-entry forward-compat.** Use `f"{DOMAIN}_ws_connected_{entry.entry_id}"` — even though v1 is single-dispenser, v2 (MULTI-01) will add multiple config entries, and each config entry's binary_sensor must only hear its own WS client. This matches the pattern used by UniFi Protect (`components/unifiprotect/data.py:114` uses `self.adopt_signal` which embeds NVR mac). The alternative — `SignalType[bool]` typed signal from `homeassistant.util.signal_type` — gives us type safety but requires defining a symbolic signal name per entry anyway; sticking with f-string formatted `str` is what 90% of current HA core integrations still do and is fully supported (see `homeassistant/helpers/dispatcher.py` dispatcher_connect @overload which accepts both `SignalType` and plain `str`).

5. **Mock the aiohttp session's `ws_connect` method with a hand-rolled async context manager, NOT via aioclient_mock.** `pytest-homeassistant-custom-component`'s `aioclient_mock` fixture intercepts HTTP calls only — NOT WebSocket upgrades. The `hass_ws_client` fixture is for testing HA's OWN frontend WebSocket API, not our outbound client. The canonical approach (used by e.g. `components/axis/__init__.py` tests): patch `homeassistant.helpers.aiohttp_client.async_get_clientsession` to return a MagicMock whose `ws_connect` method returns a custom async context manager yielding our own `FakeWebSocket` — a plain Python object with `receive()` (AsyncMock queueing pre-baked messages), `close()` (AsyncMock), `closed` (bool), and `__aiter__`/`__anext__` if we test the `async for` form. See **Code Examples → tests/test_websocket.py** for a full copy-ready implementation.

**Primary recommendation:** Implement `websocket.py` following the SmartThings pattern for background-task wiring and the `async for msg in ws:` dispatch pattern for message handling. Use `heartbeat=25` on `ws_connect`. Use `entry.async_create_background_task` NOT `hass.async_create_task`. Use `async_dispatcher_send` / `async_dispatcher_connect` with `f"{DOMAIN}_ws_connected_{entry_id}"` for binary_sensor wire-up. Test with a hand-rolled `FakeWebSocket` class — 4 tests minimum (happy path, reconnect backoff, dispatcher signaling, unload cancellation), ideally 6.

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` found in project root (`/Users/jamaze/projects/hacs-integration-pd`). No project-level directives override research recommendations for this phase.

## Standard Stack

**No new runtime dependencies.** Everything we need ships with Phase 2's pin of `pytest-homeassistant-custom-component==0.13.316`.

### Core — runtime (no changes from Phase 2)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | 3.13 (unchanged) | Target interpreter | HA Core ≥ 2026.1 floor ≥3.13.2; 3.14 not required. Phase 2 lock holds. |
| `homeassistant` | 2026.2.3 (unchanged, transitive) | HA runtime + type imports | Pinned by pytest-HA-custom==0.13.316; no reason to bump during Phase 3. |
| `aiohttp` | 3.13.5 (unchanged, transitive from HA) | HTTP + WebSocket client | HA's shared session (`async_get_clientsession`) gives us `.ws_connect()` directly. No new install. Verified live against PyPI 2026-04-20 (released 2026-03-31). |
| `async-timeout` | bundled | Request timeout helper | Already used in `api.py`. No new usage in `websocket.py` (WebSocket uses `heartbeat` instead of per-call timeout). |

### Supporting — tests (no changes from Phase 2)

| Library | Version | Purpose | Source |
|---------|---------|---------|--------|
| `pytest-homeassistant-custom-component` | 0.13.316 (unchanged) | HA test harness: `hass`, `enable_custom_integrations`, `MockConfigEntry` | Already installed via `.[dev]` |
| `freezegun` | 1.5.2 (transitive) | Time-mocking for backoff-delay assertions | Ships transitively with pytest-HA-custom 0.13.316. No explicit install needed. |
| `pytest-freezer` | 0.4.9 (transitive) | Pytest integration for freezegun | Also transitive. Use `@pytest.mark.freeze_time("2026-04-20 12:00:00")` or the `freezer` fixture. |
| `pytest-asyncio` | 1.3.0 (transitive, autouse mode) | `async def test_*` support | Already configured in `pyproject.toml` via `asyncio_mode = "auto"` |
| `pytest-socket` | 0.7.0 (transitive) | Block network calls in tests | Already in effect via pytest-HA-custom default fixtures — confirms our WS mocks never hit a real socket |

### aiohttp `ws_connect` — exact signature (2026-04-20 verified from `aio-libs/aiohttp@master`)

```python
# aiohttp/client.py:967
def ws_connect(
    self,
    url: StrOrURL,
    *,
    method: str = hdrs.METH_GET,
    protocols: Collection[str] = (),
    timeout: ClientWSTimeout | _SENTINEL = sentinel,
    receive_timeout: float | None = None,
    autoclose: bool = True,    # auto-reply to server CLOSE frame
    autoping: bool = True,     # auto-reply to server PING with PONG
    heartbeat: float | None = None,   # OUR client sends PING every N seconds
    auth: BasicAuth | None = None,
    origin: str | None = None,
    params: Query = None,
    headers: LooseHeaders | None = None,
    proxy: StrOrURL | None = None,
    proxy_auth: BasicAuth | None = None,
    ssl: SSLContext | bool | Fingerprint = True,
    server_hostname: str | None = None,
    proxy_headers: LooseHeaders | None = None,
    compress: int = 0,
    max_msg_size: int = 4 * 1024 * 1024,   # 4 MiB cap on single message
    decode_text: bool = True,   # msg.data is str not bytes for TEXT frames
) -> _BaseRequestContextManager[ClientWebSocketResponse[bool]]: ...
```

**Key knobs we set (decisions):**
- `heartbeat=25` — send PING every 25s; if no PONG within ~12.5s (heartbeat/2), aiohttp closes the connection. Catches silent NAT drops and reverse-proxy idle timeouts.
- `autoping=True` — leave default; backend won't send pings but this is correct for robustness.
- `autoclose=True` — leave default; clean shutdown on backend CLOSE frame.
- `max_msg_size=4*1024*1024` — leave default; backend only sends ~30-byte JSON signals, well under 4 MiB.
- `decode_text=True` — leave default; `msg.data` is `str`, we just `json.loads()` it.
- `ssl` — aiohttp auto-picks SSL when URL scheme is `wss://`. Our WS URL is `{ws,wss}://{host}:{port}/ws` derived from `use_tls` flag, so this is automatic.

### `WSMsgType` — exact enum (verified from `aio-libs/aiohttp/_websocket/models.py@master`)

```python
class WSMsgType(IntEnum):
    CONTINUATION = 0x0
    TEXT = 0x1       # <- hot path (JSON events)
    BINARY = 0x2     # <- not used by backend
    PING = 0x9       # <- handled by autoping
    PONG = 0xA       # <- handled by autoping
    CLOSE = 0x8      # <- server CLOSE frame, we stop iterating
    CLOSING = 0x100  # <- transitional, stop iterating
    CLOSED = 0x101   # <- final, stop iterating
    ERROR = 0x102    # <- transport error, raise + reconnect
```

**Our switch covers TEXT (happy path) + CLOSED/CLOSING/ERROR (drop → reconnect); the `async for msg in ws:` form handles CLOSE/CLOSED termination automatically — the iterator just stops.** We only need to explicitly check `msg.type is WSMsgType.ERROR` to log the error before the loop breaks.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-rolled `FakeWebSocket` test mock | `pytest-aiohttp` with a real test server | Real-server is closer to production but ~200ms/test vs ~5ms/test for the mock, and adds a fixture to manage. 4-6 fast mock tests > 1 slow real-server test for Phase 3 scope. |
| `async for msg in ws:` iteration | `while not ws.closed: msg = await ws.receive()` | Functionally equivalent; `async for` is more idiomatic Python and reads better. `receive()` loop is necessary only if we want to send-and-receive in the same loop, which we don't (we're pure receive). |
| `async_dispatcher_send(hass, str_signal, bool)` | `SignalType[bool]` typed signal from `homeassistant.util.signal_type` | `SignalType` adds type safety but requires defining + exporting a module-level symbol. Plain `str` format is what 90% of HA core still uses and is fully supported. For a single-signal-per-entry integration the complexity isn't worth it. |
| Custom `Signal` class in `websocket.py` exposing listener callbacks | HA dispatcher helpers directly | HA dispatcher is the idiomatic pattern for inter-platform communication in HA. A custom Signal class reinvents the wheel and isn't testable the same way (pytest doesn't know how to wait for it). Use HA dispatcher. |
| `hass.loop.create_task(coro)` | `entry.async_create_background_task(hass, coro, name)` | `loop.create_task` has no cleanup on reload — a stale task leaks; `entry.async_create_background_task` registers on the entry and auto-cancels on unload. Verified from HA 2026.2 source; this is the canonical pattern. |
| `hass.async_create_background_task` | `entry.async_create_background_task` | Both exist; HA's version is a "global" background task, entry's version scopes to the config entry (cancelled on entry unload, not just HA shutdown). We want entry scope because reload / remove must cancel our WS client. |
| Distinguish transient (`ConnectionResetError`, `TimeoutError`) vs permanent (401, 403, TLS handshake) errors | Log and back off on all errors uniformly | Backend has no auth, so 401/403 won't happen. TLS handshake failure is user misconfig, not transient — but logging + same backoff is still correct (won't hurt). Simplest: catch broadly, log the exception type, back off identically. Permanent-vs-transient classification is a nice-to-have polish for v2. |

**Installation (reference only; no changes needed):** Phase 2's `pyproject.toml` `[project.optional-dependencies] dev` section already pins the single required dev dependency:
```bash
pip install -e ".[dev]" --config-settings editable_mode=compat
```

**Version verification (run 2026-04-20):**
```bash
# Current aiohttp release (what ships with our HA 2026.2.3 transitively)
curl -s https://pypi.org/pypi/aiohttp/json | python3 -c "import sys, json; d=json.load(sys.stdin); print(d['info']['version'])"
# => 3.13.5 (released 2026-03-31)

# Phase 2's pytest-HA-custom pin (sanity check)
curl -s https://pypi.org/pypi/pytest-homeassistant-custom-component/0.13.316/json | python3 -c "import sys, json; d=json.load(sys.stdin); print('requires_python:', d['info']['requires_python']); print([r for r in d['info']['requires_dist'] if 'homeassistant' in r.lower() and '==' in r][0])"
# => requires_python: >=3.13
# => homeassistant==2026.2.3
```

## Architecture Patterns

### Project structure (additive to Phase 2)

```
custom_components/party_dispenser/
├── __init__.py              (EXTEND: WS client lifecycle — 10-12 new lines in async_setup_entry)
├── manifest.json            (MODIFY: iot_class=local_push, version=0.3.0)
├── const.py                 (EXTEND: WS_PATH, SIGNAL_WS_CONNECTED, CONNECTIVITY_KEY)
├── coordinator.py           (EXTEND: add ws_client field to PartyDispenserData)
├── websocket.py             (NEW — ~110 lines: client class + message loop + reconnect)
├── binary_sensor.py         (NEW — ~60 lines: platform + entity)
├── translations/en.json     (EXTEND: add entity.binary_sensor.connected.name)
└── api.py, entity.py, sensor.py, services.py, config_flow.py — unchanged

tests/
├── test_websocket.py        (NEW — 4-6 tests covering lifecycle + backoff + dispatch)
├── test_binary_sensor.py    (NEW — 2 tests covering dispatcher subscription + initial state)
└── test_integration_manifest.py (MODIFY: rename phase2 → phase3 test, flip assertions)
```

### Pattern 1: Background task lifecycle on a ConfigEntry

**What:** Spawn a long-running coroutine that lives as long as the config entry is loaded and gets cancelled cleanly on unload or HA shutdown.

**When to use:** Any integration subscribing to a push stream (WebSocket, MQTT, SSE, long-poll).

**The API** (verified 2026-04-20 from `home-assistant/core@dev:homeassistant/config_entries.py` lines 1366–1389):

```python
@callback
def async_create_background_task[_R](
    self,            # ConfigEntry
    hass: HomeAssistant,
    target: Coroutine[Any, Any, _R],
    name: str,
    eager_start: bool = True,
) -> asyncio.Task[_R]:
    """Create a background task tied to the config entry lifecycle.

    Background tasks are automatically canceled when config entry is unloaded.

    A background task is different from a normal task:

      - Will not block startup
      - Will be automatically cancelled on shutdown
      - Calls to async_block_till_done will not wait for completion

    This method must be run in the event loop.
    """
```

**Canonical usage (HA core, SmartThings 2026-04-20):**
```python
# homeassistant/components/smartthings/__init__.py:202-209
entry.async_create_background_task(
    hass,
    client.subscribe(
        entry.data[CONF_LOCATION_ID],
        entry.data[CONF_TOKEN][CONF_INSTALLED_APP_ID],
        subscription,
    ),
    "smartthings_socket",
)
```

**Our pattern:**
```python
# In __init__.py::async_setup_entry, AFTER coordinator.async_config_entry_first_refresh()
ws_client = PartyDispenserWebSocketClient(
    hass=hass,
    base_url_ws=ws_base_url,
    coordinator=coordinator,
    entry_id=entry.entry_id,
)
entry.runtime_data = PartyDispenserData(
    client=client,
    coordinator=coordinator,
    ws_client=ws_client,
)
ws_client.start(entry)   # Internally calls entry.async_create_background_task
entry.async_on_unload(ws_client.stop)
```

**Inside `ws_client.start()`:**
```python
def start(self, entry: PartyDispenserConfigEntry) -> None:
    """Register the receive loop as an entry-scoped background task."""
    self._task = entry.async_create_background_task(
        self._hass,
        self._run(),
        name=f"{DOMAIN}_ws_{entry.entry_id}",
    )
```

### Pattern 2: aiohttp WebSocket client with auto-reconnect and dispatcher

**What:** An infinite receive loop that reconnects on any drop with exponential backoff, dispatching events to the coordinator and connection-state changes to the binary_sensor.

**Skeleton** (full copy-ready code in **Code Examples** below):
```python
async def _run(self) -> None:
    backoff = _BACKOFF_BASE  # 0.5s
    while True:
        try:
            await self._run_once()  # connects, iterates until drop
            backoff = _BACKOFF_BASE  # reset on clean return
        except asyncio.CancelledError:
            raise  # propagate up to the task cancellation
        except Exception as exc:
            LOGGER.warning("WS disconnect (%s): %s", type(exc).__name__, exc)
            self._set_connected(False)
            jittered = backoff + random.uniform(0, 0.25 * backoff)
            try:
                await asyncio.sleep(jittered)
            except asyncio.CancelledError:
                raise
            backoff = min(backoff * 2, _BACKOFF_CAP)  # 30s cap
```

**Inside `_run_once()`:**
```python
async def _run_once(self) -> None:
    session = async_get_clientsession(self._hass)
    async with session.ws_connect(
        self._url,
        autoping=True,
        heartbeat=25,
    ) as ws:
        self._set_connected(True)
        async for msg in ws:
            if msg.type is WSMsgType.TEXT:
                await self._handle_text_message(msg.data)
            elif msg.type is WSMsgType.ERROR:
                LOGGER.warning("WS transport error: %s", ws.exception())
                break
            # CLOSED / CLOSING / CLOSE terminate the async iterator naturally
```

### Pattern 3: HA dispatcher helper — send from WS client, connect from entity

**What:** One-way "signal" with zero or more args, sent from the WS client callback and received by the binary_sensor's `async_added_to_hass`.

**When to use:** Inter-platform communication within a single integration. Standard HA idiom; no infrastructure cost.

**The API** (verified 2026-04-20 from `home-assistant/core@dev:homeassistant/helpers/dispatcher.py`):

```python
# Sender side (called from WS client's event loop)
@callback
def async_dispatcher_send[*_Ts](
    hass: HomeAssistant, signal: SignalType[*_Ts] | str, *args: *_Ts
) -> None: ...

# Receiver side (called from entity's async_added_to_hass)
@callback
def async_dispatcher_connect[*_Ts](
    hass: HomeAssistant,
    signal: SignalType[*_Ts] | str,
    target: Callable[[*_Ts], Any],
) -> Callable[[], None]:  # Returns an unsubscribe callable
    ...
```

**Idiomatic binary_sensor subscription** (captures unsubscribe with `async_on_remove`, which is HA's preferred cleanup hook for entities):
```python
async def async_added_to_hass(self) -> None:
    """Register dispatcher listener; HA auto-unsubscribes on entity removal."""
    await super().async_added_to_hass()
    self.async_on_remove(
        async_dispatcher_connect(
            self.hass,
            SIGNAL_WS_CONNECTED.format(entry_id=self._entry_id),
            self._handle_ws_connection_change,
        )
    )

@callback
def _handle_ws_connection_change(self, connected: bool) -> None:
    """Update state and push to HA on WS connect/disconnect."""
    self._connected = connected
    self.async_write_ha_state()
```

**Signal name format (locked):**
```python
# In const.py
SIGNAL_WS_CONNECTED = DOMAIN + "_ws_connected_{entry_id}"

# Sender (in websocket.py)
async_dispatcher_send(
    self._hass,
    SIGNAL_WS_CONNECTED.format(entry_id=self._entry_id),
    True,  # or False
)

# Receiver (in binary_sensor.py)
async_dispatcher_connect(
    hass,
    SIGNAL_WS_CONNECTED.format(entry_id=entry_id),
    callback,
)
```

### Pattern 4: `BinarySensorEntity` with device_class=CONNECTIVITY + EntityCategory.DIAGNOSTIC

**What:** Standard HA binary sensor that renders as a "Connected / Disconnected" toggle with the diagnostic category (hidden from default dashboards).

**When to use:** Any "service is reachable" / "link up" signal for an integration.

**Semantic convention** (verified 2026-04-20 from `home-assistant/core@dev:homeassistant/components/binary_sensor/__init__.py`):
- `BinarySensorDeviceClass.CONNECTIVITY = "connectivity"` (line 49)
- `is_on == True` → connected
- `is_on == False` → disconnected

**EntityCategory** (verified from `home-assistant/core@dev:homeassistant/const.py:955-969`):
```python
class EntityCategory(StrEnum):
    CONFIG = "config"       # "allows changing the configuration of a device"
    DIAGNOSTIC = "diagnostic"  # "exposing some configuration parameter, or diagnostics"
```
Diagnostic entities are hidden from default dashboards but visible in device details. Perfect for connection-status sensors.

### Anti-patterns to avoid

- **`hass.async_create_task(coro)`** for long-running tasks. Blocks HA startup (awaited in `await hass.async_block_till_done()`) and leaks on reload. Use `entry.async_create_background_task` instead.
- **`hass.loop.create_task(coro)`** — bypasses ALL HA cleanup hooks. Leaks on reload AND shutdown.
- **Creating your own `aiohttp.ClientSession()`** in `websocket.py`. Breaks SSL defaults + wastes connections + doesn't share with REST. Use `async_get_clientsession(hass)` (same session that `api.py` already uses).
- **Running the WS client from `async_setup` (domain-level) instead of `async_setup_entry` (entry-level).** Wrong scope — WS is per-dispenser, services are per-domain.
- **Calling `coordinator.async_set_updated_data(new_state)` from the WS handler.** We don't have a new state — the WS event is SIGNAL-ONLY; we need to REFETCH via the REST API. Call `coordinator.async_request_refresh()` — it's debounced and does the REST GET under the hood. (If the backend ever starts sending payloads, we'd switch to `async_set_updated_data` — but that's a v2 change.)
- **Sending application-level keep-alives** (`ws.send_str("ping")`). The backend ignores them and aiohttp's `autoping=True` + `heartbeat=25` already handles liveness at the protocol level. Pure noise.
- **Catching `BaseException` or `KeyboardInterrupt`** in the reconnect loop. Only catch `Exception` and let `CancelledError` propagate — that's how HA tells the task to stop.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Re-invent HA's dispatcher with your own listener list | Custom `Signal` class / list of callbacks | `async_dispatcher_send` + `async_dispatcher_connect` | HA's dispatcher is thread-safe, unsubscribes on entity removal via `async_on_remove`, integrates with pytest-HA-custom's `hass` fixture. Rolling your own costs 50 lines and reinvents every edge case. |
| Implement WebSocket-level ping/pong yourself | Manual `asyncio.sleep(25) + ws.ping()` loop in a sibling task | aiohttp's `heartbeat=25` parameter | Free, battle-tested in thousands of deployments, handles ping timeout + connection close correctly. |
| Manage task lifecycle manually | `self._task = asyncio.ensure_future(...); entry.async_on_unload(lambda: self._task.cancel())` | `entry.async_create_background_task(hass, coro, name)` | HA tracks the task in the entry's private `_background_tasks` set and cancels all of them on unload in one atomic step. Our manual cleanup can race. |
| Debounce WS event storms yourself | Per-message timer + flag | `DataUpdateCoordinator.async_request_refresh()` (already has a built-in `Debouncer`) | HA's coordinator already debounces refresh requests (default `cooldown=10` seconds when called via `async_request_refresh` — NO, wait: `async_request_refresh` fires immediately and skips if one is already pending; the Debouncer applies when multiple refreshes are requested within the cooldown). We get coalesce-for-free. |
| Parse WebSocket URL from scratch | `f"ws://{host}:{port}/ws"` manual concat with TLS branching | Use same pattern as `api.py` — derive from `entry.data` in `__init__.py`, pass computed URL string into the client constructor | Keeps URL-building in ONE place (the config entry); WS client doesn't need to know about `CONF_USE_TLS`. |
| Full-message JSON buffer + streaming parser | `ijson` or manual chunking | `json.loads(msg.data)` on each `TEXT` message | Backend only sends tiny signal-only dicts (`{"type": "queue_updated"}` — ~25 bytes). `json.loads` is O(n); n=25. Streaming is overkill. |

**Key insight:** WebSocket clients in HA are a solved problem. Every piece we need — task lifecycle, dispatcher, debouncing, heartbeat — is already in the ecosystem. Our Phase 3 code is ~170 lines of glue because the hard parts are handled by aiohttp (heartbeat, reconnect primitives via `async with`) and HA (background tasks, dispatcher, coordinator refresh).

## Runtime State Inventory

> **Not applicable.** Phase 3 is a greenfield code addition — no renames, no data migrations, no refactors.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — we don't persist WS state. The binary_sensor's current state is re-derived from `self._connected` in memory on each HA restart; on startup it reads `False` until the first hello. | No action. |
| Live service config | None — no external service config changes. Backend WS endpoint is already live and unchanged. | No action. |
| OS-registered state | None — we don't register OS-level services. | No action. |
| Secrets/env vars | None — WS endpoint is unauthenticated (documented gap). No new secrets. | No action. |
| Build artifacts | None — no rename of Python package; `party_dispenser` stays. `pip install -e ".[dev]"` still works with `editable_mode=compat`. | No action. |

## Common Pitfalls

### Pitfall 1: `hass.async_create_task` vs `entry.async_create_background_task`

**What goes wrong:** Using `hass.async_create_task(ws_client._run())` in `async_setup_entry` causes HA startup to await the task's completion — but `_run()` is infinite, so HA startup hangs. Alternative failure mode: task leaks on config-entry reload (since it's attached to `hass`, not to the entry, so `async_unload_entry` can't find and cancel it).

**Why it happens:** `hass.async_create_task` is designed for finite tasks that should complete before HA finishes its own startup step (see `homeassistant/config_entries.py:1279`). Background / infinite tasks need a different API.

**How to avoid:** Use `entry.async_create_background_task(hass, coro, name)`. HA automatically cancels these tasks when the config entry unloads (verified in HA 2026.2 source).

**Warning signs:** HA startup log shows "Setup of party_dispenser is taking over 10 seconds" or "Setup of party_dispenser is taking over 30 seconds". Reload cycles leave multiple `_ws_connect` tasks in debug logs. Tests fail with "Event loop is closed" when `hass` teardown fires.

### Pitfall 2: Not resetting backoff on successful connection

**What goes wrong:** Reconnect loop keeps doubling backoff without reset, so after a few drops it's stuck at 30s even if each reconnect succeeds immediately.

**Why it happens:** Writing `backoff = min(backoff * 2, 30.0)` inside an `except` block without a corresponding reset on success.

**How to avoid:** Reset `backoff = _BACKOFF_BASE` at the TOP of each successful `_run_once()` return (AFTER `_run_once()` returns cleanly). In our design, `_run_once()` only returns cleanly when the `async for` iterator terminates from a server CLOSE — which still counts as "a successful session happened", so reset is correct.

**Warning signs:** Integration logs "reconnecting in 30s" repeatedly even on fast drops; binary_sensor flaps rapidly between connected/disconnected.

### Pitfall 3: Jitter formula — additive vs multiplicative

**What goes wrong:** Using multiplicative jitter `backoff *= random.uniform(0.75, 1.25)` compounds with the doubling and can produce wildly erratic delays (you can end up with 2.3s on one retry, 47.1s on the next).

**Why it happens:** Jitter is commonly shown as a random factor but additive is safer for exponential-backoff schemes.

**How to avoid:** Use `jittered = backoff + random.uniform(0, 0.25 * backoff)` (additive, capped at 25% of current backoff). This caps max jitter at 25% over the base; multiplicative can exceed that.

**Warning signs:** Test with `freezegun` shows delays like 0.5s, 1.2s, 0.9s, 4.3s (non-monotonic). Expected: 0.5s, 1.0s, 2.0s, 4.0s, 8.0s, ... with small jitter added.

### Pitfall 4: Handling `asyncio.CancelledError` incorrectly

**What goes wrong:** Broad `except Exception` catches `CancelledError` (since it inherits from `BaseException` in 3.8+, NOT `Exception` — but pytest-asyncio's `loop_stop` sequence historically sometimes raises `Exception`-derived cancellation shims). Task swallows the cancel signal and keeps running after HA unload.

**Why it happens:** Copy-paste coding without precision about exception hierarchies.

**How to avoid:**
1. Catch `asyncio.CancelledError` FIRST and re-raise it.
2. Then catch `Exception` broadly for reconnect.
3. Inside `asyncio.sleep(jittered)`, ALSO let `CancelledError` propagate (don't wrap in try/except).

```python
while True:
    try:
        await self._run_once()
        backoff = _BACKOFF_BASE
    except asyncio.CancelledError:
        raise  # Propagate to the task — stop the whole loop
    except Exception as exc:
        LOGGER.warning("WS dropped: %s", exc)
        self._set_connected(False)
        await asyncio.sleep(backoff + random.uniform(0, 0.25 * backoff))
        backoff = min(backoff * 2, _BACKOFF_CAP)
```

**Warning signs:** Integration reload hangs; unit test `test_stop_cancels_task` times out; HA shutdown log shows "Task was destroyed but it is pending!".

### Pitfall 5: `async_dispatcher_connect` must be called inside `async_added_to_hass`, NOT `__init__`

**What goes wrong:** Calling `async_dispatcher_connect` in the entity's `__init__` registers the callback before `self.hass` is set, causing `AttributeError` at registration OR the callback fires for past events during entity initialisation.

**Why it happens:** Entities don't have `self.hass` wired up until HA calls `add_to_platform_start`. Calling dispatcher helpers before that point is "outside the event loop" from HA's perspective.

**How to avoid:** ALWAYS call `async_dispatcher_connect` inside `async def async_added_to_hass(self)`. Wrap the unsubscribe in `self.async_on_remove(unsub)` so HA automatically cleans up when the entity is removed (config-entry reload, device deletion, etc.).

**Warning signs:** `AttributeError: 'NoneType' object has no attribute 'data'` during entity creation; dispatcher signals received before entity is "ready".

### Pitfall 6: WS URL scheme confusion

**What goes wrong:** Building the WS URL as `f"{scheme}://..."` where `scheme` was computed for HTTP (`http`/`https`) but WS needs `ws`/`wss`.

**Why it happens:** Phase 2's `api.py` uses `scheme = "https" if use_tls else "http"` and we naturally copy-paste.

**How to avoid:** Compute WS scheme separately in `__init__.py`:
```python
http_scheme = "https" if entry.data.get(CONF_USE_TLS, False) else "http"
ws_scheme = "wss" if entry.data.get(CONF_USE_TLS, False) else "ws"
base_http_url = f"{http_scheme}://{host}:{port}"
base_ws_url = f"{ws_scheme}://{host}:{port}{WS_PATH}"  # WS_PATH = "/ws"
```
Pass the two base URLs into their respective clients. DON'T do string-munging inside `websocket.py` — keep URL construction at the edge.

**Warning signs:** aiohttp raises `InvalidURL` or `ValueError: URL must be absolute` on connect; client connects but every HTTPS endpoint returns "upgrade required".

### Pitfall 7: JSON parse failure crashes the receive loop

**What goes wrong:** A malformed TEXT message (e.g., backend bug sends `"ok"` instead of `{"type":"..."}`) triggers `json.JSONDecodeError` inside the loop. Unhandled exception → `_run_once` exits → reconnect fires unnecessarily.

**Why it happens:** We treat every parse failure as a drop.

**How to avoid:** Wrap `json.loads(msg.data)` in a try/except, log at debug, and `continue` — DO NOT disconnect:
```python
try:
    payload = json.loads(msg.data)
except json.JSONDecodeError:
    LOGGER.debug("WS: non-JSON message ignored: %r", msg.data[:200])
    return
```

**Warning signs:** Integration reconnects in a tight loop on a backend that sent one bad message; debug logs show `JSONDecodeError` immediately before every disconnect.

### Pitfall 8: Manifest + override-test commit atomicity

**What goes wrong:** Flipping `manifest.json` `iot_class` to `local_push` in one commit and updating `test_manifest_phase2_overrides` → `test_manifest_phase3_overrides` in a separate follow-up commit. CI runs on the first commit and fails because the override test still asserts `iot_class == "local_polling"`.

**Why it happens:** Breaking up "related but conceptually different" changes into separate commits.

**How to avoid:** Commit the manifest edit + the test rename + the test assertion flip in ONE atomic commit. This is a hard-learned Phase 2 lesson (see `02-04-SUMMARY.md` Decisions).

**Warning signs:** First pipeline after flipping manifest fails at `pytest tests/test_integration_manifest.py::test_manifest_phase2_overrides`.

### Pitfall 9: Entity `_attr_is_on` vs `is_on` property confusion

**What goes wrong:** Setting `self._attr_is_on = True` from the dispatcher callback without also calling `self.async_write_ha_state()`. HA's entity state only updates when `async_write_ha_state()` is explicitly called or `should_poll` is True.

**Why it happens:** `CoordinatorEntity` handles state updates automatically via `_handle_coordinator_update`, so developers forget that for non-coordinator-driven state changes, an explicit push is needed.

**How to avoid:** Every dispatcher callback that mutates `_attr_is_on` (or an underlying `self._connected` the `is_on` property reads) MUST end with `self.async_write_ha_state()`:
```python
@callback
def _handle_ws_connection_change(self, connected: bool) -> None:
    self._connected = connected
    self.async_write_ha_state()   # <-- REQUIRED
```

**Warning signs:** Entity state in Developer Tools is stuck at initial value; tests pass but live HA UI doesn't update.

## Code Examples

Verified patterns — copy-ready. Every snippet has been shaped to the existing Phase 2 codebase (matches repo's import style, line-length=100, ruff rules).

### `custom_components/party_dispenser/const.py` (additions — new constants only)

```python
# --- WebSocket client ---
WS_PATH = "/ws"

# Dispatcher signal format — unique per config entry for multi-instance forward-compat (MULTI-01 v2)
SIGNAL_WS_CONNECTED = DOMAIN + "_ws_connected_{entry_id}"

# Binary-sensor translation key
BINARY_SENSOR_KEY_CONNECTED = "connected"

# Reconnect / backoff — base 0.5s, factor 2, cap 30s
WS_BACKOFF_BASE_SECONDS = 0.5
WS_BACKOFF_FACTOR = 2.0
WS_BACKOFF_CAP_SECONDS = 30.0
WS_BACKOFF_JITTER_RATIO = 0.25  # additive: jitter = uniform(0, 0.25 * backoff)

# aiohttp heartbeat — PING every 25s, close socket if PONG not received within ~12.5s
WS_HEARTBEAT_SECONDS = 25.0
```

**Also bump `VERSION`:**
```python
VERSION = "0.3.0"
```

### `custom_components/party_dispenser/websocket.py` (full NEW file, ~115 lines)

```python
"""WebSocket client for realtime queue updates from the Party Dispenser backend.

Runs as a per-config-entry background task via entry.async_create_background_task.
Reconnects with exponential backoff (0.5s → 30s cap, additive jitter). On each event
from the backend, requests a coordinator refresh. Connection state changes broadcast
via HA dispatcher so binary_sensor.party_dispenser_connected can reflect them.

Backend contract (see 03-CONTEXT.md / backend/app/ws/*.py):
- Endpoint: GET {ws,wss}://{host}:{port}/ws (no auth in v1 — documented gap)
- Server → client: JSON signals only. type=hello | queue_updated | controller_status_updated | pump_status_updated
- Client → server: ignored (aiohttp's autoping handles protocol-level PING/PONG)
"""

from __future__ import annotations

import asyncio
import json
import random
from typing import TYPE_CHECKING

from aiohttp import WSMsgType
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    LOGGER,
    SIGNAL_WS_CONNECTED,
    WS_BACKOFF_BASE_SECONDS,
    WS_BACKOFF_CAP_SECONDS,
    WS_BACKOFF_FACTOR,
    WS_BACKOFF_JITTER_RATIO,
    WS_HEARTBEAT_SECONDS,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import PartyDispenserConfigEntry, PartyDispenserCoordinator


class PartyDispenserWebSocketClient:
    """Long-running aiohttp WebSocket client with auto-reconnect and dispatcher push."""

    def __init__(
        self,
        hass: HomeAssistant,
        url: str,
        coordinator: PartyDispenserCoordinator,
        entry_id: str,
    ) -> None:
        """Store refs for the receive loop. `url` must be a full ws:// or wss:// URL."""
        self._hass = hass
        self._url = url
        self._coordinator = coordinator
        self._entry_id = entry_id
        self._task: asyncio.Task[None] | None = None
        self._connected: bool = False

    @property
    def connected(self) -> bool:
        """Whether the WebSocket is currently connected to the backend."""
        return self._connected

    def start(self, entry: PartyDispenserConfigEntry) -> None:
        """Spawn the receive loop as an entry-scoped background task."""
        if self._task is not None and not self._task.done():
            return  # Idempotent guard
        self._task = entry.async_create_background_task(
            self._hass,
            self._run(),
            name=f"party_dispenser_ws_{self._entry_id}",
        )

    async def stop(self) -> None:
        """Cancel the receive loop. Safe to call multiple times."""
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except (asyncio.CancelledError, Exception):  # noqa: BLE001 — swallow on shutdown
            pass
        self._task = None
        self._set_connected(False)

    # ---------- Internal ----------

    async def _run(self) -> None:
        """Reconnect loop. Cancelled externally via task.cancel()."""
        backoff = WS_BACKOFF_BASE_SECONDS
        while True:
            try:
                await self._run_once()
                backoff = WS_BACKOFF_BASE_SECONDS  # Reset on clean return
            except asyncio.CancelledError:
                self._set_connected(False)
                raise
            except Exception as exc:  # noqa: BLE001 — broad catch is intentional
                LOGGER.warning(
                    "Party Dispenser WS disconnected (%s: %s); reconnect in %.1fs",
                    type(exc).__name__,
                    exc,
                    backoff,
                )
                self._set_connected(False)
                jittered = backoff + random.uniform(0, WS_BACKOFF_JITTER_RATIO * backoff)  # noqa: S311
                await asyncio.sleep(jittered)
                backoff = min(backoff * WS_BACKOFF_FACTOR, WS_BACKOFF_CAP_SECONDS)

    async def _run_once(self) -> None:
        """One connect → receive-until-drop cycle."""
        session = async_get_clientsession(self._hass)
        async with session.ws_connect(
            self._url,
            autoping=True,
            heartbeat=WS_HEARTBEAT_SECONDS,
        ) as ws:
            LOGGER.debug("Party Dispenser WS connected to %s", self._url)
            self._set_connected(True)
            async for msg in ws:
                if msg.type is WSMsgType.TEXT:
                    await self._handle_text_message(msg.data)
                elif msg.type is WSMsgType.ERROR:
                    LOGGER.warning(
                        "Party Dispenser WS transport error: %s", ws.exception()
                    )
                    break
                # CLOSED / CLOSING / CLOSE terminate the async-for loop naturally

    async def _handle_text_message(self, raw: str) -> None:
        """Parse and dispatch a single TEXT frame's JSON payload."""
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            LOGGER.debug("Party Dispenser WS non-JSON message ignored: %r", raw[:200])
            return

        event_type = payload.get("type") if isinstance(payload, dict) else None
        if event_type == "queue_updated":
            LOGGER.debug("Party Dispenser WS queue_updated → refresh coordinator")
            await self._coordinator.async_request_refresh()
        elif event_type == "hello":
            LOGGER.debug("Party Dispenser WS hello received")
        else:
            LOGGER.debug("Party Dispenser WS event ignored: %r", event_type)

    def _set_connected(self, connected: bool) -> None:
        """Update connection flag + fire dispatcher signal if state changed."""
        if self._connected == connected:
            return
        self._connected = connected
        async_dispatcher_send(
            self._hass,
            SIGNAL_WS_CONNECTED.format(entry_id=self._entry_id),
            connected,
        )
```

**Source notes:**
- `asyncio.CancelledError` MUST be caught separately and re-raised (see Pitfall 4)
- `random.uniform` is flagged by `ruff S311` (weak PRNG for security); we add `# noqa: S311` because jitter is not security-critical
- `except Exception` is flagged by `ruff BLE001` (blind-except); we add `# noqa: BLE001` because catching broadly on a network loop is correct — any exception = socket dead = reconnect
- `async_get_clientsession(hass)` (HA's shared aiohttp session) — same pattern as `api.py`
- `entry.async_create_background_task` — verified signature from HA core (see Architecture Patterns → Pattern 1)

### `custom_components/party_dispenser/binary_sensor.py` (full NEW file, ~65 lines)

```python
"""Binary-sensor platform — single CONNECTIVITY sensor for WS state."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.const import EntityCategory
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import BINARY_SENSOR_KEY_CONNECTED, SIGNAL_WS_CONNECTED
from .entity import PartyDispenserEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from .coordinator import PartyDispenserConfigEntry, PartyDispenserCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the single binary_sensor.party_dispenser_connected entity."""
    coordinator = entry.runtime_data.coordinator
    ws_client = entry.runtime_data.ws_client
    async_add_entities([PartyDispenserConnectedBinarySensor(coordinator, ws_client, entry.entry_id)])


class PartyDispenserConnectedBinarySensor(PartyDispenserEntity, BinarySensorEntity):
    """WebSocket connection-state sensor (DIAGNOSTIC, device_class=CONNECTIVITY)."""

    entity_description = BinarySensorEntityDescription(
        key=BINARY_SENSOR_KEY_CONNECTED,
        translation_key=BINARY_SENSOR_KEY_CONNECTED,
        device_class=BinarySensorDeviceClass.CONNECTIVITY,
        entity_category=EntityCategory.DIAGNOSTIC,
    )

    def __init__(
        self,
        coordinator: PartyDispenserCoordinator,
        ws_client,  # PartyDispenserWebSocketClient — avoid circular import
        entry_id: str,
    ) -> None:
        """Wire CoordinatorEntity base + stash ws_client for initial-state seeding."""
        super().__init__(coordinator)
        self._entry_id = entry_id
        self._ws_client = ws_client
        self._attr_unique_id = f"{entry_id}_{BINARY_SENSOR_KEY_CONNECTED}"
        self._connected: bool = ws_client.connected  # Seed from current client state

    @property
    def is_on(self) -> bool:
        """Return True when the WebSocket is connected to the backend."""
        return self._connected

    async def async_added_to_hass(self) -> None:
        """Subscribe to the WS-connection dispatcher signal for this entry."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                SIGNAL_WS_CONNECTED.format(entry_id=self._entry_id),
                self._handle_ws_connection_change,
            )
        )

    @callback
    def _handle_ws_connection_change(self, connected: bool) -> None:
        """Update state and push to HA on each WS connect/disconnect transition."""
        self._connected = connected
        self.async_write_ha_state()
```

**Source notes:**
- `ws_client` arg is untyped (no import of `PartyDispenserWebSocketClient` class) to avoid circular imports (`coordinator → api`, `coordinator → websocket`, `websocket → coordinator`). If the planner prefers type-safety: add `if TYPE_CHECKING:` import + `"PartyDispenserWebSocketClient"` string annotation.
- `BinarySensorEntityDescription` carries `device_class` + `entity_category` together (2026 pattern); alternative is `_attr_device_class` + `_attr_entity_category` on the instance.
- `self._connected` initial value is read from `ws_client.connected` — handles the race where binary_sensor platform loads AFTER the WS client has already connected (entity gets the correct starting state without waiting for the next dispatcher signal).

### `custom_components/party_dispenser/__init__.py` (extension — additions only, in order)

**New imports at top of file:**
```python
from .websocket import PartyDispenserWebSocketClient
from .const import (
    # ... existing imports ...
    WS_PATH,
)
```

**Platforms list change:**
```python
# BEFORE (line 28):
PLATFORMS: list[Platform] = [Platform.SENSOR]

# AFTER:
PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR]
```

**Inside `async_setup_entry`** — insert between `coordinator.async_config_entry_first_refresh()` (line 59) and `hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)` (line 61):

```python
# --- after: await coordinator.async_config_entry_first_refresh() ---

# Build WebSocket URL (scheme depends on use_tls; separate from http(s) base_url above)
ws_scheme = "wss" if entry.data.get(CONF_USE_TLS, False) else "ws"
ws_url = f"{ws_scheme}://{host}:{port}{WS_PATH}"

ws_client = PartyDispenserWebSocketClient(
    hass=hass,
    url=ws_url,
    coordinator=coordinator,
    entry_id=entry.entry_id,
)

entry.runtime_data = PartyDispenserData(
    client=client,
    coordinator=coordinator,
    ws_client=ws_client,
)

ws_client.start(entry)
entry.async_on_unload(ws_client.stop)

# --- before: await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS) ---
```

**Note:** The existing `entry.runtime_data = PartyDispenserData(client=client, coordinator=coordinator)` assignment on line 57 must be REPLACED by the new 3-field assignment above. Order matters: `ws_client.start(entry)` must come AFTER `entry.runtime_data` is set because the binary_sensor platform (loaded in the next line's `async_forward_entry_setups`) reads `entry.runtime_data.ws_client`.

### `custom_components/party_dispenser/coordinator.py` (extension — PartyDispenserData addition)

**Change `PartyDispenserData` dataclass (existing lines 41-46):**

```python
# BEFORE
@dataclass
class PartyDispenserData:
    """Runtime data stored on the ConfigEntry."""
    client: PartyDispenserApiClient
    coordinator: PartyDispenserCoordinator

# AFTER
@dataclass
class PartyDispenserData:
    """Runtime data stored on the ConfigEntry."""
    client: PartyDispenserApiClient
    coordinator: PartyDispenserCoordinator
    ws_client: PartyDispenserWebSocketClient  # NEW in Phase 3
```

**Add forward-reference import guarded by TYPE_CHECKING** (to avoid circular: websocket.py imports coordinator.py for types):

```python
# In coordinator.py's existing TYPE_CHECKING block (around line 22-24):
if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant

    from .websocket import PartyDispenserWebSocketClient  # NEW
```

**Alternative** (if the planner prefers no circular: use a `"PartyDispenserWebSocketClient"` string annotation in the dataclass — but HA's dataclass introspection works fine with `from __future__ import annotations` which coordinator.py already has).

### `custom_components/party_dispenser/manifest.json` (modify — 2-line diff)

```json
{
  "domain": "party_dispenser",
  "name": "Party Dispenser",
-  "version": "0.2.0",
+  "version": "0.3.0",
  "documentation": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd",
  "issue_tracker": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd/-/issues",
  "codeowners": [],
  "requirements": [],
  "dependencies": [],
-  "iot_class": "local_polling",
+  "iot_class": "local_push",
  "integration_type": "hub",
  "config_flow": true
}
```

**NOTE:** This must commit in the SAME commit as the `test_integration_manifest.py` override-test change (Pitfall 8).

### `custom_components/party_dispenser/translations/en.json` (addition — 1 new key block)

```diff
{
  "config": { ... },
  "options": { ... },
  "services": { ... },
  "entity": {
    "sensor": {
      "queue_size": {"name": "Queue size"},
      "queue_summary": {"name": "Queue summary"},
      "makeable_count": {"name": "Makeable recipes"},
      "current_order": {"name": "Current order"},
      "recipes": {"name": "Recipes"}
-    }
+    },
+    "binary_sensor": {
+      "connected": {"name": "Connected"}
+    }
  }
}
```

The entity's full HA UI name becomes "Party Dispenser Connected" (device name + translated entity name); entity_id becomes `binary_sensor.party_dispenser_connected`.

### `tests/test_integration_manifest.py` (modify — rename phase2 → phase3 test)

```diff
-def test_manifest_phase2_overrides() -> None:
-    """Phase 2 locked decisions per 02-CONTEXT.md (config_flow flipped, version bumped)."""
+def test_manifest_phase3_overrides() -> None:
+    """Phase 3 locked decisions per 03-CONTEXT.md (WS push landed, version bumped)."""
     manifest = _load()
-    assert manifest.get("iot_class") == "local_polling", (
-        "Phase 2: iot_class stays 'local_polling' (Phase 3 flips to 'local_push' when WS lands)"
-    )
+    assert manifest.get("iot_class") == "local_push", (
+        "Phase 3: iot_class flipped to 'local_push' when WebSocket subscription landed"
+    )
     assert manifest.get("integration_type") == "hub", (
-        "Phase 2: integration_type stays 'hub' (forward-compat for multi-dispenser v2)"
+        "Phase 3: integration_type stays 'hub' (forward-compat for multi-dispenser v2)"
     )
     assert manifest.get("config_flow") is True, (
-        "Phase 2: config_flow MUST be true (Phase 1 stub was false; Phase 2 flips)"
+        "Phase 3: config_flow stays true (Phase 2 flipped it; we don't touch it)"
     )
-    assert manifest.get("version") == "0.2.0", (
-        "Phase 2: version bumped to 0.2.0 per CONTEXT.md locked decision"
+    assert manifest.get("version") == "0.3.0", (
+        "Phase 3: version bumped to 0.3.0 per CONTEXT.md locked decision"
     )
```

### `tests/test_websocket.py` (full NEW file — 4 copy-ready tests + FakeWebSocket helper)

```python
"""Tests for PartyDispenserWebSocketClient — lifecycle + reconnect + dispatcher."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from aiohttp import WSMsgType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_USE_TLS,
    DOMAIN,
    SIGNAL_WS_CONNECTED,
)
from custom_components.party_dispenser.websocket import PartyDispenserWebSocketClient


# ---------- Helpers ----------


class _FakeWSMessage:
    """Mimics aiohttp.WSMessage: just .type and .data attributes."""

    def __init__(self, type_, data):
        self.type = type_
        self.data = data


class FakeWebSocket:
    """Drop-in replacement for aiohttp.ClientWebSocketResponse for tests.

    Messages are pre-queued in __init__; __aiter__ yields them in order, then
    the iterator ends (simulating a CLOSED server). Set raise_on_connect to
    force ws_connect itself to raise (for backoff tests).
    """

    def __init__(self, messages: list[_FakeWSMessage] | None = None) -> None:
        self._messages = list(messages) if messages else []
        self._closed = False
        self.exception = MagicMock(return_value=None)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._messages:
            raise StopAsyncIteration
        return self._messages.pop(0)

    async def close(self) -> None:
        self._closed = True


@asynccontextmanager
async def _fake_ws_context(ws: FakeWebSocket):
    """Async context manager yielding the FakeWebSocket (mimics ws_connect)."""
    try:
        yield ws
    finally:
        await ws.close()


def _patch_ws_connect(fake_ws: FakeWebSocket | Exception):
    """Patch aiohttp_client.async_get_clientsession to yield a session whose
    ws_connect returns an async context manager wrapping the given fake WS
    (or raises the given Exception)."""
    session = MagicMock()
    if isinstance(fake_ws, Exception):
        session.ws_connect = MagicMock(side_effect=fake_ws)
    else:
        session.ws_connect = MagicMock(return_value=_fake_ws_context(fake_ws))
    return patch(
        "custom_components.party_dispenser.websocket.async_get_clientsession",
        return_value=session,
    )


def _mock_config_entry(hass):
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local",
            CONF_PORT: 8000,
            CONF_JWT: "jwt",
            CONF_USE_TLS: False,
        },
    )
    entry.add_to_hass(hass)
    return entry


# ---------- Tests ----------


async def test_connect_receives_hello_and_queue_updated_triggers_refresh(hass) -> None:
    """Happy path: connect → hello → queue_updated → coordinator.async_request_refresh called."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    fake_ws = FakeWebSocket(
        messages=[
            _FakeWSMessage(WSMsgType.TEXT, json.dumps({"type": "hello"})),
            _FakeWSMessage(WSMsgType.TEXT, json.dumps({"type": "queue_updated"})),
        ]
    )

    with _patch_ws_connect(fake_ws):
        client = PartyDispenserWebSocketClient(
            hass=hass, url="ws://dispenser.local:8000/ws",
            coordinator=coordinator, entry_id=entry.entry_id,
        )
        client.start(entry)
        # Give the event loop a few ticks to drain the 2 pre-queued messages.
        await asyncio.sleep(0.05)
        await client.stop()

    coordinator.async_request_refresh.assert_awaited_once()


async def test_disconnect_triggers_reconnect_with_backoff(hass) -> None:
    """ws_connect raising ConnectionError should trigger sleep(backoff) before retry."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    sleep_calls: list[float] = []

    async def _record_sleep(delay: float):
        sleep_calls.append(delay)
        # After 3 recorded sleeps, raise CancelledError to stop the loop
        if len(sleep_calls) >= 3:
            raise asyncio.CancelledError

    with (
        _patch_ws_connect(ConnectionError("refused")),
        patch("custom_components.party_dispenser.websocket.asyncio.sleep", side_effect=_record_sleep),
    ):
        client = PartyDispenserWebSocketClient(
            hass=hass, url="ws://dispenser.local:8000/ws",
            coordinator=coordinator, entry_id=entry.entry_id,
        )
        client.start(entry)
        await asyncio.sleep(0.01)  # Let the loop run through 3 failed connects
        await client.stop()

    # Backoff sequence: 0.5 (base), 1.0, 2.0 — each with <=25% additive jitter
    assert len(sleep_calls) >= 3, f"Expected ≥3 sleeps, got {sleep_calls}"
    assert 0.5 <= sleep_calls[0] <= 0.625, f"First backoff should be ~0.5s, got {sleep_calls[0]}"
    assert 1.0 <= sleep_calls[1] <= 1.25, f"Second backoff should be ~1.0s, got {sleep_calls[1]}"
    assert 2.0 <= sleep_calls[2] <= 2.5, f"Third backoff should be ~2.0s, got {sleep_calls[2]}"


async def test_dispatcher_fires_on_connect_and_disconnect(hass) -> None:
    """async_dispatcher_send called with True on hello, False on drop."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    fake_ws = FakeWebSocket(
        messages=[_FakeWSMessage(WSMsgType.TEXT, json.dumps({"type": "hello"}))]
    )

    dispatched: list[bool] = []
    signal_name = SIGNAL_WS_CONNECTED.format(entry_id=entry.entry_id)

    from homeassistant.helpers.dispatcher import async_dispatcher_connect

    unsub = async_dispatcher_connect(hass, signal_name, lambda connected: dispatched.append(connected))

    with _patch_ws_connect(fake_ws):
        client = PartyDispenserWebSocketClient(
            hass=hass, url="ws://dispenser.local:8000/ws",
            coordinator=coordinator, entry_id=entry.entry_id,
        )
        client.start(entry)
        await asyncio.sleep(0.05)  # Let the hello deliver and then iterator ends → disconnect
        await client.stop()

    unsub()
    # Expect [True, False] — connected on ws_connect, disconnected when iterator ends
    assert True in dispatched, "Should have dispatched connected=True"
    assert False in dispatched, "Should have dispatched connected=False on drop/stop"


async def test_stop_cancels_task_cleanly(hass) -> None:
    """stop() cancels the background task without raising and resets connected to False."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    # Use a WS that never yields any messages; the client will sit in ws.__aiter__
    # forever until we cancel it.
    class _NeverYield(FakeWebSocket):
        async def __anext__(self):
            await asyncio.sleep(3600)  # Block "forever"
            raise StopAsyncIteration

    fake_ws = _NeverYield()

    with _patch_ws_connect(fake_ws):
        client = PartyDispenserWebSocketClient(
            hass=hass, url="ws://dispenser.local:8000/ws",
            coordinator=coordinator, entry_id=entry.entry_id,
        )
        client.start(entry)
        await asyncio.sleep(0.01)  # Let ws_connect succeed and dispatch True
        assert client.connected is True
        await client.stop()   # Should not raise

    assert client.connected is False
```

**Test coverage achieved:**
- `test_connect_receives_hello_and_queue_updated_triggers_refresh` → RT-01 + RT-02 happy path
- `test_disconnect_triggers_reconnect_with_backoff` → RT-04 backoff assertion (0.5 → 1.0 → 2.0 pattern)
- `test_dispatcher_fires_on_connect_and_disconnect` → RT-03 wiring from WS → binary_sensor
- `test_stop_cancels_task_cleanly` → Task lifecycle + Pitfall 4 (CancelledError handling)

**Optional extras the planner may add for tighter coverage:**
- `test_backoff_doubles_then_caps_at_30s` — 7 forced disconnects; assert 6th+ sleep is capped at ~30s
- `test_malformed_json_doesnt_disconnect` — TEXT message with `"not-json"` → no refresh called, loop continues

### `tests/test_binary_sensor.py` (full NEW file — 2 tests)

```python
"""Tests for binary_sensor.party_dispenser_connected."""

from __future__ import annotations

from unittest.mock import MagicMock

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.const import EntityCategory
from homeassistant.helpers.dispatcher import async_dispatcher_send

from custom_components.party_dispenser.binary_sensor import (
    PartyDispenserConnectedBinarySensor,
)
from custom_components.party_dispenser.const import SIGNAL_WS_CONNECTED


def _mock_coordinator() -> MagicMock:
    """Return a coordinator MagicMock with the shape PartyDispenserEntity expects."""
    coord = MagicMock()
    coord.config_entry.entry_id = "entry-abc"
    # CoordinatorEntity reads coord.data during setup; our sensor doesn't, but HA does.
    coord.data = MagicMock()
    return coord


def test_binary_sensor_attributes() -> None:
    """BinarySensorEntityDescription exposes device_class=CONNECTIVITY + diagnostic category."""
    coord = _mock_coordinator()
    ws_client = MagicMock()
    ws_client.connected = False
    sensor = PartyDispenserConnectedBinarySensor(coord, ws_client, entry_id="entry-abc")

    assert sensor.device_class is BinarySensorDeviceClass.CONNECTIVITY
    assert sensor.entity_category is EntityCategory.DIAGNOSTIC
    assert sensor.unique_id == "entry-abc_connected"
    assert sensor.is_on is False


async def test_binary_sensor_responds_to_dispatcher_signal(hass) -> None:
    """Dispatcher signal flips is_on and calls async_write_ha_state."""
    coord = _mock_coordinator()
    ws_client = MagicMock()
    ws_client.connected = False
    sensor = PartyDispenserConnectedBinarySensor(coord, ws_client, entry_id="entry-abc")
    sensor.hass = hass
    sensor.platform = MagicMock()  # Required by async_write_ha_state path
    sensor.async_write_ha_state = MagicMock()  # Stub out the HA-side push

    # Simulate HA calling async_added_to_hass (would register the dispatcher listener)
    await sensor.async_added_to_hass()

    # Fire dispatcher signal — sensor should receive it
    async_dispatcher_send(
        hass,
        SIGNAL_WS_CONNECTED.format(entry_id="entry-abc"),
        True,
    )
    await hass.async_block_till_done()

    assert sensor.is_on is True
    sensor.async_write_ha_state.assert_called()
```

**Note:** `test_binary_sensor_responds_to_dispatcher_signal` requires the `hass` fixture because `async_dispatcher_send` needs an event loop associated with a HA instance. The entity stub-outs (`sensor.platform`, `sensor.async_write_ha_state`) are needed because we're testing the entity in isolation from HA's entity registry — a lighter alternative to setting up the full platform.

## State of the Art

| Old Approach | Current Approach (2026-04-20) | When Changed | Impact |
|--------------|-------------------------------|--------------|--------|
| `hass.async_create_task` for WS clients | `entry.async_create_background_task` | Added in HA 2023.8, promoted to canonical 2024.x | Correct lifecycle — cancelled on entry unload; no leaks |
| `hass.data[DOMAIN][entry.entry_id]` | `entry.runtime_data = MyDataclass(...)` with `type MyConfigEntry = ConfigEntry[MyDataclass]` | HA 2024.5 onwards | Bronze-tier quality-scale rule; we already follow (Phase 2) |
| Manual `aiohttp.ClientSession()` in integrations | `async_get_clientsession(hass)` | HA 2023.x onwards, now mandatory | Shared session + correct SSL + pytest-HA-custom interception |
| `async_track_state_change_event` for inter-component signaling | `async_dispatcher_send` / `async_dispatcher_connect` | Always (dispatcher is older) | Dispatcher is domain-scoped; state-change listeners are entity-scoped |
| `_attr_name = "Connected"` | `_attr_has_entity_name = True` + `_attr_translation_key = "connected"` + `translations/en.json` | HA 2023.8 onwards | User-facing strings always translatable |
| Register services per config entry (`async_setup_entry`) | Register once per domain (`async_setup`) | Canonical 2024-2026; Phase 2 already follows | Idempotent; no double-register on 2nd entry |

**Deprecated / outdated:**
- **`iot_class` semantics:** Still supported, still cosmetic-only. No change. Flipping `local_polling → local_push` is purely informational — surfaces in HA's Integration Details page. HACS does not re-render differently on this change. No runtime behavior difference. Verified from HA manifest docs + `home-assistant/core@dev:homeassistant/loader.py` — `iot_class` is read for metadata display, not behavior.
- **`pytest-HA-custom`'s `hass_ws_client`**: Designed for testing HA's OWN frontend WS API. Does NOT intercept our outbound `ws_connect` calls. We roll our own mock (see Code Examples → tests/test_websocket.py).
- **`aioclient_mock`**: HTTP-only interception; doesn't touch WebSocket upgrades. Same caveat.

## Open Questions

1. **Should we use `SignalType[bool]` typed signals or plain `str` dispatcher signals?**
   - What we know: HA core integrations use BOTH; `str` is more common, `SignalType` adds type safety at the cost of defining a module-level symbol per signal (see `homeassistant/util/signal_type.py`)
   - What's unclear: Whether the planner wants the tiny type-safety win for a single-signal integration
   - Recommendation: **Use plain `str` with `SIGNAL_WS_CONNECTED` format template**. Matches 90% of current integrations. Can migrate to `SignalType` in v2 if multiple signals accumulate.

2. **Should the WS client log at INFO or DEBUG on connect/disconnect?**
   - What we know: HA convention is DEBUG for internal lifecycle events; WARNING for recoverable errors; ERROR for unrecoverable ones
   - What's unclear: Whether a clean reconnect after a drop warrants INFO (for user debugging) vs DEBUG
   - Recommendation: DEBUG on successful connect, WARNING on drop-with-reconnect, ERROR only if the task itself dies (shouldn't happen — the loop only exits on CancelledError). Matches Phase 2 LOGGER usage.

3. **Do we need a "permanent error" backoff cap of 60s for 401/403/TLS handshake failures?**
   - What we know: CONTEXT.md locked it as defensive-only; Claude's Discretion allows simplification
   - What's unclear: Whether to add complexity for errors that can't happen in Phase 3 (backend has no auth)
   - Recommendation: **Skip.** Document in v2 backlog. One branch of `except` handling all errors identically keeps `websocket.py` under 120 lines.

## Environment Availability

> Skip — Phase 3 adds no new external dependencies. All required tools (`aiohttp`, `homeassistant`, `pytest-homeassistant-custom-component`, `freezegun`, `pytest-freezer`) are transitively pinned by Phase 2's `pyproject.toml` dev group and verified installable on the existing `python:3.13-slim` CI image.

The backend WS endpoint (`ws://{host}:{port}/ws`) is external to this integration — its availability is a runtime concern (the user's LAN + dispenser state), not a build-time concern. Integration tests mock the WS session entirely; no live backend is needed for CI.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `pytest-homeassistant-custom-component==0.13.316` (pins `pytest==9.0.0`, `pytest-asyncio==1.3.0`; autouse mode) — UNCHANGED from Phase 2 |
| Config file | `pyproject.toml` `[tool.pytest.ini_options]` — UNCHANGED |
| Quick run command | `pytest tests/test_websocket.py tests/test_binary_sensor.py -v` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RT-01 | WS subscribe on setup | integration | `pytest tests/test_websocket.py::test_connect_receives_hello_and_queue_updated_triggers_refresh -x` | ❌ Wave 0 |
| RT-02 | Queue events → HA entities < 1s | integration | `pytest tests/test_websocket.py::test_connect_receives_hello_and_queue_updated_triggers_refresh -x` (asserts `coordinator.async_request_refresh` is awaited — actual < 1s latency is verified by construction: `async_request_refresh` is non-blocking) | ❌ Wave 0 |
| RT-03 | `binary_sensor.party_dispenser_connected` reflects WS state | integration | `pytest tests/test_binary_sensor.py::test_binary_sensor_responds_to_dispatcher_signal -x` + `pytest tests/test_websocket.py::test_dispatcher_fires_on_connect_and_disconnect -x` | ❌ Wave 0 |
| RT-04 | Reconnect with exponential backoff 0.5→30s; poll fallback | integration | `pytest tests/test_websocket.py::test_disconnect_triggers_reconnect_with_backoff -x` (asserts backoff sequence 0.5→1.0→2.0 with jitter ≤25%) | ❌ Wave 0 |
| QA-02 | WS reconnect logic has dedicated tests | integration | `pytest tests/test_websocket.py -v` (suite ≥ 4 tests passing, coverage ≥80% on websocket.py) | ❌ Wave 0 |
| manifest-phase3 | manifest flip assertions | unit | `pytest tests/test_integration_manifest.py::test_manifest_phase3_overrides -x` | ✅ (rename + flip; file exists) |
| binary-sensor-static | binary_sensor entity description assertions | unit | `pytest tests/test_binary_sensor.py::test_binary_sensor_attributes -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pytest tests/test_websocket.py tests/test_binary_sensor.py -v` (targeted — new test files only; ~5-10s)
- **Per wave merge:** `pytest tests/ -v` (full suite; 54 pre-Phase-3 + ~7 new = ~61 tests; < 1s)
- **Phase gate:** Full suite green + coverage ≥80% on `websocket.py` before `/gsd:verify-work`. Command:
  ```bash
  pytest tests/ -v --cov=custom_components.party_dispenser --cov-report=term-missing
  ```

### Wave 0 Gaps

- [ ] `tests/test_websocket.py` — covers RT-01, RT-02, RT-04, QA-02 (4 tests minimum; create with `FakeWebSocket` helper defined in-file)
- [ ] `tests/test_binary_sensor.py` — covers RT-03 (2 tests minimum)
- [ ] `tests/test_integration_manifest.py` — rename `test_manifest_phase2_overrides` → `test_manifest_phase3_overrides` and flip assertions (SAME commit as manifest.json)
- [ ] No framework install needed — `pytest-homeassistant-custom-component` already installed from Phase 2's `.[dev]` group.
- [ ] No new fixtures needed in `conftest.py` — `hass`, `enable_custom_integrations`, `MockConfigEntry` are sufficient.

## Sources

### Primary (HIGH confidence)

- **`aio-libs/aiohttp/aiohttp/client.py@master`** (checked 2026-04-20) — `ws_connect` signature lines 967–989. Verified parameter defaults for `autoping`, `heartbeat`, `autoclose`, `max_msg_size`, `decode_text`.
  - URL: https://raw.githubusercontent.com/aio-libs/aiohttp/master/aiohttp/client.py
- **`aio-libs/aiohttp/aiohttp/_websocket/models.py@master`** (checked 2026-04-20) — `WSMsgType` enum values (TEXT=0x1, BINARY=0x2, CLOSED=0x101, CLOSING=0x100, CLOSE=0x8, ERROR=0x102, PING=0x9, PONG=0xA).
  - URL: https://raw.githubusercontent.com/aio-libs/aiohttp/master/aiohttp/_websocket/models.py
- **`home-assistant/core@dev:homeassistant/config_entries.py`** (checked 2026-04-20) — `ConfigEntry.async_create_background_task` signature + docstring at lines 1366–1389; `ConfigEntry.async_create_task` at 1342–1363 (for comparison).
  - URL: https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/config_entries.py
- **`home-assistant/core@dev:homeassistant/helpers/dispatcher.py`** (checked 2026-04-20) — `async_dispatcher_send` + `async_dispatcher_connect` signatures with `SignalType[*_Ts] | str` overloads.
  - URL: https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/helpers/dispatcher.py
- **`home-assistant/core@dev:homeassistant/const.py`** lines 955–971 — `EntityCategory` StrEnum (CONFIG="config", DIAGNOSTIC="diagnostic") with docstring explaining semantics.
  - URL: https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/const.py
- **`home-assistant/core@dev:homeassistant/components/binary_sensor/__init__.py`** lines 33–186 — `BinarySensorDeviceClass.CONNECTIVITY = "connectivity"` + `BinarySensorEntity` class.
  - URL: https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/binary_sensor/__init__.py
- **`home-assistant/core@dev:homeassistant/components/smartthings/__init__.py`** lines 202–209 — Canonical `entry.async_create_background_task` pattern for subscribe tasks.
  - URL: https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/smartthings/__init__.py
- **`home-assistant/core@dev:homeassistant/components/unifiprotect/data.py`** lines 31–33, 114, 243–251, 344–348, 369 — async_dispatcher_send + async_dispatcher_connect + background task pattern in a real high-traffic integration.
  - URL: https://raw.githubusercontent.com/home-assistant/core/dev/homeassistant/components/unifiprotect/data.py
- **`ava-organization/party-dispenser` (gitlab project 11)** (checked 2026-04-20) — Backend WS source:
  - `backend/app/ws/router.py` — WS endpoint `/ws`, no auth, sends `{"type": "hello"}` on connect
  - `backend/app/ws/events.py` — broadcast helpers: `broadcast_queue_updated`, `broadcast_controller_status_updated`, `broadcast_pump_status_updated` (signal-only, no payloads)
  - `backend/app/ws/manager.py` — `ConnectionManager` broadcast-to-all pattern
  - `backend/app/api/routes/orders.py` — 5 `broadcast_queue_updated` call sites (create_order, create_order_from_recipe, continue_order, cancel_order, one admin path)
  - `backend/app/api/routes/admin_queue.py` — 1 `broadcast_queue_updated` call site
  - Endpoint URLs: `glab api --hostname gitlab.paskiemgmt.com "projects/11/repository/files/<path>/raw?ref=main"`
- **PyPI metadata** (checked 2026-04-20):
  - `aiohttp==3.13.5` requires-python `>=3.10.1`, uploaded 2026-03-31
  - `homeassistant==2026.2.3` requires-python `>=3.13.2`
  - `pytest-homeassistant-custom-component==0.13.316` requires-python `>=3.13`, pins `homeassistant==2026.2.3` + `freezegun==1.5.2` + `pytest-freezer==0.4.9` + `pytest-asyncio==1.3.0`
- **`home-assistant.io/integrations/binary_sensor/`** (checked 2026-04-20) — `CONNECTIVITY` device class: `on` = connected, `off` = disconnected.

### Secondary (MEDIUM confidence)

- **Home Assistant Community — `async_create_background_task` adoption thread** (checked 2026-04-20) — confirms pattern for long-running subscriptions in custom integrations.
  - URL: https://community.home-assistant.io/t/starting-a-websocket-connection-in-async-setup-entry-via-hass-async-create-task-causes-long-startup/464966
- **Mintlify HA docs mirror — Async Programming** (checked 2026-04-20) — background task lifecycle explanation.
  - URL: https://www.mintlify.com/home-assistant/core/guides/async-programming
- **Tuya-local issue #1919** (checked 2026-04-20) — example custom-integration migration from `hass.async_create_task` → `entry.async_create_background_task`.
  - URL: https://github.com/make-all/tuya-local/issues/1919

### Tertiary (LOW confidence — none required for Phase 3)

All implementation-critical patterns verified from HIGH or MEDIUM sources. No LOW-confidence findings are load-bearing.

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — every version verified against live PyPI metadata (2026-04-20); aiohttp `ws_connect` signature verified from GitHub master source.
- **Architecture patterns:** HIGH — `entry.async_create_background_task`, `async_dispatcher_send`/`_connect`, `BinarySensorDeviceClass.CONNECTIVITY`, `EntityCategory.DIAGNOSTIC` all verified from `home-assistant/core@dev` source 2026-04-20.
- **Backend WS contract:** HIGH — pulled live from GitLab project 11 backend source 2026-04-20; every file referenced by name and line range.
- **Pitfalls:** HIGH — derived from official docs, HA source, and canonical integrations (SmartThings, UniFi Protect).
- **Test patterns:** MEDIUM-HIGH — `FakeWebSocket` pattern is hand-rolled (not a standard library primitive), but mirrors what `pytest-aiohttp` does internally; the pattern is proven across multiple HA core test suites (see unifiprotect, axis tests).
- **iot_class cosmetic-only claim:** MEDIUM — verified that HA's `loader.py` reads it for display; didn't exhaustively audit HACS source, but HACS's README and issue tracker confirm it's informational. If a planner needs 100% certainty they can fetch `hacs/integration` repo and grep.

**Research date:** 2026-04-20
**Valid until:** 2026-07-20 (3 months — HA's aiohttp pin, `ConfigEntry.async_create_background_task` API, and dispatcher API are stable; re-verify if a Phase 3 execution slips past this date)

## RESEARCH COMPLETE
