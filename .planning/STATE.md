---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: Phase complete — ready for verification
stopped_at: Completed 04-03-PLAN.md — mobile CSS + 38 tests + v0.4.0 tag — Phase 4 complete
last_updated: "2026-04-21T02:08:15.794Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

**Core value:** One-click install and a live, push-driven dashboard card that controls the dispenser.
**Current focus:** Phase 04 — custom-lovelace-card

## Current Position

Phase: 04 (custom-lovelace-card) — EXECUTING
Plan: 3 of 3

## Performance Metrics

**Velocity:**

- Total plans completed: 9 (3 Phase 1 + 4 Phase 2 + 2 Phase 3)
- Average duration: ~5 min
- Total execution time: ~0.75 hours

**By Phase:**

| Phase | Plans | Total    | Avg/Plan |
|-------|-------|----------|----------|
| 1     | 3/3   | ~24 min  | ~8 min   |
| 2     | 4/4   | ~18 min  | ~4.5 min |
| 3     | 2/2   | ~11 min  | ~5.5 min |

**Per-Plan Metrics:**

| Plan                                    | Duration | Tasks   | Files    |
|-----------------------------------------|----------|---------|----------|
| Phase 01-foundation-hacs-scaffolding P01 | 3 min    | 3 tasks | 7 files  |
| Phase 01-foundation-hacs-scaffolding P02 | 4 min    | 3 tasks | 10 files |
| Phase 01-foundation-hacs-scaffolding P03 | 17 min   | 3 tasks | 7 files  |
| Phase 02-integration-core P01           | 2 min    | 1 task  | 1 file   |
| Phase 02-integration-core P02           | 7 min    | 3 tasks | 10 files |
| Phase 02-integration-core P03           | 2 min    | 1 task  | 1 file   |
| Phase 02-integration-core P04           | 7 min    | 3 tasks | 11 files |
| Phase 03-realtime-push P01              | 6 min    | 3 tasks | 10 files |
| Phase 03-realtime-push P02              | 5 min    | 3 tasks | 2 files  |

**Recent Trend:**

- Last 5 plans: ~5.5 min avg
- Trend: Stable (tight plans = shorter executions; Phase 3 P02 was fast despite requiring a Rule 1 fix on a tricky `asyncio.sleep` patch)

*Updated after each plan completion*
| Phase 04-custom-lovelace-card P01 | 8 | 3 tasks | 20 files |
| Phase 04-custom-lovelace-card P02 | 4min | 3 tasks | 12 files |
| Phase 04-custom-lovelace-card P03 | 20 | 3 tasks | 12 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Phase 01]: 01-01: hacs.json minimal 2-key (name + homeassistant); omit defaults per HACS PREVENT_EXTRA guidance
- [Phase 01]: 01-01: MIT LICENSE with 'Copyright (c) 2026 Party Dispenser contributors' (CONTEXT LOCKED)
- [Phase 01]: 01-01: Card placeholder ships .gitkeep + README only — NO .js (HACS one-category-per-repo)
- [Phase 01]: 01-01: Dropped misleading no-op .gitignore negation for card README.md
- [Phase 01-foundation-hacs-scaffolding]: 01-02: Applied TYPE_CHECKING guard to HA imports in __init__.py (Rule 1 fix) — from __future__ import annotations only defers annotations, not module-scope imports; TYPE_CHECKING is canonical HA pattern satisfying 'import without HA installed' acceptance criterion
- [Phase 01-foundation-hacs-scaffolding]: 01-02: pyproject.toml is single source of truth for ruff + pytest (no .ruff.toml, no pytest.ini) — Phase 2+ extends this file
- [Phase 01-foundation-hacs-scaffolding]: 01-02: Deferred pytest-asyncio install — plan kept framework installs minimal; harmless PytestConfigWarning until 01-03/Phase 2
- [Phase 01-foundation-hacs-scaffolding]: 01-03: Replaced docker-hassfest validate job with bespoke tests/test_integration_manifest.py (16 tests) — Kubernetes runner disallows DinD and plan's scripted fallback (python -m script.hassfest) is not shippable (module lives only in home-assistant/core git, not PyPI). Real hassfest + HACS action deferred to Phase 5 against GitHub mirror.
- [Phase 01-foundation-hacs-scaffolding]: 01-03: Annotated semver tag v0.1.0 at commit 593f780 (remote SHA 8ca047b) — structured multi-section release message (What's included / Deviations / Deferred) so the tag body reads as a release note.
- [Phase 01-foundation-hacs-scaffolding]: 01-03: Phase 2+ plans should add 'ruff format .' as an explicit action step BEFORE commits; CI's 'ruff format --check' fails on any file not canonically formatted locally (Deviation 1 in plan 01-03).
- [Phase 01-foundation-hacs-scaffolding]: 01-03: Phase 5 planners MUST NOT assume DinD availability on self-hosted GitLab runners without explicit confirmation. This project's Kubernetes runner has privileged=false. Phase 5 should run hassfest + HACS action on GitHub Actions against the GitHub mirror (native DinD), not on GitLab.
- [Phase 02-integration-core]: 02-02: Adopted ruff UP041 fix (asyncio.TimeoutError → builtin TimeoutError) and UP017 (timezone.utc → datetime.UTC alias) — Python 3.11+ aliases; research's copy-ready code had latent ruff findings, fixed in place
- [Phase 02-integration-core]: 02-02: Rewrote tests/test_import.py to AST-parse __init__.py + use importlib.util.spec_from_file_location for const.py — Phase 2's runtime HA imports broke Phase 1's 'import without HA' smoke test; CI stage 1 stays green
- [Phase 02-integration-core]: 02-02: Forward reference to services.py in __init__.py::async_setup is deliberate — resolved by 02-04 Task 2. CI stage 1 (no HA) unaffected because ruff + AST-based tests never trigger package import; stage 2 (once 02-04 adds HA) will execute real import by which time services.py exists
- [Phase 02-integration-core]: 02-02: Added .venv/ + venv/ to .gitignore — host is PEP 668 externally-managed Python; ruff/pytest require venv for local runs
- [Phase 02-integration-core]: 02-02: entry.runtime_data = PartyDispenserData(client, coordinator) pattern adopted — NO hass.data[DOMAIN]. Bronze quality-scale rule honored; services.py (02-04) will look up coordinator via entry.runtime_data.coordinator
- [Phase 02-integration-core]: 02-01: Added hass:HomeAssistant type annotation to _validate_connection via TYPE_CHECKING — research code omitted it; explicit typing matches 02-02 pattern and future-proofs against mypy strict modes
- [Phase 02-integration-core]: 02-01: JWT rotation + TLS toggle in entry.data (not options) — __init__.py reads them at setup time; only scan_interval lives in entry.options. HA update listener fires reload on jwt/TLS data mutation via async_update_entry
- [Phase 02-integration-core]: 02-01: OptionsFlowHandler has NO __init__ method — parent OptionsFlow provides self.config_entry via property (2025.12+ hard requirement); async_get_options_flow returns OptionsFlowHandler() with NO args
- [Phase 02-integration-core]: 02-03: Removed research code's '# noqa: ARG001' suppression — ARG is not in the project's selected ruff rules, so it was a dead directive (RUF100). Pattern: before copying noqa comments from research, check pyproject.toml [tool.ruff.lint] select groups.
- [Phase 02-integration-core]: 02-03: RecipesSensor attrs kept LIGHT ({id, name, makeable} only, no ingredients) per Open Question 2 — HA's 16KB state-attribute soft limit would be breached by 50+ recipes × 10+ ingredients. Full recipe data consumed by Phase 4 custom card directly from coordinator state.
- [Phase 02-integration-core]: 02-03: MRO order 'class X(PartyDispenserEntity, SensorEntity)' — PartyDispenserEntity first ensures CoordinatorEntity's __init__ + shared DeviceInfo + _attr_has_entity_name inherit correctly; SensorEntity second layers state pipeline on top. Swapping the order would lose INT-01's single-device invariant.
- [Phase 02-integration-core]: 02-04: Added [tool.setuptools.packages.find] include=custom_components* to pyproject.toml — setuptools flat-layout auto-discovery fails with multi-top-level www/ + custom_components/; explicit include scopes the editable install to the integration only
- [Phase 02-integration-core]: 02-04: CI pytest job uses pip install -e .[dev] --config-settings editable_mode=compat — avoids setuptools PEP 660 editable finder-hook × HA _get_custom_components iterdir FileNotFoundError; compat mode writes classic .pth
- [Phase 02-integration-core]: 02-04: Phase 2 complete with 54 tests passing (27 Phase-1 + 27 Phase-2 new) in <0.5s locally; coverage 89% overall, ≥80% on config_flow/api/coordinator/services; v0.2.0 annotated tag pushed to origin
- [Phase 02-integration-core]: 02-04: aioclient_mock.mock_calls tuple indexing confirmed: call[0]=method, call[1]=url, call[2]=body/json, call[3]=headers — research's indexing worked first-try; no adaptation needed
- [Phase 03-realtime-push]: 03-01: Dropped research-code's '# noqa: BLE001' directives (RUF100: BLE not in pyproject select groups — same pattern as 02-03 for ARG001)
- [Phase 03-realtime-push]: 03-01: Replaced try/except/pass in stop() with contextlib.suppress(asyncio.CancelledError, Exception) to satisfy ruff SIM105 + S110 while preserving shutdown-swallow semantics
- [Phase 03-realtime-push]: 03-01: Moved entry.runtime_data assignment to AFTER first_refresh (previously BEFORE) — needed because ws_client depends on live coordinator; preserves ConfigEntryAuthFailed short-circuit
- [Phase 03-realtime-push]: 03-01: Folded dataclass-migration test fixes into Task 3 atomic commit (+2 extra files beyond plan's stated 4) — same class of CI-green invariant as Pitfall 8's manifest-flip atomicity; separate commit would leave HEAD..HEAD~1 red
- [Phase 03-realtime-push]: 03-01: TYPE_CHECKING-guarded forward reference in PartyDispenserData.ws_client avoids circular import (coordinator <-> websocket) via from __future__ import annotations deferring annotations at runtime
- [Phase 03-realtime-push]: 03-01: Phase 2 lesson confirmed — always check pyproject.toml [tool.ruff.lint] select BEFORE pasting noqa comments from research; research code repeatedly carries directives for unselected rules
- [Phase 03-realtime-push]: 03-02: Saved _real_sleep = asyncio.sleep before test patches asyncio.sleep — Python's patch('mod.asyncio.sleep') mutates the single asyncio module, so naive pump-the-event-loop calls in outer test code get recorded; fix is indirection through _real_sleep reference (Rule 1 bug in research code)
- [Phase 03-realtime-push]: 03-02: Coverage on websocket.py landed at 88.31% — skipped the research's optional extras (test_backoff_doubles_then_caps_at_30s + test_malformed_json_doesnt_disconnect) since the 80% QA-02 gate was already cleared; uncovered lines are idempotent-guard + fault-injection branches (production path 100% covered)
- [Phase 03-realtime-push]: 03-02: v0.3.0 annotated tag (bb753fd) pushed to origin at HEAD=28f0910 with structured release-notes message mirroring v0.2.0 shape (What's included / Requirements closed / Research overrides / Deferred / Commits = git log --oneline v0.2.0..HEAD)
- [Phase 03-realtime-push]: 03-02: Phase 3 COMPLETE — 60/60 tests green, 88% coverage on websocket.py, v0.3.0 pushed, all version-of-record files aligned
- [Phase 04-custom-lovelace-card]: Removed 'frontend' from manifest.json dependencies — hass_frontend not in test venv; 'http' is sufficient for async_register_static_paths; async_setup_frontend defers to EVENT_HOMEASSISTANT_STARTED so Lovelace is available
- [Phase 04-custom-lovelace-card]: Rollup sourcemap warning from inject-card-version is cosmetic (string replacement without sourcemap continuation); build exits 0; deferring sourcemap fix to Phase 6 polish
- [Phase 04-custom-lovelace-card]: Added __CARD_VERSION__ define to wtr esbuildPlugin — rollup injects this global at build time but WTR's esbuildPlugin doesn't; fixed by adding define stub to web-test-runner.config.mjs
- [Phase 04-custom-lovelace-card]: Event dispatch in tests targets ha-card inside shadowRoot — @pd-order-recipe/@pd-cancel-order lit listeners are bound to ha-card in shadow DOM; dispatching from light-DOM host doesn't reach them

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-21T02:08:15.791Z
Stopped at: Completed 04-03-PLAN.md — mobile CSS + 38 tests + v0.4.0 tag — Phase 4 complete
Resume file: None
