---
phase: 03-realtime-push
plan: 01
subsystem: integration-core
tags: [websocket, aiohttp, binary_sensor, dispatcher, home-assistant, reconnect, exponential-backoff]

# Dependency graph
requires:
  - phase: 02-integration-core
    provides: "PartyDispenserApiClient, PartyDispenserCoordinator, PartyDispenserData runtime_data pattern, PartyDispenserEntity base class, translations/en.json entity block, ruff + pytest-HA test harness (54 tests)"
provides:
  - "PartyDispenserWebSocketClient (websocket.py, 156 lines): long-running aiohttp WS client with entry-scoped background task, exponential backoff 0.5s->30s cap + additive 25% jitter, CancelledError re-raised, heartbeat=25s via aiohttp autoping, dispatcher broadcast on connect-state change"
  - "PartyDispenserConnectedBinarySensor (binary_sensor.py, 82 lines): CONNECTIVITY device_class + DIAGNOSTIC entity_category entity, subscribes to dispatcher signal in async_added_to_hass wrapped in async_on_remove, seeds initial state from ws_client.connected"
  - "PartyDispenserData.ws_client field (TYPE_CHECKING-guarded forward reference — coordinator.py -> websocket.py)"
  - "WS_PATH, SIGNAL_WS_CONNECTED, BINARY_SENSOR_KEY_CONNECTED, WS_BACKOFF_* (5 constants), WS_HEARTBEAT_SECONDS constants in const.py"
  - "__init__.py async_setup_entry wiring: PLATFORMS += BINARY_SENSOR, ws_url = {ws,wss}://host:port/ws build, ws_client.start(entry) + entry.async_on_unload(ws_client.stop)"
  - "manifest.json iot_class=local_push + version=0.3.0 (flipped atomically with test_manifest_phase3_overrides rename)"
  - "pyproject.toml version=0.3.0 + const.py VERSION=0.3.0 (synchronized)"
affects: [03-02-realtime-tests, 04-custom-card, 06-docs]

# Tech tracking
tech-stack:
  added: ["aiohttp.WSMsgType (already transitive), homeassistant.helpers.dispatcher, homeassistant.components.binary_sensor.{BinarySensorDeviceClass,BinarySensorEntity,BinarySensorEntityDescription}, homeassistant.const.EntityCategory"]
  patterns:
    - "entry.async_create_background_task(hass, coro, name=...) for long-running per-entry subscribe loops (auto-cancelled on entry unload)"
    - "aiohttp_client.async_get_clientsession(hass) reused across REST + WS (SSL defaults + connection-pooling shared with api.py)"
    - "Reconnect loop: catch CancelledError FIRST and re-raise; catch Exception broadly with logged warning + jittered backoff; reset backoff to base on clean _run_once() return"
    - "Dispatcher signals per-config-entry: f'{DOMAIN}_ws_connected_{entry_id}' forward-compat with MULTI-01 v2 multi-dispenser"
    - "BinarySensorEntityDescription for device_class + entity_category (vs _attr_* overrides); translation_key wired to translations/en.json"
    - "TYPE_CHECKING-guarded forward reference in dataclass fields to break circular import (coordinator <-> websocket) while keeping typed attribute access"
    - "Atomic manifest+test+init+pyproject commit (Pitfall 8 honored) + fold in dataclass-migration test fixes so repo stays green end-to-end"

key-files:
  created:
    - "custom_components/party_dispenser/websocket.py (156 lines — PartyDispenserWebSocketClient)"
    - "custom_components/party_dispenser/binary_sensor.py (82 lines — PartyDispenserConnectedBinarySensor)"
  modified:
    - "custom_components/party_dispenser/__init__.py (PLATFORMS += BINARY_SENSOR + WS lifecycle wiring)"
    - "custom_components/party_dispenser/coordinator.py (PartyDispenserData.ws_client field + TYPE_CHECKING import)"
    - "custom_components/party_dispenser/const.py (7 new WS_*/SIGNAL/BINARY_SENSOR_KEY constants, VERSION bump)"
    - "custom_components/party_dispenser/manifest.json (iot_class=local_push, version=0.3.0)"
    - "custom_components/party_dispenser/translations/en.json (entity.binary_sensor.connected.name)"
    - "tests/test_integration_manifest.py (test_manifest_phase2_overrides -> test_manifest_phase3_overrides with flipped assertions)"
    - "tests/test_import.py (VERSION assertion 0.2.0 -> 0.3.0)"
    - "tests/test_services.py (fake _install_fake_entry passes ws_client=MagicMock() to PartyDispenserData)"
    - "pyproject.toml (version = 0.3.0)"

key-decisions:
  - "Dropped research-code's `# noqa: BLE001` directives in websocket.py (RUF100: BLE not in pyproject's ruff select groups — same pattern as Phase 2 Decision 02-03 for ARG001)"
  - "Replaced try/except/pass in PartyDispenserWebSocketClient.stop() with contextlib.suppress(asyncio.CancelledError, Exception) — satisfies ruff SIM105 + S110 while preserving swallow-on-shutdown semantics"
  - "Moved `entry.runtime_data = PartyDispenserData(...)` to AFTER `await coordinator.async_config_entry_first_refresh()` (previously BEFORE) so ConfigEntryAuthFailed still short-circuits ownership claims; required because ws_client construction depends on a live coordinator"
  - "Rule 2 deviation: folded dataclass-migration test fixes into Task 3's atomic commit (+2 files beyond the plan's 4). Required because Task 1's new required field on PartyDispenserData breaks 3 pre-existing tests that construct it; fixing them in a separate follow-up commit would leave HEAD..HEAD~1 red"
  - "Wrapped websocket.py docstring line 10 (event-type enumeration) to avoid E501 at line-length=100"
  - "Retained `# noqa: S311` on random.uniform() (S IS in ruff select; jitter is non-cryptographic by design)"

patterns-established:
  - "Per-entry WS client: `ws_client.start(entry)` registers an `entry.async_create_background_task(...)` whose cleanup is bound to `entry.async_on_unload(ws_client.stop)`. Backend task dies atomically with entry unload — no manual cancel-tracking."
  - "Connect-state signalling: WS client's `_set_connected(bool)` fires `async_dispatcher_send(hass, SIGNAL.format(entry_id=...), state)`. Entity subscribes inside `async_added_to_hass` via `self.async_on_remove(async_dispatcher_connect(...))`. No shared-state struct, no lock; dispatcher is the sync boundary."
  - "Signal-only event pattern: backend emits `{\"type\": \"queue_updated\"}` with NO payload; WS handler calls `coordinator.async_request_refresh()` which debounces + REST-fetches under the hood. Clean separation of push-notification from data-refetch."
  - "Heartbeat handled at protocol level (aiohttp `autoping=True, heartbeat=25`) — never at application level. No `ws.send_str('ping')` sibling task."
  - "Additive jitter (`backoff + random.uniform(0, 0.25 * backoff)`) over multiplicative — caps worst-case at 125% of base (vs multiplicative's 250%)."
  - "Version sync: 3 sources of truth kept identical (const.py::VERSION, manifest.json::version, pyproject.toml::version) + 1 paired test file that must flip assertions atomically with manifest."

requirements-completed: [RT-01, RT-02, RT-03, RT-04]

# Metrics
duration: 6min
completed: 2026-04-20
---

# Phase 3 Plan 1: WebSocket + binary_sensor Implementation Summary

**aiohttp WebSocket client with entry-scoped background task + exponential backoff reconnect (0.5s->30s cap, additive 25% jitter) + HA dispatcher-driven CONNECTIVITY binary_sensor, wired into async_setup_entry alongside atomic manifest.json flip to iot_class=local_push / version=0.3.0.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-04-20T20:39:15Z
- **Completed:** 2026-04-20T20:45:00Z (approx)
- **Tasks:** 3 (all committed atomically)
- **Files created:** 2 (websocket.py, binary_sensor.py — 238 lines of new Python)
- **Files modified:** 8 (7 under `custom_components/` + `tests/` + root `pyproject.toml`)
- **Net-new code:** ~265 lines production + ~5 test-line adjustments

## Accomplishments

- `PartyDispenserWebSocketClient` owns a long-running aiohttp WS connection per config entry with auto-reconnect, additive-jitter exponential backoff, HA-dispatcher state push, and HA-coordinator refresh on `queue_updated` events (RT-01 wire-up, RT-02 foundation, RT-04 full)
- `binary_sensor.party_dispenser_connected` entity reflects live WS state via dispatcher subscription (RT-03 full); entity uses `BinarySensorEntityDescription(device_class=CONNECTIVITY, entity_category=DIAGNOSTIC)` + translation key `connected`
- `PartyDispenserData` dataclass extended with `ws_client` field (TYPE_CHECKING forward-ref to break circular import); `__init__.py::async_setup_entry` constructs, starts, and registers cleanup for the WS client; `PLATFORMS` now includes `Platform.BINARY_SENSOR`
- `manifest.json`, `tests/test_integration_manifest.py`, `pyproject.toml`, and `__init__.py` flipped to version 0.3.0 + `iot_class=local_push` in ONE atomic commit (Pitfall 8 honored from Phase 2 lesson)
- Full pre-existing test suite (54/54) still green after dataclass migration + version bump propagation
- Ruff green across 21 files (format + check)
- Zero circular-import failures despite the three-way coordinator<->websocket<->binary_sensor graph (TYPE_CHECKING guards + forward-reference strings thanks to `from __future__ import annotations`)

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold WS constants + PartyDispenserData.ws_client field + connected translation** — `6e1fe1e` (feat)
2. **Task 2: Add PartyDispenserWebSocketClient + binary_sensor.connected platform** — `af3b181` (feat)
3. **Task 3: Wire WS lifecycle + PLATFORMS += BINARY_SENSOR + atomic manifest flip + paired test rename + pyproject bump** — `044f9fd` (feat)

## Files Created/Modified

**Created:**
- `custom_components/party_dispenser/websocket.py` — 156 lines. `PartyDispenserWebSocketClient` class with `start(entry)`, `stop()`, `connected` property. `_run()` reconnect loop catching `CancelledError` first + re-raising; broad `except Exception` with backoff sleep. `_run_once()` uses `async_get_clientsession(hass).ws_connect(url, autoping=True, heartbeat=WS_HEARTBEAT_SECONDS)`. `_handle_text_message()` parses JSON (JSONDecodeError -> debug-log + return; never disconnects the socket on a single bad frame). `_set_connected()` gates dispatcher broadcasts on state transition.
- `custom_components/party_dispenser/binary_sensor.py` — 82 lines. `async_setup_entry` reads `entry.runtime_data.{coordinator,ws_client}` and adds one `PartyDispenserConnectedBinarySensor`. Entity uses `entity_description = BinarySensorEntityDescription(...)` with `device_class=CONNECTIVITY` + `entity_category=DIAGNOSTIC`, seeds `self._connected = ws_client.connected` in `__init__`, subscribes to `SIGNAL_WS_CONNECTED.format(entry_id=...)` inside `async_added_to_hass` wrapped in `self.async_on_remove(...)`, writes state to HA on each dispatcher callback.

**Modified (production):**
- `custom_components/party_dispenser/__init__.py` — Added `WS_PATH` to const import + `from .websocket import PartyDispenserWebSocketClient`. `PLATFORMS` now `[Platform.SENSOR, Platform.BINARY_SENSOR]`. `async_setup_entry` builds `ws_url = f"{ws_scheme}://{host}:{port}{WS_PATH}"` where `ws_scheme` is `"wss" if use_tls else "ws"`, constructs `PartyDispenserWebSocketClient(hass, ws_url, coordinator, entry.entry_id)`, assigns to `entry.runtime_data` BEFORE `async_forward_entry_setups` (so binary_sensor platform sees a valid ws_client), calls `ws_client.start(entry)` and registers `entry.async_on_unload(ws_client.stop)`. Reordered `entry.runtime_data = ...` to AFTER `first_refresh` so auth failures still short-circuit.
- `custom_components/party_dispenser/coordinator.py` — Extended `PartyDispenserData` dataclass with `ws_client: PartyDispenserWebSocketClient` field. Added forward-reference import inside existing `if TYPE_CHECKING:` block. Works at runtime thanks to `from __future__ import annotations`.
- `custom_components/party_dispenser/const.py` — Bumped `VERSION = "0.3.0"`. Appended block: `WS_PATH`, `SIGNAL_WS_CONNECTED`, `BINARY_SENSOR_KEY_CONNECTED`, `WS_BACKOFF_BASE_SECONDS`, `WS_BACKOFF_FACTOR`, `WS_BACKOFF_CAP_SECONDS`, `WS_BACKOFF_JITTER_RATIO`, `WS_HEARTBEAT_SECONDS`.
- `custom_components/party_dispenser/manifest.json` — `iot_class`: `local_polling` -> `local_push`; `version`: `0.2.0` -> `0.3.0`.
- `custom_components/party_dispenser/translations/en.json` — Extended `entity` with `binary_sensor.connected.name = "Connected"`.
- `pyproject.toml` — `version = "0.3.0"` (was `"0.2.0"`).

**Modified (tests):**
- `tests/test_integration_manifest.py` — Renamed `test_manifest_phase2_overrides` -> `test_manifest_phase3_overrides`; flipped `iot_class` assertion to `local_push`; flipped `version` assertion to `0.3.0`; updated docstring + per-assertion comments to phase 3.
- `tests/test_import.py` — `test_const_exports` asserts `VERSION == "0.3.0"` (was `"0.2.0"`) so Phase 1's HA-free import smoke test stays green.
- `tests/test_services.py` — `_install_fake_entry` now passes `ws_client=MagicMock()` to `PartyDispenserData(...)` because the dataclass's new required field is a breaking constructor change.

## Decisions Made

- **Ruff noqa strategy** — Dropped research code's `# noqa: BLE001` directives (both in `websocket.py`). `BLE` isn't in `pyproject.toml`'s `[tool.ruff.lint] select` list, so the directive triggered `RUF100: Unused noqa directive`. Same pattern as Phase 2 Decision 02-03 with `ARG001`. Retained `# noqa: S311` on `random.uniform(...)` because `S` IS selected and jitter is explicitly non-cryptographic.
- **`contextlib.suppress` over try/except/pass** — Research's `stop()` used `try/except (CancelledError, Exception): pass` which tripped `SIM105` + `S110` under the selected ruff groups. Rewrote to `with contextlib.suppress(asyncio.CancelledError, Exception): await self._task`. Preserves the shutdown-swallow semantic explicitly.
- **Setup order in `async_setup_entry`** — Research code placed `entry.runtime_data = ...` BEFORE `first_refresh` to preserve "claim nothing on auth failure". Phase 3 requires `ws_client` in runtime_data, and ws_client depends on a live coordinator. Reordered so: (1) coordinator built, (2) `first_refresh` fires (auth failures short-circuit here — runtime_data still unassigned), (3) ws_client built, (4) runtime_data assigned with all three fields, (5) `ws_client.start(entry)` + `entry.async_on_unload(ws_client.stop)`, (6) `async_forward_entry_setups`. Preserves the "nothing owned on failure" invariant.
- **TYPE_CHECKING-guarded forward reference** — Rather than deferring the circular import via string annotations on the dataclass field, added the import inside `coordinator.py`'s existing `if TYPE_CHECKING:` block. `from __future__ import annotations` (already present at top) keeps the field annotation a string at runtime, so no actual circular import happens when `websocket.py` imports `coordinator.py`. Both approaches work; TYPE_CHECKING version gives IDE + mypy better type resolution.
- **Folding test fixes into Task 3's atomic commit** — See Deviations.
- **Docstring line-wrap** — Wrapped `websocket.py` module docstring line 10 (the event-type enumeration) to stay under `line-length = 100`. Minor cosmetic; content preserved as a two-line bullet.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Ruff BLE001 noqa directives were dead weight in websocket.py**
- **Found during:** Task 2 (writing websocket.py verbatim from 03-RESEARCH.md)
- **Issue:** Research code at lines 765 + 782 of 03-RESEARCH.md carried `# noqa: BLE001 - ...` comments. `BLE` is not in this project's `[tool.ruff.lint] select` list (see `pyproject.toml` — selects E/W/F/I/N/UP/B/ASYNC/S/SIM/T20/RUF), so the directives triggered `RUF100: Unused noqa directive` on `.venv/bin/ruff check .`. Same latent ruff finding as Phase 2 Decision 02-03 (re: `ARG001`).
- **Fix:** Deleted both `# noqa: BLE001` directives. The `except Exception` catches remain — they just no longer need suppression because broad-except (`BLE001`) isn't an enabled rule.
- **Files modified:** `custom_components/party_dispenser/websocket.py` (lines 81 + 98 in research, now unsuppressed)
- **Verification:** `.venv/bin/ruff check .` exits 0
- **Committed in:** `af3b181` (Task 2 commit)

**2. [Rule 1 - Bug] websocket.py stop() used try/except/pass — ruff SIM105 + S110 fail**
- **Found during:** Task 2
- **Issue:** Research code had `try: await self._task; except (asyncio.CancelledError, Exception): pass`. Ruff complained: `SIM105: Use contextlib.suppress` + `S110: try/except/pass detected, consider logging the exception`. With BLE001 removed (above), both rules fired.
- **Fix:** Rewrote as `with contextlib.suppress(asyncio.CancelledError, Exception): await self._task`. Added `import contextlib`. Added a short comment explaining shutdown-swallow semantics.
- **Files modified:** `custom_components/party_dispenser/websocket.py` (lines 16, 74-84)
- **Verification:** `.venv/bin/ruff check .` exits 0; `.stop()` semantics unchanged (CancelledError + any pending transport error both swallowed)
- **Committed in:** `af3b181` (Task 2 commit)

**3. [Rule 1 - Bug] websocket.py docstring line 10 exceeded line-length=100**
- **Found during:** Task 2
- **Issue:** Research code's module docstring line 10 was 114 chars: `- Server -> client: JSON signals only. type=hello | queue_updated | controller_status_updated | pump_status_updated`. Ruff `E501` failed.
- **Fix:** Wrapped the event-type enumeration onto two lines: `- Server -> client: JSON signals only. Types accepted:` + `  hello | queue_updated | controller_status_updated | pump_status_updated`.
- **Files modified:** `custom_components/party_dispenser/websocket.py` (lines 9-11)
- **Verification:** `.venv/bin/ruff format --check .` exits 0; `.venv/bin/ruff check .` exits 0
- **Committed in:** `af3b181` (Task 2 commit)

**4. [Rule 2 - Missing Critical] Pre-existing tests broken by Task 1's dataclass extension**
- **Found during:** Task 3 (after running `.venv/bin/pytest tests/ -v`)
- **Issue:** Task 1 added `ws_client` as a required positional field to `PartyDispenserData`. This broke 4 pre-existing tests: `test_import.py::test_const_exports` (asserted VERSION == "0.2.0"; we bumped to 0.3.0) + 3 tests in `test_services.py::_install_fake_entry` (constructed `PartyDispenserData(client=..., coordinator=...)` — now missing required arg). The plan's outer success criterion says `pytest tests/ -v` exits 0, so these must be fixed to close the plan; leaving them red would mean CI breaks on this commit.
- **Fix:** In `tests/test_import.py`, changed assertion to `const.VERSION == "0.3.0"`. In `tests/test_services.py::_install_fake_entry`, added `fake_ws_client = MagicMock()` and passed `ws_client=fake_ws_client` to `PartyDispenserData(...)`. Services code never references `ws_client`, so a bare MagicMock suffices.
- **Files modified:** `tests/test_import.py` (1 line), `tests/test_services.py` (2 added lines)
- **Verification:** `.venv/bin/pytest tests/ -v` passes 54/54 (zero regressions; all 3 services tests + the const-exports test now green on the new dataclass shape)
- **Committed in:** `044f9fd` (folded into Task 3's atomic commit per Pitfall 8's same-commit-as-manifest-flip rationale; rationale in commit message)
- **Note on atomicity:** The plan's Task 3 said "EXACTLY 4 files". I added 2 test files to that commit, taking it to 6. The reasoning is that Pitfall 8's atomicity rule ("don't split manifest flip from its test") applies equally to "don't split dataclass migration from the tests it breaks" — same class of CI-green invariant. A separate commit for the test fixes would leave HEAD..HEAD~1 with a red `pytest` run. Commit message calls this out explicitly.

---

**Total deviations:** 4 auto-fixed (3 Rule 1 ruff bugs in research code + 1 Rule 2 test migration)
**Impact on plan:** All four were necessary to satisfy the plan's outer success criteria (ruff green + full test suite green). Zero scope creep — all changes are consequences of the plan's own edits (dataclass extension + version bump) or latent ruff findings in the research-code snippets. Same class of find-and-fix as Phase 2 Decision 02-03.

## Issues Encountered

None beyond the deviations documented above. All ruff findings + test breakages were anticipated failure modes per Phase 2 lessons.

## Known Stubs

None — every new symbol is wired live. `ws_client` in `PartyDispenserData` is constructed and started in `async_setup_entry`; `binary_sensor.connected` subscribes to real dispatcher signals; the reconnect loop's backoff values come from live `const.py` symbols.

(Plan 03-02 adds test coverage of the wire — the code path is functional now.)

## Downstream Contract (for Plan 03-02 to test)

**Names + signatures Plan 03-02 can rely on:**

```python
# custom_components/party_dispenser/websocket.py
class PartyDispenserWebSocketClient:
    def __init__(
        self,
        hass: HomeAssistant,
        url: str,                    # Full ws:// or wss:// URL, including /ws path
        coordinator: PartyDispenserCoordinator,
        entry_id: str,
    ) -> None: ...

    @property
    def connected(self) -> bool: ...    # Current WS connection state

    def start(self, entry: PartyDispenserConfigEntry) -> None:
        """Idempotent — safe to call twice (second call is a no-op while task alive)"""

    async def stop(self) -> None:
        """Idempotent — safe to call when never started"""

# custom_components/party_dispenser/const.py
SIGNAL_WS_CONNECTED = "party_dispenser_ws_connected_{entry_id}"  # .format(entry_id=<uuid>)
WS_BACKOFF_BASE_SECONDS = 0.5
WS_BACKOFF_FACTOR = 2.0
WS_BACKOFF_CAP_SECONDS = 30.0
WS_BACKOFF_JITTER_RATIO = 0.25
WS_HEARTBEAT_SECONDS = 25.0

# custom_components/party_dispenser/binary_sensor.py
class PartyDispenserConnectedBinarySensor(PartyDispenserEntity, BinarySensorEntity):
    entity_description = BinarySensorEntityDescription(
        key="connected",
        translation_key="connected",
        device_class=BinarySensorDeviceClass.CONNECTIVITY,
        entity_category=EntityCategory.DIAGNOSTIC,
    )
    # unique_id = f"{entry_id}_connected"
    # entity_id (typical) = "binary_sensor.party_dispenser_connected"
```

**Testable behaviors:**
- Connect -> hello -> binary_sensor.is_on == True (via dispatcher)
- Receive `{"type": "queue_updated"}` -> coordinator.async_request_refresh() called
- Drop socket -> binary_sensor.is_on == False + backoff sleep + reconnect
- `client.stop()` cancels the background task + sets connected False
- Backoff resets to 0.5s on clean `_run_once()` return (i.e., on a fresh reconnect)
- Non-JSON text frame -> logged at debug + socket stays connected (no re-reconnect)
- CancelledError propagates (doesn't get swallowed as a reconnect event)

## Verification

```
$ .venv/bin/ruff check .
All checks passed!

$ .venv/bin/ruff format --check .
21 files already formatted

$ .venv/bin/pytest tests/ 2>&1 | tail -3
tests/test_services.py ....                                              [100%]

============================== 54 passed in 0.45s ==============================

$ .venv/bin/python -c "from custom_components.party_dispenser import async_setup_entry; \
    from custom_components.party_dispenser.websocket import PartyDispenserWebSocketClient; \
    from custom_components.party_dispenser.binary_sensor import PartyDispenserConnectedBinarySensor; \
    from custom_components.party_dispenser.coordinator import PartyDispenserData; \
    print('imports OK')"
imports OK

$ git log --oneline -n 3
044f9fd feat(03-01): wire WS lifecycle + platforms += BINARY_SENSOR + flip manifest iot_class=local_push, version=0.3.0 (+ paired test rename)
af3b181 feat(03-01): add PartyDispenserWebSocketClient + binary_sensor.connected platform
6e1fe1e feat(03-01): scaffold WS constants + PartyDispenserData.ws_client field + connected translation
```

## User Setup Required

None — WS endpoint is unauthenticated in v1 (documented gap in CONTEXT.md). Integration reload will establish the WS connection automatically against the existing host/port/TLS data from Phase 2's config flow.

## Next Phase Readiness

**Ready for Plan 03-02:**
- Every public API surface the tests will exercise is frozen above (Downstream Contract section)
- `PartyDispenserWebSocketClient` signature stable — tests can inject a mock `hass`, mock `coordinator`, dummy URL
- Dispatcher signal format locked: `party_dispenser_ws_connected_{entry_id}`
- Binary_sensor's `is_on` reads from `self._connected` which mutates on dispatcher callback — testable via `async_dispatcher_send` from the test harness

**Not yet done (Plan 03-02 scope):**
- RT-02 assertion (queue event -> entity update within 1s): needs test in tests/test_websocket.py
- QA-02 (dedicated WS reconnect tests): 4 tests in tests/test_websocket.py + 2 in tests/test_binary_sensor.py per research plan
- Annotated v0.3.0 tag + push to origin

**Blockers:** None.

## Self-Check: PASSED

Verification that SUMMARY.md claims match repo state:
- `websocket.py` created (156 lines, >= 100 required): FOUND via `wc -l`
- `binary_sensor.py` created (82 lines, >= 50 required): FOUND via `wc -l`
- 3 task commits on main: `6e1fe1e` FOUND, `af3b181` FOUND, `044f9fd` FOUND — verified via `git log --oneline --all | grep`
- Metadata commit `b68548e` FOUND (this SUMMARY.md + STATE/ROADMAP/REQUIREMENTS updates)
- Ruff check + format: exit 0 across 21 files
- pytest tests/ -v: 54/54 passing
- Imports resolve cleanly (no circular-import error on `from custom_components.party_dispenser import async_setup_entry; from .websocket import ...; from .binary_sensor import ...; from .coordinator import PartyDispenserData`)
- SUMMARY.md itself: 294 lines at `.planning/phases/03-realtime-push/03-01-SUMMARY.md`

---
*Phase: 03-realtime-push*
*Plan: 03-01*
*Completed: 2026-04-20*
