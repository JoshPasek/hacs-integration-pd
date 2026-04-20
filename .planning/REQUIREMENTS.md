# Requirements: Party Dispenser HACS Integration

**Defined:** 2026-04-20
**Core Value:** One-click install and a live, push-driven dashboard card that controls the dispenser.

## v1 Requirements

### HACS Distribution

- [x] **HACS-01**: Repo is HACS-installable as a custom repository (root `hacs.json`, valid `custom_components/party_dispenser/manifest.json`, `info.md`)
- [ ] **HACS-02**: Semver release tags drive HACS version selection (tags on GitLab propagate to GitHub mirror)
- [ ] **HACS-03**: Card is discoverable under the HACS "Frontend" category via a second `hacs.json` entry or combined config

### Installation & Configuration

- [x] **CFG-01**: Config flow asks for host, port, JWT, TLS mode; validates connectivity before saving
- [x] **CFG-02**: Options flow lets user rotate the JWT without re-adding the integration
- [x] **CFG-03**: No YAML edits required for normal setup — everything is via UI

### Integration Core (Entities & Services)

- [x] **INT-01**: One `device_registry` entry per config entry labeled "Party Dispenser"
- [x] **INT-02**: Entities: `sensor.party_dispenser_queue_size`, `sensor.party_dispenser_queue_summary`, `sensor.party_dispenser_makeable_count`, `sensor.party_dispenser_current_order`, `sensor.party_dispenser_recipes`
- [x] **INT-03**: Service `party_dispenser.order_recipe(recipe_id: str)` places an order on the backend
- [x] **INT-04**: Service `party_dispenser.cancel_order(order_id: str)` cancels a queued order
- [x] **INT-05**: Service `party_dispenser.refresh()` forces a full state refresh

### Realtime Updates

- [ ] **RT-01**: Integration subscribes to backend WebSocket broadcaster on setup
- [ ] **RT-02**: Queue/order events update HA entities within 1 second of backend broadcast
- [ ] **RT-03**: `binary_sensor.party_dispenser_connected` reflects WebSocket connection state
- [ ] **RT-04**: On disconnect, the integration reconnects with exponential backoff (0.5s→30s cap) and falls back to polling until reconnected

### Custom Lovelace Card

- [ ] **UI-01**: Card type `custom:party-dispenser-card` registers via HACS frontend install
- [ ] **UI-02**: Card renders recipe grid (make-now button per recipe when makeable)
- [ ] **UI-03**: Card renders live queue with per-item cancel buttons
- [ ] **UI-04**: Card renders summary counts (queue size, makeable recipes)
- [ ] **UI-05**: Card calls integration services (primary path) — no backend network calls from browser by default
- [ ] **UI-06**: Card is usable on mobile HA companion (single-column layout <600px wide)
- [ ] **UI-07**: Card visual style matches HA core conventions (mushroom-ish chips, HA theming variables)

### Testing & Quality

- [x] **QA-01**: `pytest-homeassistant-custom-component` tests cover config flow (happy + sad paths), each service, coordinator state machine _(Phase 2 partial — behaviors coded in 02-02; pytest-HA suite lands in 02-04)_
- [ ] **QA-02**: WebSocket reconnect logic has dedicated tests (drop simulation, backoff assertions)
- [ ] **QA-03**: Card has unit tests covering render + service-call invocation (using `@web/test-runner` or similar)
- [x] **QA-04**: CI pipeline runs lint + all tests on every push; blocks merge on failure

### Distribution & Release

- [x] **REL-01**: Primary repo on `gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd`
- [ ] **REL-02**: On tag push, CI mirrors commits + tag to a private GitHub repo
- [ ] **REL-03**: GitHub release is auto-created with release notes derived from the tag message
- [ ] **REL-04**: HACS install from the GitHub URL succeeds end-to-end (smoke test)

### Docs & Migration

- [ ] **DOC-01**: README covers install, config flow, card usage, troubleshooting
- [ ] **DOC-02**: Migration guide maps every existing `party_dispenser.yaml` capability to the HACS equivalent
- [x] **DOC-03**: `info.md` renders correctly in the HACS UI
- [ ] **DOC-04**: At least 3 screenshots: HACS install, config flow, live card

## v2 Requirements

Deferred to future releases — not in v1.0 scope.

### Multi-instance

- **MULTI-01**: Support multiple Party Dispenser devices per HA instance
- **MULTI-02**: Card supports targeting a specific dispenser by entity_id

### Enhanced UX

- **UX-01**: Voice-assistant intents (`HassClimateSetTemperature`-style) for hands-free ordering
- **UX-02**: Public HACS store listing (requires public GitHub repo + compliance review)
- **UX-03**: Themes/skins for card

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cloud-relay backend | v1 assumes local LAN; cloud relay is a v2+ network-topology change |
| i18n beyond English | v1 personal-use; translations can follow if the plugin gains external users |
| Non-FastAPI backends | The plugin is specific to this Party Dispenser backend contract |
| HACS public store | Private GitHub repo for personal use; public submission is a v2 decision |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| HACS-01 | Phase 1 | Complete |
| HACS-02 | Phase 5 | Pending |
| HACS-03 | Phase 4 | Pending |
| CFG-01 | Phase 2 | Complete |
| CFG-02 | Phase 2 | Complete |
| CFG-03 | Phase 2 | Complete |
| INT-01 | Phase 2 | Complete |
| INT-02 | Phase 2 | Complete |
| INT-03 | Phase 2 | Complete |
| INT-04 | Phase 2 | Complete |
| INT-05 | Phase 2 | Complete |
| RT-01 | Phase 3 | Pending |
| RT-02 | Phase 3 | Pending |
| RT-03 | Phase 3 | Pending |
| RT-04 | Phase 3 | Pending |
| UI-01 | Phase 4 | Pending |
| UI-02 | Phase 4 | Pending |
| UI-03 | Phase 4 | Pending |
| UI-04 | Phase 4 | Pending |
| UI-05 | Phase 4 | Pending |
| UI-06 | Phase 4 | Pending |
| UI-07 | Phase 4 | Pending |
| QA-01 | Phase 2 | Complete |
| QA-02 | Phase 3 | Pending |
| QA-03 | Phase 4 | Pending |
| QA-04 | Phase 1 (skeleton), Phase 5 (full) | Complete |
| REL-01 | Phase 1 | Complete |
| REL-02 | Phase 5 | Pending |
| REL-03 | Phase 5 | Pending |
| REL-04 | Phase 5 | Pending |
| DOC-01 | Phase 6 | Pending |
| DOC-02 | Phase 6 | Pending |
| DOC-03 | Phase 1 (stub), Phase 6 (full) | Complete |
| DOC-04 | Phase 6 | Pending |
