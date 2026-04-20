# Roadmap: Party Dispenser HACS Integration

## Overview

Ship a full HACS-installable Home Assistant plugin (Python integration + custom Lovelace card) that replaces the current YAML package, with GitLab-primary + GitHub-mirror distribution and end-to-end test coverage. v1.0 = installable from HACS as a custom repository with a working card that places and cancels orders via realtime WebSocket-driven updates.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & HACS scaffolding** - Repo structure, HACS metadata, Python package skeleton, license, CI skeleton
- [x] **Phase 2: Integration core** - Config flow, polling coordinator, sensors, services, device registry
- [ ] **Phase 3: Realtime push** - WebSocket subscription, reconnect/backoff, connection-status entity
- [ ] **Phase 4: Custom Lovelace card** - lit-element card with recipe grid, queue, summary; wired to integration services
- [ ] **Phase 5: CI + GitHub mirror + release automation** - GitLab CI pipeline, GitHub private-repo mirror, semver release tagging
- [ ] **Phase 6: Docs + migration + polish** - README, install instructions, YAML-package migration guide, screenshots, mobile layout pass

## Phase Details

### Phase 1: Foundation & HACS scaffolding
**Goal**: A structurally-valid HACS custom repository exists at the GitLab URL — HACS "Add custom repository" would accept it, and the integration appears as installable (even though it does nothing yet).
**Depends on**: Nothing (first phase)
**Requirements**: HACS-01, REL-01, QA-04, DOC-03
**Success Criteria** (what must be TRUE):
  1. Repo has `custom_components/party_dispenser/{__init__.py,manifest.json,const.py}` minimally populated
  2. Root has `hacs.json`, `info.md`, `README.md`, `LICENSE` (MIT)
  3. Integration loads in HA without errors (`async_setup_entry` is a no-op stub)
  4. GitLab CI pipeline exists with lint + basic import test jobs (green)
  5. Semver tagging strategy documented and `v0.1.0` tagged
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — HACS root metadata (hacs.json, info.md, LICENSE, .gitignore, stub README, card placeholder dir)
- [x] 01-02-PLAN.md — Python package skeleton (manifest.json, __init__.py, const.py, strings.json) + pyproject.toml + Wave-0 tests
- [x] 01-03-PLAN.md — GitLab CI skeleton (ruff + pytest + hassfest) + v0.1.0 semver tag

### Phase 2: Integration core
**Goal**: A Home Assistant user can install the plugin, complete a config flow, and see live Party Dispenser state as real HA entities they can trigger services against — using HTTP polling for now.
**Depends on**: Phase 1
**Requirements**: CFG-01, CFG-02, CFG-03, INT-01, INT-02, INT-03, INT-04, INT-05, QA-01
**Success Criteria** (what must be TRUE):
  1. Config flow accepts host / port / JWT and stores via config entries (no YAML required)
  2. Device registry shows one "Party Dispenser" device per config entry
  3. Entities exist and update on poll: `sensor.party_dispenser_queue_size`, `sensor.party_dispenser_queue_summary`, `sensor.party_dispenser_makeable_count`, `sensor.party_dispenser_current_order`, `sensor.party_dispenser_recipes`
  4. Services registered and callable from Developer Tools: `party_dispenser.order_recipe` (recipe_id), `party_dispenser.cancel_order` (order_id), `party_dispenser.refresh` (no args)
  5. Unit + HA fixture tests cover config flow happy/sad paths and each service
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Config flow (ConfigFlow + OptionsFlowHandler; CFG-01/02/03)
- [x] 02-02-PLAN.md — Scaffolding + api.py + coordinator.py + entity.py + __init__.py extension (runtime_data pattern; QA-01 partial)
- [x] 02-03-PLAN.md — Sensor platform (5 SensorEntity subclasses + device_registry via shared DeviceInfo; INT-01, INT-02)
- [x] 02-04-PLAN.md — Wave-0 CI scaffolding + services.py + full pytest suite (INT-03, INT-04, INT-05, QA-01 full)

### Phase 3: Realtime push
**Goal**: Order placements and queue changes propagate from backend → HA entities sub-second via the WebSocket broadcaster, with graceful fallback when the socket drops.
**Depends on**: Phase 2
**Requirements**: RT-01, RT-02, RT-03, RT-04, QA-02
**Success Criteria** (what must be TRUE):
  1. Integration opens a single WebSocket to the backend per config entry after setup
  2. Order events update coordinator state within 1s (measurable in tests)
  3. Connection drops trigger reconnect with exponential backoff (0.5s → 30s cap)
  4. `binary_sensor.party_dispenser_connected` reflects socket state
  5. Polling continues as a fallback when the socket is disconnected (no stale data > 30s)
**Plans**: 2 plans

Plans:
- [ ] 03-01: WebSocket client + event-to-coordinator adapter + binary_sensor platform
- [ ] 03-02: Reconnect/backoff logic, poll-fallback interplay, integration tests for connection lifecycle

### Phase 4: Custom Lovelace card
**Goal**: A user adds a single `type: custom:party-dispenser-card` card to their dashboard and sees a polished recipe grid + live queue + summary; tapping a recipe places an order and tapping a queue item cancels it — all via the integration's services.
**Depends on**: Phase 3
**Requirements**: HACS-03, UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, QA-03
**Success Criteria** (what must be TRUE):
  1. Card source at `www/community/party-dispenser-card/` builds via rollup to a single `.js` bundle
  2. Card registers with Lovelace and renders the recipe grid, live queue, and summary counts
  3. Placing an order via the card triggers `party_dispenser.order_recipe` and the queue updates sub-second
  4. Cancel-order button triggers `party_dispenser.cancel_order` and removes the item
  5. Layout is usable on mobile companion (single-column) and desktop (grid)
  6. Card unit tests cover rendering + service-call invocation
**Plans**: 3 plans

Plans:
- [ ] 04-01: Card scaffolding (lit-element, TS, rollup, resource registration via HACS frontend category)
- [ ] 04-02: UI components (recipe grid, queue list, summary header) + service invocation
- [ ] 04-03: Mobile/desktop layout + card unit tests

### Phase 5: CI + GitHub mirror + release automation
**Goal**: A tag on the GitLab repo automatically produces a GitHub release on the mirror, so a HACS user can install from the GitHub URL and get the right version.
**Depends on**: Phase 4
**Requirements**: HACS-02, REL-02, REL-03, REL-04
**Success Criteria** (what must be TRUE):
  1. GitLab CI runs on every push: lint, Python tests, card tests, HACS validation action
  2. On tag push, a CI job pushes commits + tags to the private GitHub repo
  3. GitHub Actions (or equivalent) on the mirror creates a GitHub release with release notes from the tag
  4. The plugin installs cleanly in a fresh HA via HACS "Add custom repository → GitHub URL"
  5. Secrets (GitHub PAT) stored in GitLab CI variables, not in the repo
**Plans**: 2 plans

Plans:
- [ ] 05-01: GitLab CI pipeline (lint, test, HACS validation)
- [ ] 05-02: GitHub mirror job + release automation + end-to-end HACS install smoke test

### Phase 6: Docs + migration + polish
**Goal**: A new user can follow README.md to install, configure, and use the plugin; an existing YAML-package user has a documented migration path with no surprises.
**Depends on**: Phase 5
**Requirements**: DOC-01, DOC-02, DOC-04
**Success Criteria** (what must be TRUE):
  1. README.md covers: what it is, HACS install steps (URL to add), config flow walkthrough, card usage, troubleshooting
  2. `docs/migration-from-yaml-package.md` maps every YAML-package capability to the HACS equivalent
  3. `info.md` renders correctly inside HACS (markdown subset compatible)
  4. At least 3 screenshots in `docs/screenshots/` showing: HACS install, config flow, live card
  5. Mobile layout verified against HA companion app (iOS + Android if available)
**Plans**: 2 plans

Plans:
- [ ] 06-01: README, info.md, migration guide, troubleshooting
- [ ] 06-02: Screenshots + mobile verification + polish pass (copy, icons, attribution)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & HACS scaffolding | 3/3 | Complete | 2026-04-20 |
| 2. Integration core | 4/4 | Complete | 2026-04-20 |
| 3. Realtime push | 0/2 | Not started | - |
| 4. Custom Lovelace card | 0/3 | Not started | - |
| 5. CI + GitHub mirror + releases | 0/2 | Not started | - |
| 6. Docs + migration + polish | 0/2 | Not started | - |
