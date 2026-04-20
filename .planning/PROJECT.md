# Party Dispenser HACS Integration

## What This Is

A Home Assistant Community Store (HACS) plugin that replaces the existing `party_dispenser.yaml` HA package with a full-fledged custom integration plus a custom Lovelace card. It lets Home Assistant users install, configure, and control the Party Dispenser backend (FastAPI service in `ava-organization/party-dispenser/party-dispenser-main`) through a one-click HACS install, a UI config flow, proper HA entities, and a purpose-built dashboard card.

## Core Value

**One-click install and a live, push-driven dashboard card that controls the dispenser.** No YAML editing, no secret-file wrangling, no manual sensor declarations — the user adds the repo to HACS, clicks install, completes a config flow, and gets a working Party Dispenser card on their dashboard.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] REQ-01: HACS-installable as a custom repository (manifest.json, hacs.json, info.md, release tags)
- [ ] REQ-02: Config flow for setup — host, port, JWT, optional TLS — replacing all YAML/secrets edits
- [ ] REQ-03: Proper HA entities — sensors for queue size, queue summary, makeable-recipe count, current order, recipe list; device registry entry for the dispenser
- [ ] REQ-04: Registered services — `party_dispenser.order_recipe`, `party_dispenser.cancel_order`, `party_dispenser.refresh`
- [ ] REQ-05: Realtime push updates via the backend WebSocket broadcaster, with reconnect/backoff and a connection-status binary sensor
- [ ] REQ-06: Custom Lovelace card — lit-element, renders recipe grid + live queue + summary, matches HA styling, mobile-responsive
- [ ] REQ-07: Card can send API calls — via HA services (primary path, through the integration) with an option to call the backend directly when CORS permits
- [ ] REQ-08: Documented migration from the existing YAML package to the HACS plugin (removal steps + equivalence table)
- [ ] REQ-09: GitLab primary + GitHub private-repo mirror with CI — release tags propagate automatically so HACS can install from GitHub
- [ ] REQ-10: Test coverage — `pytest-homeassistant-custom-component` for integration, JS unit tests for card; CI gates both

### Out of Scope

- Public HACS store submission — private GitHub repo, personal use only
- Multi-dispenser / multi-account — single PD per HA instance in v1.0
- Cloud-relay or non-LAN backend support — assumes local network
- i18n beyond English
- Voice/conversation-agent integration

## Context

- Existing YAML package at `config/packages/party_dispenser.yaml` in `ava-organization/party-dispenser/party-dispenser-main` — the HACS plugin's functional parity target
- Backend exposes REST (`/recipes`, `/queue`, `/orders/from-recipe`, `/orders/{id}/cancel`) and a WebSocket broadcaster for realtime queue state
- Users run HA on same LAN as backend; backend uses private hostnames like `elsinnombre.local`
- Auth is a backend-issued JWT stored in HA (today: `secrets.yaml`; tomorrow: config-flow-managed)
- HACS distribution is fundamentally GitHub-backed; GitLab must be the source of truth with GitHub as a mirror

## Constraints

- **Tech stack (integration)**: Python ≥ 3.12, HA Core ≥ 2026.1, `aiohttp` + HA's built-in WebSocket client; no exotic dependencies
- **Tech stack (card)**: lit-element (HA convention), TypeScript, rollup bundling
- **Distribution**: Primary on `gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd`, mirror to private GitHub repo via CI
- **License**: MIT (HACS plugin convention)
- **Versioning**: semver; release tags on GitLab propagate to GitHub mirror for HACS install
- **API contract**: whatever `party-dispenser-main` exposes at current REST + WS endpoints — additive change tolerance, flag breaking changes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| HACS plugin, not YAML package | End-user UX: one-click install + UI config flow + proper entities | — Pending |
| Both integration AND custom card in one repo | "Full HACS plugin" scope; shared versioning; single install touchpoint | — Pending |
| Card → HA services → integration → backend (primary) | Auth/network handled by integration; no CORS surprises; standard HA pattern | — Pending |
| GitLab primary, GitHub mirror | Preserves `ava-organization/party-dispenser` group layout while supporting HACS | — Pending |
| WebSocket push over poll-only | Subsecond order-placed feedback on card; backend already broadcasts | — Pending |
| lit-element for card | Matches HA core and existing HACS plugins; smallest learning curve for maintainers | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after initialization*
