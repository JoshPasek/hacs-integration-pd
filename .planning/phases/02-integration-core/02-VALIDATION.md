---
phase: 2
slug: integration-core
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `02-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `pytest 9.0.0` + `pytest-asyncio 1.3.0` + `pytest-homeassistant-custom-component 0.13.316` (pins HA 2026.2.3) |
| **Config file** | `pyproject.toml` — `[tool.pytest.ini_options]` with `asyncio_mode = "auto"` (already set in Phase 1) |
| **Quick run command** | `pytest tests/ -v -x --tb=short` (~60s when HA installed, ~5s for pure-Python tests) |
| **Full suite command** | `pytest tests/ -v` |
| **Lint command** | `ruff check . && ruff format --check .` |
| **Install dev deps** | `pip install -e ".[dev]"` — pulls HA core + test plugin (~90s cold, ~5s cached) |

---

## Sampling Rate

- **After every task commit:** Run `pytest tests/test_<module-under-edit>.py -x --tb=short` (5–15s per module) + `ruff check . && ruff format --check .`
- **After every plan wave:** Run `pytest tests/ -v` full suite (~60s) + lint
- **Before `/gsd:verify-work`:** Full GitLab CI pipeline green (lint + pytest) + v0.2.0 tag pushed successfully
- **Max feedback latency:** ~15s local per-task, ~60s local full-suite, ~120s GitLab CI

---

## Per-Task Verification Map

Derived from 02-RESEARCH.md §Validation Architecture. Task IDs are placeholders — actual IDs finalized by planner.

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| CFG-01 | Config flow collects host/port/JWT/TLS + validates connectivity before save | integration | `pytest tests/test_config_flow.py::test_happy_path_creates_entry -x` |
| CFG-01 | Config flow rejects invalid JWT with `invalid_auth` error | integration | `pytest tests/test_config_flow.py::test_invalid_auth_shows_error -x` |
| CFG-01 | Config flow rejects unreachable host with `cannot_connect` error | integration | `pytest tests/test_config_flow.py::test_cannot_connect_shows_error -x` |
| CFG-01 | Config flow deduplicates on `{host}:{port}` unique_id | integration | `pytest tests/test_config_flow.py::test_duplicate_aborts -x` |
| CFG-02 | Options flow rotates JWT, re-validates on save | integration | `pytest tests/test_config_flow.py::test_options_flow_jwt_rotation -x` |
| CFG-03 | No YAML required — manifest declares `config_flow: true` | structural | `pytest tests/test_integration_manifest.py::test_manifest_phase2_overrides -x` (config_flow=true, version=0.2.0) |
| INT-01 | One device per config entry labeled "Party Dispenser" | unit | `pytest tests/test_sensor.py::test_device_info_stable_across_sensors -x` |
| INT-02 | All 5 sensors exist, read correct coordinator state | unit (x5) | `pytest tests/test_sensor.py -v -x` |
| INT-03 | `party_dispenser.order_recipe` calls `api.order_from_recipe` + triggers refresh | integration | `pytest tests/test_services.py::test_order_recipe_calls_api_then_refresh -x` |
| INT-04 | `party_dispenser.cancel_order` calls `api.cancel_order` + triggers refresh | integration | `pytest tests/test_services.py::test_cancel_order_calls_api_then_refresh -x` |
| INT-05 | `party_dispenser.refresh` triggers coordinator refresh on all entries | integration | `pytest tests/test_services.py::test_refresh_triggers_coordinator -x` |
| INT-05 | `party_dispenser.refresh` raises when no entries configured | integration | `pytest tests/test_services.py::test_service_raises_when_no_entries -x` |
| QA-01 | Coordinator handles auth / connection errors correctly | unit | `pytest tests/test_coordinator.py -v -x` |
| QA-01 | API client maps HTTP status → typed exceptions | unit | `pytest tests/test_api.py -v -x` |

---

## Wave 0 Requirements

Files + configurations created as the FIRST wave of Phase 2. Without these, no test can run.

- [ ] `pyproject.toml` — bump `requires-python = ">=3.13"` + add `[project.optional-dependencies] dev = ["pytest-homeassistant-custom-component==0.13.316", "ruff==0.15.11"]`
- [ ] `.gitlab-ci.yml` — default image `python:3.13-slim` (bump from 3.12) + pytest job uses `pip install -e ".[dev]"`
- [ ] `tests/conftest.py` — extend with autouse `enable_custom_integrations` fixture from pytest-HA-custom
- [ ] `tests/fixtures/recipes.json` — canned recipes response for `aioclient_mock`
- [ ] `tests/fixtures/queue.json` — canned queue response
- [ ] Update `tests/test_integration_manifest.py::test_manifest_phase1_overrides` — rename to `test_manifest_phase2_overrides`, assertions now `config_flow is True`, `version == "0.2.0"`
- [ ] Clear `.pytest_cache/` once after 3.12→3.13 switch (stale cached import maps can cause false failures)

**Test framework install:** `pip install -e ".[dev]"` in CI — pulls HA core + plugin (~90s cold, ~5s cached). Adds ~75s to Phase 1's ~20s CI time; total still ~2 min, within budget.

---

## Dimension 8 (Nyquist) Self-Audit

| Dimension | Covered? | How |
|-----------|----------|-----|
| 1. Functional correctness | ✅ | Each of 9 Phase-2 req IDs maps to ≥1 concrete pytest command |
| 2. Boundary / input validation | ✅ | Config flow tests cover invalid host, invalid JWT, empty JWT, port out-of-range; service schemas are voluptuous-validated; coordinator tests exercise auth vs connection error branches |
| 3. Error handling | ✅ | `test_api.py` asserts each HTTP status → typed exception mapping; `test_coordinator.py` asserts `UpdateFailed` + `ConfigEntryAuthFailed` are raised correctly |
| 4. Performance | ✅ | CI budget ~2 min (lint + `pip install -e ".[dev]"` + full pytest); coordinator update_interval 30s default; each test individually <1s |
| 5. Integration | ✅ | `pytest-homeassistant-custom-component` spins up a real HA test harness; `aioclient_mock` mocks the backend HTTP layer; services + coordinator + sensors all exercised end-to-end in test |
| 6. Regression | ✅ | Every push runs full suite via `.gitlab-ci.yml` pytest job; Phase 1 tests (test_import, test_hacs_manifest, test_info_md, test_integration_manifest) continue to run unchanged (aside from the Phase-2 override test update) |
| 7. Observability | ⏭ Partial | `_LOGGER.debug/info/warning` calls exist in coordinator + api; no explicit log-assertion tests in Phase 2 (Phase 3 adds binary_sensor.connected for runtime observability) |
| 8. Validation traceability | ✅ | This table — every Phase 2 requirement ID maps to at least one automated test command |

Phase 2 is Nyquist-compliant for its scope. Observability (Dim 7) ramps up in Phase 3 with `binary_sensor.party_dispenser_connected`.

---

## Deferred (explicitly NOT in Phase 2)

- Real hassfest + HACS action — Phase 5 (requires GitHub mirror CI)
- WebSocket subscribe + push updates — Phase 3
- Reconnect/backoff logic + connection-status binary sensor — Phase 3
- Custom Lovelace card tests — Phase 4
- Multi-dispenser tests — v2 (MULTI-01)
- Coverage threshold gate in CI (stricter than ≥80%) — Phase 6 polish
