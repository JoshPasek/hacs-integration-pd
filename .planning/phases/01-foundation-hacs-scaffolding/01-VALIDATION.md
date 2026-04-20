---
phase: 1
slug: foundation-hacs-scaffolding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-20
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution. Source: `01-RESEARCH.md` §Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | `pytest` (bare) for Phase 1 import smoke + static JSON/markdown checks. `pytest-homeassistant-custom-component` 0.13.x deferred to Phase 5 full HA fixture suite. |
| **Config file** | `pyproject.toml` → `[tool.pytest.ini_options]` |
| **Quick run command** | `ruff check . && ruff format --check . && pytest tests/ -v` |
| **Full suite command** | `ruff check . && ruff format --check . && pytest tests/ -v && docker run --rm -v "$(pwd):/github/workspace" ghcr.io/home-assistant/hassfest` |
| **Estimated runtime** | ~15 s local quick, ~45 s local full (hassfest dominates; first pull ~2 min) |

---

## Sampling Rate

- **After every task commit:** Run quick command (≈15 s local)
- **After every plan wave:** Run full suite (≈45 s local)
- **Before `/gsd:verify-work`:** Full GitLab CI pipeline green (ruff + import-smoke + hassfest) + v0.1.0 tag pushed successfully
- **Max feedback latency:** 45 s local / ~60 s GitLab CI

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01-01 | 1 | HACS-01 | static | `python -c "import json; d=json.load(open('hacs.json')); assert 'name' in d; assert set(d.keys()) <= {'name','homeassistant','hacs','content_in_root','zip_release','filename','hide_default_branch','country','persistent_directory','render_readme'}"` | ❌ W0 | ⬜ pending |
| 01-01-02 | 01-01 | 1 | HACS-01 | static | `docker run --rm -v "$(pwd):/github/workspace" ghcr.io/home-assistant/hassfest` | ❌ W0 | ⬜ pending |
| 01-01-03 | 01-01 | 1 | HACS-01, DOC-03 | static | `test -s info.md` + `! grep -qE '<picture\|> \[!' info.md` | ❌ W0 | ⬜ pending |
| 01-02-01 | 01-02 | 2 | HACS-01 | unit | `pytest tests/test_import.py -v` | ❌ W0 | ⬜ pending |
| 01-02-02 | 01-02 | 2 | HACS-01 | static | `test -f custom_components/party_dispenser/const.py && python -c "from custom_components.party_dispenser.const import DOMAIN, VERSION, MANUFACTURER"` | ❌ W0 | ⬜ pending |
| 01-03-01 | 01-03 | 3 | QA-04 | static | `ruff check .` | ❌ W0 | ⬜ pending |
| 01-03-02 | 01-03 | 3 | QA-04 | static | `ruff format --check .` | ❌ W0 | ⬜ pending |
| 01-03-03 | 01-03 | 3 | REL-01, QA-04 | manual | Inspect GitLab pipeline after push — all 3 jobs green | ✅ | ⬜ pending |
| 01-03-04 | 01-03 | 3 | QA-04 | manual | GitLab MR settings require pipeline pass before merge | N/A (settings) | ⬜ pending |
| 01-03-05 | 01-03 | 3 | HACS-01 | manual | Tag v0.1.0 pushed; visible at gitlab.paskiemgmt.com/.../tags | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

Exact task IDs will be finalized by the planner; the rows above reflect the expected wave + requirement mapping derived from the roadmap.

---

## Wave 0 Requirements

Files/configurations that must be created before any validation can run. The planner should include Wave 0 as the first wave of plan 01-01 (scaffolding).

- [ ] `pyproject.toml` — ruff + pytest + project metadata (stdlib-only build deps for Phase 1)
- [ ] `tests/__init__.py` — empty marker
- [ ] `tests/conftest.py` — empty or path-only fixture setup
- [ ] `tests/test_import.py` — smoke test for `custom_components.party_dispenser` (covers QA-04 unit slice and HACS-01 load-cleanly slice)
- [ ] `tests/test_hacs_manifest.py` — `hacs.json` schema check (covers HACS-01 static slice)
- [ ] `tests/test_info_md.py` — `info.md` exists + uses only HACS-supported markdown (covers DOC-03 + HACS-01 docs slice)
- [ ] `.gitlab-ci.yml` — three jobs: `ruff`, `import-smoke` (pytest), `hassfest` (docker)
- [ ] GitLab MR settings: "Pipelines must succeed" toggle enabled (REQ: QA-04) — project-settings change, not a committed file

**Test framework install** (in `.gitlab-ci.yml`): `pip install ruff pytest` only. No `homeassistant` install needed in Phase 1 CI — import-smoke tests don't execute HA at runtime thanks to `from __future__ import annotations` in `__init__.py`. This keeps Phase 1 CI runtime well under a minute.

---

## Dimension 8 (Nyquist) Self-Audit

| Dimension | Covered? | How |
|-----------|----------|-----|
| 1. Functional correctness | ✅ | Import smoke + manifest/hacs/info static checks assert the code and metadata are what we expect |
| 2. Boundary / input validation | ✅ | `test_hacs_manifest.py` asserts key whitelist (extra keys rejected); `test_info_md.py` asserts forbidden markdown patterns absent |
| 3. Error handling | ⏭ N/A in Phase 1 | No runtime logic yet — Phase 2 adds error paths |
| 4. Performance | ✅ | Full Phase 1 CI budget: <60 s. Quick local test <15 s. |
| 5. Integration | ⏭ Deferred | HA fixture tests land in Phase 5 with full CI; Phase 1 uses filesystem-level integration (hassfest validates against core schema) |
| 6. Regression | ✅ | All three tests run on every push per `.gitlab-ci.yml`. |
| 7. Observability | ⏭ N/A | Phase 1 has no logs/metrics; Phase 3 adds connection-status observability |
| 8. Validation traceability | ✅ | This table; every Phase 1 requirement ID maps to at least one automated test or gated manual check |

Phase 1 is Nyquist-compliant **for the Phase 1 scope** (covers static + unit slices that matter for a scaffolding phase). Runtime/integration dimensions ramp up in Phases 2, 3, 5.

---

## Deferred (explicitly NOT in Phase 1)

- Full HACS action validation — requires GitHub mirror (Phase 5)
- `pytest-homeassistant-custom-component` fixture-based HA load tests (Phase 2 adds some, Phase 5 completes)
- Card unit tests (Phase 4)
- WebSocket reconnect tests (Phase 3)
- End-to-end "install via HACS from GitHub and it works" smoke (Phase 5)
