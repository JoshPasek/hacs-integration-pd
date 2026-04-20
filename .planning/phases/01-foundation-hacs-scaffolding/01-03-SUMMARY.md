---
phase: 01-foundation-hacs-scaffolding
plan: 03
subsystem: infra
tags: [gitlab-ci, ruff, pytest, hassfest, semver, release, hacs]

# Dependency graph
requires:
  - phase: 01-foundation-hacs-scaffolding
    provides: "hacs.json + info.md (from 01-01) and pyproject.toml + tests/ + custom_components/party_dispenser/manifest.json (from 01-02) — consumed by CI jobs"
provides:
  - ".gitlab-ci.yml — 2-stage pipeline (lint → test); ruff 0.15.11 check + format --check; pytest tests/ -v runs all 26 Wave-0 + manifest tests"
  - "tests/test_integration_manifest.py — 16 bespoke tests that validate manifest.json's HACS-required fields, HA enum values (iot_class/integration_type), semver, URL shapes, and Phase-1-locked overrides (no DinD required)"
  - "Annotated semver tag v0.1.0 locally AND on origin, pointing at commit 593f780 — the first Phase-1 release tag"
  - "QA-04 skeleton slice: pipeline-must-succeed MR gate enabled (confirmed by user)"
  - "HACS-01 versioning slice: v0.1.0 is what HACS would install from this custom repository"
affects:
  - 02-01-PLAN and all subsequent Phase 2 plans (will extend .gitlab-ci.yml to add HA test dependencies)
  - 05-01-PLAN (Phase 5 replaces bespoke manifest tests with real hassfest + HACS action against GitHub mirror where DinD is natively available)
  - Phase 5 planners (must NOT assume DinD availability on self-hosted GitLab runners)
  - Phase 2+ planners (should include `ruff format .` as an action step BEFORE commits to avoid CI format-check failures)

# Tech tracking
tech-stack:
  added:
    - "GitLab CI (.gitlab-ci.yml) with python:3.12-slim default image, pip cache keyed by $CI_COMMIT_REF_SLUG"
    - "ruff 0.15.11 (pinned) as CI linter + formatter (check-only)"
    - "pytest runs all 26 tests including bespoke manifest validation (no HA install needed in Phase 1)"
  patterns:
    - "Phase-1 CI uses bespoke tests instead of hassfest where the runner cannot support DinD — structural invariants (required fields, enum values, semver, URL shapes) are asserted in Python/pytest. Real hassfest + HACS action deferred to Phase 5 against GitHub mirror."
    - "Annotated tags (not lightweight) carry a structured release message documenting phase contents + deviations + deferred work, so `git cat-file -p v0.1.0` is a human-readable release note."
    - "Tag push uses `git push origin <tag>` on the same branch the green pipeline ran on; no main-branch assumption."

key-files:
  created:
    - /Users/jamaze/projects/hacs-integration-pd/.gitlab-ci.yml
    - /Users/jamaze/projects/hacs-integration-pd/tests/test_integration_manifest.py
  modified:
    - /Users/jamaze/projects/hacs-integration-pd/custom_components/party_dispenser/__init__.py (ruff format — no semantic change)
    - /Users/jamaze/projects/hacs-integration-pd/tests/conftest.py (ruff format — no semantic change)
    - /Users/jamaze/projects/hacs-integration-pd/tests/test_hacs_manifest.py (ruff format — no semantic change)
    - /Users/jamaze/projects/hacs-integration-pd/tests/test_import.py (ruff format — no semantic change)
    - /Users/jamaze/projects/hacs-integration-pd/tests/test_info_md.py (ruff format — no semantic change)

key-decisions:
  - "Removed the docker-based hassfest validate-stage job because the project's Kubernetes GitLab runner disallows DinD, and the plan's scripted fallback (`python -m script.hassfest`) is not shippable — that module lives only in home-assistant/core's git repo, not in the PyPI homeassistant package."
  - "Added tests/test_integration_manifest.py (16 tests) to cover the same structural invariants hassfest checks (required fields, iot_class/integration_type enum membership, semver, URL shapes, domain pattern, Phase-1-locked overrides). Total CI tests 10 → 26, all green."
  - "Real hassfest + HACS action are now officially deferred to Phase 5, where they run against the GitHub mirror (GitHub Actions has DinD natively)."
  - "Tag v0.1.0 is annotated (not lightweight) with a multi-paragraph release message documenting phase contents, the CI deviation, and deferred Phase-5 work — so `git cat-file -p v0.1.0` reads as a release note."
  - "Ran `ruff format .` on the Phase 1 Python files committed by plan 01-02 (no semantic change) to unblock CI's `ruff format --check` step."

patterns-established:
  - "When a self-hosted runner blocks a tool that requires privileged containers, prefer re-implementing the tool's structural invariants as bespoke tests over waiting for infra changes — keeps Phase 1 shippable and defers the canonical tool to a phase where it's natively available."
  - "Annotated release tags carry structured, multi-section messages (What's included / Deviations / Deferred) so the tag itself is the release note."
  - "Phase 2+ plans should include `ruff format .` as an explicit action step BEFORE committing new Python files; `ruff format --check` in CI fails on any file that was not canonically formatted locally."

requirements-completed: [QA-04, HACS-01]

# Metrics
duration: ~17 min
completed: 2026-04-20
---

# Phase 01 Plan 03: GitLab CI Skeleton + v0.1.0 Release Tag Summary

**2-stage GitLab CI pipeline (ruff lint + pytest with 26 tests including 16 bespoke manifest invariants) green on commit 593f780, with annotated semver tag v0.1.0 pushed to origin — Phase 1 is shippable.**

## Performance

- **Duration:** ~17 min (wall-clock spanning Task 1 + human-verify checkpoint + Task 3)
- **Started:** 2026-04-20T17:28:24Z (first plan-03 commit)
- **Completed:** 2026-04-20T17:45:52Z (tag pushed + verified)
- **Tasks:** 3 (Task 1 auto, Task 2 human-verify checkpoint, Task 3 auto)
- **Files created:** 2 (.gitlab-ci.yml, tests/test_integration_manifest.py)
- **Files modified:** 5 (5 Python files reformatted by `ruff format .`, no semantic change)

## Accomplishments

- `.gitlab-ci.yml` pipeline green on commit `593f780` — ruff (check + format --check) + pytest (26 tests) — total pipeline duration under the <1 min target (per `01-CONTEXT.md`).
- Annotated semver tag `v0.1.0` created with a structured release message and pushed to origin GitLab (remote SHA `8ca047b`), pointing at commit `593f780`. This satisfies `01-CONTEXT.md`'s "v0.1.0 tag at phase completion" requirement, `ROADMAP.md` phase-1 success criterion #5, and the HACS-01 versioning slice (v0.1.0 is the version a HACS user would install).
- Version consistent across all 4 sources: `manifest.json` → `"version": "0.1.0"`, `const.py` → `VERSION = "0.1.0"`, `pyproject.toml` → `version = "0.1.0"`, git tag → `v0.1.0`.
- `tests/test_integration_manifest.py` (16 tests) replaces the docker-hassfest validate-stage job with bespoke checks on the same structural invariants — required fields, iot_class/integration_type enum membership, semver shape, URL shape, domain pattern, Phase-1-locked overrides. Net: CI test count 10 → 26, all green.
- "Pipelines must succeed" MR gate enabled in GitLab project settings (user-verified), which is the QA-04 skeleton-slice contract.

## Task Commits

| Task | Name | Commit | Type | Files |
|------|------|--------|------|-------|
| 1 (initial) | Create .gitlab-ci.yml with 3 jobs (ruff + import-smoke + hassfest) | `4e1d448` | feat | `.gitlab-ci.yml` (3-stage DinD-hassfest variant per plan as written) |
| 1 (deviation 1 — style) | Apply `ruff format .` to Phase 1 Python files to unblock CI's `ruff format --check` | `b385f80` | style | `custom_components/party_dispenser/__init__.py`, `tests/conftest.py`, `tests/test_hacs_manifest.py`, `tests/test_import.py`, `tests/test_info_md.py` |
| 1 (deviation 2 — CI restructure) | Replace docker-hassfest job with bespoke manifest tests (Kubernetes runner has no DinD) | `593f780` | fix | `.gitlab-ci.yml` (2-stage lint+test, no validate stage), `tests/test_integration_manifest.py` (+16 tests) |
| 2 | Human verifies GitLab pipeline runs green + enables "Pipelines must succeed" MR gate | (checkpoint — no commit) | — | — |
| 3 | Tag v0.1.0 and push to GitLab | (tag object `8ca047b`) | — | — |

**Plan metadata:** `af3a876` (docs: complete plan — bundles this SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md updates)

## Tag

- **Name:** `v0.1.0`
- **Type:** annotated (confirmed via `git cat-file -t v0.1.0` → `tag`)
- **Points at commit:** `593f780` (green-pipeline commit)
- **Local SHA:** created locally
- **Remote SHA:** `8ca047b93851019b345e687f952fa16292bbed6c` (from `git ls-remote --tags origin v0.1.0`)
- **Release message:** multi-paragraph note documenting Phase 1 contents (HACS metadata, Python skeleton, project config, Wave-0 tests, CI pipeline, license/ignore/README/card placeholder), CI-deviation note (docker-hassfest → bespoke tests; real hassfest deferred to Phase 5), and satisfied requirements (HACS-01, REL-01, QA-04 skeleton, DOC-03 stub).

## Files Created/Modified

- `/Users/jamaze/projects/hacs-integration-pd/.gitlab-ci.yml` — CREATED (initially 3-stage with DinD hassfest), then MODIFIED to 2-stage (lint → test) after Deviation 2
- `/Users/jamaze/projects/hacs-integration-pd/tests/test_integration_manifest.py` — CREATED (188 lines, 16 tests) as bespoke replacement for the hassfest docker job
- `/Users/jamaze/projects/hacs-integration-pd/custom_components/party_dispenser/__init__.py` — MODIFIED (ruff format, no semantic change, committed in `b385f80`)
- `/Users/jamaze/projects/hacs-integration-pd/tests/conftest.py` — MODIFIED (ruff format, no semantic change, committed in `b385f80`)
- `/Users/jamaze/projects/hacs-integration-pd/tests/test_hacs_manifest.py` — MODIFIED (ruff format, no semantic change, committed in `b385f80`)
- `/Users/jamaze/projects/hacs-integration-pd/tests/test_import.py` — MODIFIED (ruff format, no semantic change, committed in `b385f80`)
- `/Users/jamaze/projects/hacs-integration-pd/tests/test_info_md.py` — MODIFIED (ruff format, no semantic change, committed in `b385f80`)

## Decisions Made

All key decisions are captured in the frontmatter `key-decisions` list. The two architecturally-significant ones:

1. **Bespoke manifest tests instead of docker hassfest (Phase 1 scope).** When the Kubernetes runner was confirmed to block DinD and the plan's scripted fallback proved non-existent on PyPI, we replaced the docker-hassfest job with 16 bespoke tests covering the same structural invariants. Phase 5 re-introduces real hassfest + HACS action against the GitHub mirror (which has DinD natively through GitHub Actions).
2. **Annotated-tag-as-release-note.** The `v0.1.0` tag body is structured with What's-included / Deviations / Deferred sections, so `git cat-file -p v0.1.0` (or GitLab's tag UI) reads as a release note with no separate file needed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `ruff format --check` failed on Phase 1 Python files**

- **Found during:** Task 1 (first pipeline push — `ruff format --check .` failed)
- **Issue:** The CI lint job runs `ruff format --check .` which fails (non-zero) on any file that does not match ruff's canonical formatting. The Python files created in plan 01-02 (`custom_components/party_dispenser/__init__.py`, `tests/conftest.py`, `tests/test_hacs_manifest.py`, `tests/test_import.py`, `tests/test_info_md.py`) were not run through `ruff format` locally before commit, so the CI check failed on first push.
- **Reproduction:** `ruff format --check .` exited non-zero locally, pointing at the 5 files above.
- **Fix:** Ran `ruff format .` locally (no semantic change, pure whitespace/style alignment), committed the reformatted files as a single `style(01-02): apply ruff format — fix CI lint failure` commit, re-pushed.
- **Files modified:** 5 Python files (listed in Task 1 row of the commits table).
- **Verification:** Next CI run had a green ruff stage. `ruff format --check .` now exits 0 locally and in CI.
- **Committed in:** `b385f80`
- **Scope guard:** Pure style/whitespace — no logic changes. All previously-passing tests still pass.

**2. [Rule 3 - Blocking] Kubernetes GitLab runner disallows DinD; plan's scripted-hassfest fallback does not work**

- **Found during:** Task 1 (first pipeline push — the `hassfest` job failed)
- **Issue (two-part):**
  - **Part A:** The `hassfest` job as written uses `docker:25-dind` as a service. The project's GitLab runner (Kubernetes executor) does not permit privileged mode / DinD — the job failed with `Cannot connect to the Docker daemon at tcp://docker:2375` (matching the plan's own Task-2 troubleshooting row for "Runner does not allow DinD / privileged mode").
  - **Part B:** The plan's documented "Path B" scripted fallback — `pip install homeassistant && python -m script.hassfest --action validate --integration-path custom_components/party_dispenser` — does NOT work. The `script.hassfest` module lives only in the `home-assistant/core` git repository tree; it is NOT packaged in the PyPI `homeassistant` wheel/sdist. `python -m script.hassfest` on a pip-installed `homeassistant` produces `ModuleNotFoundError: No module named 'script'`.
- **Fix:**
  - Removed the `hassfest` job AND the `validate` stage from `.gitlab-ci.yml` (Phase-1 `stages: [lint, test]` now).
  - Added `tests/test_integration_manifest.py` — 16 bespoke tests covering the same structural invariants the canonical hassfest docker image would check: required fields (`domain`, `name`, `version`, `documentation`, `issue_tracker`, `codeowners`, `dependencies`, `requirements`, `iot_class`, `integration_type`, `config_flow`), `iot_class` enum membership (one of the 8 HA-documented values), `integration_type` enum membership (one of HA's 6 types), semver shape for `version`, URL shape for `documentation` + `issue_tracker`, domain-name regex (`^[a-z0-9_]+$`), and Phase-1-locked overrides (`iot_class == local_polling`, `integration_type == hub`, `config_flow == false`).
  - Real hassfest + HACS action are now officially deferred to Phase 5, where they run against the GitHub mirror via GitHub Actions (which has DinD natively through Docker Action support).
- **Files modified:** `.gitlab-ci.yml` (removed validate stage + hassfest job), `tests/test_integration_manifest.py` (new, 16 tests, 188 lines).
- **Verification:** Total CI test count 10 → 26, all green. `pytest tests/ -v` locally shows 26/26 passed. Pipeline green on `593f780` (user-confirmed in Task 2).
- **Committed in:** `593f780`
- **Scope guard:** The bespoke tests assert the same schema-level invariants hassfest checks; they do NOT replace hassfest's HA-version-matrix loader verification, which is why Phase 5 still re-introduces real hassfest against the GitHub mirror. The deviation is bounded — Phase 1 ships with a valid manifest; Phase 5 ships with a canonical validator.

---

**Total deviations:** 2 auto-fixed (both Rule 3 - Blocking)
**Impact on plan:** Both deviations were unavoidable given the environment (self-hosted runner + PyPI package reality). Neither relaxes the Phase-1 contract — the bespoke tests cover the same structural invariants, and Phase 5 re-introduces the canonical tools against the GitHub mirror. Phase 1 is shippable and the v0.1.0 release tag is justified.

## Notes for Future Planners

Two lessons distilled from the deviations above:

1. **Phase 2+ planners: add `ruff format .` as an explicit action step BEFORE any commit that creates new Python files.** CI's `ruff format --check` fails on any file that was not run through `ruff format` locally first. Either the executor runs the formatter before staging (preferred — cheap, no semantic change), or the plan's Phase-2+ `<action>` blocks should explicitly say so. Deviation 1 (commit `b385f80`) would not have occurred if plan 01-02's Task 1/3 action blocks had a final "run `ruff format .`" step.
2. **Phase 5 planners: do NOT assume DinD availability on self-hosted GitLab runners without explicit confirmation.** This project's runner is a Kubernetes executor with `privileged = false` (the safe default for production). Any Phase 5 plan that touches `.gitlab-ci.yml` and depends on `docker:25-dind` or any `services: docker:*` MUST either (a) confirm the runner config allows privileged pods, (b) use a runner-tag strategy to route to a DinD-enabled tag, or (c) fall back to non-Docker tooling (e.g., running hassfest + HACS action on GitHub Actions against the GitHub mirror, which is already the Phase 5 intent per `05-01-PLAN` preview in `ROADMAP.md`). Also: the plan's `python -m script.hassfest` fallback does NOT work against a PyPI-installed `homeassistant` — that module ships only in the `home-assistant/core` git tree. Phase 5 should either clone the core repo in CI (expensive) or rely on GitHub Actions' native `home-assistant/actions/hassfest@master` action instead of trying to run hassfest on GitLab.

## Issues Encountered

None beyond the two deviations above, both of which were resolved in-line during Task 1 iteration.

## Authentication Gates

None — the GitLab remote uses the `glab` credential helper, which is already configured for the user. Cosmetic `-25308` Keychain warnings appeared during `git push origin v0.1.0` but did not block the push (the new tag was created on the remote as confirmed by `git ls-remote --tags origin v0.1.0` returning `8ca047b93851019b345e687f952fa16292bbed6c refs/tags/v0.1.0`).

## User Setup Required

All three `user_setup` items from the plan frontmatter were resolved during the Task 2 human-verify checkpoint:

- **GitLab MR setting (`Pipelines must succeed`)** — user confirmed enabled.
- **GitLab runner privileged mode / DinD** — user confirmed the Kubernetes runner does NOT permit DinD. Resolved via Deviation 2 (bespoke manifest tests replace docker-hassfest; real hassfest deferred to Phase 5).
- **Tag push** — completed in Task 3 (this task). Tag `v0.1.0` is live on `origin` at remote SHA `8ca047b`.

No outstanding user setup for Phase 1.

## Next Phase Readiness

Phase 1 is COMPLETE. All 5 success criteria from `ROADMAP.md` phase-1 block are satisfied:

1. ✅ `custom_components/party_dispenser/{__init__.py,manifest.json,const.py}` minimally populated (from plan 01-02).
2. ✅ Root has `hacs.json`, `info.md`, `README.md`, `LICENSE` MIT (from plan 01-01).
3. ✅ Integration loads without errors — `async_setup_entry` is a no-op stub returning `True` (plan 01-02).
4. ✅ GitLab CI pipeline exists with lint + basic import test jobs, green on commit `593f780` (this plan).
5. ✅ Semver tagging strategy documented (in `01-CONTEXT.md`, reinforced in tag body) AND `v0.1.0` tagged on origin (this plan).

**Ready for Phase 2:** Config flow (`CFG-01..03`) + coordinator + REST client + sensors + services — see `ROADMAP.md` Phase 2 block. The HACS + CI shell is in place; Phase 2 will flip `config_flow=true` in manifest.json and extend `.gitlab-ci.yml` to add the `pytest-homeassistant-custom-component` test dependency.

**Known minor notes carried forward (non-blocking, already documented in 01-02 SUMMARY):**
- `01-RESEARCH.md §Pitfall 4` and `01-02-PLAN.md` Task 1 action still carry the incorrect "`from __future__ import annotations` defers module-scope imports" claim. Documentation out-of-scope for this plan; flagged for Phase 2 / future planners.
- `pytest-asyncio` not installed in Phase 1 → harmless `Unknown config option: asyncio_mode` warning. Phase 2 should install it (first test file that uses `async def` will need it).

## Known Stubs

None introduced by this plan. The plan added CI scaffolding + a release tag; it did not add any user-facing stubs. (Phase 1's intentional stubs — card placeholder, Phase 6 README, info.md stub — were all introduced in 01-01 and are documented in 01-01 SUMMARY's "Known Stubs" section.)

## Self-Check: PASSED

All referenced files exist on disk (`.gitlab-ci.yml`, `tests/test_integration_manifest.py`, all 5 reformatted Python files, and this SUMMARY.md). All 3 task commits (`4e1d448`, `b385f80`, `593f780`) are present in `git log --oneline --all`. Local tag `v0.1.0` exists and remote tag `v0.1.0` is confirmed via `git ls-remote --tags origin` (remote SHA `8ca047b`).

---
*Phase: 01-foundation-hacs-scaffolding*
*Completed: 2026-04-20*
