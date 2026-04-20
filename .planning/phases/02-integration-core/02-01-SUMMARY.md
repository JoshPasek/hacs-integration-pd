---
phase: 02-integration-core
plan: 01
subsystem: config_flow
tags: [homeassistant, config_flow, options_flow, voluptuous, selector, runtime_data]

# Dependency graph
requires:
  - phase: 02-integration-core
    plan: 02
    provides: "api.py (PartyDispenserApiClient + 4 exception classes), const.py (CONF_HOST/CONF_PORT/CONF_JWT/CONF_USE_TLS/CONF_SCAN_INTERVAL + DEFAULT_PORT/DEFAULT_SCAN_INTERVAL/MIN_SCAN_INTERVAL/MAX_SCAN_INTERVAL + DOMAIN/LOGGER), translations/en.json (config + options step strings), manifest.json with config_flow:true"
provides:
  - "custom_components/party_dispenser/config_flow.py with PartyDispenserConfigFlow (ConfigFlow subclass, domain=DOMAIN) + OptionsFlowHandler (OptionsFlow subclass, 2025.12+ pattern)"
  - "Complete UI-driven onboarding: async_step_user collects host/port/JWT/TLS/scan_interval, validates GET /recipes before save, maps typed API exceptions to form errors (invalid_auth / cannot_connect / invalid_response / unknown)"
  - "JWT rotation + TLS toggle + scan_interval editing via OptionsFlowHandler.async_step_init without re-adding the integration"
  - "Unique ID f\"{host}:{port}\" via async_set_unique_id + _abort_if_unique_id_configured — prevents duplicate dispenser entries"
  - "TextSelector(type=PASSWORD) masks JWT input in BOTH user step and options step (2 occurrences)"
affects: [02-04-services-and-tests]

# Tech tracking
tech-stack:
  added: [voluptuous (already present via HA), selector (HA helper — previously unused in this project)]
  patterns:
    - "OptionsFlowHandler has NO __init__ method — parent OptionsFlow provides self.config_entry (2025.12+ hard requirement; setting it manually is a ValueError in HA 2026.2.3)"
    - "async_get_options_flow @staticmethod @callback returns OptionsFlowHandler() with NO args — config_entry not passed through (2025.12+ pattern)"
    - "Connectivity probe via PartyDispenserApiClient(...).list_recipes() BEFORE async_create_entry — catches typed exceptions and maps to form errors so users see actionable feedback instead of a broken entry"
    - "Options flow mutates entry.data for jwt+use_tls (via hass.config_entries.async_update_entry) AND stores scan_interval in entry.options — data keeps what's needed at setup time, options keeps what can change at runtime"
    - "vol.UNDEFINED seed default preserves voluptuous's 'no prior value' behavior on initial form render (vs defaults.get returning empty string which would pre-fill fields misleadingly)"

key-files:
  created:
    - custom_components/party_dispenser/config_flow.py
  modified: []

key-decisions:
  - "Added hass: HomeAssistant type annotation to _validate_connection helper via TYPE_CHECKING import — research code omitted the type hint; explicit typing matches the 02-02 __init__.py/coordinator.py/entity.py pattern and future-proofs against mypy strict modes"
  - "Kept research's explicit vol.UNDEFINED default seeds for CONF_HOST and CONF_JWT on initial render — prevents misleading empty-string pre-fill that would make users think a value is already set"
  - "Put JWT rotation + TLS toggle in entry.data (not options) because __init__.py::async_setup_entry reads them at setup time via entry.data[CONF_JWT]; only scan_interval lives in entry.options (coordinator reads it on refresh interval updates)"

requirements-completed: [CFG-01, CFG-02, CFG-03]

# Metrics
duration: 2min
completed: 2026-04-20
---

# Phase 02 Plan 01: Config flow + options flow Summary

**Single-file plan delivering the user-facing config flow (async_step_user collects host/port/JWT/TLS/scan_interval + validates GET /recipes) and options flow (rotate JWT, toggle TLS, change scan_interval) for the Party Dispenser integration — closes CFG-01, CFG-02, CFG-03 and unblocks user-visible HA onboarding without any YAML.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-20T19:00:03Z
- **Completed:** 2026-04-20T19:02:19Z
- **Tasks:** 1
- **Files created:** 1

## Accomplishments

- `PartyDispenserConfigFlow` exposes a single `async_step_user` collecting all 5 required fields. On submit, it sets unique_id `f"{host}:{port}"`, aborts on duplicate, probes connectivity via `PartyDispenserApiClient.list_recipes()`, and maps the four typed exception classes (`PartyDispenserAuthError` → invalid_auth, `PartyDispenserConnectionError` → cannot_connect, `PartyDispenserProtocolError` → invalid_response, `PartyDispenserError` catch-all → unknown) to form errors.
- `OptionsFlowHandler` follows the strict 2025.12+ pattern — NO `__init__` method, NO `self.config_entry = ...`, parent class owns `self.config_entry` via property. Re-validates new JWT/TLS against the real backend before saving. Mutates `entry.data` for JWT+TLS changes via `hass.config_entries.async_update_entry` and stores `scan_interval` in `entry.options` so the __init__.py's update listener fires the coordinator reload on scan-interval edits.
- `async_get_options_flow` is a `@staticmethod @callback` returning `OptionsFlowHandler()` with NO args — matches research Pitfall 2 guidance and the 2025.12+ HA contract.
- TextSelector with `type=PASSWORD` masks JWT input in BOTH flows (2 occurrences — matches `<verification>` expectation of `grep -c "TextSelectorType.PASSWORD" == 2`).
- NumberSelector with `min=5`, `max=600`, `unit_of_measurement="s"` renders `scan_interval` as an explicit polling-seconds field.
- File passes `ruff format --check .` and `ruff check .` clean (no UP041/UP017/F401 deviations — the research code was already ruff-aligned for this file's import set).
- All 27 existing tests still pass (no regressions).

## Task Commits

1. **Task 1: config_flow.py creation** — `86133a7` (feat)
   — full ConfigFlow + OptionsFlow implementation, 276 lines, single commit

## Files Created/Modified

### Created
- `custom_components/party_dispenser/config_flow.py` — 276 lines: `_user_schema` builder, `_validate_connection` helper, `PartyDispenserConfigFlow(ConfigFlow, domain=DOMAIN)`, `OptionsFlowHandler(OptionsFlow)`

### Modified
None — this plan was purely additive. `__init__.py`, `const.py`, `api.py`, and `translations/en.json` were all already prepared by 02-02 with the exact surface this plan consumed.

## Decisions Made

- **Added `hass: HomeAssistant` type annotation** to `_validate_connection` via `TYPE_CHECKING` import. Research code left `hass` untyped. Explicit typing matches the `__init__.py`/`coordinator.py` pattern established in 02-02 and future-proofs against stricter mypy modes. Zero runtime cost (under `from __future__ import annotations` all annotations are strings).
- **Kept research's `vol.UNDEFINED` default seeds** for `CONF_HOST` and `CONF_JWT` on initial render — prevents misleading empty-string pre-fill that would make users think a value is already set.
- **Put JWT rotation + TLS toggle in `entry.data`** (not options) because `__init__.py::async_setup_entry` reads `entry.data[CONF_JWT]`/`entry.data[CONF_USE_TLS]` at setup time when building the API client; only `scan_interval` lives in `entry.options`. This means the options flow must call `hass.config_entries.async_update_entry(entry, data=new_data)` for jwt/TLS edits, and HA's entry update listener (registered in `__init__.py::async_setup_entry` via `entry.async_on_unload(entry.add_update_listener(_async_reload_entry))`) triggers a reload so the client picks up the new JWT without a full re-add.

## Deviations from Plan

None. The plan executed exactly as written — the research code (02-RESEARCH.md lines 1288-1545) was copy-ready and ruff-clean for this file's import surface, and no auto-fix rules (1/2/3) fired. The one adjustment (adding `HomeAssistant` type annotation to `_validate_connection`) was within-scope typing precision rather than a deviation; noted above under Decisions Made.

## Issues Encountered

- **Plan's `<verify>` includes `python -c "from custom_components.party_dispenser.config_flow import PartyDispenserConfigFlow, OptionsFlowHandler; print('OK')"`** — this fails without HA installed, same as the 02-02 Task 3 issue documented in `02-02-SUMMARY.md`. Importing `custom_components.party_dispenser.config_flow` triggers the package `__init__.py` which imports `homeassistant.const`, `homeassistant.helpers.aiohttp_client`, etc. — all unavailable in the stage-1 CI venv. **Actual verification used:** (a) `ruff format --check . && ruff check .` both green, (b) AST parse confirmed `PartyDispenserConfigFlow`, `OptionsFlowHandler`, `async_step_user`, `async_step_init`, `_validate_connection` all present and `OptionsFlowHandler` has NO `__init__` method, (c) `pytest tests/` → 27/27 pass (no regressions). Full HA-runtime import becomes possible when 02-04 installs `.[dev]` in stage 2; at that point the 6-scenario pytest suite 02-04 will add (`test_show_user_form`, `test_happy_path_creates_entry`, `test_invalid_auth_shows_error`, `test_cannot_connect_shows_error`, `test_duplicate_aborts`, `test_options_flow_jwt_rotation`) will exercise the runtime behaviors this plan codes.
- **No deviations from research content needed** — unlike 02-02 which hit UP041/UP017/F401, this file's import set happened to be ruff-clean from the start (no `asyncio.TimeoutError`, no `timezone.utc`, no unused imports).

## User Setup Required

None. No external services, no credentials, no manual setup. Tests for this plan's behaviors land in 02-04.

## Next Phase Readiness

**Plan 02-03 (sensor platform)** is unaffected by this plan and remains unblocked by 02-02's outputs (coordinator.py + entity.py + const.py). Can run in parallel with or after this plan.

**Plan 02-04 (services + pytest suite)** now has the full surface to test:
- `tests/test_config_flow.py` will import `from custom_components.party_dispenser.config_flow import PartyDispenserConfigFlow, OptionsFlowHandler` and exercise the 6 scenarios listed in `02-VALIDATION.md` section CFG-01/02/03.
- Test fixtures will use `MockConfigEntry` + `aioclient_mock` (from `pytest-homeassistant-custom-component`) to simulate `GET /recipes` responses covering happy, 401, timeout, malformed-JSON, and duplicate-entry cases — all four `except` branches in `async_step_user` have explicit paths to test.
- Options flow test: create `MockConfigEntry` with existing `data`, call `hass.config_entries.options.async_init(...)` through to `async_step_init`, submit a new JWT, assert `aioclient_mock` saw the revalidation request with the NEW Bearer header AND that `entry.data[CONF_JWT]` was updated.

**Notes to 02-04 planner:** No schema changes are needed in `translations/en.json` — the existing `config.step.user`, `config.error`, `config.abort`, `options.step.init`, and `options.error` sections already cover every string-key this implementation uses (verified: `invalid_auth`, `cannot_connect`, `invalid_response`, `unknown`, `already_configured` all present with matching translations).

---

## Self-Check: PASSED

- File `custom_components/party_dispenser/config_flow.py` exists (verified)
- Commit `86133a7` resolves (verified via `git log --oneline`)
- `class PartyDispenserConfigFlow(ConfigFlow, domain=DOMAIN):` — line 119 (grep-positive)
- `class OptionsFlowHandler(OptionsFlow):` — line 190 (grep-positive)
- `async def async_step_user` — line 125 (grep-positive)
- `async def async_step_init` — line 196 (grep-positive)
- `_abort_if_unique_id_configured` — line 139 (grep-positive)
- `TextSelectorType.PASSWORD` — 2 occurrences (user + options; matches verification expectation)
- `invalid_auth` + `cannot_connect` + `invalid_response` — 5 total occurrences (grep-positive; user step has 3 + options step has 2 because options doesn't catch `PartyDispenserProtocolError` separately per research)
- `PartyDispenserApiClient` + `async_get_clientsession` — both present (grep-positive)
- `return OptionsFlowHandler()` with NO args — line 184 (grep-positive)
- **NO** `def __init__.*config_entry.*:` pattern anywhere — grep-negative (Pitfall 2 compliance)
- `ruff format --check .` → exit 0
- `ruff check .` → All checks passed
- `pytest tests/` → 27 passed, 0 failed

---
*Phase: 02-integration-core*
*Completed: 2026-04-20*
