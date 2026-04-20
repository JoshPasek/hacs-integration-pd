# Phase 1: Foundation & HACS scaffolding — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Source:** Synthesized from INTAKE.md (root PRD) + PROJECT.md + REQUIREMENTS.md

<domain>
## Phase Boundary

Phase 1 produces a **structurally valid HACS custom repository** at `gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd`. The integration must load cleanly in Home Assistant as a no-op (no entities, no services — that's Phase 2) AND the repo must satisfy every HACS structural/metadata requirement so a user running HACS "Add custom repository" against the (future) GitHub mirror URL is accepted without validation errors.

**In scope for this phase:**
- Repo layout and directory scaffolding for both integration (`custom_components/party_dispenser/`) and card (`www/community/party-dispenser-card/` — directory + stub only, no build yet)
- HACS metadata: root `hacs.json`, integration `manifest.json`, `info.md`
- Home Assistant integration Python skeleton with empty `async_setup_entry`/`async_unload_entry`
- `const.py` with `DOMAIN`, `VERSION`, `MANUFACTURER`
- Root project files: `README.md` (stub — full version in Phase 6), `LICENSE` (MIT), `.gitignore`
- `.gitlab-ci.yml` skeleton with: Python lint (`ruff`), Python syntax/import test, HACS action validation (via docker)
- Semver strategy: v0.1.0 tag pushed at phase completion
- GitLab CI runner confirmed working (lint + import test go green)

**Out of scope for this phase (deferred):**
- Config flow logic (Phase 2)
- Any actual entity, platform, or service (Phase 2)
- WebSocket client (Phase 3)
- Card build tooling, bundling, UI (Phase 4)
- GitHub mirror CI (Phase 5)
- Full README, migration guide, screenshots (Phase 6)

</domain>

<decisions>
## Implementation Decisions

### Repo layout (LOCKED)
- Single repo containing both the HA integration AND the Lovelace card
- Integration path: `custom_components/party_dispenser/`
- Card path: `www/community/party-dispenser-card/`
- Root-level HACS metadata covers both
- HACS repo-type: **integration** (single category — HACS enforces one-per-repo per research findings, verified against `custom_components/hacs/utils/validate.py`). Shipping mechanism for the card is deferred to Phase 4 and will choose between: (a) the embedded-card pattern (integration registers the card as a Lovelace resource at startup — single HACS install), or (b) split the card into a second HACS repo published under the `plugin` category. Phase 1 keeps both options open by scaffolding directories at both `custom_components/party_dispenser/` and `www/community/party-dispenser-card/`.

### Integration manifest (LOCKED values)
- `domain`: `party_dispenser`
- `name`: "Party Dispenser"
- `version`: `0.1.0`
- `documentation`: `https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd`
- `issue_tracker`: same as documentation + `/-/issues`
- `codeowners`: `[]` (single maintainer; can add later)
- `requirements`: `[]` (Phase 1 adds no third-party Python deps)
- `iot_class`: `local_polling` (conservative / truthful for a no-op v0.1.0; Phase 3 flips to `local_push` once the WebSocket client lands — decision per research findings)
- `config_flow`: `false` in v0.1.0 (no config flow logic yet; Phase 2 flips this to `true`)
- `integration_type`: `hub` (forward-compatible for multi-dispenser v2 per MULTI-01 — lets one config entry represent N devices without a breaking manifest change; decision per research findings)

### hacs.json (LOCKED values)
- `name`: "Party Dispenser"
- `homeassistant`: `2026.1.0` (min HA Core version)
- `content_in_root`: `false`
- `zip_release`: `false`

### Python skeleton (LOCKED)
- `__init__.py` exports `async_setup_entry(hass, entry) -> True` and `async_unload_entry(hass, entry) -> True` — both no-ops returning True
- `const.py` exports `DOMAIN = "party_dispenser"`, `VERSION = "0.1.0"`, `MANUFACTURER = "PartyDispenser"`
- `strings.json` with config-flow placeholder strings (empty flow for now; structure ready for Phase 2)
- No `config_flow.py` yet (Phase 2)

### License (LOCKED)
- MIT (HACS convention; matches expected community-plugin licensing)
- Copyright holder: "Party Dispenser contributors"

### CI skeleton (LOCKED)
- Stages: `lint`, `test`
- Python 3.12 image
- `ruff` for lint (config in `pyproject.toml` with default ruleset + per-file ignores for `__init__.py`)
- Import test: `python -c "import custom_components.party_dispenser"` passes
- HACS validation: use `home-assistant/actions` GitHub action OR equivalent docker image in GitLab CI. Research agent to check if a first-party GitLab-compatible validator exists; if not, shell out to `hacs-action` container.

### Versioning (LOCKED)
- Semver
- v0.1.0 tag at phase completion
- Tag format: `v{MAJOR}.{MINOR}.{PATCH}` (with `v` prefix — matches GitHub + HACS conventions)

### Claude's Discretion
- Exact ruff config (rules, line length) — follow project convention, default to 100-char line, extend-select sensible rules
- `.gitignore` contents — standard Python + Node ignores plus HA-specific (`.pytest_cache`, `.ruff_cache`, `node_modules`, `dist/`)
- `info.md` — minimal content for Phase 1 (full in Phase 6)
- Stub README content — 1–2 paragraphs + placeholders for future sections
- Whether to include a `pyproject.toml` in Phase 1 (recommended: yes, enables `ruff` config and future packaging)
- Directory placeholders for `tests/` with a single smoke-import test

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `INTAKE.md` — Original PRD / scope brief
- `.planning/PROJECT.md` — Vision, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 32 requirement IDs with phase traceability
- `.planning/ROADMAP.md` — 6-phase roadmap with goals and success criteria

### HACS specs (external — researcher should pull current docs)
- HACS integration structure: https://hacs.xyz/docs/publish/integration
- HACS plugin (card) structure: https://hacs.xyz/docs/publish/plugin
- HACS action (repo validator): https://github.com/hacs/action

### Home Assistant conventions
- Integration manifest spec: https://developers.home-assistant.io/docs/creating_integration_manifest
- Integration file structure: https://developers.home-assistant.io/docs/creating_integration_file_structure
- Integration quality scale: https://developers.home-assistant.io/docs/core/integration-quality-scale (aspirational — we aim for at least silver by v1.0)

### Existing reference
- `ava-organization/party-dispenser/party-dispenser-main` repo on the same GitLab — specifically `config/packages/party_dispenser.yaml` for the functional parity contract (the HACS plugin must ultimately replace everything this YAML does). Phase 1 only needs to know this exists; later phases reference it directly.

</canonical_refs>

<specifics>
## Specific Ideas

**Requirement mapping for Phase 1:**
- HACS-01: HACS-installable as custom repository — satisfied by valid `hacs.json` + `manifest.json` + `info.md` + repo structure
- REL-01: Primary repo on GitLab — ✓ (already done as part of project init; Phase 1 just needs to ensure CI runs there)
- QA-04: CI pipeline runs lint + tests on every push — Phase 1 covers the *skeleton* (lint + import test). Full test suite is Phase 5.
- DOC-03: `info.md` renders correctly in HACS UI — Phase 1 covers stub with correct markdown subset; full content Phase 6.

**Dev convenience:**
- Add a `Makefile` or `justfile` with targets: `lint`, `test`, `install` (pip install -e .) — gives contributors a consistent entry point and helps CI stay in sync
- Include `pyproject.toml` with ruff + pytest config even though Phase 1 doesn't *run* pytest heavily

**Card placeholder:**
- Even though the card isn't built in Phase 1, create the directory `www/community/party-dispenser-card/` with a `.gitkeep` and a stub `README.md` so Phase 4's work isn't blocked on layout decisions

**Gitignore specifics:**
- Ignore `.env`, `.env.local`, `*.pyc`, `__pycache__/`, `.pytest_cache/`, `.ruff_cache/`, `dist/`, `build/`, `*.egg-info/`, `.coverage`, `node_modules/`, `package-lock.json` (if card dev produces one and we commit `package.json` only — decide in Phase 4), `.DS_Store`

</specifics>

<deferred>
## Deferred Ideas

- **Public HACS store listing** — requires public GitHub repo + HACS maintainer review; v2 decision (from PROJECT.md Out of Scope)
- **Multi-dispenser support** — v2 (MULTI-01, MULTI-02)
- **i18n** — v2 (from PROJECT.md Out of Scope)
- **GitHub mirror CI** — Phase 5
- **Actual config flow + entities + services** — Phase 2
- **WebSocket client + binary_sensor.connected** — Phase 3
- **Full README content + migration guide + screenshots** — Phase 6
- **Card build tooling (rollup, lit-element, TS)** — Phase 4

---

*Phase: 01-foundation-hacs-scaffolding*
*Context gathered: 2026-04-20 via PRD synthesis from INTAKE.md*
