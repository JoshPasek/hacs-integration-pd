---
phase: 4
slug: custom-lovelace-card
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 4 — Validation Strategy

> Per-phase validation contract. Source: `04-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (card)** | `@web/test-runner 0.20.0` + `@open-wc/testing 4.0.0` + `@esm-bundle/chai 4.3.4-fix.0` + `sinon 17.0.2` + `@web/test-runner-playwright 0.11.0` + `@web/dev-server-esbuild` (TS transpile at test time, target ES2020) |
| **Framework (Python side)** | `pytest-homeassistant-custom-component 0.13.316` (Phase 2 established, unchanged) |
| **Card config file** | `www/community/party-dispenser-card/web-test-runner.config.mjs` |
| **Card quick run** | `cd www/community/party-dispenser-card && npm test` |
| **Card full suite** | `cd www/community/party-dispenser-card && npm run test && npm run typecheck` |
| **Python quick run** | `.venv/bin/pytest tests/test_integration_manifest.py tests/test_frontend_register.py -x` |
| **Python full suite** | `.venv/bin/pytest tests/ -v` |
| **Coverage gate** | ≥70% line coverage on `www/community/party-dispenser-card/src/` (enforced by web-test-runner coverageConfig) |

---

## Sampling Rate

- **Per task commit:** targeted `npm test -- --grep <name>` (card) + targeted `pytest tests/test_<module>.py -x` (Python) — target <3s
- **Per wave merge:** full `npm test` + full `pytest tests/ -v` + all grep gates — target ~6s total
- **Phase gate:** full suite green + coverage ≥70% on `src/` + coverage ≥80% on `custom_components/party_dispenser/frontend/__init__.py` before `/gsd:verify-work` + annotated `v0.4.0` tag pushed

---

## Per-Task Verification Map

| Req ID | Behavior | Test Type | Automated Command |
|--------|----------|-----------|-------------------|
| HACS-03 | Card served via integration-registered static path | integration (Python) | `pytest tests/test_frontend_register.py -x` |
| UI-01 | `customCards.push` + `customElements.define` run at module load | unit (card) | `npm test -- --grep 'registers customCards'` |
| UI-02 | Recipe tile tap dispatches `pd-order-recipe` custom event | unit (card) | `npm test -- --grep 'pd-recipe-tile'` |
| UI-02 | Root card's `pd-order-recipe` handler calls `hass.callService('party_dispenser', 'order_recipe', {recipe_id})` | unit (card) | `npm test -- --grep 'order_recipe service'` |
| UI-03 | Queue item cancel button dispatches `pd-cancel-order` | unit (card) | `npm test -- --grep 'pd-queue-item'` |
| UI-03 | Root card's `pd-cancel-order` handler calls `hass.callService('party_dispenser', 'cancel_order', {order_id})` | unit (card) | `npm test -- --grep 'cancel_order service'` |
| UI-04 | Summary header renders 3 chips when `show_connection_status: true`, 2 when false | unit (card) | `npm test -- --grep 'pd-summary-header'` |
| UI-05 | NO `fetch(` anywhere in card `src/` | grep gate | `! grep -rE '\bfetch\s*\(' www/community/party-dispenser-card/src/` |
| UI-05 | NO hex colors outside `:host` block in card `src/` | grep gate | see research §Validation for exact one-liner |
| UI-06 | Card renders in <600px viewport without horizontal overflow | unit (card) | `npm test -- --grep 'mobile layout'` |
| UI-07 | `<ha-form>` editor emits `config-changed` with merged config | unit (card) | `npm test -- --grep 'pd-editor'` |
| QA-03 | ≥70% line coverage on `src/` | coverage gate | `npm test` (threshold enforced) |
| Phase 4 manifest | `manifest.json` `version == "0.4.0"` + `dependencies == ["frontend", "http"]` | unit (Python) | `pytest tests/test_integration_manifest.py::test_manifest_phase4_overrides -x` |
| Phase 4 Python | `frontend/__init__.py::async_register_frontend` calls `async_register_static_paths` + `resources.async_create_item` with defensive `async_load()` first | unit (Python) | `pytest tests/test_frontend_register.py -x` |

---

## Wave 0 Requirements

Files/configurations that MUST land in the first plan's first wave — all subsequent plans depend on this scaffolding.

- [ ] `www/community/party-dispenser-card/package.json` — npm manifest, pinned deps per UI-SPEC §15.2 + research overrides
- [ ] `www/community/party-dispenser-card/tsconfig.json` — `useDefineForClassFields: false` + `experimentalDecorators: true` (lit legacy-decorator requirement)
- [ ] `www/community/party-dispenser-card/rollup.config.mjs` — bundle config with `inlineDynamicImports: true`, `rollup-plugin-copy` to `custom_components/party_dispenser/frontend/`
- [ ] `www/community/party-dispenser-card/web-test-runner.config.mjs` — `@web/test-runner-playwright` + `@web/dev-server-esbuild` + coverage config
- [ ] `www/community/party-dispenser-card/.eslintrc*` — NOT created (eslint deferred to Phase 6; CI uses `tsc --noEmit` for lint)
- [ ] `www/community/party-dispenser-card/test/fixtures/hass-*.ts` — 4 fixture factories (happy, empty, disconnected, no-config)
- [ ] `tests/test_frontend_register.py` — Python unit test verifying `async_register_frontend` behavior
- [ ] Rename `tests/test_integration_manifest.py::test_manifest_phase3_overrides` → `test_manifest_phase4_overrides`, flip version `"0.3.0" → "0.4.0"`, add `dependencies == ["frontend", "http"]` assertion — in the SAME commit as `manifest.json` flip (atomic; mirror Phase 2/3 pattern)
- [ ] `.gitlab-ci.yml` — new `test-card` stage using `node:22-alpine` (with `mcr.microsoft.com/playwright:v1.x-jammy` fallback documented in comment if Alpine Chromium's V8 coverage API proves unreliable on the runner)

---

## Dimension 8 (Nyquist) Self-Audit

| Dimension | Covered? | How |
|-----------|----------|-----|
| 1. Functional correctness | ✅ | Each of 9 Phase-4 req IDs maps to ≥1 concrete test command |
| 2. Boundary / input validation | ✅ | `pd-editor` tests cover schema validation; card gracefully renders when `hass` is undefined (loading) |
| 3. Error handling | ✅ | Service-call failures surface via HA's native toast (card tests verify the call happens; error UI is HA's job) |
| 4. Performance | ✅ | Card CI: <5s test suite. Bundle size <150KB unminified. HA runtime impact: pure reactive properties; negligible. |
| 5. Integration | ✅ | Python-side test exercises `async_register_static_paths` + `resources.async_create_item`; card-side tests exercise `hass.callService` via sinon spy |
| 6. Regression | ✅ | Every push runs both card suite AND Python suite; Phase 1-3 tests continue unchanged aside from the manifest-override rename |
| 7. Observability | ✅ (inherited) | `binary_sensor.party_dispenser_connected` from Phase 3 surfaces in card UI; card itself adds no logging (it's stateless / hass-driven) |
| 8. Validation traceability | ✅ | This table — every Phase 4 req maps to at least one automated test or grep gate |

Phase 4 is Nyquist-compliant for its scope.

---

## Deferred

- Real hassfest + HACS action — Phase 5 (GitHub mirror)
- eslint config for card — Phase 6 polish
- Minified build output — Phase 6 polish
- Multi-dispenser support in card — v2 (MULTI-02)
- i18n beyond English — v2
- Public HACS-store submission — v2
- Visual regression testing (Chromatic / Percy) — not in scope for v1

---

## Cross-plan Wave 0 ordering note

Plan 04-01 must land Wave 0 scaffolding (package.json, tsconfig, rollup, web-test-runner, .gitlab-ci.yml Node stage, Python `frontend/__init__.py` + `__init__.py` wire-up + `manifest.json` flip + paired test rename). Plans 04-02 (UI components) and 04-03 (mobile/tests) depend on 04-01's scaffold being in place.
