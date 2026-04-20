---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: "Phase 3 Plan 1 landed — websocket.py (PartyDispenserWebSocketClient w/ reconnect + dispatcher) + binary_sensor.py (CONNECTIVITY entity) + __init__.py wired + manifest/test atomic flip to iot_class=local_push/version=0.3.0; 54/54 tests green. Next: Plan 03-02 (pytest-HA WS/binary_sensor coverage + v0.3.0 tag)."
stopped_at: Completed 03-01-PLAN.md (Phase 3 Wave 1 — websocket.py + binary_sensor.py + manifest flip 0.3.0/local_push)
last_updated: "2026-04-20T20:48:09.354Z"
last_activity: 2026-04-20
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 9
  completed_plans: 8
  percent: 89
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-20)

**Core value:** One-click install and a live, push-driven dashboard card that controls the dispenser.
**Current focus:** Phase 3 Plan 1 LANDED (WebSocket client + binary_sensor + 0.3.0 manifest flip). Next: Plan 03-02 — test_websocket.py + test_binary_sensor.py + annotated v0.3.0 tag.

## Current Position

Phase: 3 of 6 (Realtime push) — IN PROGRESS
Plan: 1 of 2 in current phase complete (03-01 done; 03-02 next)
Status: Phase 3 Plan 1 landed — websocket.py (PartyDispenserWebSocketClient w/ reconnect + dispatcher) + binary_sensor.py (CONNECTIVITY entity) + __init__.py wired + manifest/test atomic flip to iot_class=local_push/version=0.3.0; 54/54 tests green.
Last activity: 2026-04-20

Progress: [█████████░] 89% (8 of 9 plans complete across phases 1-3; 03-02 is the next plan)

## Performance Metrics

**Velocity:**

- Total plans completed: 1
- Average duration: ~3 min
- Total execution time: 0.05 hours

**By Phase:**

| Phase | Plans | Total    | Avg/Plan |
|-------|-------|----------|----------|
| 1     | 1/3   | ~3 min   | ~3 min   |

**Per-Plan Metrics:**

| Plan          | Duration | Tasks   | Files   |
|---------------|----------|---------|---------|
| Phase 01 P01  | 3min     | 3 tasks | 7 files |

**Recent Trend:**

- Last 5 plans: ~3 min
- Trend: Baseline

*Updated after each plan completion*
| Phase 01-foundation-hacs-scaffolding P02 | 4 min | 3 tasks | 10 files |
| Phase 01-foundation-hacs-scaffolding P03 | 17 min | 3 tasks | 7 files |
| Phase 02-integration-core P02 | 7 min | 3 tasks | 10 files |
| Phase 02-integration-core P01 | 2min | 1 tasks | 1 files |
| Phase 02-integration-core P03 | 2min | 1 tasks | 1 files |
| Phase 02-integration-core P04 | 7min | 3 tasks | 11 files |
| Phase 03-realtime-push P01 | 6min | 3 tasks | 10 files |

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-04-20T20:47:53.164Z
Stopped at: Completed 03-01-PLAN.md (Phase 3 Wave 1 — websocket.py + binary_sensor.py + manifest flip 0.3.0/local_push)
Resume file: None
