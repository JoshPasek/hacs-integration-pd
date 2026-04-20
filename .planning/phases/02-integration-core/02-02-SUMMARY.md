---
phase: 02-integration-core
plan: 02
subsystem: api
tags: [homeassistant, aiohttp, dataclasses, dataupdatecoordinator, config_flow, runtime_data]

# Dependency graph
requires:
  - phase: 01-foundation-hacs-scaffolding
    provides: "Phase 1 skeleton: manifest.json (config_flow: false), const.py stub, __init__.py no-op, strings.json stub, bespoke tests/test_integration_manifest.py"
provides:
  - "Manifest flipped to config_flow:true + version:0.2.0"
  - "const.py extended with every symbol downstream plans need (CONF_*, DEFAULT_*, SERVICE_*, ATTR_*, SENSOR_KEY_*, VERSION, MODEL, ATTRIBUTION)"
  - "translations/en.json (canonical 2026 HA translations) replacing Phase 1's strings.json"
  - "api.py: PartyDispenserApiClient + 4-class exception hierarchy + 4 frozen+slots dataclasses (Recipe, RecipeIngredient, QueueItem, OrderResult) with from_dict constructors"
  - "coordinator.py: PartyDispenserCoordinator (DataUpdateCoordinator subclass), PartyDispenserState + PartyDispenserData dataclasses, PEP 695 type alias PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]"
  - "entity.py: PartyDispenserEntity (CoordinatorEntity subclass) with shared DeviceInfo keyed on (DOMAIN, entry_id)"
  - "__init__.py extended: async_setup (domain-level services hook) + async_setup_entry (coordinator + runtime_data + platform forward + reload listener) + async_unload_entry"
  - "test_integration_manifest.py::test_manifest_phase2_overrides asserts new values (config_flow is True, version == '0.2.0')"
  - "tests/test_import.py reworked for Phase 2's runtime HA imports (AST parse + importlib-isolated const check)"
affects: [02-01-config-flow, 02-03-sensors, 02-04-services-and-tests]

# Tech tracking
tech-stack:
  added: [aiohttp, async_timeout, homeassistant (runtime imports), importlib.util (test isolation)]
  patterns:
    - "entry.runtime_data = PartyDispenserData(client, coordinator) — Bronze quality-scale rule; NO hass.data[DOMAIN]"
    - "Domain-level services via async_setup(hass, config) — registered once per HA lifetime, not per-entry"
    - "type PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData] — PEP 695 type alias anchors typing across modules"
    - "Injected aiohttp session (never instantiate own) — aioclient_mock compatibility"
    - "Frozen+slots dataclasses with from_dict classmethods at the API boundary — explicit TypeError on malformed payloads"
    - "PartyDispenserAuthError → ConfigEntryAuthFailed; other PartyDispenserError → UpdateFailed (canonical HA coordinator error mapping)"
    - "translations/en.json as sole translation source (drop strings.json; matches ludeeus blueprint + 2026 core integrations)"

key-files:
  created:
    - custom_components/party_dispenser/api.py
    - custom_components/party_dispenser/coordinator.py
    - custom_components/party_dispenser/entity.py
    - custom_components/party_dispenser/translations/en.json
  modified:
    - custom_components/party_dispenser/const.py
    - custom_components/party_dispenser/manifest.json
    - custom_components/party_dispenser/__init__.py
    - tests/test_integration_manifest.py
    - tests/test_import.py
    - .gitignore

key-decisions:
  - "Adopted asyncio.TimeoutError → TimeoutError swap (ruff UP041; aliased since Python 3.11) — future-proof and ruff-clean"
  - "Adopted datetime.timezone.utc → datetime.UTC alias (ruff UP017; Python 3.11+) in coordinator.py"
  - "Rewrote tests/test_import.py to AST-parse __init__.py + use importlib.util.spec_from_file_location for const.py — Phase 2's runtime HA imports broke Phase 1's 'import without HA' smoke test"
  - "Added .venv/ + venv/ to .gitignore — PEP 668 externally-managed Python requires venvs for local ruff/pytest runs"

patterns-established:
  - "Pattern: API boundary dataclasses — frozen=True + slots=True + from_dict classmethod = explicit failure at deserialization, minimal memory"
  - "Pattern: Forward references between modules within a plan (__init__.py imports services.py created by a later plan) — atomic commit discipline keeps main branch green because CI doesn't import the top-level package yet"
  - "Pattern: CI-stage-independent const tests — use importlib.util.spec_from_file_location('name', path) + spec.loader.exec_module(module) to load a single file bypassing package __init__.py"

requirements-completed: [QA-01]

# Metrics
duration: 7min
completed: 2026-04-20
---

# Phase 02 Plan 02: API, coordinator, entity, runtime_data scaffolding Summary

**Foundation scaffolding for Phase 2: flipped manifest to config_flow:true/v0.2.0, extended const.py with every downstream symbol, swapped strings.json for canonical translations/en.json, and created the 3 core modules (PartyDispenserApiClient REST client with typed dataclasses + DataUpdateCoordinator + CoordinatorEntity base) wired together via entry.runtime_data in async_setup_entry.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-20T18:45:14Z
- **Completed:** 2026-04-20T18:52:30Z
- **Tasks:** 3
- **Files modified/created:** 10 (4 created, 5 modified, 1 deleted)

## Accomplishments
- Phase 2 manifest scaffolding lands atomically in ONE commit (manifest flip + test update + strings.json deletion + translations/en.json creation), avoiding the CI-red intermediate state the plan warned about
- `PartyDispenserApiClient` implemented with deterministic HTTP status → typed exception mapping (401/403 → PartyDispenserAuthError, 4xx/5xx/malformed-JSON → PartyDispenserProtocolError, network → PartyDispenserConnectionError)
- DataUpdateCoordinator fetches /recipes + /queue concurrently via asyncio.gather and maps auth errors to ConfigEntryAuthFailed (HA re-auth flow) and other errors to UpdateFailed (entity unavailable)
- `entry.runtime_data = PartyDispenserData(...)` pattern replaces legacy `hass.data[DOMAIN]` — Bronze quality-scale compliant
- Domain-level services hook (`async_setup` calls `async_setup_services(hass)`) is a forward reference to services.py (02-04 Task 2); documented in the plan and in this summary
- `PartyDispenserEntity` base class with `_attr_has_entity_name = True` + shared DeviceInfo keyed on `(DOMAIN, entry_id)` — one device registry entry per config entry
- PEP 695 `type PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]` alias anchors typing across coordinator/entity/init

## Task Commits

Each task was committed atomically:

1. **Task 1: Wave-0 scaffolding** — `42a7c01` (feat)
   — manifest flip + const.py extension + translations/en.json creation + strings.json deletion + manifest test rename/reassertion + .gitignore venv entry
2. **Task 2: api.py creation** — `bd2f357` (feat)
   — 4 exception classes + 4 frozen+slots dataclasses + PartyDispenserApiClient with 4 async methods
3. **Task 3: coordinator + entity + __init__ extension** — `6d0f162` (feat)
   — PartyDispenserCoordinator + PartyDispenserState + PartyDispenserData + type alias + PartyDispenserEntity + __init__.py with async_setup/setup_entry/unload_entry/reload_listener + test_import.py rework

**Plan metadata commit:** (follow-up commit with SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md updates)

## Files Created/Modified

### Created
- `custom_components/party_dispenser/api.py` — REST client + exception hierarchy + 4 dataclasses
- `custom_components/party_dispenser/coordinator.py` — DataUpdateCoordinator + runtime_data types + PEP 695 type alias
- `custom_components/party_dispenser/entity.py` — Base CoordinatorEntity with shared DeviceInfo
- `custom_components/party_dispenser/translations/en.json` — Canonical user-facing strings (config, options, services, entity namespaces)

### Modified
- `custom_components/party_dispenser/const.py` — Extended from 10 lines → ~45 lines (CONF_*, DEFAULT_*, SERVICE_*, ATTR_*, SENSOR_KEY_*, VERSION bumped to 0.2.0, added MODEL + ATTRIBUTION)
- `custom_components/party_dispenser/manifest.json` — Two field changes: config_flow false→true, version 0.1.0→0.2.0
- `custom_components/party_dispenser/__init__.py` — Extended from 24-line no-op stub → ~80 lines (async_setup + async_setup_entry with full coordinator wiring + async_unload_entry + private _async_reload_entry)
- `tests/test_integration_manifest.py` — Renamed test_manifest_phase1_overrides → test_manifest_phase2_overrides; assertions flipped to config_flow is True + version == '0.2.0'
- `tests/test_import.py` — Reworked to handle Phase 2's runtime HA imports (AST parse + importlib-isolated const load)
- `.gitignore` — Added .venv/ and venv/ entries

### Deleted
- `custom_components/party_dispenser/strings.json` — Superseded by translations/en.json (canonical 2026 pattern; ludeeus blueprint + Shelly + Nut don't ship strings.json)

## Decisions Made

- **Swap `asyncio.TimeoutError` → builtin `TimeoutError`** in api.py: ruff UP041 flagged the research code. They are aliased (same class) since Python 3.11, so there's no behavioral change — just ruff-compliant. Also dropped the now-unused `import asyncio` from api.py. (`TimeoutError` in the api.py body still catches every timeout path.)
- **Swap `datetime.timezone.utc` → `datetime.UTC`** in coordinator.py: ruff UP017 flagged the research code. `UTC` is an alias added in Python 3.11 — shorter, canonical, ruff-clean.
- **Drop unused `LOGGER` import from api.py** and **unused `DOMAIN, LOGGER` from __init__.py**: ruff F401. These are expected to be re-added when debug logging is wired up in later plans.
- **Rewrite tests/test_import.py** from `import custom_components.party_dispenser` to AST parse + importlib-isolated const check: Phase 2's runtime HA imports (`from homeassistant.const import Platform` etc.) break Phase 1's "import without HA" smoke test. Without this rework, CI stage 1 (lint + pytest without HA installed) would fail on every Phase 2 commit. When 02-04 adds `pip install -e ".[dev]"` to CI, a full-runtime integration import test can live alongside the new config_flow/coordinator test suites.
- **Add `.venv/` + `venv/` to `.gitignore`**: Host machine is PEP 668 externally-managed Python. Local ruff/pytest require a venv. Added pre-emptively so it can't leak into git by mistake.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Research copy-ready code would fail ruff lint on 3 rules (UP041, UP017, F401)**
- **Found during:** Task 2 (api.py), Task 3 (coordinator.py, __init__.py)
- **Issue:** 02-RESEARCH.md's code used `asyncio.TimeoutError` (UP041), `datetime.timezone.utc` (UP017), imported but never used `LOGGER` in api.py and `DOMAIN, LOGGER` in __init__.py (F401). All are real ruff findings — the research code was pasted without running ruff against it.
- **Fix:** Replaced `asyncio.TimeoutError` → `TimeoutError`; `timezone.utc` → `UTC`; removed unused imports (`asyncio`, `LOGGER`, `DOMAIN`).
- **Files modified:** custom_components/party_dispenser/api.py, custom_components/party_dispenser/coordinator.py, custom_components/party_dispenser/__init__.py
- **Verification:** `ruff format --check . && ruff check .` → green
- **Committed in:** bd2f357 (Task 2), 6d0f162 (Task 3)

**2. [Rule 3 - Blocking] Phase 1's tests/test_import.py was incompatible with Phase 2 __init__.py**
- **Found during:** Task 3 (__init__.py extension)
- **Issue:** Phase 1's test_import.py did `import custom_components.party_dispenser` and asserted `const.VERSION == "0.1.0"`. Phase 2 __init__.py imports homeassistant at runtime (required for the real coordinator + platform wiring) — so without HA installed (current CI stage 1), the import fails. Additionally VERSION now = "0.2.0". Without this fix, every Phase 2 commit would redden CI.
- **Fix:** Rewrote test_import.py to (a) AST-parse __init__.py for syntax + surface (`test_integration_package_parses`, `test_integration_public_surface`), (b) load const.py via `importlib.util.spec_from_file_location` (bypasses package __init__.py), and (c) assert VERSION == "0.2.0". Added `test_integration_public_surface` to verify async_setup / async_setup_entry / async_unload_entry are all declared.
- **Files modified:** tests/test_import.py
- **Verification:** `pytest tests/test_import.py -v` → 3/3 pass; full suite → 27/27 pass.
- **Committed in:** 6d0f162 (Task 3)

**3. [Rule 3 - Blocking] Host machine has no ruff / pytest available (PEP 668 externally-managed Python)**
- **Found during:** Task 1 (initial ruff invocation)
- **Issue:** Plan's every task requires `ruff format . && ruff check .` before commit. Host `python3` is homebrew's Python 3.14 — PEP 668 refuses `pip install --user ruff==0.15.11`. Without a venv, plan cannot be executed.
- **Fix:** Created `.venv` in project root; `pip install ruff==0.15.11 pytest aiohttp async_timeout`. Added `.venv/` + `venv/` to `.gitignore` so the local toolchain never leaks into git.
- **Files modified:** .gitignore (pre-emptive); venv itself is untracked
- **Verification:** `.venv/bin/ruff --version` → 0.15.11; `.venv/bin/pytest --version` → 9.0.3; both run successfully.
- **Committed in:** 42a7c01 (the .gitignore entry; venv itself stays local)

---

**Total deviations:** 3 auto-fixed (1 Rule 1 - Bug, 2 Rule 3 - Blocking)
**Impact on plan:** All auto-fixes were necessary for correctness (ruff compliance matches CI's enforcement) and ability to execute (test_import compatibility, local toolchain). No scope creep. The manifest test already had its Phase-2 renaming prescribed in the plan; `test_import.py` needed the same treatment but was omitted from the plan's file list — this summary documents the gap for 02-03 / 02-04 planners.

## Issues Encountered

- **Plan's `<verify>` step for Task 3 cannot succeed as written.** The plan asks for `python -c "from custom_components.party_dispenser import coordinator, entity, api, const"`. This statement fails with `ModuleNotFoundError: No module named 'homeassistant'` because importing any submodule of a Python package executes that package's `__init__.py` first — and __init__.py now imports homeassistant at runtime (plus the forward reference to services.py). The plan itself acknowledges this in the Task 3 body. The ACTUAL verification used was: (a) ruff format + ruff check green, (b) AST parse of __init__.py succeeds, (c) pytest tests/ -v → 27/27 pass (the AST-based test_integration_public_surface + importlib-based test_const_exports together cover the same invariants). When 02-04 adds HA to CI via `pip install -e ".[dev]"`, a full-runtime import will become possible. Flagging this for 02-03 / 02-04 planners so they don't re-prescribe the same impossible verify step.

- **Forward reference `from .services import async_setup_services` in __init__.py** will fail at runtime until 02-04 Task 2 creates `custom_components/party_dispenser/services.py`. This is deliberate and documented in the plan. CI stage 1 (lint + pytest without HA) is unaffected because neither ruff nor the AST-based tests trigger the package-level import. CI stage 2 (once 02-04 lands with HA installed) will execute the real import — by then services.py will exist.

## User Setup Required

None - no external service configuration required. All toolchain deps (ruff, pytest, aiohttp, async_timeout) are standard Python packages installed in CI via `pip install -e ".[dev]"` (02-04) or directly (current CI stage 1 uses bare `pip install ruff==0.15.11 pytest`).

## Next Phase Readiness

**Plan 02-01 (config flow) is unblocked.** Ready for parallel wave-2 execution:
- Import contract from this plan: `from .api import PartyDispenserApiClient, PartyDispenserAuthError, PartyDispenserConnectionError, PartyDispenserError, PartyDispenserProtocolError`
- Import contract: `from .const import CONF_HOST, CONF_JWT, CONF_PORT, CONF_SCAN_INTERVAL, CONF_USE_TLS, DEFAULT_PORT, DEFAULT_SCAN_INTERVAL, DOMAIN, LOGGER, MAX_SCAN_INTERVAL, MIN_SCAN_INTERVAL`
- 02-01 creates config_flow.py; the OptionsFlowHandler class it defines honors the 2025.12+ pattern (no `self.config_entry = ...` in `__init__`)

**Plan 02-03 (sensors) is unblocked.**
- Import contract: `from .coordinator import PartyDispenserCoordinator` (for type param), `from .entity import PartyDispenserEntity` (base class), `from .const import SENSOR_KEY_QUEUE_SIZE, SENSOR_KEY_QUEUE_SUMMARY, SENSOR_KEY_MAKEABLE_COUNT, SENSOR_KEY_CURRENT_ORDER, SENSOR_KEY_RECIPES`
- entity.py's base sets DeviceInfo once; sensors only need `entity_description` + `native_value` + `_attr_translation_key`

**Plan 02-04 (services + tests) is unblocked and will RESOLVE the forward reference.**
- Must create `custom_components/party_dispenser/services.py` exporting `async_setup_services(hass)` — imported from `__init__.py::async_setup` NOW. Once it lands, `import custom_components.party_dispenser` will succeed.
- Import contract: `from .api import PartyDispenserApiClient, PartyDispenserError` (re-imported), `from .const import ATTR_ORDER_ID, ATTR_RECIPE_ID, ATTR_SESSION_UID, DEFAULT_SESSION_UID, DOMAIN, SERVICE_CANCEL_ORDER, SERVICE_ORDER_RECIPE, SERVICE_REFRESH`
- Services look up coordinator via `entry.runtime_data.coordinator` (per runtime_data pattern) — NOT via `hass.data[DOMAIN]`
- 02-04 adds `[project.optional-dependencies] dev = ["pytest-homeassistant-custom-component==0.13.316", ...]` to pyproject.toml and bumps `requires-python = ">=3.13"` + CI to `python:3.13-slim` — that's when the runtime-HA test stage comes online.

**Notes to downstream planners:**
- CI stage 1 (current) still runs on Python 3.12-slim and does NOT install HA; it runs ruff + pytest (27 tests as of this commit). 02-04 will bump the image + install HA — test count will grow from 27 to ~40+ then.
- Use `.venv/bin/ruff` + `.venv/bin/pytest` locally (host is PEP 668 protected).
- The tests/test_import.py rewrite demonstrates the importlib-isolation pattern for ANY future test that wants to check a single non-HA-dependent module without running the package __init__.py.

---

## Self-Check: PASSED

- All 11 claimed files exist (7 integration-package, 2 tests, 1 .gitignore, 1 SUMMARY)
- Deleted file `custom_components/party_dispenser/strings.json` confirmed absent
- All 3 task commit hashes resolve (42a7c01, bd2f357, 6d0f162)
- ruff format + ruff check → green
- pytest tests/ -v → 27/27 pass

---
*Phase: 02-integration-core*
*Completed: 2026-04-20*
