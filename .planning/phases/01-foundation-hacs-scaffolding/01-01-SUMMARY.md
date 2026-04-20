---
phase: 01-foundation-hacs-scaffolding
plan: 01
subsystem: infra
tags: [hacs, home-assistant, mit-license, gitignore, markdown]

# Dependency graph
requires: []
provides:
  - HACS custom-repository root metadata (hacs.json, info.md)
  - MIT LICENSE with "Party Dispenser contributors" copyright
  - Python + Node + HA .gitignore baseline
  - Phase 1 stub README.md (GitLab-default template replaced)
  - www/community/party-dispenser-card/ placeholder directory (unblocks Phase 4 layout)
affects:
  - 01-02-PLAN.md (Python package skeleton sits inside this HACS shell)
  - 01-03-PLAN.md (CI runs against this .gitignore + root layout)
  - Phase 4 (card build uses the placeholder directory)
  - Phase 6 (replaces README.md stub with full docs)

# Tech tracking
tech-stack:
  added:
    - "HACS 2.0.5 hacs.json schema (2-key minimal: name + homeassistant)"
    - "MIT License (HACS convention)"
  patterns:
    - "HACS PREVENT_EXTRA-compliant metadata (only whitelisted keys in hacs.json)"
    - "CommonMark-subset info.md (no GitHub <picture>, no > [!NOTE] blockquotes)"
    - "Phase-gated stubs: Phase 1 scaffolds, later phases expand (README Phase 6, card Phase 4)"

key-files:
  created:
    - /Users/jamaze/projects/hacs-integration-pd/hacs.json
    - /Users/jamaze/projects/hacs-integration-pd/info.md
    - /Users/jamaze/projects/hacs-integration-pd/LICENSE
    - /Users/jamaze/projects/hacs-integration-pd/.gitignore
    - /Users/jamaze/projects/hacs-integration-pd/www/community/party-dispenser-card/.gitkeep
    - /Users/jamaze/projects/hacs-integration-pd/www/community/party-dispenser-card/README.md
  modified:
    - /Users/jamaze/projects/hacs-integration-pd/README.md (overwrote GitLab-default with Phase 1 stub)

key-decisions:
  - "hacs.json kept at 2 keys (name + homeassistant) — omitted content_in_root/zip_release defaults as intentionally noisy per 01-RESEARCH.md"
  - "MIT License with 'Copyright (c) 2026 Party Dispenser contributors' per 01-CONTEXT.md LOCKED value"
  - ".gitignore excludes card .js files (Phase 4 build artifacts) but NOT the card README.md; dropped the misleading no-op '!...README.md' negation line"
  - "Card placeholder ships .gitkeep + README only — NO .js file (HACS one-category-per-repo per 01-RESEARCH.md Pitfall 1)"

patterns-established:
  - "Stub convention: Phase 1 files that later phases expand carry an explicit 'Phase N' marker in their body so reviewers see scope intentionally deferred"
  - "HACS metadata minimalism: only keys HACS validates; skip defaults to avoid PREVENT_EXTRA mistakes later"
  - "Directory preservation via .gitkeep for placeholders that must stay empty"

requirements-completed:
  - HACS-01
  - REL-01
  - DOC-03

# Metrics
duration: ~3 min
completed: 2026-04-20
---

# Phase 01 Plan 01: HACS Root Metadata Summary

**HACS-valid custom-repository root scaffolding: hacs.json (2-key minimal), info.md (CommonMark-subset stub), MIT LICENSE, Python+Node+HA .gitignore, Phase 1 README stub, and Phase-4 card-placeholder directory.**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-20T17:12:10Z
- **Completed:** 2026-04-20T17:14:14Z
- **Tasks:** 3
- **Files created:** 6 (hacs.json, info.md, LICENSE, .gitignore, card/.gitkeep, card/README.md)
- **Files modified:** 1 (README.md)

## Accomplishments

- `hacs.json` now satisfies the HACS 2.0.5 schema (verified with Python JSON load and key-whitelist check against PREVENT_EXTRA). A HACS user adding this repo with category=Integration sees name="Party Dispenser" and min HA 2026.1.0.
- `info.md` renders as valid HACS CommonMark subset (no `<picture>`, no `> [!NOTE]`), contains install-path hint and GitLab issues link.
- MIT `LICENSE` carries exactly the CONTEXT-locked copyright line `Copyright (c) 2026 Party Dispenser contributors`.
- `.gitignore` covers Python caches (`__pycache__`, `.ruff_cache`, `.pytest_cache`), Node tooling (`node_modules`, `*.tsbuildinfo`, `yarn.lock`), Phase 4 card build artifacts (`www/community/party-dispenser-card/dist/`, `*.js` in that dir), env files (with `.env.example` allowlisted), local dev HA config, and OS noise (`.DS_Store`). The plan explicitly removed the previous draft's misleading no-op negation `!www/community/party-dispenser-card/README.md` — the card README is tracked because no preceding rule ignores it.
- Root `README.md` replaced the GitLab-generated default with a Phase 1 stub pointing at `LICENSE`, GitLab issues, and `.planning/ROADMAP.md`.
- `www/community/party-dispenser-card/` exists with a zero-byte `.gitkeep` and a stub `README.md` that explicitly forbids shipping `.js` files before Phase 4 (per 01-RESEARCH.md Pitfall 1: HACS supports exactly one category per repository).

## Task Commits

Each task was committed atomically:

1. **Task 1: HACS root metadata (hacs.json + info.md)** — `0dd0620` (feat)
2. **Task 2: LICENSE + .gitignore + stub README** — `79d7c0f` (feat)
3. **Task 3: Card placeholder directory** — `76852a2` (feat)

**Plan metadata:** (pending final docs commit below — see Next section)

## Files Created/Modified

- `hacs.json` — HACS custom-repository metadata: `{"name": "Party Dispenser", "homeassistant": "2026.1.0"}` (intentional 2-key minimum; omits `content_in_root`/`zip_release` defaults per 01-RESEARCH guidance)
- `info.md` — HACS UI stub (CommonMark-subset) with install hint, README link, GitLab issues link
- `LICENSE` — Canonical MIT text with `Copyright (c) 2026 Party Dispenser contributors`
- `.gitignore` — Python + Node + HA + OS ignore rules; excludes Phase 4 card `.js` build artifacts; no misleading no-op negation
- `README.md` — Overwritten: Phase 1 scaffold notice with status, LICENSE link, GitLab issues link, and pointer to `.planning/ROADMAP.md` (full docs in Phase 6)
- `www/community/party-dispenser-card/.gitkeep` — Empty (0 bytes) directory marker
- `www/community/party-dispenser-card/README.md` — Phase 1 placeholder stub that forbids shipping `.js` here before Phase 4's category decision

## Decisions Made

All decisions were LOCKED in 01-CONTEXT.md and copy-ready in the PLAN `<action>` blocks; no independent choices made during execution.

- **hacs.json minimalism:** Two keys only (no `content_in_root`, no `zip_release`). Defaults are implicit and omitted per 01-RESEARCH.md "setting them explicitly is allowed but noisy".
- **MIT copyright line:** Exact string `Copyright (c) 2026 Party Dispenser contributors` per 01-CONTEXT.md LOCKED value.
- **Dropped `.gitignore` negation:** The plan called out that a preceding draft's `!www/community/party-dispenser-card/README.md` was a misleading no-op (nothing ignored that path). Executor confirmed its absence via `! grep -q '^!www/community/party-dispenser-card/README\.md$' .gitignore`.
- **Card placeholder: no .js:** Per 01-RESEARCH.md Pitfall 1 (HACS one-category-per-repo), Phase 1 publishes as `integration`. A `.js` file here before Phase 4 would be ignored by HACS and confuse reviewers.

## Deviations from Plan

None — plan executed exactly as written. Every file content, every verification command, every acceptance criterion matched the PLAN verbatim.

## Known Stubs

All "stubs" here are intentional per plan scope and are explicitly tied to later phases. The verifier/future-Claude should NOT treat these as incomplete work:

- **`README.md`** — Phase 1 scaffold notice. Plan explicitly states "Installation instructions land in Phase 6". Full replacement comes in Phase 6 (DOC-01).
- **`info.md`** — Phase 1 UI stub (DOC-03 stub). Full content in Phase 6 (DOC-03 full).
- **`www/community/party-dispenser-card/README.md`** — Phase 1 placeholder README. The card itself is built in Phase 4 (UI-01..UI-07, QA-03). File explicitly forbids shipping `.js` here before Phase 4.
- **`www/community/party-dispenser-card/.gitkeep`** — Empty by design. Removed when Phase 4 adds real card source.

No stub blocks this plan's goal (HACS-recognizable repo root) from being achieved.

## Issues Encountered

None.

## User Setup Required

None — plan frontmatter `user_setup: []`. No external service configuration, no environment variables, no dashboard steps required. The artifacts are pure repo files.

## Next Phase Readiness

Ready for 01-02-PLAN.md (Python package skeleton + pyproject.toml + Wave-0 tests). The HACS shell is in place; 01-02 populates `custom_components/party_dispenser/`. Ready for 01-03-PLAN.md (GitLab CI skeleton) to run lint + import tests against the layout established here and in 01-02.

**Dependencies satisfied for Phase 1:**
- HACS-01 structural requirements: root `hacs.json` + `info.md` exist (manifest.json lands in 01-02 — still part of Phase 1).
- REL-01: Primary GitLab repo at `gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd` exists and now carries HACS root artifacts.
- DOC-03 stub: `info.md` renders in HACS UI per CommonMark subset.

## Self-Check: PASSED

Verified all 7 files listed in frontmatter exist on disk (6 created + 1 modified). All 3 task commits present in `git log`. SUMMARY.md itself exists at the declared path. No missing items.

---
*Phase: 01-foundation-hacs-scaffolding*
*Completed: 2026-04-20*
