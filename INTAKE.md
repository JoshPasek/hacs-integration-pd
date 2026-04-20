# Party Dispenser HACS Integration — Intake

## What We're Building

A "full HACS plugin" for the **Party Dispenser** (PD) backend — the FastAPI service in `ava-organization/party-dispenser/party-dispenser-main`. This replaces the existing `config/packages/party_dispenser.yaml` Home Assistant package (which relies on REST sensors + scripts + manual `secrets.yaml` edits) with a proper HACS-installable package containing **both**:

1. **Custom integration (Python, `custom_components/party_dispenser/`)** — a real Home Assistant integration with config flow, entity registry, services, and push-driven updates.
2. **Custom Lovelace card (JS/TS, `www/community/party-dispenser-card/`)** — a bespoke dashboard card that displays the recipe grid, queue, and makeable-recipes view, and lets the user place/cancel orders. The card must be able to send API calls to the PD backend (either via the integration's services or directly to the FastAPI endpoints — design decision to make in planning).

## Background Context

- Existing PD backend: FastAPI + Postgres, REST + WebSocket at endpoints like `/recipes`, `/queue`, `/orders/from-recipe`, `/orders/{id}/cancel`.
- Existing auth: backend JWT (stored in HA `secrets.yaml` today).
- Existing HA package config at `config/packages/party_dispenser.yaml` in the `party-dispenser-main` repo is the reference for required capabilities — everything the YAML package does, the HACS plugin must do better.
- Home users run HA on the same LAN as the PD backend. CORS and local HTTPS/HTTP considerations apply.

## Scope — In

- Python integration with:
  - Config flow UI for setup (host, port, JWT, optional: TLS mode)
  - Entity registry: sensors for queue size, queue summary, makeable-recipe count, current-order state, recipe list; optionally binary sensor for dispenser busy/idle
  - Services: `party_dispenser.order_recipe`, `party_dispenser.cancel_order`, `party_dispenser.refresh`
  - Realtime push via the existing backend WebSocket broadcaster (not poll-only)
  - Device registry entry representing the dispenser
  - Reconnect + backoff on WebSocket failure
- Custom Lovelace card with:
  - Recipe grid (make-now button per recipe when makeable)
  - Live queue list (ordered, with cancel buttons)
  - Summary counts
  - Calls integration services (or direct backend calls — decision to make)
  - Visual style matching HA's Mushroom-ish look + PD branding
- HACS metadata + structure:
  - `hacs.json` at repo root
  - `custom_components/party_dispenser/manifest.json`
  - `info.md`
  - Semver releases via GitLab CI
  - README with install instructions for HACS custom-repository add
- Distribution:
  - Primary source of truth: GitLab (`gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd`)
  - CI mirror to a private GitHub repo so HACS can pull (HACS requires GitHub API)
  - Release tags propagate from GitLab → GitHub
- Tests:
  - Integration tests using `pytest-homeassistant-custom-component` fixtures
  - Card unit tests where feasible (JS test runner)
  - CI pipeline runs both

## Scope — Out (for v1.0.0)

- Public HACS store submission (private GitHub repo, personal use)
- Multi-dispenser / multi-account support (one PD per HA instance)
- Cloud-relay backends (assumes local LAN)
- i18n beyond English
- Voice control / conversation agents

## Constraints

- **HACS + GitLab mismatch:** HACS only pulls from GitHub. Architecture must handle this via a GitLab-primary + GitHub-mirror CI job.
- **HA compatibility:** target HA Core ≥ 2026.1 (latest LTS-style).
- **Python:** ≥ 3.12 (matches HA Core requirement).
- **License:** MIT (matches typical HACS plugin convention).
- **Dependencies:** stay thin — `aiohttp` (already in HA), `websockets` or HA's built-in WS client.
- **Backend API contract:** whatever the current party-dispenser-main exposes at `/recipes`, `/queue`, `/orders`. The integration should tolerate additive changes but flag breaking ones.

## Success Criteria

- A fresh HA install can add this as a HACS custom repository, install, complete config flow in under a minute, and see live queue updates in a default Lovelace card.
- Placing an order via the card appears in the queue < 1s later (via WebSocket push).
- Token rotation is a config-flow operation, not a file edit.
- The card works on mobile HA companion without layout breakage.
- Existing users of the YAML package can migrate with a documented cutover (remove package, add integration, remove secrets entries).

## Open Questions for Planning

1. **Card → backend path:** Should the card call HA services (which then call the backend via the integration) or call the backend directly from the browser (requires CORS on backend)?
2. **Auth refresh:** JWT expiry — is it long-lived enough to not need refresh, or do we need a refresh-token mechanism?
3. **WebSocket failure UX:** fall back to polling or show "disconnected" state?
4. **Card framework:** lit-element (HA convention) vs preact/vanilla? lit-element recommended.
5. **Versioning gate:** what minimum backend API version does v1.0.0 require?
