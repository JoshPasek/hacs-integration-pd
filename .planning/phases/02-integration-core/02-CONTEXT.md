# Phase 2: Integration core — Context

**Gathered:** 2026-04-20
**Status:** Ready for planning
**Source:** Synthesized from PROJECT.md + REQUIREMENTS.md + existing YAML package at `ava-organization/party-dispenser/party-dispenser-main:config/packages/party_dispenser.yaml` + Phase 1 delivered state

<domain>
## Phase Boundary

Phase 2 turns the Phase 1 no-op shell into a **working Home Assistant integration** that:

1. Accepts setup via the HA UI (config flow) — no YAML required
2. Persists config to HA's config entries
3. Creates a single Device registry entry per config entry
4. Creates and updates five sensor entities by polling the Party Dispenser REST API
5. Registers three services the user (or a Lovelace card) can call
6. Ships with tests using `pytest-homeassistant-custom-component`

Phase 2 uses **polling only** (30s default, configurable). Phase 3 layers WebSocket push on top. Phase 4 builds the custom card. This phase must not require any Phase 3 or Phase 4 work to ship — a plain Lovelace `entities` card over the five sensors should be a usable v0.2.0 release on its own.

**In scope:**
- `config_flow.py` — single `ConfigFlow` class with `async_step_user` collecting host, port, JWT, optional TLS boolean; validates connectivity before save
- Options flow (`OptionsFlowHandler`) — lets user rotate JWT or change scan interval without re-adding the integration
- `api.py` — async REST client wrapping the backend's four endpoints (GET /recipes, GET /queue, POST /orders/from-recipe, POST /orders/{id}/cancel); raises typed exceptions for connectivity / auth / server errors
- `coordinator.py` — `DataUpdateCoordinator` subclass polling every `scan_interval` seconds, merging recipes + queue into a single coordinator payload
- `sensor.py` — five `CoordinatorEntity` sensors reading from coordinator state
- `services.py` — three services registered once per integration domain (not per entry)
- `manifest.json` — flip `config_flow: false → true`, bump version to `0.2.0`
- `const.py` — add config-flow keys, service names, default scan interval, device identifier
- `strings.json` — populate user step + options step strings + service descriptions
- `translations/en.json` — mirror of strings.json (HA expects both)
- Tests: config flow happy-path + invalid-host + wrong-JWT sad paths; coordinator state machine; each service's call through to the mocked REST client

**Out of scope (deferred):**
- WebSocket subscription / push updates (Phase 3)
- Binary sensor for connection state (Phase 3)
- Reconnect/backoff logic (Phase 3)
- Custom Lovelace card (Phase 4)
- GitHub mirror CI (Phase 5)
- Real hassfest validation in CI (Phase 5 against GitHub mirror — still blocked on DinD locally)
- Multi-dispenser support (v2, MULTI-01)

</domain>

<decisions>
## Implementation Decisions

### Config Flow — user step fields (LOCKED)

Collected via `async_step_user`:

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `host` | string | (empty) | Required; non-empty string |
| `port` | int | `8000` | Required; 1–65535 |
| `use_tls` | bool | `False` | Optional; toggles `http` / `https` URL scheme |
| `jwt` | string (`selector.TextSelector` with `type: password`) | (empty) | Required; non-empty |
| `scan_interval` | int (seconds) | `30` | Optional; 5–600 |

**Connectivity validation before save:** Call `GET {scheme}://{host}:{port}/recipes` with the provided JWT. Expect 200 OK with a JSON list body. Handle:
- Network failure → `cannot_connect` error on the form
- 401 / 403 → `invalid_auth` error
- Timeout > 10s → `cannot_connect` error
- Non-JSON / unexpected shape → `invalid_response` error

### Config Flow — unique_id strategy (LOCKED)

Use `f"{host}:{port}"` as the unique_id for the config entry. Reason: the backend doesn't expose a stable instance ID yet (v2 will), so host+port is the current best. Prevents duplicate entries for the same dispenser.

### Options Flow (LOCKED)

Exposes: `jwt` (rotation), `scan_interval` (5–600), `use_tls` (toggle). Host and port are NOT editable after creation — force a remove-and-re-add if they change (the unique_id depends on them).

### API Client (LOCKED)

- `async` + `aiohttp` (HA provides `aiohttp_client.async_get_clientsession(hass)` — use it, don't instantiate a new session)
- Timeout: 10s default per call; configurable via coordinator
- Exceptions: `PartyDispenserAuthError`, `PartyDispenserConnectionError`, `PartyDispenserProtocolError` (subclasses of a base `PartyDispenserError`)
- Methods:
  - `async def list_recipes() -> list[Recipe]`
  - `async def list_queue() -> list[QueueItem]`
  - `async def order_from_recipe(recipe_id: str, session_uid: str = "home-assistant") -> OrderResult`
  - `async def cancel_order(order_id: str, session_uid: str = "home-assistant") -> None`
- Typed shapes (using `dataclasses` or `typing.TypedDict`) for `Recipe`, `QueueItem`, `OrderResult` — concrete fields from the current backend (see Canonical References)

### Coordinator (LOCKED)

- `class PartyDispenserCoordinator(DataUpdateCoordinator[PartyDispenserData])` — where `PartyDispenserData` is a dataclass with fields: `recipes: list[Recipe]`, `queue: list[QueueItem]`, `current_order: QueueItem | None`, `last_updated: datetime`
- `_async_update_data()` calls `api.list_recipes()` + `api.list_queue()` concurrently via `asyncio.gather`; on failure raises `UpdateFailed` (standard HA pattern)
- `update_interval` driven by `scan_interval` option; default 30s
- `current_order` derived: `queue[0] if queue else None`

### Entities (LOCKED shapes — see REQUIREMENTS.md INT-02)

All sensors use `CoordinatorEntity[PartyDispenserCoordinator]` pattern.

| Entity ID | Class | `native_value` | `state_attributes` |
|-----------|-------|---------------|--------------------|
| `sensor.party_dispenser_queue_size` | `SensorEntity` | `len(coord.data.queue)` | `{queue: [full list]}` |
| `sensor.party_dispenser_queue_summary` | `SensorEntity` | `f"{n} queued · {recipe} {state}"` derived | `{queue: ...}` |
| `sensor.party_dispenser_makeable_count` | `SensorEntity` | `len([r for r in recipes if r.makeable])` | `{makeable: [names]}` |
| `sensor.party_dispenser_current_order` | `SensorEntity` | `coord.data.current_order.recipe_name or "idle"` | `{order_id, state, started_at}` |
| `sensor.party_dispenser_recipes` | `SensorEntity` | `len(coord.data.recipes)` | `{recipes: [full list with makeable flags]}` |

Each sensor exposes `_attr_has_entity_name = True` + a stable `_attr_unique_id` using `f"{entry.entry_id}_{suffix}"` so HA's entity registry handles renames cleanly.

**Device:** single `DeviceInfo` shared across all 5 sensors, identifiers `{(DOMAIN, entry.entry_id)}`, name "Party Dispenser", manufacturer "PartyDispenser", model "Dispenser", sw_version from `/info` endpoint if available, else coordinator's `last_updated`.

### Services (LOCKED)

Three services registered in `async_setup_entry` (guarded by "already registered?" check since services are domain-level, not entry-level):

| Service | Schema | Action |
|---------|--------|--------|
| `party_dispenser.order_recipe` | `{recipe_id: str (required), session_uid: str (optional, default "home-assistant")}` | `api.order_from_recipe(...)` then `coordinator.async_request_refresh()` |
| `party_dispenser.cancel_order` | `{order_id: str (required), session_uid: str (optional, default "home-assistant")}` | `api.cancel_order(...)` then `coordinator.async_request_refresh()` |
| `party_dispenser.refresh` | `{}` | `coordinator.async_request_refresh()` |

Service schemas defined via `voluptuous` (HA convention).

### Version bump (LOCKED)

- `manifest.json`: `"version": "0.2.0"`
- `const.py`: `VERSION = "0.2.0"`
- `pyproject.toml`: `version = "0.2.0"`
- Tag `v0.2.0` at phase completion

### Lesson applied from Phase 1 (LOCKED)

- Every Python file change must pass `ruff check .` AND `ruff format --check .` before commit. Plans will include `ruff format .` as an explicit step in every task that writes Python.
- Do NOT assume DinD — CI stays as 2-stage (lint + test). Real hassfest stays deferred to Phase 5.
- Keep the `if TYPE_CHECKING:` guard pattern for `homeassistant.*` imports where they're only used for type hints. Runtime imports of HA modules at function body level (inside `async_setup_entry` etc.) are necessary and correct.

### Research-backed overrides applied (LOCKED)

Applied to this CONTEXT after 02-RESEARCH.md was produced — supersede any pre-research defaults elsewhere in this file:

1. **Python 3.13 required** (NOT 3.12). `homeassistant ≥ 2026.1` requires Python ≥ 3.13.2. Phase 2 plans must bump:
   - `pyproject.toml`: `requires-python = ">=3.13"`
   - `.gitlab-ci.yml`: `image: python:3.13-slim`
   - `pytest-homeassistant-custom-component` latest Python-3.13-compatible release is `0.13.316` (pins HA 2026.2.3)
2. **Service registration lives in `async_setup(hass, config)`, NOT `async_setup_entry`.** Services are domain-level (registered once for HA's lifetime); registering per-entry causes double-registration errors when a second config entry is added. Use a `services.py` module with an `async_setup_services(hass)` helper called from `__init__.py::async_setup`. Schema via voluptuous remains in the schema dict.
3. **Use `entry.runtime_data = PartyDispenserData(client=..., coordinator=...)` pattern (Bronze quality-scale rule).** Drop the legacy `hass.data[DOMAIN][entry_id] = ...` pattern entirely. Type alias `PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]` anchors the typing across modules.
4. **Options flow 2025.12+ pattern.** `OptionsFlowHandler.__init__` takes NO args — do NOT set `self.config_entry = config_entry`. The parent class provides `self.config_entry` automatically. Setting it manually is a hard error since HA 2025.12.
5. **Drop `strings.json`. Ship only `translations/en.json`.** This matches current HA convention (ludeeus blueprint + every 2026-era core integration). Phase 1's stub `strings.json` should be deleted as part of Phase 2. Saves a sync-drift bug and one file to maintain.
6. **Phase 1's `tests/test_integration_manifest.py::test_manifest_phase1_overrides` assertion must be updated** when Phase 2 flips `config_flow: true` and bumps `version: 0.2.0`. Rename the test to `test_manifest_current_overrides` (or similar), update the `config_flow is False` → `config_flow is True` and the version assertion to `"0.2.0"`. Otherwise CI's `pytest` job will fail.

### Testing strategy (LOCKED)

- Add dev-dep `pytest-homeassistant-custom-component` (latest stable, 0.13.x per RESEARCH already) to `pyproject.toml` `[project.optional-dependencies] dev`
- CI must install `.[dev]` so the HA fixtures are available (will slow CI somewhat — HA install is ~45s)
- Tests cover at minimum:
  - Config flow: happy path, invalid host, invalid JWT, timeout, duplicate-entry
  - Coordinator: successful fetch, transient failure + retry, permanent failure sets unavailable
  - Each of the 3 services end-to-end via `hass.services.async_call(...)`
  - Each of the 5 sensors: state reflects coordinator data
- Target: ≥ 80% coverage on `config_flow.py`, `api.py`, `coordinator.py`, `services.py` (sensor tests more thin but present)

### Claude's Discretion
- Exact field names for `Recipe` / `QueueItem` dataclasses — align with backend response shape; researcher should extract from `backend/app/` code if needed
- Whether to use `dataclasses` vs `typing.TypedDict` vs `pydantic` — `dataclasses` preferred (no extra dep)
- Whether `api.py` exposes a `close()` coroutine or relies on HA's session lifecycle (prefer HA session lifecycle)
- Whether to add a `diagnostics.py` (HA feature) in Phase 2 — nice-to-have, not required by roadmap
- Exactly how to structure the `translations/` directory (single `en.json` sufficient for v0.2.0)
- Whether to add a `DataUpdateCoordinator` failure-debounce (probably keep default HA behavior)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context (internal)
- `INTAKE.md` — Original PRD / scope brief
- `.planning/PROJECT.md` — Vision, core value, constraints, key decisions
- `.planning/REQUIREMENTS.md` — 32 requirement IDs; Phase 2 covers CFG-01..03, INT-01..05, QA-01
- `.planning/ROADMAP.md` — Phase 2 goal + success criteria
- `.planning/phases/01-foundation-hacs-scaffolding/01-03-SUMMARY.md` — two deviations to apply as lessons (ruff format before commit; DinD unavailable)
- `custom_components/party_dispenser/__init__.py` — current Phase 1 stub (keeps `if TYPE_CHECKING:` pattern; Phase 2 adds real setup logic)
- `custom_components/party_dispenser/manifest.json` — current Phase 1 manifest; Phase 2 flips `config_flow: false → true` and bumps version
- `custom_components/party_dispenser/const.py` — current Phase 1 constants; Phase 2 extends
- `tests/test_integration_manifest.py` — the bespoke manifest validator; must continue to pass after the manifest bumps

### Backend API contract (external, in `ava-organization/party-dispenser/party-dispenser-main`)
- `config/packages/party_dispenser.yaml` — **THE canonical endpoint + payload reference** — shows all 4 endpoints, JWT header, payload shapes, and `session_uid: "home-assistant"` convention
- `backend/app/` — FastAPI source; researcher should grep for endpoint handlers to confirm response shapes (recipe fields, queue item fields, order response)
- `backend/README.md` — may document endpoints + auth flow

### Home Assistant reference docs (external)
- Config flow: https://developers.home-assistant.io/docs/config_entries_config_flow_handler
- Options flow: https://developers.home-assistant.io/docs/config_entries_options_flow_handler
- DataUpdateCoordinator: https://developers.home-assistant.io/docs/integration_fetching_data
- Device registry + DeviceInfo: https://developers.home-assistant.io/docs/device_registry_index
- Entity platform + unique_id conventions: https://developers.home-assistant.io/docs/entity_registry_index
- Service registration: https://developers.home-assistant.io/docs/dev_101_services
- Integration quality scale (aspirational): https://developers.home-assistant.io/docs/core/integration-quality-scale — silver tier by v1.0
- `pytest-homeassistant-custom-component` testing patterns: https://github.com/MatthewFlamm/pytest-homeassistant-custom-component

</canonical_refs>

<specifics>
## Specific Ideas

**Requirement mapping for Phase 2:**
- CFG-01: Config flow collects host/port/JWT/TLS, validates connectivity before save → `config_flow.py`
- CFG-02: Options flow rotates JWT → `config_flow.py::OptionsFlowHandler`
- CFG-03: No YAML required → guaranteed by config_flow + `config_flow: true` in manifest
- INT-01: One device per entry → `DeviceInfo` with `identifiers={(DOMAIN, entry.entry_id)}`
- INT-02: 5 sensors → `sensor.py` with 5 entity classes
- INT-03: `party_dispenser.order_recipe` → `services.py`
- INT-04: `party_dispenser.cancel_order` → `services.py`
- INT-05: `party_dispenser.refresh` → `services.py`
- QA-01: test suite → `tests/test_config_flow.py`, `tests/test_coordinator.py`, `tests/test_services.py`, `tests/test_sensor.py`

**File layout (new files to create):**
```
custom_components/party_dispenser/
├── __init__.py                  (EXTEND: real async_setup_entry, register coordinator + platforms + services)
├── manifest.json                (MODIFY: config_flow→true, version→0.2.0)
├── const.py                     (EXTEND: add CONF_HOST, CONF_PORT, CONF_JWT, CONF_TLS, CONF_SCAN_INTERVAL, service names, defaults)
├── strings.json                 (EXTEND: user step, options step, service descriptions)
├── translations/
│   └── en.json                  (NEW: mirror of strings.json)
├── config_flow.py               (NEW)
├── api.py                       (NEW)
├── coordinator.py               (NEW)
├── sensor.py                    (NEW)
└── services.py                  (NEW)

tests/
├── conftest.py                  (EXTEND: add HA fixtures via pytest-homeassistant-custom-component)
├── test_config_flow.py          (NEW)
├── test_coordinator.py          (NEW)
├── test_api.py                  (NEW)
├── test_sensor.py               (NEW)
└── test_services.py             (NEW)
```

**pyproject.toml additions:**
```toml
[project.optional-dependencies]
dev = [
  "pytest-homeassistant-custom-component~=0.13.0",
  "pytest-asyncio~=1.0",
  "ruff==0.15.11",
]
```

**CI changes (`.gitlab-ci.yml`):**
- `pytest` job: change to `pip install --quiet -e .[dev]` (installs HA + plugin) instead of bare `pip install pytest`
- Expect CI time to jump from ~20s to ~90s (HA install dominates) — still well under 2-minute budget
- Keep ruff job as-is

**Service call examples for card (Phase 4 reference):**
```yaml
# In the card (Phase 4), call via HA websocket API
service: party_dispenser.order_recipe
data:
  recipe_id: "abc123"
```

**Testing gotchas to flag to planner:**
- `pytest-homeassistant-custom-component` requires `asyncio_mode = auto` in pyproject.toml (Phase 1 already set this)
- The plugin provides `hass` fixture, `aioclient_mock` fixture, `enable_custom_integrations` autouse fixture
- Tests must NOT import `homeassistant.*` at module level in test files outside of `TYPE_CHECKING` — use fixtures instead
- `MockConfigEntry` helper for config-entry-state tests

</specifics>

<deferred>
## Deferred Ideas

- WebSocket push → Phase 3
- Binary sensor for connection state → Phase 3
- Custom Lovelace card → Phase 4
- GitHub mirror + real hassfest → Phase 5
- Multi-dispenser / per-device routing → v2 (MULTI-01, MULTI-02)
- i18n beyond English → v2 (UX-03 adjacent)
- Diagnostics handler (`diagnostics.py`) — could slot into Phase 2 as Claude's discretion; probably defer to Phase 6 polish
- Repairs / issue registry integration — nice-to-have for quality-scale silver, not Phase 2 required

---

*Phase: 02-integration-core*
*Context gathered: 2026-04-20 via Phase 2 PRD synthesis*
