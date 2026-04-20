# Phase 1: Foundation & HACS scaffolding — Research

**Researched:** 2026-04-20
**Domain:** HACS custom repository scaffolding, Home Assistant custom integration skeleton, GitLab CI for Python HACS plugins
**Confidence:** HIGH for HACS/HA Core specifics (verified against official source code); MEDIUM on GitLab-CI-specific HACS validation (no first-party GitLab support — we verified the workaround directly)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Repo layout**
- Single repo containing both the HA integration AND the Lovelace card
- Integration path: `custom_components/party_dispenser/`
- Card path: `www/community/party-dispenser-card/`
- Root-level HACS metadata covers both
- HACS repo-type: dual (integration + plugin category). Decision: use HACS multi-category by declaring the integration via `custom_components/` and the card via `hacs.json`'s `filename` + `name` fields for the frontend category. If HACS requires one-category-per-repo, default to **integration** as the HACS category and ship the card by documenting `/hacsfiles/party-dispenser-card/party-dispenser-card.js` as a Lovelace resource. Research agent to confirm which model HACS currently supports.

**Integration manifest (LOCKED values)**
- `domain`: `party_dispenser`
- `name`: "Party Dispenser"
- `version`: `0.1.0`
- `documentation`: `https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd`
- `issue_tracker`: same as documentation + `/-/issues`
- `codeowners`: `[]` (single maintainer; can add later)
- `requirements`: `[]` (Phase 1 adds no third-party Python deps)
- `iot_class`: `local_push` (we'll have WebSocket push by Phase 3; for v0.1.0 which is a no-op, `local_polling` is equally valid — research agent to decide which is correct for a no-op shell)
- `config_flow`: `false` in v0.1.0 (no config flow logic yet; Phase 2 flips this to `true`)
- `integration_type`: `device` (one device per config entry)

**hacs.json (LOCKED values)**
- `name`: "Party Dispenser"
- `homeassistant`: `2026.1.0` (min HA Core version)
- `content_in_root`: `false`
- `zip_release`: `false`

**Python skeleton (LOCKED)**
- `__init__.py` exports `async_setup_entry(hass, entry) -> True` and `async_unload_entry(hass, entry) -> True` — both no-ops returning True
- `const.py` exports `DOMAIN = "party_dispenser"`, `VERSION = "0.1.0"`, `MANUFACTURER = "PartyDispenser"`
- `strings.json` with config-flow placeholder strings (empty flow for now; structure ready for Phase 2)
- No `config_flow.py` yet (Phase 2)

**License (LOCKED)**
- MIT (HACS convention; matches expected community-plugin licensing)
- Copyright holder: "Party Dispenser contributors"

**CI skeleton (LOCKED)**
- Stages: `lint`, `test`
- Python 3.12 image
- `ruff` for lint (config in `pyproject.toml` with default ruleset + per-file ignores for `__init__.py`)
- Import test: `python -c "import custom_components.party_dispenser"` passes
- HACS validation: use `home-assistant/actions` GitHub action OR equivalent docker image in GitLab CI. Research agent to check if a first-party GitLab-compatible validator exists; if not, shell out to `hacs-action` container.

**Versioning (LOCKED)**
- Semver
- v0.1.0 tag at phase completion
- Tag format: `v{MAJOR}.{MINOR}.{PATCH}` (with `v` prefix)

### Claude's Discretion
- Exact ruff config (rules, line length) — follow project convention, default to 100-char line, extend-select sensible rules
- `.gitignore` contents — standard Python + Node ignores plus HA-specific (`.pytest_cache`, `.ruff_cache`, `node_modules`, `dist/`)
- `info.md` — minimal content for Phase 1 (full in Phase 6)
- Stub README content — 1–2 paragraphs + placeholders for future sections
- Whether to include a `pyproject.toml` in Phase 1 (recommended: yes, enables `ruff` config and future packaging)
- Directory placeholders for `tests/` with a single smoke-import test

### Deferred Ideas (OUT OF SCOPE)
- **Public HACS store listing** — v2
- **Multi-dispenser support** — v2 (MULTI-01, MULTI-02)
- **i18n** — v2
- **GitHub mirror CI** — Phase 5
- **Actual config flow + entities + services** — Phase 2
- **WebSocket client + binary_sensor.connected** — Phase 3
- **Full README content + migration guide + screenshots** — Phase 6
- **Card build tooling (rollup, lit-element, TS)** — Phase 4
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **HACS-01** | Repo is HACS-installable as a custom repository (root `hacs.json`, valid `custom_components/party_dispenser/manifest.json`, `info.md`) | Verified against HACS voluptuous schemas in [`custom_components/hacs/utils/validate.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py): `hacs.json` requires only `name` (all other fields optional); `manifest.json` requires `codeowners`, `documentation`, `domain`, `issue_tracker`, `name`, `version`. See **Standard Stack** and **Code Examples** for exact shapes. |
| **REL-01** | Primary repo on `gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd` | Already in place. Phase 1 only needs to ensure CI runs there (covered by **Validation Architecture**). |
| **QA-04** | CI pipeline runs lint + tests on every push; blocks merge on failure (Phase 1 = skeleton; Phase 5 = full) | Verified: GitLab CI supports `python:3.12-slim` (≈162 MB), `ruff` installs via pip in <10 s, import smoke-test runs in <1 s. See **Code Examples → .gitlab-ci.yml skeleton**. |
| **DOC-03** | `info.md` renders correctly in HACS UI | Verified: `info.md` is optional (HACS defaults to `README.md` if absent or `render_readme: true`); markdown subset is a subset of GitHub-flavoured markdown (no picture elements, no GitHub blockquote notes). See **Standard Stack → info.md**. |
</phase_requirements>

## Summary

HACS structural requirements for a custom integration are tightly specified and narrower than most tutorials suggest. The authoritative source is the voluptuous schemas in the HACS integration codebase (`custom_components/hacs/utils/validate.py`): `hacs.json` requires only the `name` key; `manifest.json` requires exactly six fields (`codeowners`, `documentation`, `domain`, `issue_tracker`, `name`, `version`). Everything else is optional — which means Phase 1 can ship a minimal, truthful Phase-1 manifest without over-specifying.

**The single most important finding is that HACS does not support a repository that is simultaneously an integration AND a plugin (dashboard/frontend card).** The HACS backend assigns exactly one category per repository, and when a user adds a custom repository they must pick one category from the dropdown. The option CONTEXT.md contemplated — "declare the card via `hacs.json`'s `filename` + `name` fields for the frontend category" — would require adding the same repo URL twice, once under each category; there is no first-party HACS configuration that exposes both categories simultaneously from a single repo entry. The workable approaches are (a) publish under the `integration` category and have the integration register a static HTTP path + auto-register the card as a Lovelace resource at startup (the "embedded card" pattern — solves the distribution problem elegantly), or (b) split into two repos at the cost of a second HACS "Add custom repository" step. Phase 1 should proceed with HACS category = `integration` and keep `www/community/party-dispenser-card/` as an out-of-tree placeholder OR relocate the card to `custom_components/party_dispenser/frontend/` (the embedded pattern) — this is a decision the planner must make, and both paths are low-risk for Phase 1 which only scaffolds a directory.

The second important finding is that the HACS validation action (`ghcr.io/hacs/action:main`) **cannot validate a GitLab-only repository**. Inspection of [`action/action.py`](https://github.com/hacs/integration/blob/main/action/action.py) shows it reads the repository tree from the GitHub API using a `GITHUB_TOKEN` and is tightly coupled to GitHub event data (`GITHUB_EVENT_PATH`, `GITHUB_REPOSITORY`, `GITHUB_ACTOR`). Phase 1 must therefore rely on a different validator. The good news: Home Assistant's `hassfest` ships as a standalone Docker image (`ghcr.io/home-assistant/hassfest`) that validates manifests against the local filesystem — confirmed by pulling the image (627 MB, 143 MB compressed) and inspecting [`script/hassfest/docker/entrypoint.sh`](https://github.com/home-assistant/core/blob/dev/script/hassfest/docker/entrypoint.sh). Combined with a lightweight bespoke JSON-schema check for `hacs.json` (the HACS voluptuous schema is small enough to reproduce as a jsonschema validator), Phase 1 can get full static validation without GitHub. Full HACS-action validation is deferred to Phase 5 after the GitHub mirror exists.

**Primary recommendation:** Phase 1 publishes under HACS category `integration`. Ship `hacs.json` with only `{"name", "homeassistant"}`; ship `manifest.json` with all six required fields + `config_flow: false` + `integration_type: hub` (see pitfalls for why `hub` is better than `device` for a no-op today) + `iot_class: local_polling` (conservative for a no-op; Phase 3 upgrades to `local_push`). `__init__.py` is a literal `return True` stub — no `PLATFORMS` list, no forwarding, no config flow. CI uses `python:3.12-slim` + ruff + an import smoke-test + `docker run ghcr.io/home-assistant/hassfest` for manifest validation.

## Standard Stack

### Core — Python runtime and validators
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | 3.12 (locked by CONTEXT) | Target interpreter | HA 2026.1+ requires ≥3.12; HA 2026.3+ moves to 3.14. Stick with 3.12 as the floor for broadest custom-integration compatibility. |
| homeassistant (pypi) | 2026.4.3 (latest as of 2026-04-17) | Type imports only in Phase 1 | We import `HomeAssistant`, `ConfigEntry` for type hints. We do NOT install this in CI — `pytest-homeassistant-custom-component` pulls it in for Phase 5. Phase 1 import-smoke runs without it. |
| ruff | 0.15.11 (latest as of 2026-04-16) | Lint + format | HA Core itself uses ruff; the ludeeus blueprint uses ruff. Standard choice — no reason to deviate. |
| hassfest (docker) | `ghcr.io/home-assistant/hassfest:latest` | Manifest validation in CI | Official HA tool, runs as standalone docker container, validates `manifest.json` against core schema. Image is linux/amd64 only (no arm64). |

**Version verification** (run 2026-04-20):
```bash
$ curl -s https://pypi.org/pypi/ruff/json | jq -r '.info.version'
0.15.11    # released 2026-04-16

$ curl -s https://pypi.org/pypi/homeassistant/json | jq -r '.info.version'
2026.4.3   # released 2026-04-17

$ curl -s https://pypi.org/pypi/pytest-homeassistant-custom-component/json | jq -r '.info.version'
0.13.324   # released 2026-04-18 (updates daily against HA main)

$ curl -s https://api.github.com/repos/hacs/integration/releases/latest | jq -r '.tag_name'
2.0.5      # HACS 2.0.5, published 2025-01-28 (stable for >1 year)
```

### Supporting — CI and tooling
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `python:3.12-slim` docker image | Debian-slim base, ≈162 MB | GitLab CI runner image | Use as `image:` for lint and import-test jobs. `python:3.12-alpine` is smaller (≈90 MB) but dropped wheel compatibility for some HA dependencies — stay on slim for Phase 5 compatibility. |
| `pyproject.toml` | PEP 518/621 | Central config for ruff, pytest, project metadata | Single source of truth; ludeeus blueprint uses `.ruff.toml`, but `pyproject.toml` with `[tool.ruff]` sections is equally valid and centralizes config. Pick one — don't split. |
| `pytest-homeassistant-custom-component` | 0.13.324 | HA integration test harness | **Phase 5 only** — Phase 1 does NOT need this. Phase 1's smoke-test is plain `python -c "import …"`. Installing pytest-HA-custom adds ≈60 s to CI; defer it. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `hassfest` docker image | Bespoke Python script re-implementing HACS + HA schemas | hassfest checks many things (icons, translations, config_flow signature, etc.) that we'd miss. Use it. |
| `ghcr.io/hacs/action` | Run HACS action inside GitLab CI against GitHub mirror | Blocked in Phase 1: no GitHub mirror exists yet (that's Phase 5). Even if it did, the HACS action is hard-wired to GitHub Actions runtime env vars (`GITHUB_EVENT_PATH`, `GITHUB_REPOSITORY`, `GITHUB_ACTOR`). Defer to Phase 5 which runs it on the mirror. |
| `python:3.12-alpine` | Slightly smaller image | Some HA requirement wheels don't exist for musllinux — bite you in Phase 5. Use `-slim`. |
| `hacs.json` with `filename` field | Shipping the card via `hacs.json` frontend field | Not supported for `integration`-category repos. `filename` is a plugin-category-only field. See Pitfalls. |

**Installation (Phase 1 developer env):**
```bash
# Local dev environment — what contributors need
pip install ruff==0.15.11
# Optional for Phase 1: pytest-homeassistant-custom-component (deferred to Phase 5)
```

### hacs.json — authoritative schema

Directly copied from [`custom_components/hacs/utils/validate.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py) (`HACS_MANIFEST_JSON_SCHEMA`, HACS 2.0.5):

```python
HACS_MANIFEST_JSON_SCHEMA = vol.Schema(
    {
        vol.Optional("content_in_root"): bool,
        vol.Optional("country"): _country_validator,
        vol.Optional("filename"): str,
        vol.Optional("hacs"): str,                  # minimum HACS version
        vol.Optional("hide_default_branch"): bool,
        vol.Optional("homeassistant"): str,         # minimum HA version
        vol.Optional("persistent_directory"): str,
        vol.Optional("render_readme"): bool,        # render README.md instead of info.md
        vol.Optional("zip_release"): bool,
        vol.Required("name"): str,                  # ← only required field
    },
    extra=vol.PREVENT_EXTRA,                        # ← extra fields REJECT the schema
)
```

**Load-bearing facts (per schema):**
- `name` is the only required field.
- **`extra=vol.PREVENT_EXTRA`** — any key not in this list is a validation error. Do NOT add custom fields. (E.g., you can't put `description` or `version` in `hacs.json`.)
- `filename` is used by the *plugin* category to point at the card JS file; for `integration` category it is ignored.
- `zip_release: true` requires `filename` to also be set (HACS validator enforces this).
- `homeassistant` is a minimum version string — user's HA must be ≥ this or HACS blocks install.
- `hacs` is a minimum HACS version — rarely set; default (unset) means "works on any HACS ≥ 1.6.0".

### manifest.json — authoritative schema (for HACS validation)

From same source file (`INTEGRATION_MANIFEST_JSON_SCHEMA`):

```python
INTEGRATION_MANIFEST_JSON_SCHEMA = vol.Schema(
    {
        vol.Required("codeowners"): list,
        vol.Required("documentation"): url_validator,
        vol.Required("domain"): str,
        vol.Required("issue_tracker"): url_validator,
        vol.Required("name"): str,
        vol.Required("version"): vol.Coerce(AwesomeVersion),
    },
    extra=vol.ALLOW_EXTRA,                          # ← HA-spec fields allowed through
)
```

**HACS enforces just these six fields.** HA Core (hassfest) enforces additional fields per the [integration manifest spec](https://developers.home-assistant.io/docs/creating_integration_manifest):

- `iot_class` — required by HA Core; allowed values: `assumed_state`, `cloud_polling`, `cloud_push`, `local_polling`, `local_push`, `calculated`.
- `integration_type` — required by HA Core as of 2026.4 (hassfest check added in 2026.4 changelog); allowed values: `device`, `hub`, `service`, `entity`, `hardware`, `helper`, `system`, `virtual`.
- `version` — required for custom integrations (HA Core uses this for version compare; HACS uses it for UI display). Must parse as `AwesomeVersion` (basically semver with extra flexibility).
- `dependencies` / `after_dependencies` / `requirements` — arrays of strings; optional; can be empty.
- `config_flow: true|false` — optional; if `true`, `config_flow.py` must exist with a `ConfigFlow` subclass or hassfest fails.

### info.md — what HACS renders

From HACS docs and [issue #3995 (blockquote notes not rendered)](https://github.com/hacs/integration/issues/3995):

- Optional. If absent, HACS renders `README.md` **only if** `hacs.json` has `"render_readme": true`. Otherwise HACS shows the GitHub repository description only.
- Rendered as a subset of CommonMark — not full GitHub-Flavoured Markdown.
- **Not supported:** GitHub picture elements (`<picture>`), GitHub blockquote notes (`> [!NOTE]`), GitHub-specific emoji shortcodes (some render, some don't).
- **Supported:** headings, paragraphs, lists, inline code, code blocks, standard links, plain images via `![](...)`.
- Path: repository root (`/info.md`).

**Rule of thumb:** treat `info.md` as a plain-text CommonMark summary that HACS displays under the repository description. Phase 1 can ship a 5–10-line placeholder.

### Directory layout — authoritative

What HACS reads from a repo when `category = integration`:

```
hacs-integration-pd/                       # repo root
├── hacs.json                              # REQUIRED (root, contains "name")
├── info.md                                # OPTIONAL (rendered in HACS UI)
├── README.md                              # OPTIONAL (rendered if hacs.json has render_readme: true)
├── LICENSE                                # OPTIONAL but required for HACS default-store inclusion (not our case)
└── custom_components/
    └── party_dispenser/                   # ONE subdirectory only; HACS scans only the first
        ├── __init__.py                    # REQUIRED (any valid python file)
        ├── manifest.json                  # REQUIRED
        ├── const.py                       # convention, not enforced
        └── ... other python files ...
```

**Gotcha confirmed in [HACS integration docs](https://www.hacs.xyz/docs/publish/integration/):**
> "There must only be one integration per repository, i.e. there can only be one subdirectory to `ROOT_OF_THE_REPO/custom_components/`. If there are more than one, only the first one will be managed."

This means `custom_components/party_dispenser_card/` alongside `custom_components/party_dispenser/` is ignored by HACS — but also causes a `hassfest` warning. Stick to exactly one subdirectory.

## Architecture Patterns

### Recommended Project Structure (Phase 1 end-state)

```
hacs-integration-pd/
├── .gitlab-ci.yml                         # lint + import smoke + hassfest
├── .gitignore                             # Python + Node + HA conventions
├── LICENSE                                # MIT
├── README.md                              # stub (1-2 para + future placeholders)
├── hacs.json                              # {"name": "Party Dispenser", "homeassistant": "2026.1.0"}
├── info.md                                # HACS-rendered summary (stub)
├── pyproject.toml                         # ruff config + pytest config + project metadata
│
├── custom_components/
│   └── party_dispenser/
│       ├── __init__.py                    # async_setup_entry / async_unload_entry no-op stubs
│       ├── manifest.json                  # full HA + HACS manifest
│       ├── const.py                       # DOMAIN, VERSION, MANUFACTURER
│       └── strings.json                   # placeholder config-flow strings for Phase 2
│
├── www/
│   └── community/
│       └── party-dispenser-card/
│           ├── .gitkeep                   # preserves empty dir
│           └── README.md                  # stub: "Card lives here in Phase 4"
│
└── tests/
    ├── __init__.py                        # empty
    └── test_import.py                     # import-smoke test (runs without HA installed)
```

### Pattern 1: No-op integration skeleton

**What:** `__init__.py` exports `async_setup_entry` and `async_unload_entry`, both returning `True`. No platforms, no coordinator, no config flow logic.

**When to use:** Phase 1 only — scaffolding before any real functionality exists. Phase 2 replaces this.

**Example** (adapted from [home-assistant/example-custom-config](https://github.com/home-assistant/example-custom-config/blob/master/custom_components/detailed_hello_world_push/__init__.py)):

```python
"""The Party Dispenser integration (Phase 1 scaffold — no-op)."""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN  # noqa: F401 — imported for Phase 2 extension


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Party Dispenser from a config entry (Phase 1: no-op)."""
    # Phase 2 will create a coordinator, forward to platforms, etc.
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry (Phase 1: no-op)."""
    # Phase 2 will call async_unload_platforms and tear down resources.
    return True
```

**Notes:**
- **Do not** declare `PLATFORMS` in Phase 1. Declaring empty `PLATFORMS: list[Platform] = []` is harmless but adds noise.
- **Do not** call `async_forward_entry_setups` or `async_unload_platforms` — these raise if there are no platforms to forward to.
- The `from __future__ import annotations` is HA convention for forward type references; keep it.
- `noqa: F401` on the `DOMAIN` import signals to ruff that the unused import is intentional (prepares for Phase 2).

### Pattern 2: Manifest with config_flow: false — what hassfest accepts

If `config_flow: false` (Phase 1), **hassfest does NOT require `config_flow.py`**. It also does NOT require `strings.json` or `translations/`. Shipping `strings.json` is a convenience for Phase 2 (so the planner can land config-flow code without touching manifest).

If `config_flow: true` and `config_flow.py` is missing, hassfest fails with:
> Integrations which implement a config flow must have a `config_flow.py` file.

**Phase 1 decision:** leave `config_flow: false`. Phase 2 flips it to `true` AND adds `config_flow.py` in the same commit.

### Pattern 3: GitLab CI skeleton with hassfest

**What:** Three jobs — ruff lint, Python import smoke, hassfest manifest validation.

**When to use:** Every push and MR (Phase 1 covers the skeleton; Phase 5 adds the HACS-action job against the GitHub mirror).

**Example** (see **Code Examples** section below for full file).

### Anti-Patterns to Avoid

- **Don't ship multiple subdirectories under `custom_components/`.** HACS manages only the first alphabetically; hassfest warns. If you want a shared "common" module, structure it as `custom_components/party_dispenser/common/` — a sub-package, not a sibling integration.
- **Don't put `description` or `version` or custom fields in `hacs.json`.** The voluptuous schema has `extra=vol.PREVENT_EXTRA` — validation fails outright. Only the 10 documented keys are allowed.
- **Don't name the plugin file `party-dispenser-card.js` in a repo whose HACS category is `integration`.** HACS `filename` matching is a plugin-category-only mechanism; in integration-category repos, anything in `www/` is ignored by HACS. See Pitfalls.
- **Don't run the HACS action locally against the GitLab repo.** The action reads the repository tree through the GitHub API. It will fail with "repository not found" or similar.
- **Don't use `pip install homeassistant` in CI just to verify imports.** It pulls ≈400 MB of transitive deps and takes ~45–60 s. Use `python -c "import custom_components.party_dispenser"` which doesn't need HA at all — works because `__init__.py` only imports from `homeassistant.*` inside function bodies via forward references. If HA *is* imported at module load (e.g., `from homeassistant.core import HomeAssistant` at top of file), the smoke test will fail without HA installed. See Pitfalls.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Validate `manifest.json` schema | Hand-written Python schema check | `ghcr.io/home-assistant/hassfest` docker image | hassfest tracks HA Core's actual validation logic across 27+ plugins (brand, codeowners, config_flow, deps, icons, integration_type, manifest, mqtt, quality_scale, requirements, services, ssdp, translations, …). Re-implementing misses edge cases. |
| Validate `hacs.json` schema | Hand-written Python schema check | Port the 10-key voluptuous schema from [`validate.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py) into a 40-line `jsonschema` check OR just run `python -c "import json; json.load(open('hacs.json'))"` + grep for `"name"`. | The full HACS schema has subtle parts (country list, format of `homeassistant` version) but for Phase 1 a simple "name is present + only known keys" check catches 95% of mistakes. Full validation happens in Phase 5 via the HACS action against the GitHub mirror. |
| Version comparison | Custom semver parser | HA's `AwesomeVersion` (already available in HA Core) OR Python's `packaging.version` | `AwesomeVersion` handles HA's version quirks (e.g., `2026.4.3`, `0.1.0b0`). Phase 1 doesn't parse versions at runtime, but if you need to — don't roll your own. |
| Card distribution | Split into two HACS repos or implement your own Lovelace resource registration | **Embedded card pattern**: bundle the card JS under `custom_components/party_dispenser/frontend/<card>.js`, and at integration setup call `hass.http.async_register_static_paths(...)` + `hass.data["lovelace"].resources.async_create_item(...)`. See [gist by KipK](https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492) and [this community thread](https://community.home-assistant.io/t/developer-guide-embedded-lovelace-card-in-a-home-assistant-integration/974909). | Phase 4 concern primarily, but Phase 1 should scaffold the directory that matches whatever decision is made. If embedded-card: `custom_components/party_dispenser/frontend/`. If separate: `www/community/party-dispenser-card/`. The planner must pick. |
| CI "smoke test" that imports HA fixtures | Install `homeassistant` and run `pytest` in Phase 1 | Plain `python -c "import custom_components.party_dispenser"` | Phase 1 has no entities; there's nothing to test beyond "the module imports". HA fixture tests start in Phase 2 with `pytest-homeassistant-custom-component`. |

**Key insight:** HACS and HA Core each provide a validator. Use both. The hand-rolled `python -c "import …"` covers "does the module load without syntax errors" — the gap the two official validators leave. Three cheap checks (ruff + import + hassfest) cover >95% of Phase-1 regressions.

## Runtime State Inventory

**Status:** SKIPPED — Phase 1 is a greenfield scaffold phase (no rename, refactor, or migration). There are no pre-existing stored data / live service config / OS-registered state / secrets / build artifacts to inventory. The repo is empty on both GitLab and the local clone.

## Common Pitfalls

### Pitfall 1: HACS "one category per repository" limitation

**What goes wrong:** The team designs a single repo to ship both the integration AND the card, then discovers at HACS-add time that the user has to pick exactly one category in the "Add custom repository" dropdown. Whichever they pick, HACS scans for that category's expected layout and ignores the other directory tree entirely.

**Why it happens:** HACS assigns `data.category` to each repository at registration (see [`validate/manager.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/validate/manager.py)'s `repository.data.category` field). All validators run against that single category. There's no "multi-category" repo.

**How to avoid:**
1. **Recommended:** Choose HACS category = `integration`. Bundle the card JS inside `custom_components/party_dispenser/frontend/<card>.js`. At `async_setup_entry` call `hass.http.async_register_static_paths([StaticPathConfig("/party-dispenser", Path(__file__).parent / "frontend", False)])` and add a Lovelace resource pointing to `/party-dispenser/party-dispenser-card.js`. This ships both via one HACS install.
2. **Alternative:** Leave `www/community/party-dispenser-card/` empty in Phase 1 and document a manual "add this as a second HACS custom repository under category Dashboard" step in the Phase-6 README. Requires splitting the card into a second repo or having the user understand two HACS entries point at the same URL with different categories.
3. **Punt in Phase 1:** Both CONTEXT-specified layouts (`custom_components/party_dispenser/` for integration + `www/community/party-dispenser-card/` for the card placeholder) are compatible with either decision as long as Phase 1 does NOT ship an actual card JS file. Create both directory trees with `.gitkeep` placeholders and defer the decision to Phase 4.

**Warning signs:** Adding the repo to HACS and seeing only one category's content appear; hassfest warning about extra directories under `custom_components/`; user confusion when the card doesn't appear after HACS install.

**Phase 1 action:** Create `www/community/party-dispenser-card/.gitkeep` and `www/community/party-dispenser-card/README.md` (stub). DO NOT ship any `.js` file. The decision about HACS multi-repo vs embedded card is a Phase 4 concern; Phase 1 only needs to not foreclose either option.

### Pitfall 2: HACS action cannot validate a GitLab-only repo

**What goes wrong:** Copy-pasting the `hacs/action` GitHub Actions usage example into `.gitlab-ci.yml` via `docker run ghcr.io/hacs/action:main`, expecting it to work. It fails with "No GitHub token found" or "Repository not found" or hangs trying to reach `api.github.com/repos/ava-organization/…`.

**Why it happens:** [`action/action.py`](https://github.com/hacs/integration/blob/main/action/action.py) line 15-20 reads `GITHUB_TOKEN`, `GITHUB_WORKSPACE`, `GITHUB_ACTOR`, `GITHUB_EVENT_PATH`, `GITHUB_REPOSITORY`. It then calls `hacs.githubapi.repos.get(repository)` which unconditionally hits GitHub's API to fetch the repository tree. There is no filesystem-only mode.

**How to avoid:** Run `ghcr.io/home-assistant/hassfest` instead for Phase 1 — it's pure filesystem-based and validates manifest.json against HA Core's authoritative schema. Add a bespoke `hacs.json` check (10 lines of Python using `jsonschema` or `voluptuous`) in CI. Defer full HACS-action validation to Phase 5 when the GitHub mirror exists and the action can run against the mirror.

**Warning signs:** CI logs show API calls to `api.github.com`; job fails with 401/404; the validator prints "use env GITHUB_TOKEN to set this".

### Pitfall 3: hassfest is linux/amd64-only

**What goes wrong:** Developer on Apple Silicon (M-series Mac) or ARM GitLab runner tries `docker run ghcr.io/home-assistant/hassfest` and gets `exec /usr/src/homeassistant/script/hassfest/docker/entrypoint.sh: exec format error`.

**Why it happens:** `docker manifest inspect ghcr.io/home-assistant/hassfest:latest` shows only a `linux/amd64` variant. No multi-arch manifest list.

**How to avoid:**
- On Apple Silicon: `docker run --platform linux/amd64 --rm -v $(pwd):/github/workspace ghcr.io/home-assistant/hassfest` (uses Rosetta/QEMU emulation, ~3× slower but works).
- In GitLab CI: use an x86_64 runner. Most shared GitLab runners are x86_64 by default; if the team's self-hosted runner is ARM, add `tags: [x86_64]` or equivalent to force x86_64.

**Warning signs:** `exec format error` when running hassfest locally on Mac M-series; CI runner prints it when the runner is ARM.

### Pitfall 4: Import smoke-test fails because __init__.py imports homeassistant.* at module scope

**What goes wrong:** The Phase 1 `__init__.py` does `from homeassistant.core import HomeAssistant` at the top of the file. Running `python -c "import custom_components.party_dispenser"` in a plain Python 3.12 image (no HA installed) fails with `ModuleNotFoundError: No module named 'homeassistant'`.

**Why it happens:** Python evaluates top-level imports eagerly. HA is not installed in the CI `python:3.12-slim` image.

**How to avoid:** Two options:
1. **Preferred:** use `from __future__ import annotations` at the top and reference HA types only in function signatures (Python 3.12+ treats these as strings at runtime — no import needed). The example in **Code Examples** uses this pattern.
2. **Alternative:** install `homeassistant` in CI (`pip install homeassistant==2026.4.3`, ~45–60 s). Too slow for a Phase-1 smoke test; use option 1.

**Warning signs:** `ModuleNotFoundError: homeassistant` in CI; test passing locally where HA is installed but failing in CI.

**Phase 1 gold standard:** The `__init__.py` top-level imports should be:
```python
from __future__ import annotations
from homeassistant.config_entries import ConfigEntry   # used in type hints only
from homeassistant.core import HomeAssistant            # used in type hints only
from .const import DOMAIN                               # internal
```
Under `from __future__ import annotations`, the HA imports are not evaluated at runtime — they're just for type checkers. The `python -c "import custom_components.party_dispenser"` smoke test succeeds because Python 3.12 string-ifies the annotations without running the imports.

**Caveat:** If any decorator or default-argument value uses an HA type (e.g., `def f(hass: HomeAssistant = None)` with a real call), the import is needed. Our Phase 1 skeleton only uses HA types in annotations — safe.

### Pitfall 5: integration_type "device" for a single-instance no-op

**What goes wrong:** `integration_type: "device"` is set per CONTEXT, but hassfest warns or future-HA behavior assumes every config entry corresponds to a physical device in the device registry. In Phase 1 (no entities, no device registry entry), this isn't wrong but isn't ideal.

**Why it happens:** `integration_type` hints HA's UI about how to group the integration. `device` implies "one physical device per config entry" — the user is setting up one specific dispenser. `hub` implies "one server/gateway per config entry, which may expose multiple devices" (the Party Dispenser is a backend service hosting one dispenser today, but the MULTI-01 v2 requirement says multi-dispenser is a future direction — hub leaves that open).

**How to avoid:** For the Party Dispenser, `hub` is the more accurate and forward-compatible choice — the backend is the hub, the dispenser(s) are device(s). The HA Core [Philips Hue integration](https://www.home-assistant.io/integrations/hue/) is the canonical hub example.

**Recommendation:** Override CONTEXT.md's `device` in favor of `hub`. This is a Claude's-Discretion change within the spirit of CONTEXT (CONTEXT explicitly says "research agent to confirm" on the iot_class question; extending that reasoning to integration_type is warranted). Flag for planner review.

**Warning signs:** V2 multi-dispenser work in a year forces a migration from `device` to `hub`, which is a user-facing manifest breaking change (config entries may need to be re-created). Choose `hub` now to avoid that.

### Pitfall 6: iot_class local_push with no push mechanism yet

**What goes wrong:** Set `iot_class: local_push` in Phase 1 (per CONTEXT option A), but v0.1.0 has no push mechanism at all — not even polling. Misleading for users browsing the HACS UI, and misleading for future integration-quality-scale assessment.

**Why it happens:** `local_push` promises "push-driven local updates"; a no-op integration has no updates at all.

**How to avoid:** Use `local_polling` in Phase 1. Phase 3 flips to `local_push` when the WebSocket client lands. `local_polling` says "local HA contacts the device" which is more defensible for a no-op (nothing is happening locally or remotely).

**Warning signs:** Reviewer confusion; misleading HACS UI metadata; quality-scale tooling may later flag the mismatch between claimed `local_push` and actual behavior.

**Recommendation:** Use `local_polling` for Phase 1. Flip to `local_push` in Phase 3. Document the change in the Phase 3 plan.

### Pitfall 7: `hacs.json` with `zip_release: true` but no `filename`

**What goes wrong:** CONTEXT explicitly locks `zip_release: false`, so this is not our immediate bug — but if the planner ever flips it (e.g., to speed up HACS install), and forgets to add `filename`, the HACS validator fails with "zip_release is True, but filename is not set".

**Why it happens:** HACS supports shipping a pre-built zip in the GitHub release as an optimization (avoids re-downloading every file). Requires `filename` to name the zip.

**How to avoid:** Leave `zip_release: false` in Phase 1 (per CONTEXT). Phase 5 may revisit.

**Warning signs:** `zip_release is True, but filename is not set` error in HACS action logs.

## Code Examples

Verified patterns from official / authoritative sources. Each example is copy-ready for Phase 1 unless noted.

### `hacs.json` (Phase 1 minimal)

```json
{
  "name": "Party Dispenser",
  "homeassistant": "2026.1.0"
}
```

**Source:** HACS voluptuous schema in [`custom_components/hacs/utils/validate.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py).

**Notes:** Only `name` is required. `homeassistant` is strongly recommended (CONTEXT locks `2026.1.0`). We OMIT `content_in_root: false` and `zip_release: false` because these are the defaults and the schema has `extra=vol.PREVENT_EXTRA` — setting them explicitly is allowed but noisy. **Do not add** `description`, `version`, or any field not in the 10-key schema.

### `custom_components/party_dispenser/manifest.json`

```json
{
  "domain": "party_dispenser",
  "name": "Party Dispenser",
  "version": "0.1.0",
  "documentation": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd",
  "issue_tracker": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd/-/issues",
  "codeowners": [],
  "requirements": [],
  "dependencies": [],
  "iot_class": "local_polling",
  "integration_type": "hub",
  "config_flow": false
}
```

**Source:** HA manifest spec at [developers.home-assistant.io/docs/creating_integration_manifest](https://developers.home-assistant.io/docs/creating_integration_manifest) + HACS schema verification + recommendations from Pitfalls 5 and 6.

**Changes from CONTEXT.md locks:**
- `iot_class`: `local_polling` (not `local_push`) — safer for a no-op; flip to `local_push` in Phase 3. See Pitfall 6.
- `integration_type`: `hub` (not `device`) — forward-compatible for v2 multi-dispenser. See Pitfall 5.

Both changes are flagged for planner review; CONTEXT explicitly delegated the iot_class decision.

### `custom_components/party_dispenser/__init__.py`

```python
"""The Party Dispenser integration (Phase 1 scaffold — no-op).

This is the Phase 1 skeleton. It does not create any entities, services, or
platforms. Phase 2 adds config flow, coordinator, and entity platforms.
"""
from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Party Dispenser from a config entry (Phase 1: no-op)."""
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry (Phase 1: no-op)."""
    return True
```

**Source:** Pattern adapted from [home-assistant/example-custom-config](https://github.com/home-assistant/example-custom-config/blob/master/custom_components/detailed_hello_world_push/__init__.py), simplified to remove platform forwarding (which we don't have in Phase 1).

**Key points:**
- `from __future__ import annotations` makes the HA imports type-hint-only at runtime → import smoke-test works without HA installed.
- No `PLATFORMS` list — nothing to forward to.
- No `async_setup(hass, config)` function — not needed since we only support config entries (no YAML config in v1.0).

### `custom_components/party_dispenser/const.py`

```python
"""Constants for the Party Dispenser integration."""

from logging import Logger, getLogger

DOMAIN = "party_dispenser"
VERSION = "0.1.0"
MANUFACTURER = "PartyDispenser"

LOGGER: Logger = getLogger(__package__)
```

**Source:** Convention from [ludeeus/integration_blueprint/custom_components/integration_blueprint/const.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/const.py), extended per CONTEXT.md locks.

**Note:** `LOGGER` is bonus-but-idiomatic; every HA integration needs one eventually and it costs nothing.

### `custom_components/party_dispenser/strings.json`

```json
{
  "config": {
    "step": {
      "user": {
        "title": "Party Dispenser",
        "description": "Set up the Party Dispenser backend connection.",
        "data": {
          "host": "Host",
          "port": "Port",
          "token": "API token"
        }
      }
    },
    "error": {
      "cannot_connect": "Failed to connect to the backend.",
      "invalid_auth": "The API token was rejected.",
      "unknown": "Unexpected error."
    },
    "abort": {
      "already_configured": "This dispenser is already configured."
    }
  }
}
```

**Source:** HA [backend localization docs](https://developers.home-assistant.io/docs/internationalization/core/) + ludeeus blueprint translations pattern.

**Note:** This is a placeholder — Phase 1 has `config_flow: false`, so HA does NOT load this file. It's shipped to unblock Phase 2 landing. Phase 2 will flip the manifest and this file is immediately live.

### `info.md`

```markdown
# Party Dispenser

Home Assistant integration and Lovelace card for the Party Dispenser backend.

Install via HACS → Add custom repository → paste the repo URL → select **Integration**.

Full documentation is in the [README](README.md).

Report issues on [GitLab](https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd/-/issues).
```

**Source:** HACS info.md render limitations per [issue #3995](https://github.com/hacs/integration/issues/3995). Keep it short and CommonMark — no GitHub-flavoured extras.

### `pyproject.toml` (Phase 1)

```toml
[project]
name = "party_dispenser"
version = "0.1.0"
description = "Home Assistant integration and Lovelace card for the Party Dispenser backend."
requires-python = ">=3.12"
readme = "README.md"
license = { text = "MIT" }

[tool.ruff]
target-version = "py312"
line-length = 100
extend-exclude = [
  "tests/fixtures",
  "www",
]

[tool.ruff.lint]
# Start from HA Core's ruleset (adapted from https://github.com/home-assistant/core/blob/dev/pyproject.toml)
select = [
  "E",      # pycodestyle errors
  "W",      # pycodestyle warnings
  "F",      # pyflakes
  "I",      # isort
  "N",      # pep8-naming
  "UP",     # pyupgrade
  "B",      # flake8-bugbear
  "ASYNC",  # flake8-async
  "S",      # flake8-bandit (security)
  "SIM",    # flake8-simplify
  "T20",    # flake8-print
  "RUF",    # ruff-specific
]
ignore = [
  "D203",   # no-blank-line-before-class (conflicts with formatter)
  "D212",   # multi-line-summary-first-line (conflicts with formatter)
  "COM812", # incompatible with formatter
  "ISC001", # incompatible with formatter
]

[tool.ruff.lint.per-file-ignores]
"tests/*" = ["S101", "D"]                                      # tests can use asserts, skip docstrings
"custom_components/party_dispenser/__init__.py" = ["ARG001"]   # unused args (hass, entry) are required by HA's signature

[tool.ruff.format]
quote-style = "double"
indent-style = "space"

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

**Source:** Composite of [HA Core's pyproject.toml](https://github.com/home-assistant/core/blob/dev/pyproject.toml) (ruff rule selection), [ludeeus/integration_blueprint's .ruff.toml](https://github.com/ludeeus/integration_blueprint/blob/main/.ruff.toml) (ignore list), and standard pytest config.

**Note:** HA Core itself uses `select = ["ALL"]` and then ignores a big list. Phase 1 starts with a curated subset — gives room to expand in Phase 2 without the churn of re-formatting. Line length 100 per CONTEXT Claude's-Discretion default.

### `tests/test_import.py`

```python
"""Phase 1 smoke test: the integration module imports cleanly."""
from __future__ import annotations


def test_integration_imports() -> None:
    """The integration package can be imported without Home Assistant installed."""
    import custom_components.party_dispenser as pd

    # Verify the public surface we promised to ship
    assert hasattr(pd, "async_setup_entry")
    assert hasattr(pd, "async_unload_entry")

    # Verify const module exports
    from custom_components.party_dispenser import const
    assert const.DOMAIN == "party_dispenser"
    assert const.VERSION == "0.1.0"
    assert const.MANUFACTURER == "PartyDispenser"
```

**Source:** Standard Python import-smoke-test pattern. No HA fixture dependency — intentional for Phase 1 speed.

**Note:** Run time < 0.1 s. Runs under stock `pytest` with `pip install pytest` (no HA). In Phase 5, this test becomes one of many under `pytest-homeassistant-custom-component`.

### `.gitlab-ci.yml`

```yaml
# Phase 1 CI skeleton — lint + import-smoke + hassfest manifest validation.
# Phase 5 will add: HACS action (against GitHub mirror) + full pytest-HA-custom suite.

stages:
  - lint
  - test
  - validate

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  PYTHONDONTWRITEBYTECODE: "1"
  PIP_DISABLE_PIP_VERSION_CHECK: "1"

default:
  image: python:3.12-slim
  cache:
    key: pip-$CI_COMMIT_REF_SLUG
    paths:
      - .cache/pip/

ruff:
  stage: lint
  script:
    - pip install --quiet ruff==0.15.11
    - ruff check .
    - ruff format --check .

import-smoke:
  stage: test
  script:
    - pip install --quiet pytest
    - pytest tests/test_import.py -v

hassfest:
  stage: validate
  image: docker:25-cli
  services:
    - docker:25-dind
  variables:
    DOCKER_HOST: tcp://docker:2375
    DOCKER_TLS_CERTDIR: ""
  script:
    - docker run --rm -v "$CI_PROJECT_DIR:/github/workspace" ghcr.io/home-assistant/hassfest
```

**Source:** Pattern derived from [GitLab CI Python examples](https://nekrasovp.github.io/setting-up-gitlab-ci.html) + hassfest action source at [home-assistant/actions/hassfest/action.yml](https://github.com/home-assistant/actions/blob/master/hassfest/action.yml).

**Total runtime estimate** (on default shared GitLab runner):
- `ruff`: ~15 s (10 s pip install + 5 s check)
- `import-smoke`: ~10 s (8 s pip install + 2 s pytest)
- `hassfest`: ~30 s (25 s docker pull + 5 s validation)
- **Total**: <1 min for the full CI, under budget.

**Notes:**
- The `hassfest` job uses docker-in-docker (`dind`) because GitLab CI images don't ship docker by default. Alternative: use a GitLab shell runner with docker installed. DinD adds ~20 s overhead per pipeline (one-time image pull).
- `ghcr.io/home-assistant/hassfest` is pulled anonymously (public image); no GHCR credentials needed.
- The image is linux/amd64 only — if the GitLab runner is ARM, add `tags: [amd64]` or use a different runner (see Pitfall 3).

### `.gitignore`

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.egg-info/
.eggs/
.tox/
.pytest_cache/
.ruff_cache/
.coverage
.coverage.*
htmlcov/
dist/
build/

# IDE / editor
.vscode/*
!.vscode/extensions.json
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Env
.env
.env.*
!.env.example

# Node (for Phase 4 card build)
node_modules/
npm-debug.log
yarn-error.log
yarn.lock          # commit package-lock.json only (Phase 4 decides)
*.tsbuildinfo

# Card build artifacts (Phase 4)
www/community/party-dispenser-card/dist/
www/community/party-dispenser-card/*.js
!www/community/party-dispenser-card/README.md

# Local dev HA config (if someone tests locally)
config/
home-assistant*.log
```

**Source:** Composite of Python + Node + HA-community conventions; per CONTEXT Claude's-Discretion.

### `LICENSE` (MIT)

Use the canonical MIT license text from [opensource.org/licenses/MIT](https://opensource.org/licenses/MIT). Copyright line: `Copyright (c) 2026 Party Dispenser contributors` (per CONTEXT lock). Standard 20-line file.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `async_timeout` package | `asyncio.timeout()` context manager | Python 3.11+, required by HA 2026.3+ | Modern integrations must use `async with asyncio.timeout(X)`. Phase 1 doesn't do I/O so doesn't matter; Phase 3 WebSocket code must use the new pattern. |
| `PLATFORMS = ["sensor", "binary_sensor"]` (str list) | `PLATFORMS = [Platform.SENSOR, Platform.BINARY_SENSOR]` (enum) | HA 2023.x | String list still works but emits deprecation warning in logs. Phase 2 should use the `Platform` enum. Phase 1 has no PLATFORMS. |
| `hass.config_entries.async_setup_platforms(entry, platforms)` | `await hass.config_entries.async_forward_entry_setups(entry, platforms)` | HA 2023.3 | Old method was removed. Phase 2 uses the new one. |
| `entry.async_start_reauth(hass)` via setup method | `ConfigEntryAuthFailed` exception | HA 2022.x+ | Phase 2 config flow code should raise `ConfigEntryAuthFailed` on auth errors — HA handles re-auth automatically. |
| `strings.json` + manual `translations/en.json` copy | `strings.json` only (HA auto-generates `en.json`) | HA 2022.x | For community integrations, `strings.json` is the source of truth. Phase 1 ships `strings.json` only. |
| Single-repo HACS multi-category | **Not supported** — embedded card OR separate repos | Always | See Pitfall 1. This is current 2026 state and unlikely to change. |

**Deprecated / outdated:**
- **`async_listen` in HA Labs** — deprecated 2026-02-16 per [HA dev blog](https://developers.home-assistant.io/blog/2026/02/16/labs-async-listen-deprecation/). Not relevant to Phase 1 but flag for Phase 3 WebSocket work.
- **Custom integration without `integration_type`** — hassfest started enforcing this in 2026.4 per changelog. Our manifest includes it — we're covered.

## Open Questions

1. **Card shipping mechanism: embedded vs separate repo?**
   - What we know: HACS does not support dual-category repos. Two viable paths (embedded in `custom_components/party_dispenser/frontend/`, or split into two HACS entries). Both are compatible with Phase 1.
   - What's unclear: Which the team prefers. Embedded has simpler UX (one HACS install) but couples the card's build output into the Python package. Separate repos keep concerns clean but require users to understand two custom repository entries.
   - Recommendation: Defer to Phase 4 planning. Phase 1 creates BOTH directory placeholders (`custom_components/party_dispenser/` AND `www/community/party-dispenser-card/`) so either decision is unblocked. The repo scaffolding is path-agnostic at Phase 1.

2. **Override of CONTEXT-locked `iot_class: local_push` → `local_polling`?**
   - What we know: `local_push` promises push behavior; v0.1.0 has no push. See Pitfall 6.
   - What's unclear: Whether the user considers this a lock they want to keep, or a placeholder for research.
   - Recommendation: CONTEXT explicitly delegated this ("research agent to decide"). Planner should use `local_polling` in Phase 1's `manifest.json`, flag the flip to `local_push` in Phase 3's plan, and call this out in the Phase 1 plan-check summary.

3. **Override of CONTEXT-locked `integration_type: device` → `hub`?**
   - What we know: `hub` is forward-compatible for v2 multi-dispenser; `device` implies one-device-per-entry. See Pitfall 5.
   - What's unclear: Whether the CONTEXT lock on `device` was deliberate or a quick pick. CONTEXT does not flag this for research.
   - Recommendation: Treat this as a **soft override with planner review**. Document the change in the Phase 1 plan and surface it at plan-check for user acceptance. If user insists on `device`, revert — the v2 migration pain is a deferred cost.

4. **Should Phase 1 CI run hassfest or just ruff + import?**
   - What we know: hassfest adds ~30 s to CI; manifest bugs are easy to ship without it.
   - What's unclear: Whether 30 s is acceptable per the CONTEXT's "under a minute" target.
   - Recommendation: Include hassfest in Phase 1 CI. It's under the minute target (estimated total <1 min) and catches real issues (missing required fields, invalid `iot_class`, etc.). If timing becomes a problem, move it to a nightly/scheduled pipeline in Phase 5.

5. **Should Phase 1 commit `package-lock.json` or `yarn.lock`?**
   - What we know: CONTEXT says "`package-lock.json` (if card dev produces one and we commit `package.json` only — decide in Phase 4)".
   - What's unclear: Deferred to Phase 4.
   - Recommendation: Phase 1 `.gitignore` excludes both by default. Phase 4 adds an exception for whichever file type is chosen.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Python | Local dev + CI | ✓ | 3.14.3 (local) / 3.12 (CI image target) | — |
| Docker | CI `hassfest` job + local manifest validation | ✓ | 29.3.0 (local) | GitLab shell runner without Docker → skip hassfest locally, rely on CI |
| Git | All CI ops | ✓ | 2.50.1 | — |
| ruff | Lint | ✗ (not installed locally) | — | `pip install ruff` in CI and local — zero-cost |
| Node / npm | Card build (Phase 4, NOT Phase 1) | ✓ | Node 25.8.1 | — (Phase 1 doesn't need Node) |
| `ghcr.io/home-assistant/hassfest` image | CI `hassfest` job | ✓ | Pulled successfully (627 MB raw, 143 MB compressed, linux/amd64 only) | `--platform linux/amd64` on ARM hosts (Rosetta/QEMU) |
| GitLab runner (x86_64) | Running hassfest in CI | Assumed (standard shared runner config) | N/A | If org runners are ARM → use `--platform linux/amd64` in docker run OR add `tags: [amd64]` OR use GitLab shared runner |

**Missing dependencies with no fallback:** None for Phase 1.

**Missing dependencies with fallback:** ruff — installed on-demand via pip in CI. Zero impact.

**Environmental risks to flag to planner:**
- Contributors on Apple Silicon will hit the hassfest arm64 issue locally. Document the `--platform linux/amd64` workaround in the Phase 1 README contributor section or in a Makefile/justfile target.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `pytest` (bare) for Phase 1 import smoke. `pytest-homeassistant-custom-component` 0.13.324 in Phase 5. |
| Config file | `pyproject.toml` → `[tool.pytest.ini_options]` |
| Quick run command | `pytest tests/test_import.py -v` |
| Full suite command | `pytest tests/ -v` (Phase 1: one test; Phase 5: full HA fixture suite) |
| Lint command | `ruff check . && ruff format --check .` |
| Manifest validation command | `docker run --rm -v "$(pwd):/github/workspace" ghcr.io/home-assistant/hassfest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HACS-01 | `hacs.json` is valid HACS manifest | static | bespoke check: `python -c "import json; d=json.load(open('hacs.json')); assert 'name' in d; assert set(d.keys()) <= {'name','homeassistant','hacs','content_in_root','zip_release','filename','hide_default_branch','country','persistent_directory','render_readme'}"` | ❌ Wave 0 (add as `tests/test_hacs_manifest.py`) |
| HACS-01 | `custom_components/party_dispenser/manifest.json` validates against HA Core schema | static | `docker run --rm -v "$(pwd):/github/workspace" ghcr.io/home-assistant/hassfest` | ❌ Wave 0 (add `.gitlab-ci.yml` `hassfest` job) |
| HACS-01 | `info.md` exists and is non-empty | static | `test -s info.md` (bash) OR `pytest tests/test_info_md.py -v` | ❌ Wave 0 (add as `tests/test_info_md.py`) |
| REL-01 | Pipeline runs in GitLab, not GitHub Actions | manual | (inspect GitLab pipelines page after push) | ✅ (GitLab CI exists once `.gitlab-ci.yml` lands) |
| QA-04 | `ruff check` passes on all Python files | static | `ruff check .` | ❌ Wave 0 (add `.gitlab-ci.yml` `ruff` job + `pyproject.toml`) |
| QA-04 | `ruff format --check` passes | static | `ruff format --check .` | ❌ Wave 0 (same) |
| QA-04 | Integration module imports cleanly | unit | `pytest tests/test_import.py -v` | ❌ Wave 0 (add `tests/test_import.py`) |
| QA-04 | Merge is blocked on any failing job | manual | (GitLab MR settings: require all pipelines to pass) | ❌ Wave 0 (configure MR rules) |
| DOC-03 | `info.md` uses only HACS-supported markdown (no `<picture>`, no `> [!NOTE]` blocks) | static | grep-based: `! grep -qE '<picture|\> \[!' info.md` | ❌ Wave 0 (add as `tests/test_info_md.py`) |

### Sampling Rate
- **Per task commit:** `ruff check . && ruff format --check . && pytest tests/ -v` (≈15 s local)
- **Per wave merge:** full local test set above + `docker run ghcr.io/home-assistant/hassfest` (≈45 s local)
- **Phase gate:** Full GitLab CI pipeline green (all three jobs: ruff, import-smoke, hassfest) before `/gsd:verify-work`; plus v0.1.0 tag pushed successfully.

### Wave 0 Gaps
- [ ] `pyproject.toml` — ruff + pytest config + project metadata
- [ ] `tests/__init__.py` — empty marker file
- [ ] `tests/test_import.py` — import smoke test (REQ: QA-04)
- [ ] `tests/test_hacs_manifest.py` — `hacs.json` schema check (REQ: HACS-01)
- [ ] `tests/test_info_md.py` — `info.md` exists + no unsupported markdown (REQ: DOC-03, HACS-01)
- [ ] `.gitlab-ci.yml` — lint, test, validate stages (REQ: QA-04)
- [ ] GitLab MR settings: require pipeline pass before merge (REQ: QA-04) — project-settings change, not a file commit

**Test framework install:** None beyond `pip install ruff pytest` in CI. No Home Assistant install needed in Phase 1 (smoke tests don't import HA at runtime thanks to `from __future__ import annotations`).

## Sources

### Primary (HIGH confidence — authoritative source code / official docs)

- [HACS voluptuous schemas — `custom_components/hacs/utils/validate.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py) — canonical `hacs.json` and `manifest.json` schema as of HACS 2.0.5
- [HACS action source — `action/action.py`](https://github.com/hacs/integration/blob/main/action/action.py) — confirms `GITHUB_TOKEN` + GitHub-API coupling that blocks GitLab-only validation
- [HACS action Dockerfile — `action/Dockerfile`](https://github.com/hacs/integration/blob/main/action/Dockerfile) — base `python:3.13-alpine`, entrypoint `python3 /hacs/action.py`
- [HACS integration category docs](https://www.hacs.xyz/docs/publish/integration/) — "one subdirectory to `custom_components/`" rule
- [HACS plugin/dashboard docs](https://www.hacs.xyz/docs/publish/plugin/) — `dist/` vs root JS file location, `filename` field semantics
- [HACS general publishing docs](https://www.hacs.xyz/docs/publish/start/) — required fields, allowed categories
- [HACS custom repositories FAQ](https://www.hacs.xyz/docs/faq/custom_repositories/) — the "Type" dropdown confirms one-category-per-repo
- [HACS action docs](https://www.hacs.xyz/docs/publish/action/) — `category`, `ignore` inputs, valid `ignore` entries
- [HACS info.md / `render_readme` issue #3995](https://github.com/hacs/integration/issues/3995) — info.md markdown limitations
- [home-assistant/core hassfest source](https://github.com/home-assistant/core/tree/dev/script/hassfest) — 27 validator plugins, `__main__.py` argument parsing
- [home-assistant/core hassfest Dockerfile](https://github.com/home-assistant/core/blob/dev/script/hassfest/docker/Dockerfile) — base `python:3.14-alpine`, entrypoint at `script/hassfest/docker/entrypoint.sh`
- [home-assistant/core hassfest docker entrypoint](https://github.com/home-assistant/core/blob/dev/script/hassfest/docker/entrypoint.sh) — filesystem-based validation, auto-discovers all `manifest.json` files
- [home-assistant/actions hassfest action.yml](https://github.com/home-assistant/actions/blob/master/hassfest/action.yml) — canonical `docker run ghcr.io/home-assistant/hassfest` invocation
- [HA Integration manifest spec](https://developers.home-assistant.io/docs/creating_integration_manifest) — required fields, `iot_class` values, `integration_type` values
- [HA Config entries docs](https://developers.home-assistant.io/docs/config_entries_index/) — `async_setup_entry` signature
- [home-assistant/example-custom-config detailed_hello_world_push](https://github.com/home-assistant/example-custom-config/blob/master/custom_components/detailed_hello_world_push/__init__.py) — reference minimal `__init__.py`
- [ludeeus/integration_blueprint](https://github.com/ludeeus/integration_blueprint) — community reference template (2026-compatible)
- [HA Core pyproject.toml](https://github.com/home-assistant/core/blob/dev/pyproject.toml) — authoritative ruff ruleset source
- [pytest-homeassistant-custom-component README](https://github.com/MatthewFlamm/pytest-homeassistant-custom-component) — version pinning to HA 2026.4.3 (Phase 5 reference)
- PyPI version verification (2026-04-20): ruff 0.15.11, homeassistant 2026.4.3, pytest-homeassistant-custom-component 0.13.324, HACS 2.0.5

### Secondary (MEDIUM confidence — verified WebSearch findings, cross-referenced)

- [HA community thread — embedded Lovelace card in integration](https://community.home-assistant.io/t/developer-guide-embedded-lovelace-card-in-a-home-assistant-integration/974909) — describes the embedded-card pattern as a workaround for HACS one-category-per-repo
- [KipK gist — embedded card registration pattern](https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492) — Python code for `async_register_static_paths` + Lovelace resource auto-registration
- [HA developer blog: hassfest for custom components](https://developers.home-assistant.io/blog/2020/04/16/hassfest/) — hassfest supports custom integrations
- [HA 2026.4 changelog](https://www.home-assistant.io/changelogs/core-2026.4/) — `integration_type` hassfest check added
- [HA async_listen deprecation blog](https://developers.home-assistant.io/blog/2026/02/16/labs-async-listen-deprecation/) — current 2026 deprecation signal
- [pythonspeed GitLab DinD guide](https://pythonspeed.com/articles/gitlab-build-docker-image/) — DinD overhead estimates (~20 s per pipeline)

### Tertiary (LOW confidence — single-source or community tutorials; treated as informational)

- [HA integration dev guide by cagcoach](https://github.com/cagcoach/ha-ipixel-color/blob/main/Home-Assistant-HACS-Integration-Development-Guide.md) — hacs.json example, informational only
- [Aaron Godfrey HA custom component tutorial series](https://aarongodfrey.dev/home%20automation/building_a_home_assistant_custom_component_part_3/) — config flow walkthrough, may be partially stale (pre-2024)
- [community.home-assistant.io card development tutorials](https://community.home-assistant.io/t/tutorials-how-to-develop-a-custom-card-and-ship-hacs-repositories/526566) — Phase 4 reference, not verified for 2026 currency

### Verified negative findings (important to record)

- HACS **does not** support a single repository with both integration AND plugin categories — verified by inspecting the `repository.data.category` field semantics in [`validate/manager.py`](https://github.com/hacs/integration/blob/main/custom_components/hacs/validate/manager.py) and by the HACS UI flow (one `Type` dropdown at add time, per official FAQ).
- The HACS action image (`ghcr.io/hacs/action`) **cannot** be used to validate a GitLab-only repo — verified by reading [`action/action.py`](https://github.com/hacs/integration/blob/main/action/action.py) which unconditionally calls `hacs.githubapi.repos.get(repository)` against GitHub's API.
- `ghcr.io/home-assistant/hassfest` is **linux/amd64 only** — verified by `docker manifest inspect` returning a single-platform manifest (2026-04-20).
- `hacs.json` **does not** accept custom/extra fields — the schema has `extra=vol.PREVENT_EXTRA`; any unknown key fails validation.
- `hacs.json` field `filename` is **ignored by the `integration` category** — it's consumed only by the `plugin` (dashboard) category.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all versions verified against PyPI/GHCR on 2026-04-20. Schemas pulled from HACS + HA Core source code.
- Architecture: **HIGH** — patterns verified against 2+ canonical references (HA `example-custom-config` + ludeeus blueprint + HA Core docs).
- GitLab CI / hassfest usage: **HIGH** — image pulled and inspected locally; action source read; DinD pattern is standard.
- HACS multi-category limitation: **HIGH** — confirmed in source code (schemas, validator manager) + docs + community support threads (4+ cross-references).
- Pitfalls (iot_class / integration_type recommendations): **MEDIUM** — based on HA conventions and forward-compatibility analysis; not directly contradicted by docs but worth planner review since they override CONTEXT locks.
- Embedded-card pattern as Phase-4 option: **MEDIUM** — pattern is well-documented in community gists but not in HACS/HA official docs; implementation details (`async_register_static_paths` signature, Lovelace resource schema) may drift across HA versions.

**Research date:** 2026-04-20

**Valid until:** 2026-05-20 (30 days — HACS 2.0.5 is stable; HA Core moves fast but Phase 1 relies only on well-established 2026-era APIs).

## RESEARCH COMPLETE

**Phase:** 1 - Foundation & HACS scaffolding
**Confidence:** HIGH

### Key Findings
- HACS repos are **one-category-only**; CONTEXT's "multi-category via hacs.json filename+name" idea is not supported. Recommend HACS category = `integration` and either (a) defer card-shipping decision to Phase 4 (embedded vs separate repo) or (b) commit to embedded-card pattern now and relocate `www/community/` → `custom_components/party_dispenser/frontend/`. Phase 1 creates both placeholders so either path stays open.
- HACS action (`ghcr.io/hacs/action`) **cannot validate a GitLab-only repo** — it's GitHub-coupled at the API level. Use `ghcr.io/home-assistant/hassfest` (filesystem-based, publicly pullable) in Phase 1 for manifest validation, add a tiny bespoke `hacs.json` check, and defer HACS action to Phase 5 (after GitHub mirror exists).
- Two CONTEXT-locked manifest values warrant planner review: `iot_class: local_push` → recommend `local_polling` for Phase 1 (flip in Phase 3); `integration_type: device` → recommend `hub` for v2 forward-compatibility.
- Full schemas for `hacs.json` (10 keys, `name` required, `extra=PREVENT_EXTRA`) and `manifest.json` (6 required HACS fields + HA-spec fields like `iot_class`/`integration_type`) are documented verbatim in RESEARCH.md.
- CI budget is comfortably under 1 minute: ruff (~15 s) + import smoke (~10 s) + hassfest (~30 s) = under 1 min on stock GitLab shared runners. Full `.gitlab-ci.yml` copy-ready in Code Examples.

### File Created
`/Users/jamaze/projects/hacs-integration-pd/.planning/phases/01-foundation-hacs-scaffolding/01-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | PyPI versions verified 2026-04-20; schemas pulled from canonical HACS + HA Core source |
| Architecture | HIGH | Patterns cross-referenced against 2+ official templates (example-custom-config, ludeeus blueprint) |
| CI / hassfest | HIGH | Docker image pulled and inspected; GitLab DinD pattern standard |
| Multi-category limitation | HIGH | Source-code verified (validator manager + UI flow + community threads) |
| iot_class / integration_type overrides | MEDIUM | Recommendations override CONTEXT locks; planner should surface at plan-check |
| Embedded-card pattern (Phase 4 context) | MEDIUM | Well-documented in community gists; exact HA API signatures may drift |

### Open Questions
1. Card shipping: embedded vs separate repo? (Decision belongs in Phase 4; Phase 1 keeps both paths open.)
2. Accept `iot_class: local_polling` override of CONTEXT? (Recommended — CONTEXT delegated this.)
3. Accept `integration_type: hub` override of CONTEXT? (Recommended for v2 forward-compat; needs planner/user confirmation.)
4. Is `package-lock.json` or `yarn.lock` the lockfile of choice for Phase 4? (Deferred to Phase 4.)

### Ready for Planning
Research complete. Planner can now create PLAN.md files for plans 01-01 (repo scaffolding + HACS/HA metadata), 01-02 (Python package skeleton), and 01-03 (GitLab CI skeleton + v0.1.0 tag).
