---
phase: 01-foundation-hacs-scaffolding
plan: 02
subsystem: infra
tags: [python, pytest, ruff, home-assistant, hacs, manifest, scaffolding]

# Dependency graph
requires:
  - phase: 01-foundation-hacs-scaffolding
    provides: "hacs.json + info.md at repo root (landed by plan 01-01) — consumed by tests/test_hacs_manifest.py and tests/test_info_md.py"
provides:
  - "custom_components/party_dispenser/ Python package — imports cleanly without homeassistant installed; exports async_setup_entry + async_unload_entry no-op stubs"
  - "manifest.json with 6 HACS-required fields + HA-required iot_class/integration_type/config_flow (overrides: hub instead of device; local_polling instead of local_push)"
  - "const.py — DOMAIN='party_dispenser', VERSION='0.1.0', MANUFACTURER='PartyDispenser', LOGGER"
  - "strings.json — Phase-2-ready config-flow placeholder strings"
  - "pyproject.toml — single-source config for ruff (HA Core subset) and pytest (asyncio_mode=auto, testpaths=['tests'])"
  - "tests/ Wave-0 suite — test_import.py (2), test_hacs_manifest.py (4), test_info_md.py (4) — 10 tests total, all green locally"
affects: [01-03-PLAN, phase-02-config-flow, phase-03-websocket, phase-05-ci]

# Tech tracking
tech-stack:
  added:
    - "pytest 9.0.2 (already installed on host)"
    - "ruff (config only — install deferred to 01-03 CI)"
  patterns:
    - "TYPE_CHECKING-guarded HA imports + `from __future__ import annotations` so the integration package imports in plain Python 3.12 without homeassistant installed (the canonical HA custom-component pattern for import-smoke tests)"
    - "Single-file config (pyproject.toml) for ruff + pytest — no separate .ruff.toml / pytest.ini"
    - "Tests live at repo-root/tests/ and put repo root on sys.path via conftest.py"
    - "Wave-0 test suite strategy: static JSON + markdown validators + import smoke, no homeassistant install needed in Phase 1 CI"

key-files:
  created:
    - "custom_components/party_dispenser/__init__.py"
    - "custom_components/party_dispenser/manifest.json"
    - "custom_components/party_dispenser/const.py"
    - "custom_components/party_dispenser/strings.json"
    - "pyproject.toml"
    - "tests/__init__.py"
    - "tests/conftest.py"
    - "tests/test_import.py"
    - "tests/test_hacs_manifest.py"
    - "tests/test_info_md.py"
  modified: []

key-decisions:
  - "Applied TYPE_CHECKING guard to HA imports in __init__.py (Rule 1 fix): plan's action block had `from homeassistant.config_entries import ConfigEntry` at module scope after `from __future__ import annotations`, but that future import only defers annotations, not module-scope imports. The plan's own acceptance criterion required `import custom_components.party_dispenser` to succeed without HA installed, which the plan's code block would have failed. TYPE_CHECKING is the canonical HA pattern and satisfies the acceptance criterion."
  - "Kept plan's narrowed verify (pytest tests/test_import.py only) but additionally confirmed full `pytest tests/ -v` is green (10/10) because 01-01 has landed — this satisfies the objective's top-level success criterion."
  - "Did NOT install pytest-asyncio in Phase 1 (not in plan). The `asyncio_mode=auto` config entry emits a harmless PytestConfigWarning until 01-03 CI or Phase 2 adds the plugin. Non-blocking."

patterns-established:
  - "TYPE_CHECKING import guard: any HA custom_component module that needs to be importable without homeassistant installed should guard HA imports under `if TYPE_CHECKING:` and use `from __future__ import annotations`."
  - "pyproject.toml as single source of truth for ruff + pytest config — Phase 2+ should extend the existing file, not fork into separate config files."
  - "Test scaffold under tests/ at repo root with conftest.py adding repo root to sys.path — avoids a src/ layout or an installed package, matches HA Core integration conventions."

requirements-completed: [HACS-01]

# Metrics
duration: 4 min
completed: 2026-04-20
---

# Phase 1 Plan 2: Python Package Skeleton + Wave-0 Tests Summary

**HA custom-component scaffold (import-safe without HA installed via TYPE_CHECKING guard) + pyproject.toml central config + 10-test Wave-0 suite all green.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-20T17:19:08Z
- **Completed:** 2026-04-20T17:23:25Z
- **Tasks:** 3
- **Files created:** 10

## Accomplishments

- HA integration package `custom_components/party_dispenser/` lands with the 4 canonical files (manifest.json, __init__.py, const.py, strings.json) and imports cleanly in plain Python 3.12 without homeassistant installed
- manifest.json carries the 6 HACS-required fields plus HA-required `iot_class=local_polling` / `integration_type=hub` / `config_flow=false` (research-backed overrides from 01-RESEARCH.md Pitfalls 5 and 6, baked into the plan)
- pyproject.toml centralizes ruff (curated HA Core subset, line-length 100) and pytest (asyncio_mode=auto, testpaths=['tests']) — single source of truth for 01-03's CI
- Wave-0 test suite — 10 tests total across test_import.py (2), test_hacs_manifest.py (4), test_info_md.py (4) — all green locally against 01-01's hacs.json + info.md artifacts

## Task Commits

1. **Task 1: HA integration skeleton** — `6b96813` (feat) — manifest.json + __init__.py (with TYPE_CHECKING fix) + const.py + strings.json
2. **Task 2: pyproject.toml** — `afc5518` (chore) — ruff + pytest central config
3. **Task 3: tests/ scaffold** — `353b020` (test) — 5 test files (10 tests), all green

**Plan metadata:** (pending — final metadata commit below)

## Files Created

- `custom_components/party_dispenser/__init__.py` — no-op `async_setup_entry`/`async_unload_entry` stubs with TYPE_CHECKING-guarded HA imports
- `custom_components/party_dispenser/manifest.json` — HA + HACS integration manifest (6 HACS-required + 3 HA-required fields)
- `custom_components/party_dispenser/const.py` — DOMAIN, VERSION, MANUFACTURER, LOGGER exports
- `custom_components/party_dispenser/strings.json` — config-flow placeholder strings (inert in Phase 1, active from Phase 2)
- `pyproject.toml` — project metadata + ruff config + pytest config
- `tests/__init__.py` — empty marker (0 bytes)
- `tests/conftest.py` — puts repo root on sys.path for `import custom_components.party_dispenser`
- `tests/test_import.py` — 2 tests: integration imports, const exports
- `tests/test_hacs_manifest.py` — 4 tests: hacs.json exists/parses, has 'name', no extra keys (PREVENT_EXTRA), homeassistant==2026.1.0
- `tests/test_info_md.py` — 4 tests: info.md exists/non-empty, no `<picture>`, no `> [!NOTE]` blockquotes, opens with `#` heading

## Decisions Made

- **TYPE_CHECKING guard for HA imports (Rule 1 fix, see Deviations)** — plan's action block shipped HA imports at module scope after `from __future__ import annotations`, but that future import only defers annotations, not module-scope imports. Switched to the canonical HA custom-component pattern with `if TYPE_CHECKING:` — satisfies the plan's own acceptance criterion (`import custom_components.party_dispenser` succeeds without HA installed).
- **Additionally ran full `pytest tests/ -v`** — plan's narrowed verify only required `pytest tests/test_import.py -v`, but since 01-01 has landed, the full 10-test suite could be confirmed green. This matches the top-level objective's stated success criterion.
- **Deferred pytest-asyncio install** — plan explicitly keeps framework installs minimal (pytest only). The `asyncio_mode=auto` config entry produces a harmless PytestConfigWarning until Phase 2 or 01-03 CI installs the plugin.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `from __future__ import annotations` does NOT defer module-scope imports**

- **Found during:** Task 1 (first attempt to run `python3 -c "import custom_components.party_dispenser"` after writing __init__.py from the plan's copy-ready block)
- **Issue:** The plan's action block for `__init__.py` (and 01-RESEARCH.md §Pitfall 4) claims that `from __future__ import annotations` alone makes HA imports "string-only at runtime" so that the import smoke test runs without `pip install homeassistant`. This is factually wrong. `from __future__ import annotations` only defers **annotations** (type hints in function signatures / variable declarations); it does NOT make module-scope `import` or `from X import Y` statements lazy. Python evaluates module-scope imports eagerly regardless of the `__future__` flag. The plan's shipped code therefore fails its own Task 1 acceptance criterion: "`python3 -c "import custom_components.party_dispenser"` succeeds in plain Python 3.12 WITHOUT `pip install homeassistant`".
- **Reproduction:** `python3 -c "import custom_components.party_dispenser"` with the plan-as-written code produced `ModuleNotFoundError: No module named 'homeassistant'`. Confirmed with a parallel minimal repro in /tmp.
- **Fix:** Switched to the canonical HA custom-component pattern: wrap HA imports in `if TYPE_CHECKING:`. Under `from __future__ import annotations`, the `HomeAssistant` / `ConfigEntry` annotations in function signatures become strings at runtime, and `TYPE_CHECKING` is `False` at runtime so the HA imports never execute. Type checkers still see the imports (since `TYPE_CHECKING` is `True` for them). This is the widely-used pattern across `custom_components/` in HA Core and the reference `ludeeus/integration_blueprint`.
- **Files modified:** `custom_components/party_dispenser/__init__.py` only
- **Verification:** `python3 -c "import custom_components.party_dispenser"` now succeeds; `python3 -c "import custom_components.party_dispenser as p; assert hasattr(p, 'async_setup_entry'); assert hasattr(p, 'async_unload_entry')"` succeeds; `pytest tests/test_import.py -v` shows 2/2 passing. All other Task 1 acceptance criteria still satisfied (e.g., still contains `from __future__ import annotations`, still no PLATFORMS, still no `async_setup(`, still no `async_forward_entry_setups`, signatures unchanged).
- **Committed in:** `6b96813` (Task 1 commit)
- **Scope guard:** The fix is strictly scoped to the file whose acceptance criterion was being violated. 01-RESEARCH.md and the PLAN.md itself still carry the incorrect claim; that's documentation content out of scope for this plan's execution. Flagging here so Phase 2 / future planners notice.

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for correctness. Without the fix, the plan's own Task 1 acceptance criterion and the plan-level success criterion "`python3 -c "import custom_components.party_dispenser"` succeeds in a plain Python 3.12 env (no HA install)" would have failed. No scope creep — single file edited, canonical HA pattern applied, all other acceptance criteria preserved.

## Issues Encountered

None — the TYPE_CHECKING fix was straightforward and applied in the first iteration after the failing import was observed.

## Authentication Gates

None — this plan was 100% offline (no CLI logins, no external APIs, no credentials needed).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 01-03:** pyproject.toml centralizes ruff + pytest; Wave-0 tests are in place; 01-03 can now write `.gitlab-ci.yml` with three jobs (ruff, import-smoke pytest, hassfest docker) and push the v0.1.0 tag at phase completion.
- **Ready for Phase 2:** strings.json is Phase-2-ready, so Phase 2 can flip `config_flow=true` in manifest.json and add `config_flow.py` without also adding strings.json. `const.py` exposes the canonical DOMAIN for coordinator/entity wiring.
- **Known minor notes (non-blocking):**
  - `pytest-asyncio` plugin not installed in Phase 1 → harmless `Unknown config option: asyncio_mode` warning when running `pytest`. Will be handled in 01-03 CI install list or Phase 2.
  - 01-RESEARCH.md §Pitfall 4 and the PLAN.md action block still carry the incorrect `from __future__ import annotations`-defers-imports claim. Not edited (out of scope); flagged here for future planners.

## Self-Check: PASSED

All 10 created files exist on disk. All 3 task commits (6b96813, afc5518, 353b020) exist in git history.

---
*Phase: 01-foundation-hacs-scaffolding*
*Completed: 2026-04-20*
