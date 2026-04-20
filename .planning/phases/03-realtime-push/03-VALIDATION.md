---
phase: 3
slug: realtime-push
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 3 — Validation Strategy

> Per-phase validation contract. Source: `03-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `pytest-homeassistant-custom-component==0.13.316` (pins pytest 9.0.0, pytest-asyncio 1.3.0) — unchanged from Phase 2 |
| **Config file** | `pyproject.toml` `[tool.pytest.ini_options]` — unchanged |
| **Quick run** | `pytest tests/test_websocket.py tests/test_binary_sensor.py -v` (~5–10s) |
| **Full suite** | `pytest tests/ -v` (~60 tests now; < 1s local) |
| **Lint** | `ruff check . && ruff format --check .` |
| **Coverage gate** | `pytest tests/ -v --cov=custom_components.party_dispenser --cov-report=term-missing` — target ≥ 80% on `websocket.py` |

---

## Sampling Rate

- **Per task commit:** `pytest tests/test_websocket.py tests/test_binary_sensor.py -v` + `ruff check . && ruff format --check .`
- **Per wave merge:** `pytest tests/ -v`
- **Phase gate:** full suite + coverage check green on GitLab CI; v0.3.0 tag pushed
- **Max feedback latency:** < 15 s local per task, < 30 s local full suite

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| RT-01 | WS subscribes on `async_setup_entry` (background task spawned) | integration | `pytest tests/test_websocket.py::test_connect_receives_hello_and_queue_updated_triggers_refresh -x` |
| RT-02 | `queue_updated` event triggers `coordinator.async_request_refresh()` within 1s | integration | same as RT-01 — refresh-call is awaited from the test; latency is guaranteed by construction (non-blocking call) |
| RT-03 | `binary_sensor.party_dispenser_connected` reflects WS state via dispatcher | integration | `pytest tests/test_binary_sensor.py::test_binary_sensor_responds_to_dispatcher_signal -x` + `pytest tests/test_websocket.py::test_dispatcher_fires_on_connect_and_disconnect -x` |
| RT-04 | Reconnect with exponential backoff 0.5s → 30s cap + jitter; polling keeps running | integration | `pytest tests/test_websocket.py::test_disconnect_triggers_reconnect_with_backoff -x` (asserts sequence 0.5 → 1.0 → 2.0 with jitter ≤ 25%) |
| QA-02 | WS reconnect logic has dedicated tests + ≥ 80% coverage on `websocket.py` | unit + integration | `pytest tests/test_websocket.py -v` (≥ 4 tests) + `--cov=custom_components.party_dispenser.websocket --cov-fail-under=80` |
| manifest-phase3 | `iot_class=local_push`, `version=0.3.0` | structural | `pytest tests/test_integration_manifest.py::test_manifest_phase3_overrides -x` |
| binary-sensor-static | entity_description + device_class + entity_category attributes correct | unit | `pytest tests/test_binary_sensor.py::test_binary_sensor_attributes -x` |

---

## Wave 0 Requirements

Files/configurations needed before any Phase 3 test can run:

- [ ] `tests/test_websocket.py` — create with `FakeWebSocket` helper; covers RT-01, RT-02, RT-04, QA-02 (≥ 4 tests)
- [ ] `tests/test_binary_sensor.py` — create; covers RT-03 + static attribute checks (2 tests)
- [ ] `tests/test_integration_manifest.py` — rename `test_manifest_phase2_overrides` → `test_manifest_phase3_overrides`; flip assertions to `iot_class == "local_push"` and `version == "0.3.0"`. Must land in SAME commit as `manifest.json` flip.
- [ ] No new framework install — `pytest-homeassistant-custom-component` already installed from Phase 2's `.[dev]` group
- [ ] No new conftest fixtures — `hass`, `enable_custom_integrations`, `MockConfigEntry` are sufficient

**Framework install:** None — Phase 2's `pip install -e ".[dev]" --config-settings editable_mode=compat` in CI covers it.

---

## Dimension 8 (Nyquist) Self-Audit

| Dimension | Covered? | How |
|-----------|----------|-----|
| 1. Functional correctness | ✅ | Each of 5 Phase-3 req IDs maps to ≥1 concrete pytest command |
| 2. Boundary / input validation | ✅ | `FakeWebSocket` feeds malformed JSON messages; client logs + skips, connection survives; unknown event types dropped at debug |
| 3. Error handling | ✅ | `test_disconnect_triggers_reconnect_with_backoff` asserts backoff math; ConnectionResetError + generic Exception both route to reconnect loop; CancelledError propagates cleanly |
| 4. Performance | ✅ | WS heartbeat 25s; refresh call is non-blocking (`async_request_refresh` debounces); CI time budget stays ~2 min |
| 5. Integration | ✅ | Full `hass` fixture exercises __init__ + coordinator + websocket end-to-end; FakeWebSocket drives lifecycle deterministically |
| 6. Regression | ✅ | Every push runs full suite via `.gitlab-ci.yml`; Phase 1–2 tests continue unchanged aside from the manifest-override rename |
| 7. Observability | ✅ (incremental) | `binary_sensor.party_dispenser_connected` newly surfaces runtime observability; dispatcher fires WARNING log on drops (QA-02 asserts log emitted) |
| 8. Validation traceability | ✅ | This table — every Phase-3 requirement maps to at least one automated test |

Phase 3 is Nyquist-compliant for its scope. No deferred dimensions remain at Phase 3 except strict coverage thresholds (that's Phase 6 polish).

---

## Deferred

- Strict coverage threshold gate in CI (stricter than ≥ 80%) — Phase 6
- Real `hassfest` against GitHub mirror — Phase 5
- WS auth once backend adds it — post-Phase-5 / v2
- Custom Lovelace card tests — Phase 4
- Differential WS payloads (backend adds first) — v2
