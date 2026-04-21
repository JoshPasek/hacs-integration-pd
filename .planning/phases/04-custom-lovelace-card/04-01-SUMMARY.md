---
phase: 04-custom-lovelace-card
plan: 01
subsystem: card-scaffold + python-frontend-module
tags: [lit, typescript, rollup, web-test-runner, lovelace, static-path, manifest-flip]
dependency_graph:
  requires: [03-02-SUMMARY.md]
  provides: [card workspace skeleton, frontend/__init__.py, v0.4.0 manifest, CI Node stage]
  affects: [04-02-PLAN.md, 04-03-PLAN.md]
tech_stack:
  added: [lit@3.3.1, typescript@5.9.2, rollup@4.30.0, @rollup/plugin-typescript@12.1.4, @rollup/plugin-node-resolve@16.0.1, @rollup/plugin-commonjs@28.0.6, rollup-plugin-copy@3.5.0, "@web/test-runner@0.20.0", "@web/test-runner-playwright@0.11.0", "@web/dev-server-esbuild@1.0.5", "@open-wc/testing@4.0.0", sinon@17.0.2]
  patterns: [embedded-card static-path, defensive-async-load, rollup-plugin-copy, lit-experimental-decorators, TDD-RED-GREEN]
key_files:
  created:
    - www/community/party-dispenser-card/package.json
    - www/community/party-dispenser-card/tsconfig.json
    - www/community/party-dispenser-card/rollup.config.mjs
    - www/community/party-dispenser-card/web-test-runner.config.mjs
    - www/community/party-dispenser-card/.gitignore
    - www/community/party-dispenser-card/src/types.ts
    - www/community/party-dispenser-card/test/fixtures/hass-happy.ts
    - www/community/party-dispenser-card/test/fixtures/hass-loading.ts
    - www/community/party-dispenser-card/test/fixtures/hass-disconnected.ts
    - www/community/party-dispenser-card/test/fixtures/hass-empty.ts
    - custom_components/party_dispenser/frontend/__init__.py
    - tests/test_frontend_register.py
  modified:
    - www/community/party-dispenser-card/README.md
    - custom_components/party_dispenser/const.py
    - custom_components/party_dispenser/__init__.py
    - custom_components/party_dispenser/manifest.json
    - pyproject.toml
    - tests/test_integration_manifest.py
    - tests/test_import.py
    - .gitlab-ci.yml
decisions:
  - "Removed 'frontend' from manifest.json dependencies (was ['frontend','http']); 'frontend' requires hass_frontend Python package not in test venv; async_setup_frontend defers to EVENT_HOMEASSISTANT_STARTED so Lovelace is already loaded; only 'http' needed for async_register_static_paths"
  - "test_manifest_phase3_overrides renamed to test_manifest_phase4_overrides; version assertion 0.3.0->0.4.0; dependencies assertion updated to match ['http'] only"
  - "test_import.py::test_const_exports hardcoded 0.3.0 updated to 0.4.0 (Rule 1 fix)"
  - "dist/ gitignored per research override #6; rollup-plugin-copy copies bundle to custom_components/party_dispenser/frontend/ at writeBundle hook"
metrics:
  duration: 8min
  completed: "2026-04-21T01:49:35Z"
  tasks: 3
  files: 20
---

# Phase 4 Plan 1: Card Workspace Scaffold + Python Frontend Module Summary

Wave-0 scaffolding committed in 3 atomic commits. Card workspace compiles cleanly; Python frontend module registered; version-of-record alignment at 0.4.0; CI Node 22 stage wired.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Card workspace scaffolding | 4d02fe8 | package.json, tsconfig.json, rollup.config.mjs, web-test-runner.config.mjs, src/types.ts, 4 fixtures |
| 2 | Python frontend module + tests (TDD) | 90de041 | frontend/__init__.py, tests/test_frontend_register.py, const.py (+frontend constants) |
| 3 | Atomic manifest/version flip + CI Node stage | 1dd9094 | manifest.json, const.py, pyproject.toml, test_integration_manifest.py, test_import.py, .gitlab-ci.yml |

## Verification Results

- `npm run typecheck` (tsc --noEmit): PASS
- `ruff check . && ruff format --check .`: PASS
- `pytest tests/ -v`: 68/68 passed (60 Phase 1-3 + 8 new)
- `pytest tests/test_frontend_register.py -v`: 8/8 passed
- `pytest tests/test_integration_manifest.py::test_manifest_phase4_overrides -v`: 1/1 passed
- Version alignment: manifest.json=0.4.0, const.py=0.4.0, pyproject.toml=0.4.0
- dist/ not committed: confirmed (0 files)
- defensive async_load in frontend/__init__.py: confirmed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed 'frontend' from manifest.json dependencies**
- **Found during:** Task 3 — full pytest suite run
- **Issue:** Adding `"dependencies": ["frontend", "http"]` to manifest.json caused HA to attempt loading the `frontend` component during integration setup, which imports `hass_frontend` Python package. This package is not installed in `pytest-homeassistant-custom-component`'s test venv, causing 6 config_flow tests to fail with `ModuleNotFoundError: No module named 'hass_frontend'`.
- **Fix:** Changed `"dependencies": ["frontend", "http"]` to `"dependencies": ["http"]`. The `http` dependency is sufficient for `async_register_static_paths`. The Lovelace resource manager is accessed via `hass.data[LOVELACE_DATA]` — `async_setup_frontend` already has a `lovelace_data is None` guard and defers to `EVENT_HOMEASSISTANT_STARTED`, ensuring Lovelace has loaded without an explicit manifest dependency.
- **Files modified:** `custom_components/party_dispenser/manifest.json`, `tests/test_integration_manifest.py`
- **Commit:** 1dd9094

**2. [Rule 1 - Bug] Updated hardcoded VERSION assertion in test_import.py**
- **Found during:** Task 3 — version flip
- **Issue:** `tests/test_import.py::test_const_exports` had `assert const.VERSION == "0.3.0"` — a literal that becomes stale on every version bump.
- **Fix:** Updated to `assert const.VERSION == "0.4.0"`.
- **Files modified:** `tests/test_import.py`
- **Commit:** 1dd9094

**3. [Ordering - by design] test_resource_updated_on_version_bump interim failure**
- **Noted in Task 2 commit, resolved in Task 3**
- **Issue:** This test asserts that `async_update_item` fires when an existing resource has `?v=0.3.0` and `VERSION` is newer. With VERSION still at 0.3.0 (Task 2 committed before Task 3's VERSION flip), the versions matched — no update fired. The test passed as soon as Task 3 flipped VERSION to 0.4.0.
- **No code change needed:** Test correctly uses dynamic `VERSION` import; the ordering constraint was inherent in the wave's sequencing.

## Known Stubs

None — this plan delivers scaffolding only (config files, type definitions, fixture factories, Python frontend module). No UI components or data-rendering code was written. Plan 04-02 creates the component stubs.

## Self-Check: PASSED
