---
phase: 02-integration-core
plan: 04
subsystem: testing
tags: [homeassistant, pytest, pytest-HA-custom, ci, services, voluptuous, coverage]

# Dependency graph
requires:
  - phase: 02-integration-core
    plan: 01
    provides: "PartyDispenserConfigFlow + OptionsFlowHandler — exercised by test_config_flow.py"
  - phase: 02-integration-core
    plan: 02
    provides: "api.py (PartyDispenserApiClient + 4 exception classes + 4 dataclasses), coordinator.py (PartyDispenserCoordinator + PartyDispenserData + PEP 695 type alias), entity.py (shared DeviceInfo), __init__.py (async_setup hook + async_setup_entry wiring + forward reference to services.py), const.py (all CONF_*/SERVICE_*/ATTR_*/SENSOR_KEY_* symbols), translations/en.json — all exercised by the new test suite"
  - phase: 02-integration-core
    plan: 03
    provides: "sensor.py (5 SensorEntity subclasses) — exercised by test_sensor.py"
provides:
  - "custom_components/party_dispenser/services.py with 3 domain-level services (order_recipe / cancel_order / refresh) registered idempotently via async_setup_services(hass) — resolves 02-02's forward reference"
  - "Python 3.13 floor + [project.optional-dependencies] dev group pinning pytest-homeassistant-custom-component==0.13.316 + ruff==0.15.11"
  - ".gitlab-ci.yml upgraded to python:3.13-slim + pytest job uses `pip install -e .[dev] --config-settings editable_mode=compat`"
  - "tests/conftest.py with autouse enable_custom_integrations fixture + tests/fixtures/recipes.json + queue.json canned data"
  - "5 new test files — test_api.py (5), test_config_flow.py (6), test_coordinator.py (4), test_sensor.py (8), test_services.py (4) = 27 new tests covering every Phase 2 requirement"
  - "Annotated v0.2.0 tag pushed to origin with structured release notes (What's included / Requirements closed / Research overrides / Commits)"
affects: [03-realtime-push, 04-custom-card, 05-ci-mirror-release]

# Tech tracking
tech-stack:
  added: [pytest-homeassistant-custom-component, aioclient_mock, MockConfigEntry, homeassistant (core, via .[dev]), voluptuous (runtime-used for schemas), setuptools editable_mode=compat]
  patterns:
    - "Domain-level services via async_setup_services(hass) called from async_setup — NOT async_setup_entry (Pitfall 3 — prevents double-register on 2nd config entry)"
    - "Service handlers resolve coordinator via hass.config_entries.async_entries(DOMAIN) + entry.runtime_data.coordinator — NOT hass.data[DOMAIN] (Bronze quality-scale)"
    - "has_service(DOMAIN, SERVICE_ORDER_RECIPE) guard on async_setup_services — defensive idempotence"
    - "coordinator.async_request_refresh() AFTER api.* call (not before) — Pitfall 7: refresh reflects post-write state"
    - "HomeAssistantError('Party Dispenser is not configured') when no entries loaded — service call raises visibly rather than silently no-op'ing"
    - "Autouse enable_custom_integrations fixture in conftest.py — removes boilerplate from every test"
    - "setuptools editable_mode=compat — avoids the editable finder-hook × HA _get_custom_components iterdir interaction (FileNotFoundError)"
    - "aioclient_mock.mock_calls tuple indexing: call[0]=method, call[1]=url, call[2]=body/json, call[3]=headers"

key-files:
  created:
    - custom_components/party_dispenser/services.py
    - tests/fixtures/recipes.json
    - tests/fixtures/queue.json
    - tests/test_api.py
    - tests/test_config_flow.py
    - tests/test_coordinator.py
    - tests/test_sensor.py
    - tests/test_services.py
  modified:
    - pyproject.toml
    - .gitlab-ci.yml
    - tests/conftest.py

key-decisions:
  - "Added [tool.setuptools.packages.find] include=custom_components* to pyproject.toml — without it setuptools' auto-discovery fails with 'Multiple top-level packages discovered' (www/ + custom_components/)"
  - "pip install -e .[dev] --config-settings editable_mode=compat in CI — avoids the setuptools editable-finder-hook × HA custom_components.__path__ iterdir() FileNotFoundError"
  - "Ruff's RUF059 fired on `entry, fake_client, fake_coord = ...` when `entry` was never used afterwards — prefixed unused unpacked vars with `_` (e.g., `_entry, fake_client, fake_coord = ...`)"
  - "Ruff's E501 fired on research's long one-line docstrings in test_services.py — shortened docstrings to fit the project's 100-char line-length"
  - "Used `datetime.UTC` alias (Python 3.11+) instead of `datetime.timezone.utc` in test_coordinator.py + test_sensor.py — matches ruff UP017 pattern established in 02-02"

patterns-established:
  - "Pattern: 5 test modules = 1 per source module (api/config_flow/coordinator/sensor/services) — mirrors source layout 1:1; greps `pytest tests/test_<module>.py` map clearly"
  - "Pattern: _mock_coordinator(state) helper + MagicMock with .config_entry.entry_id = 'entry-abc' — lets sensor tests avoid any HA fixture (pure unit tests, no hass required)"
  - "Pattern: _install_fake_entry(hass) helper patches async_setup_entry + injects AsyncMock client + MagicMock coordinator on entry.runtime_data — isolates service-call tests from the real coordinator/api chain"
  - "Pattern: config-flow sad-path tests use aioclient_mock's status=401 / exc=ClientError / json={} to drive each exception path in _validate_connection"
  - "Pattern: FlowResultType.FORM | CREATE_ENTRY | ABORT asserted with `is` not `==` (Pitfall 5; enforced 7 occurrences across 6 test_config_flow.py tests)"

requirements-completed: [INT-03, INT-04, INT-05, QA-01]

# Metrics
duration: 7min
completed: 2026-04-20
---

# Phase 02 Plan 04: Wave-0 CI + services.py + full pytest suite Summary

**Closed Phase 2 by flipping to Python 3.13 / pytest-homeassistant-custom-component 0.13.316, landing services.py with 3 domain-level services (resolving 02-02's forward reference), and creating 5 test files (27 new tests) that bring the Phase-2 suite to 54 tests passing in <0.5s with 82-100% coverage on all core modules — ready to tag v0.2.0.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-20T19:15:25Z
- **Completed:** 2026-04-20T19:23:19Z
- **Tasks:** 3
- **Files created/modified:** 11 (8 created, 3 modified)

## Accomplishments

- Python 3.13 floor + `[project.optional-dependencies] dev` group pinning `pytest-homeassistant-custom-component==0.13.316` (HA 2026.2.3) + `ruff==0.15.11` (research override #1 — Pitfall 1)
- `.gitlab-ci.yml` now uses `python:3.13-slim` + `pip install -e .[dev] --config-settings editable_mode=compat` — the `editable_mode=compat` flag avoids the setuptools-editable-finder-hook × HA `_get_custom_components` iterdir FileNotFoundError
- `custom_components/party_dispenser/services.py` (150 lines) — 3 handlers + 3 voluptuous schemas + `async_setup_services(hass)` with `has_service` idempotence guard. Resolves the forward reference 02-02 left in `__init__.py::async_setup`; full `import custom_components.party_dispenser` now succeeds.
- 5 test files totaling 27 new tests covering every Phase-2 requirement:
  - `test_api.py` (5 tests) — HTTP status mapping: happy / 401 / 500 / ClientError / session_uid wiring
  - `test_config_flow.py` (6 tests) — user step / happy path / invalid_auth / cannot_connect / duplicate abort / options-flow JWT rotation (all with `is FlowResultType.*` per Pitfall 5)
  - `test_coordinator.py` (4 tests) — `_async_update_data` success / `ConfigEntryAuthFailed` / `UpdateFailed` / queue-head → current_order
  - `test_sensor.py` (8 tests) — each sensor's native_value + extra_state_attributes + INT-01 DeviceInfo stability across all 5 sensors
  - `test_services.py` (4 tests) — order_recipe + cancel_order + refresh + `HomeAssistantError('not configured')` when no entries
- Full suite: **54 tests pass in 0.4s locally** (27 Phase 1 + 27 new Phase 2)
- Coverage on core modules (per-module targets all met): **config_flow 82% · api 86% · coordinator 100% · services 82% · overall 89%**
- Annotated `v0.2.0` tag pushed to `origin` with structured release notes enumerating all 8 Phase-2 commits (42a7c01 → c15b803), requirements closed (CFG-01/02/03, INT-01/02/03/04/05, QA-01), and research overrides applied

## Task Commits

Each task committed atomically against `/Users/jamaze/projects/hacs-integration-pd` HEAD:

1. **Task 1: Wave-0 CI scaffolding** — `3f5c319` (chore)
   — pyproject.toml bumped to 3.13 + [dev] group + setuptools.packages.find include=custom_components*, .gitlab-ci.yml upgraded to 3.13-slim + .[dev], tests/conftest.py with autouse enable_custom_integrations, tests/fixtures/recipes.json + queue.json
2. **Task 2: services.py** — `7f5e9b0` (feat)
   — services.py (150 lines): 3 handlers + 3 schemas + async_setup_services with has_service guard. Resolves 02-02's forward reference.
3. **Task 3: Full pytest suite + editable_mode=compat** — `c15b803` (test)
   — 5 test files (27 new tests) + .gitlab-ci.yml editable_mode=compat tweak (Rule 3 - Blocking fix)

**Tag:** `v0.2.0` (annotated) — commit `c15b803`, pushed to `origin` (ref: `refs/tags/v0.2.0`).

**Plan metadata commit:** (follow-up with SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md updates)

## Files Created/Modified

### Created
- `custom_components/party_dispenser/services.py` — 150 lines: 3 service handlers (_async_handle_order_recipe, _async_handle_cancel_order, _async_handle_refresh) + 3 voluptuous schemas (ORDER_RECIPE_SCHEMA, CANCEL_ORDER_SCHEMA, REFRESH_SCHEMA) + async_setup_services(hass) @callback helper + private helpers (_all_runtime_data, _first_runtime_data_or_raise)
- `tests/fixtures/recipes.json` — 3 recipes (Margarita makeable=true, Mojito makeable=false, Gin & Tonic makeable=true with null description/created_at)
- `tests/fixtures/queue.json` — 1 QUEUED order (Margarita, home-assistant session_uid)
- `tests/test_api.py` — 5 unit tests for PartyDispenserApiClient
- `tests/test_config_flow.py` — 6 integration tests for PartyDispenserConfigFlow + OptionsFlowHandler
- `tests/test_coordinator.py` — 4 unit tests for PartyDispenserCoordinator._async_update_data state machine + error mapping
- `tests/test_sensor.py` — 8 unit tests for 5 sensors + INT-01 device stability
- `tests/test_services.py` — 4 integration tests for 3 services + no-entries-raises contract

### Modified
- `pyproject.toml` — requires-python bumped `>=3.12 → >=3.13`, version `0.1.0 → 0.2.0`, target-version `py312 → py313`, added [project.optional-dependencies] dev group, added [tool.setuptools.packages.find] with include=custom_components*
- `.gitlab-ci.yml` — default image `python:3.12-slim → python:3.13-slim`, pytest job install changed from bare `pip install pytest` to `pip install --quiet -e ".[dev]" --config-settings editable_mode=compat`, updated comment block
- `tests/conftest.py` — replaced Phase 1 stub with autouse `auto_enable_custom_integrations` fixture wiring pytest-HA-custom's `enable_custom_integrations` + kept the sys.path tweak

## Decisions Made

- **Added `[tool.setuptools.packages.find] include=["custom_components*"]`** — setuptools' flat-layout auto-discovery fails with "Multiple top-level packages discovered" when both `www/` (Phase 4 card workspace) and `custom_components/` exist at the repo root. Explicit `include` scope resolves this cleanly without forcing a src-layout migration. Recorded to 02-02's decision list for future Phase 4 planners (who will manage `www/` as a Node workspace independent of the Python install).
- **Added `--config-settings editable_mode=compat` to the CI pytest job + local install command** — the default PEP 660 "lax" editable mode registers a `__editable__.party_dispenser-0.2.0.finder.__path_hook__` entry in `custom_components.__path__`, which HA's `_get_custom_components` iterates and then `iterdir()`s — the finder-hook path isn't a real directory, triggering `FileNotFoundError` on EVERY test that uses the `hass` fixture. `compat` mode uses a classic `.pth` file to extend sys.path, bypassing the finder-hook. This is the canonical fix and is stable across setuptools 70+ (we're on the current release). Documented with a 3-line comment above the `pip install` in `.gitlab-ci.yml` so future CI maintainers understand why the flag is load-bearing.
- **Ruff RUF059 fix: prefixed unused unpacked tuple variables with `_`** — research code in test_services.py used `entry, fake_client, fake_coord = await _install_fake_entry(hass)` but `entry` was never referenced afterwards in 3 of the 4 tests (and `fake_client` was unused in 1). Ruff's RUF059 flags this. Applied the canonical fix: `_entry, fake_client, fake_coord = ...` (and `_entry, _fake_client, fake_coord = ...` for the refresh test). Behavior identical, ruff green.
- **Ruff E501 fix: shortened long one-line docstrings in test_services.py** — research-code docstrings were 101-106 chars; project's ruff `line-length = 100` flagged them. Replaced with semantically equivalent shorter descriptions.
- **Used `datetime.UTC` (alias since Python 3.11) instead of `datetime.timezone.utc`** in test_coordinator.py and test_sensor.py — research code used the older form; ruff UP017 would fire. Matches the 02-02 pattern established in coordinator.py.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] setuptools multi-top-level-package auto-discovery fails in editable install**
- **Found during:** Task 1 (first `pip install -e .[dev]` attempt)
- **Issue:** Running `pip install -e ".[dev]"` on the repo failed with `error: Multiple top-level packages discovered in a flat-layout: ['www', 'custom_components']` because setuptools' flat-layout auto-discovery refuses to guess which top-level directory is THE package. Plan assumed editable install would "just work" — research didn't surface this because the research was written before `www/` existed as a top-level sibling of `custom_components/`.
- **Fix:** Added `[tool.setuptools.packages.find]` section with `where = ["."]` and `include = ["custom_components*"]` to pyproject.toml. Explicitly restricts editable-install discovery to the integration package; `www/` stays out of the Python package index (it's managed as a Node workspace in Phase 4).
- **Files modified:** pyproject.toml
- **Verification:** `pip install -e ".[dev]"` succeeds; `pip show party_dispenser` reports the editable install; full pytest suite runs.
- **Committed in:** 3f5c319 (Task 1 commit)

**2. [Rule 3 - Blocking] setuptools editable finder-hook × HA custom_components iterdir → FileNotFoundError**
- **Found during:** Task 3 (first pytest run of test_config_flow.py)
- **Issue:** Every test using the `hass` fixture from pytest-HA-custom failed with `FileNotFoundError: [Errno 2] No such file or directory: '__editable__.party_dispenser-0.2.0.finder.__path_hook__'`. Root cause: modern setuptools (PEP 660 editable install) registers a finder-hook path entry in `custom_components.__path__`. HA's `_get_custom_components` then iterates `custom_components.__path__` and calls `pathlib.Path(entry).iterdir()` on each — the finder-hook path isn't a real directory, triggering FileNotFoundError.
- **Fix:** `pip install -e ".[dev]" --config-settings editable_mode=compat` — forces setuptools to use the classic `.pth` file editable mode instead of the PEP 660 finder hook. No code change needed; just a pip config flag. Also baked into `.gitlab-ci.yml` with a 3-line comment explaining why.
- **Files modified:** .gitlab-ci.yml
- **Verification:** All 6 test_config_flow.py tests went from 6 failed → 6 passed; full 54-test suite now passes in 0.4s.
- **Committed in:** c15b803 (Task 3 commit — bundled with test files since this is the CI-side enablement for those tests)

**3. [Rule 1 - Bug] Research-copy-ready test_services.py triggered 6 ruff findings (E501 x 2, RUF059 x 4)**
- **Found during:** Task 3 (first `ruff check` on test_services.py)
- **Issue:** Research docstrings were 101-106 chars (project line-length=100 → E501 x 2). Research's `entry, fake_client, fake_coord = ...` unpacking never used `entry` in 3 tests (and `fake_client` unused in 1) → RUF059 x 4.
- **Fix:** Shortened 2 docstrings to ≤100 chars; prefixed unused unpacked vars with `_` (e.g., `_entry, fake_client, fake_coord = ...`). Same class as 02-02/02-03 latent-ruff-findings-in-research pattern.
- **Files modified:** tests/test_services.py
- **Verification:** `ruff check .` → "All checks passed!"; 4/4 test_services.py tests pass.
- **Committed in:** c15b803 (Task 3 commit)

---

**Total deviations:** 3 auto-fixed (1 Rule 1 - Bug, 2 Rule 3 - Blocking)
**Impact on plan:** All auto-fixes were mandatory for correctness (ruff/CI compliance) and ability to execute (editable install + pytest fixture resolution). No scope creep. Both Rule 3 blockers are classic ecosystem interactions (setuptools multi-top-level + editable-finder-hook × HA) that the plan's research didn't anticipate — documented here for future Phase planners.

## Issues Encountered

- **Host Python is 3.14.3, not 3.13.** Plan assumed Python 3.13; host machine's `/opt/homebrew/opt/python@3.14/bin/python3.14` is 3.14.3. The `.venv/` created by 02-02 uses this 3.14 interpreter. `pytest-homeassistant-custom-component==0.13.316` actually runs fine on 3.14 — the `requires-python = ">=3.13"` in pyproject.toml is a FLOOR not a pin, and HA 2026.2.3 accepts 3.14 (HA pins `>=3.13.2`). All 54 tests pass locally on 3.14. CI will run on `python:3.13-slim` per `.gitlab-ci.yml` which the pyproject.toml floor accepts. No action needed.
- **54 tests, not 53 as plan's Task 3 narrative estimated.** The plan's Task 3 narrative (lines 661-664) projected "5 + 6 + 4 + 8 + 4 + 16 + 10 = 53 tests (Phase 2 exit number)". Actual total is 54 because `test_import.py` has 3 tests (not the 2 the "10 other Phase 1 tests" line-item counted). Math: test_api 5 + test_config_flow 6 + test_coordinator 4 + test_sensor 8 + test_services 4 + test_integration_manifest 16 + test_hacs_manifest 4 + test_info_md 4 + test_import 3 = **54**. The objective block in the spawn prompt said "≥ 51 tests passing"; 54 satisfies that.
- **`aioclient_mock.mock_calls` indexing worked exactly as documented in research** — `call[0]=method, call[1]=url, call[2]=body/json, call[3]=headers`. No adaptation needed. All 5 test_api.py tests and 5 test_config_flow.py tests passed first-try with the research-code indexing.
- **`is FlowResultType.*` vs `==` (Pitfall 5) — enforced consistently** — 7 occurrences across the 6 test_config_flow.py tests (ABORT path uses it twice: once for type, once for reason). No `== FlowResultType.*` anywhere; ruff-clean.
- **No `PytestConfigWarning: Unknown config option: asyncio_mode`** in the final suite — the pytest-HA-custom plugin (now installed) registers pytest-asyncio which DOES know the `asyncio_mode = "auto"` option. Warning from 02-02/02-03 era (no pytest-asyncio installed) is resolved.

## User Setup Required

None — no external service configuration required. HA dev dependencies are installed automatically by CI via `pip install -e ".[dev]" --config-settings editable_mode=compat`. Local runs use `.venv/` at repo root (already in `.gitignore` from 02-02).

## Next Phase Readiness

**Phase 2 is COMPLETE.** All 4 plans landed, `v0.2.0` tag pushed, CI green locally (remote pipeline will be verified by `/gsd:verify-work`).

**Phase 3 (Realtime push) is unblocked:**
- Will reuse this plan's api.py exception classes (`PartyDispenserConnectionError`) for the WebSocket reconnect/backoff branch
- Will add `binary_sensor.py` alongside sensor.py and a 2nd platform to `PLATFORMS` in `__init__.py`
- Will rely on `entry.runtime_data.coordinator.async_set_updated_data(...)` from WS push events — coordinator shape (`PartyDispenserState`) is final for this purpose
- Test harness is in place: new WS tests can live in `tests/test_websocket.py` following the `test_coordinator.py` pattern (AsyncMock client + MockConfigEntry)

**Phase 4 (Custom Lovelace card) is unblocked on the integration side:**
- `sensor.*.extra_state_attributes` carry the recipe list + queue in LIGHT form (no ingredients — Open Question 2 resolution from 02-03); the card will subscribe to coordinator state for full detail
- 3 services (`order_recipe`, `cancel_order`, `refresh`) are callable from the card via HA's websocket `call_service` API
- `translations/en.json` already has `services.*.fields.*.name` + `.description` for Developer Tools → Services UI rendering

**Phase 5 (CI + GitHub mirror + release):**
- `.gitlab-ci.yml` is now 2-stage (lint + test) on `python:3.13-slim` with `.[dev]` install. Phase 5 will add the GitHub mirror job + HACS action (against mirror). No changes needed to existing stages.
- Real hassfest remains deferred to Phase 5 + GitHub Actions (DinD constraint on Kubernetes runner hasn't changed).

**Notes to downstream planners:**
- **Local dev:** Host Python is 3.14; use `.venv/bin/pytest`, `.venv/bin/ruff`. Created via `python3.14 -m venv .venv && .venv/bin/pip install -e ".[dev]" --config-settings editable_mode=compat`.
- **Ruff rules to watch:** Every new test or source file should pass `ruff check .` clean. Research code has a track record of E501 (line-length=100) and RUF059 (unused unpacked vars) findings. Run ruff before committing.
- **HA version pin:** We pin HA transitively via `pytest-homeassistant-custom-component==0.13.316` which pins `homeassistant==2026.2.3`. To bump HA, bump the pytest-HA-custom version (check its CHANGELOG for the HA version it pins). Phase 5 may want to add `quality_scale: "bronze"` to manifest.json — we already conform to the Bronze rules (runtime_data, strict ConfigEntry typing, typed exceptions).
- **v0.2.0 tag shape:** Annotated tag with ~90-line structured release message (sections: What's included / Requirements closed / Research overrides / Deferred / Commits). Future tags (v0.3.0, etc.) should follow this format — `/gsd:verify-work` will consume tag messages as release notes for HACS install-from-tag flow.

---

## Self-Check: PASSED

- **Files exist:**
  - `custom_components/party_dispenser/services.py` — present (150 lines)
  - `tests/fixtures/recipes.json` — present, valid JSON, 3 recipes, makeable:false coverage
  - `tests/fixtures/queue.json` — present, valid JSON, 1 QUEUED order
  - `tests/test_api.py` — present, 5 tests
  - `tests/test_config_flow.py` — present, 6 tests
  - `tests/test_coordinator.py` — present, 4 tests
  - `tests/test_sensor.py` — present, 8 tests
  - `tests/test_services.py` — present, 4 tests
- **Commits resolve:** `3f5c319` (Task 1), `7f5e9b0` (Task 2), `c15b803` (Task 3) — all present in `git log --oneline`
- **Tag exists:** `v0.2.0` annotated, points at `c15b803`, pushed to origin (`[new tag] v0.2.0 -> v0.2.0`)
- **Ruff green:** `ruff format --check .` → "19 files already formatted"; `ruff check .` → "All checks passed!"
- **Tests green:** `pytest tests/ -v` → 54 passed in 0.4s (27 Phase 1 + 27 Phase 2)
- **Coverage:** `pytest --cov=custom_components.party_dispenser` → 89% overall; config_flow 82%, api 86%, coordinator 100%, services 82% — all meet ≥80% target
- **Grep acceptance (Task 1):** requires-python ">=3.13" ✓, target-version "py313" ✓, version "0.2.0" ✓, pytest-HA pin ✓, optional-deps section ✓, image "python:3.13-slim" ✓, pip install [dev] ✓, no "3.12-slim" refs ✓, conftest autouse ✓, enable_custom_integrations ✓, recipes.json valid+makeable:false ✓, queue.json valid ✓
- **Grep acceptance (Task 2):** 3 handlers ✓, 3 schemas ✓, async_setup_services ✓, @callback ✓, has_service guard ✓, async_request_refresh ✓, not-configured raise ✓, hass.config_entries.async_entries(DOMAIN) ✓
- **Grep acceptance (Task 3):** 5 async test_ in test_api, 6 in test_config_flow, 4 in test_coordinator, 8 def test_ in test_sensor, 4 async test_ in test_services, `is FlowResultType.*` 7 occurrences (ABORT path uses it twice), MockConfigEntry imported, ConfigEntryAuthFailed + UpdateFailed raised, all 5 test function names from validation doc present ✓

---
*Phase: 02-integration-core*
*Completed: 2026-04-20*
