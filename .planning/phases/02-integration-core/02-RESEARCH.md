# Phase 2: Integration core — Research

**Researched:** 2026-04-20
**Domain:** Home Assistant custom-integration config flow, DataUpdateCoordinator-based polling, aiohttp REST client, `pytest-homeassistant-custom-component` test harness, service registration, device registry — all targeted at HA Core ≥ 2026.1
**Confidence:** HIGH on canonical HA patterns (verified against current `home-assistant/core` source + ludeeus blueprint + live PyPI metadata); HIGH on backend API shapes (pulled directly from GitLab project 11); MEDIUM on one Python-version pitfall that the CONTEXT.md doesn't flag (see **Pitfall 1** — Python 3.12 is now incompatible with `homeassistant ≥ 2026.1`; CI must bump to 3.13-slim).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Phase boundary**
- `config_flow.py` — single `ConfigFlow` class with `async_step_user` collecting host, port, JWT, optional TLS boolean; validates connectivity before save
- Options flow (`OptionsFlowHandler`) — rotate JWT, change scan_interval, toggle TLS; host and port NOT editable
- `api.py` — async REST client wrapping backend's 4 endpoints, raises typed exceptions
- `coordinator.py` — `DataUpdateCoordinator` subclass polling every `scan_interval` seconds, merging `/recipes` + `/queue` in a single payload via `asyncio.gather`
- `sensor.py` — five `CoordinatorEntity` sensors reading from coordinator state
- `services.py` — three services registered once per integration domain (not per entry)
- `manifest.json` — flip `config_flow: false → true`, bump version to `0.2.0`
- `const.py` — add config-flow keys, service names, default scan interval, device identifier
- `strings.json` — populate user step + options step strings + service descriptions
- `translations/en.json` — mirror of strings.json (HA expects both)
- Tests: config flow happy-path + sad paths; coordinator state machine; each service's call-through via mocked REST client

**Config Flow — user step fields (LOCKED)**

| Field | Type | Default | Validation |
|-------|------|---------|------------|
| `host` | string | (empty) | Required; non-empty string |
| `port` | int | `8000` | Required; 1–65535 |
| `use_tls` | bool | `False` | Optional; toggles `http` / `https` URL scheme |
| `jwt` | string (`selector.TextSelector` with `type: password`) | (empty) | Required; non-empty |
| `scan_interval` | int (seconds) | `30` | Optional; 5–600 |

**Connectivity validation before save:** GET `{scheme}://{host}:{port}/recipes` with provided JWT. Error mapping:
- Network failure → `cannot_connect`
- 401 / 403 → `invalid_auth`
- Timeout > 10s → `cannot_connect`
- Non-JSON / unexpected shape → `invalid_response`

**Config Flow unique_id strategy (LOCKED):** `f"{host}:{port}"`.

**Options Flow (LOCKED):** Exposes `jwt`, `scan_interval` (5–600), `use_tls`.

**API Client (LOCKED):**
- `async` + `aiohttp`; use `homeassistant.helpers.aiohttp_client.async_get_clientsession(hass)` — do NOT instantiate a new session
- Timeout: 10s default per call
- Exceptions: `PartyDispenserAuthError`, `PartyDispenserConnectionError`, `PartyDispenserProtocolError` (all subclass `PartyDispenserError`)
- Methods: `list_recipes()`, `list_queue()`, `order_from_recipe(recipe_id, session_uid)`, `cancel_order(order_id, session_uid)`
- Typed shapes via `dataclasses` (no extra deps) — `Recipe`, `QueueItem`, `OrderResult`

**Coordinator (LOCKED):**
- `class PartyDispenserCoordinator(DataUpdateCoordinator[PartyDispenserData])` — `PartyDispenserData` is a dataclass with `recipes: list[Recipe]`, `queue: list[QueueItem]`, `current_order: QueueItem | None`, `last_updated: datetime`
- `_async_update_data()` calls `api.list_recipes()` + `api.list_queue()` concurrently via `asyncio.gather`; on failure raises `UpdateFailed`
- `update_interval` driven by `scan_interval` option; default 30s
- `current_order` derived: `queue[0] if queue else None`

**Entities (LOCKED shapes — see REQUIREMENTS.md INT-02):**

All sensors use `CoordinatorEntity[PartyDispenserCoordinator]` pattern. Each sensor exposes `_attr_has_entity_name = True` + stable `_attr_unique_id` using `f"{entry.entry_id}_{suffix}"`.

| Entity ID | `native_value` | `state_attributes` |
|-----------|---------------|--------------------|
| `sensor.party_dispenser_queue_size` | `len(coord.data.queue)` | `{queue: [full list]}` |
| `sensor.party_dispenser_queue_summary` | `f"{n} queued · {recipe} {state}"` | `{queue: ...}` |
| `sensor.party_dispenser_makeable_count` | `len([r for r in recipes if r.makeable])` | `{makeable: [names]}` |
| `sensor.party_dispenser_current_order` | `coord.data.current_order.recipe_name or "idle"` | `{order_id, state, started_at}` |
| `sensor.party_dispenser_recipes` | `len(coord.data.recipes)` | `{recipes: [full list with makeable flags]}` |

**Device:** single `DeviceInfo` shared across all 5 sensors, `identifiers={(DOMAIN, entry.entry_id)}`, name "Party Dispenser", manufacturer "PartyDispenser", model "Dispenser".

**Services (LOCKED):** Three services registered once per domain (guarded by "already registered?" check):

| Service | Schema | Action |
|---------|--------|--------|
| `party_dispenser.order_recipe` | `{recipe_id: str required, session_uid: str optional default "home-assistant"}` | `api.order_from_recipe(...)` then `coordinator.async_request_refresh()` |
| `party_dispenser.cancel_order` | `{order_id: str required, session_uid: str optional default "home-assistant"}` | `api.cancel_order(...)` then `coordinator.async_request_refresh()` |
| `party_dispenser.refresh` | `{}` | `coordinator.async_request_refresh()` |

**Version bump (LOCKED):** `manifest.json` → `0.2.0`, `const.py` → `VERSION = "0.2.0"`, `pyproject.toml` → `0.2.0`, tag `v0.2.0` at phase completion.

**Lessons from Phase 1 (LOCKED):**
- Every Python file change must pass `ruff check .` AND `ruff format --check .` before commit; plans will include `ruff format .` as an explicit step
- Do NOT assume DinD — CI stays 2-stage (lint + test)
- Keep `if TYPE_CHECKING:` guards for `homeassistant.*` imports used only in type hints

**Testing strategy (LOCKED):**
- Add dev-dep `pytest-homeassistant-custom-component` to `pyproject.toml` `[project.optional-dependencies] dev`
- CI must install `.[dev]` so HA fixtures are available
- Tests cover: config flow (happy + sad paths); coordinator state machine; each of 3 services end-to-end via `hass.services.async_call(...)`; each of 5 sensors: state reflects coordinator data
- Target ≥ 80% coverage on `config_flow.py`, `api.py`, `coordinator.py`, `services.py`

### Claude's Discretion
- Exact field names for `Recipe` / `QueueItem` dataclasses — align with backend response shape (researcher extracts from `backend/app/api/schemas.py`)
- `dataclasses` vs `typing.TypedDict` vs `pydantic` — `dataclasses` preferred (no extra dep)
- Whether `api.py` exposes a `close()` coroutine or relies on HA's session lifecycle (prefer HA session lifecycle)
- Whether to add a `diagnostics.py` in Phase 2 — nice-to-have, not required
- Exactly how to structure the `translations/` directory (single `en.json` sufficient for v0.2.0)
- Whether to add a `DataUpdateCoordinator` failure-debounce (probably keep default HA behavior)

### Deferred Ideas (OUT OF SCOPE)
- WebSocket push / binary_sensor.connected / reconnect+backoff → Phase 3
- Custom Lovelace card → Phase 4
- GitHub mirror CI + real hassfest in CI → Phase 5
- Multi-dispenser support → v2 (MULTI-01, MULTI-02)
- i18n beyond English → v2
- Diagnostics handler (`diagnostics.py`) — defer to Phase 6 polish
- Repairs / issue registry integration — not Phase 2 required
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **CFG-01** | Config flow asks for host, port, JWT, TLS mode; validates connectivity before saving | **Code Examples → `config_flow.py`**; validation via `_test_connection()` calls the `api.py` wrapper (see `IntegrationBlueprintApiClient` pattern); error mapping and `self._abort_if_unique_id_configured()` pinned in **Architecture Patterns → Config flow** |
| **CFG-02** | Options flow lets user rotate JWT without re-adding the integration | **Code Examples → `OptionsFlowHandler`**; **Pitfall 2** (2025.12 deprecation: do NOT set `self.config_entry` in `__init__`); uses `self.add_suggested_values_to_schema(..., self.config_entry.options)` |
| **CFG-03** | No YAML edits required for normal setup | Guaranteed by `"config_flow": true` in manifest.json + no `CONFIG_SCHEMA` in `__init__.py` (or `cv.empty_config_schema(DOMAIN)` if required). See **Architecture Patterns → manifest.json deltas** |
| **INT-01** | One `device_registry` entry per config entry labeled "Party Dispenser" | **Code Examples → `entity.py`**; `DeviceInfo(identifiers={(DOMAIN, entry.entry_id)}, name="Party Dispenser", manufacturer="PartyDispenser", model="Dispenser")` attached to every sensor via `CoordinatorEntity` base class |
| **INT-02** | 5 sensors with specific entity_ids | **Code Examples → `sensor.py`**; `SensorEntityDescription` list + `CoordinatorEntity` subclass; `_attr_has_entity_name = True` + `_attr_translation_key` for clean naming; `_attr_unique_id = f"{entry.entry_id}_{key}"` for multi-entity uniqueness |
| **INT-03** | Service `party_dispenser.order_recipe(recipe_id: str)` | **Code Examples → `services.py`**; `hass.services.async_register(DOMAIN, "order_recipe", handler, schema=...)` — register once at domain level, not per entry (see **Pitfall 3**) |
| **INT-04** | Service `party_dispenser.cancel_order(order_id: str)` | Same as INT-03 with different handler |
| **INT-05** | Service `party_dispenser.refresh()` | Same pattern — handler calls `coordinator.async_request_refresh()` on all entries of this domain |
| **QA-01** | `pytest-homeassistant-custom-component` tests cover config flow (happy + sad), each service, coordinator state machine | **Code Examples → test files**; fixtures: `hass`, `aioclient_mock`, `enable_custom_integrations` (autouse); `MockConfigEntry` for entry-state tests; **Pitfall 1** (Python version bump required for `pytest-homeassistant-custom-component` to install) |
</phase_requirements>

## Summary

Phase 2 is the first "real" phase of the integration — every line of integration code the user will ever see gets written here. The research confirms the design in `02-CONTEXT.md` is sound, but surfaces **three must-fix items** and **five load-bearing patterns** that the CONTEXT.md doesn't address in detail.

**The must-fix items:**

1. **Python 3.12 is incompatible with HA 2026.1+.** The current `pyproject.toml` says `requires-python = ">=3.12"` and `.gitlab-ci.yml` uses `python:3.12-slim`. But `homeassistant==2026.1.0` (and every subsequent release) declares `requires_python = ">=3.13.2"`, and the latest `pytest-homeassistant-custom-component==0.13.316` that pins HA 2026.2.3 declares `requires_python = ">=3.13"`. **`pip install pytest-homeassistant-custom-component` on a 3.12 runner fails immediately.** Phase 2 MUST bump `pyproject.toml` to `>=3.13` and `.gitlab-ci.yml` to `python:3.13-slim`. (Note: HA 2026.3+ moves to 3.14; 3.13 is the widest sweet spot for Phase 2 because it still resolves against HA 2026.2.3.)
2. **Options-flow `self.config_entry` is deprecated.** As of HA 2025.12 (released roughly 2025-12-03), setting `self.config_entry = config_entry` in `OptionsFlowHandler.__init__` is a hard error. The parent `OptionsFlow` class now provides `self.config_entry` and `self._config_entry_id` automatically. `async_get_options_flow` still receives a `config_entry` arg, but the handler's `__init__` must take zero args (or only its own).
3. **Services register once, not per entry.** The canonical 2026 pattern (Shelly, Nut, ludeeus blueprint) is: put the 3 services in `services.py` with an `async_setup_services(hass)` function, and call it from `async_setup(hass, config)` — NOT `async_setup_entry`. This means Phase 2 introduces an `async_setup` function alongside `async_setup_entry` (Phase 1 has only `async_setup_entry`). The services access the current coordinator via `hass.config_entries.async_get_entry(...).runtime_data.coordinator` (or iterate all entries of our DOMAIN for a broadcast-style `refresh`).

**The five load-bearing patterns:**

1. **`ConfigEntry.runtime_data` over `hass.data[DOMAIN][entry_id]`.** Since HA 2024.5 the canonical way to attach a coordinator to an entry is `entry.runtime_data = MyData(coordinator=...)` with a type alias `type PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]`. This is a Bronze-tier quality-scale rule ([developers.home-assistant.io/docs/core/integration-quality-scale/rules/runtime-data](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/runtime-data)) — "no exceptions." The old `hass.data[DOMAIN][entry.entry_id] = coordinator` pattern still works but is actively discouraged.
2. **`selector.TextSelector(TextSelectorConfig(type=selector.TextSelectorType.PASSWORD))`** is the modern way to mark a field as a password in config flow — NOT plain `str` which renders as cleartext. For `scan_interval` use `selector.NumberSelector(NumberSelectorConfig(min=5, max=600, mode=NumberSelectorMode.BOX))`.
3. **`_attr_has_entity_name = True` + `_attr_translation_key`.** Since HA 2023.8 this is the canonical entity-naming pattern. Entities set `_attr_translation_key = "queue_size"` and the name comes from `translations/en.json → entity.sensor.queue_size.name`. The final entity_id is derived as `{device_name} {translated_name}` → slug. Setting a hard-coded `_attr_name` in Python is discouraged; all user-facing strings belong in translations.
4. **`translations/en.json` is the canonical location; `strings.json` is optional.** The ludeeus blueprint (the modern canonical template) ships only `translations/en.json` and no `strings.json`. HA Core fallback order: check `translations/<lang>.json` first; fall back to `strings.json` only if no translations. CONTEXT.md locks both — safest is to ship both with identical content, or ship only `translations/en.json`. The bespoke manifest validator in Phase 1 doesn't check either file.
5. **`aioclient_mock` fixture ONLY works inside HA's own `aiohttp_client.async_get_clientsession`.** If `api.py` creates a fresh `aiohttp.ClientSession` with `aiohttp.ClientSession()`, the fixture won't intercept it. `api.py` must accept a session parameter and the coordinator passes `async_get_clientsession(hass)` — this is what the ludeeus blueprint does and what enables all the tests.

**Primary recommendation:** Follow the **ludeeus/integration_blueprint** 2026 template as the structural baseline (data.py + entity.py + coordinator.py + api.py + config_flow.py) — it's the single most up-to-date canonical example, matches every 2026 best practice (runtime_data, has_entity_name, translations-only naming, `type` alias for `ConfigEntry`), and directly inspired the Shelly, Nut, and many other core integrations. Deviate only where CONTEXT.md explicitly locks a decision (e.g., the specific 5 sensor shapes, the 3 service signatures, the exact exception class names).

## Project Constraints (from CLAUDE.md)

No `./CLAUDE.md` found in project root (`/Users/jamaze/projects/hacs-integration-pd`). No project-level directives override research recommendations for this phase.

## Standard Stack

### Core — runtime & test harness (version-verified 2026-04-20)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | **3.13** (bumped from 3.12) | Target interpreter | `homeassistant ≥ 2026.1` requires ≥3.13.2; `pytest-homeassistant-custom-component` latest-3.13-compat version requires ≥3.13. Sticking with 3.12 is not a viable option for Phase 2. |
| `homeassistant` | **2026.2.3** (dev dep only, pulled in by pytest-HA-custom) | HA runtime for tests + type imports | Latest version that Python 3.13 can install. HA 2026.3+ moved to 3.14. Pinning against 2026.2.3 is the widest sweet spot for a 3.13 CI runner today. |
| `pytest-homeassistant-custom-component` | **0.13.316** (released 2026-02-21, pins `homeassistant==2026.2.3` + `pytest-asyncio==1.3.0` + `pytest==9.0.0`) | HA test harness | The ONLY supported way to get `hass`, `aioclient_mock`, `enable_custom_integrations`, `MockConfigEntry` fixtures without shipping HA core itself. Updated daily by upstream against latest HA; we pin a specific minor to avoid CI drift. |
| `aiohttp` | ≥3.11 (comes with HA pin) | HTTP client for `api.py` | HA's `async_get_clientsession(hass)` already returns an aiohttp session — Phase 2 imports `aiohttp` only for type hints and exception classes (`aiohttp.ClientError`). No top-level `aiohttp` install needed; it arrives transitively. |
| `voluptuous` | ≥0.15 (comes with HA pin) | Config flow + service schemas | HA's mandated validation library; every core integration uses it. Do NOT swap to pydantic here. |
| `ruff` | **0.15.11** (same as Phase 1) | Lint + format | No change — same pin as Phase 1. |

**Version verification commands (run 2026-04-20):**

```bash
# Python version floor for HA 2026.x
curl -s https://pypi.org/pypi/homeassistant/2026.2.3/json | jq -r '.info.requires_python'
# => >=3.13.2

# Latest pytest-HA-custom that still supports 3.13 (NOT 3.14)
curl -s https://pypi.org/pypi/pytest-homeassistant-custom-component/0.13.316/json | jq -r '.info.requires_python'
# => >=3.13

# What HA version does pytest-HA-custom 0.13.316 pin?
curl -s https://pypi.org/pypi/pytest-homeassistant-custom-component/0.13.316/json | jq -r '.info.requires_dist[] | select(contains("homeassistant=="))'
# => homeassistant==2026.2.3

# Latest versions of bundled deps
curl -s https://pypi.org/pypi/aiohttp/json | jq -r '.info.version'        # => 3.13.5 (2026-03-31)
curl -s https://pypi.org/pypi/pytest-asyncio/json | jq -r '.info.version' # => 1.3.0 (2025-11-10)
```

### Supporting — CI-only tools

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `python:3.13-slim` docker image | Debian-slim, ~165 MB | GitLab CI runner image | Replace `python:3.12-slim` in `.gitlab-ci.yml`. 3.14-slim is also viable but adds ~60s because many wheel indices still publish 3.13 builds first. |
| `pip cache` | — | CI speedup | Already configured in Phase 1; preserve. HA install is ~200 MB of deps; cache-key-per-ref is correct. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `dataclasses` for API shapes | `typing.TypedDict` | Dataclasses give real runtime constructors + `field(default_factory=list)`; TypedDict is structural-only and JSON-parse doesn't check field presence. Stick with dataclasses. |
| `dataclasses` for API shapes | `pydantic` (already pulled in by HA) | `pydantic` is a runtime dep of HA, so it's "free"; but HA core style explicitly avoids it outside of `homeassistant.util.dt` etc. Blueprint uses dataclasses. Stay consistent. |
| `aiohttp.ClientSession()` instantiated in `api.py` | `hass.helpers.aiohttp_client.async_get_clientsession(hass)` | HA's session is shared across integrations, has lifecycle tied to HA shutdown, is pre-wrapped with HA's SSL context. Using your own session breaks `aioclient_mock` in tests (you'd need `respx` instead). **Use the HA session.** ([inject-websession quality rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/inject-websession/)) |
| `unittest.mock.AsyncMock` patching in tests | `aioclient_mock` fixture from pytest-HA-custom | `aioclient_mock` intercepts at the aiohttp layer of the shared HA session — closest to production. AsyncMock patching works for simpler unit tests but misses real URL shapes. Prefer `aioclient_mock` for end-to-end config-flow + coordinator tests; reserve `AsyncMock` for tight API-wrapper unit tests. |
| Single `strings.json` | `translations/en.json` + (optional) `strings.json` | The **ludeeus blueprint and all current 2026 core integrations** ship only `translations/`. `strings.json` is a legacy fallback. CONTEXT locks "both" — simplest is identical content in both files OR drop `strings.json` entirely. (My recommendation: drop `strings.json`; Phase 1's existing `strings.json` can be deleted in Phase 2 if the planner agrees.) |
| Options flow with `self.config_entry = config_entry` | Options flow with no explicit assignment (2025.12 pattern) | Old pattern warned since 2025.1, hard-error as of 2025.12. The new pattern — parent class sets `self.config_entry` — is the ONLY supported way now. |

**Installation (Phase 2 dev env):**

```bash
# Updated pyproject.toml adds:
pip install -e ".[dev]"
# Pulls: pytest-homeassistant-custom-component==0.13.316, homeassistant==2026.2.3, pytest==9.0.0, pytest-asyncio==1.3.0, aiohttp==3.13.5, and ~80 transitive deps
# Total install time on cold cache: ~60-90s on python:3.13-slim
# With pip cache: ~20-30s
```

### The Backend API Contract (pulled directly from `ava-organization/party-dispenser/party-dispenser-main` @ main, 2026-04-20)

Extracted verbatim from `backend/app/api/schemas.py` (response schema) and `backend/app/api/routes/{recipes,queue,orders}.py` (endpoint handlers). Copy-ready Python typed shapes for the integration follow.

#### Endpoint 1: `GET /recipes`

**Source:** `backend/app/api/routes/recipes.py::list_recipes` → `response_model=list[RecipeOut]`.

**Auth:** The `list_recipes` handler does NOT `Depends(require_admin)` or `Depends(get_current_user)` — the `/recipes` endpoint is **publicly readable** (no auth required for GET). However, CONTEXT.md locks "JWT on every call" and the existing `config/packages/party_dispenser.yaml` sets `Authorization: Bearer <JWT>` on this endpoint too. **Safe stance: ALWAYS send the bearer header — backend tolerates it on unauthenticated endpoints.**

**Response element shape** (from `RecipeOut` pydantic model):

```python
{
  "id": "<uuid>",                  # str (UUID representation)
  "name": "Margarita",             # str
  "description": "Classic lime",   # str | None
  "is_active": true,               # bool
  "created_at": "2026-04-20T...",  # ISO-8601 datetime | None
  "order_count": 12,               # int (times this recipe was ordered historically)
  "ingredients": [                 # list[RecipeIngredientOut]
    {
      "position": 1,               # int
      "ingredient_id": "<uuid>",   # str
      "ingredient_name": "Tequila",# str
      "amount_ml": 60.0,           # float
      "unit": "ml",                # str | None
      "requires_dispense": true    # bool
    },
    ...
  ],
  "makeable": true,                # bool - all required dispensed ingredients are attached+calibrated
  "missing_ingredients": [],       # list[str] - human-readable names of missing ingredients
  "missing_count": 0               # int - len(missing_ingredients)
}
```

#### Endpoint 2: `GET /queue`

**Source:** `backend/app/api/routes/queue.py::get_queue` → `response_model=list[DrinkOrderOut]`.

**Auth:** Same as `/recipes` — handler doesn't declare auth dep, but we send JWT for consistency.

**Filtered state:** Handler filters out `state in {"COMPLETED", "FAILED", "CANCELED"}` — i.e., `/queue` returns only active/pending orders. Ordered by `priority DESC, created_at ASC` (highest-priority-first, then FIFO).

**Response element shape** (from `DrinkOrderOut`):

```python
{
  "id": "<uuid>",                    # str - order_id
  "recipe_id": "<uuid>" | null,      # str | None - null for custom (non-recipe) orders
  "recipe_name": "Margarita",        # str - "(custom)" if recipe_id is null
  "state": "QUEUED",                 # str - one of: QUEUED, IN_PROGRESS, PAUSED_MOVE, CANCEL_REQUESTED, NON_FINISHED (terminal: COMPLETED, FAILED, CANCELED filtered out)
  "priority": 0,                     # int (higher = sooner)
  "requested_by_session_uid": "home-assistant",  # str | None
  "created_at": "2026-04-20T...",    # ISO-8601 datetime (required)
  "updated_at": "2026-04-20T...",    # ISO-8601 datetime (required)
  "items_json": "[{...}]"            # str | None - JSON-string of order items (nested)
}
```

#### Endpoint 3: `POST /orders/from-recipe`

**Source:** `backend/app/api/routes/orders.py::create_order_from_recipe` → `response_model=CreateOrderOut`.

**Auth:** Handler uses `user=Depends(get_optional_user)` inside the internal `_assert_recipe_is_orderable` path — auth is **optional but accepted**. JWT recommended for audit trail.

**Request body** (`CreateOrderFromRecipeIn`):

```python
{
  "recipe_id": "<uuid>",           # str - REQUIRED
  "session_uid": "home-assistant"  # str | None - defaults to "home-assistant" on handler side if missing
}
```

**Response body** (`CreateOrderOut`):

```python
{
  "order_id": "<uuid>",            # str
  "session_uid": "home-assistant"  # str - echoed back
}
```

**Possible errors:**
- `404 {"detail": "Recipe not found"}` — recipe_id invalid
- `422 {"detail": "Recipe is inactive"}` — recipe.is_active = false
- `422 {"detail": "Recipe is hidden"}` — recipe not in guest-visible collections
- `422 {"detail": "Recipe has no ingredients"}` — malformed recipe
- `422 {"detail": "Ingredient {id} requires_dispense=true but is not attached to an enabled calibrated pump"}` — not makeable
- `422` — various pour-limit violations (amount_ml over limit)

#### Endpoint 4: `POST /orders/{order_id}/cancel`

**Source:** `backend/app/api/routes/orders.py::cancel_order`.

**Auth:** `user=Depends(get_optional_user)` — optional. Note: if `session_uid` in the payload doesn't match the order's `requested_by_session_uid`, cancel is rejected (unless caller is admin). **Since we POSTed with `session_uid="home-assistant"` at order creation, we MUST send the same `session_uid` at cancel time.**

**Request body** (`CancelOrderIn`):

```python
{
  "session_uid": "home-assistant"  # str | None - but REQUIRED in practice (authorship check)
}
```

**Response body:** `{"ok": true}` — plain JSON, NOT 204 No Content. (CONTEXT.md says "204 / order object" — actual backend returns `{"ok": true}` with status 200.)

**Possible errors:**
- `404 {"detail": "Order not found"}`
- `409 {"detail": "Order already finished"}` — state in {COMPLETED, FAILED, CANCELED}
- `409 {"detail": "Cancel already requested"}` — state == CANCEL_REQUESTED
- `403 {"detail": "Not allowed"}` — session_uid mismatch

### Copy-ready typed API shapes for `api.py`

```python
# custom_components/party_dispenser/api.py
from __future__ import annotations
from dataclasses import dataclass, field
from datetime import datetime


@dataclass(frozen=True, slots=True)
class RecipeIngredient:
    """One ingredient in a recipe (from RecipeIngredientOut)."""
    position: int
    ingredient_id: str
    ingredient_name: str
    amount_ml: float
    requires_dispense: bool
    unit: str | None = None


@dataclass(frozen=True, slots=True)
class Recipe:
    """A recipe the dispenser can make (from RecipeOut)."""
    id: str
    name: str
    is_active: bool
    order_count: int
    ingredients: tuple[RecipeIngredient, ...]   # immutable for hashability
    makeable: bool
    missing_ingredients: tuple[str, ...]
    missing_count: int
    description: str | None = None
    created_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class QueueItem:
    """An active/pending drink order (from DrinkOrderOut)."""
    id: str                              # order_id
    recipe_name: str                     # "(custom)" if recipe_id is None
    state: str                           # QUEUED | IN_PROGRESS | PAUSED_MOVE | CANCEL_REQUESTED | NON_FINISHED
    priority: int
    created_at: datetime
    updated_at: datetime
    recipe_id: str | None = None
    requested_by_session_uid: str | None = None
    items_json: str | None = None


@dataclass(frozen=True, slots=True)
class OrderResult:
    """Response from POST /orders/from-recipe (from CreateOrderOut)."""
    order_id: str
    session_uid: str
```

## Architecture Patterns

### Recommended Project Structure (Phase 2 end-state)

```
hacs-integration-pd/
├── .gitlab-ci.yml                              # UPDATED: python:3.13-slim + pip install -e .[dev]
├── pyproject.toml                              # UPDATED: requires-python = ">=3.13", [project.optional-dependencies] dev
├── hacs.json                                   # UNCHANGED (homeassistant: 2026.1.0 min is FINE — that's for end-user, not CI)
├── info.md, README.md, LICENSE                 # UNCHANGED
│
├── custom_components/
│   └── party_dispenser/
│       ├── __init__.py                         # EXTENDED: async_setup (registers services once) + async_setup_entry (coordinator + platforms)
│       ├── manifest.json                       # UPDATED: "config_flow": true, "version": "0.2.0"
│       ├── const.py                            # EXTENDED: CONF_HOST, CONF_PORT, CONF_JWT, CONF_USE_TLS, CONF_SCAN_INTERVAL; SERVICE_ORDER_RECIPE, SERVICE_CANCEL_ORDER, SERVICE_REFRESH; DEFAULT_SCAN_INTERVAL, DEFAULT_PORT, MANUFACTURER, MODEL, ATTRIBUTION
│       ├── api.py                              # NEW: typed dataclasses + PartyDispenserApiClient + 3 exception classes
│       ├── coordinator.py                      # NEW: PartyDispenserCoordinator(DataUpdateCoordinator[PartyDispenserData]) + PartyDispenserData dataclass + type PartyDispenserConfigEntry = ConfigEntry[...]
│       ├── config_flow.py                      # NEW: PartyDispenserConfigFlow + OptionsFlowHandler (2025.12+ pattern)
│       ├── entity.py                           # NEW: PartyDispenserEntity base class (CoordinatorEntity + DeviceInfo)
│       ├── sensor.py                           # NEW: 5 sensor classes, ENTITY_DESCRIPTIONS tuple, async_setup_entry wiring
│       ├── services.py                         # NEW: async_setup_services(hass) — registers 3 services with vol schemas; handlers find coordinator via hass.config_entries
│       ├── strings.json                        # EXTENDED (or removed): config+options+services strings — OR delete entirely and keep only translations/en.json
│       └── translations/
│           └── en.json                         # NEW: mirror of strings.json content — REQUIRED
│
└── tests/
    ├── conftest.py                             # EXTENDED: auto_enable_custom_integrations fixture + snapshot fixture
    ├── fixtures/
    │   ├── recipes.json                        # NEW: canned /recipes response for aioclient_mock (3 recipes, one with makeable=false)
    │   └── queue.json                          # NEW: canned /queue response (1 active order)
    ├── test_integration_manifest.py            # UNCHANGED (bespoke validator) - but will need Phase-1-overrides loosened (config_flow=true now expected)
    ├── test_import.py                          # UNCHANGED
    ├── test_hacs_manifest.py                   # UNCHANGED
    ├── test_info_md.py                         # UNCHANGED
    ├── test_api.py                             # NEW: unit tests for PartyDispenserApiClient against aioclient_mock — exception mapping, URL shapes, header presence
    ├── test_config_flow.py                     # NEW: happy path, cannot_connect, invalid_auth, timeout, duplicate-entry (unique_id), options flow
    ├── test_coordinator.py                     # NEW: successful update, ApiAuthError → ConfigEntryAuthFailed, ApiConnectionError → UpdateFailed, concurrent gather
    ├── test_sensor.py                          # NEW: each of 5 sensors reads correct value from coordinator state; DeviceInfo matches
    └── test_services.py                        # NEW: order_recipe → POST /orders/from-recipe + refresh; cancel_order → POST /orders/{id}/cancel + refresh; refresh → coordinator.async_request_refresh
```

### Pattern 1: `ConfigEntry.runtime_data` with type alias (Bronze quality scale)

**What:** Store coordinator + API client on the config entry's runtime attribute (not `hass.data`). A type alias lets tooling type-check every access.

**When to use:** Always in 2026+ integrations. This is a "no-exceptions" Bronze-tier rule per the [runtime-data quality rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/runtime-data).

**Example (from ludeeus/integration_blueprint `data.py`):**

```python
# custom_components/party_dispenser/coordinator.py (or data.py — combined here)
"""Coordinator + runtime-data types for Party Dispenser."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserError,
    QueueItem,
    Recipe,
)
from .const import DOMAIN, LOGGER

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant


@dataclass
class PartyDispenserData:
    """Runtime data stored on the config entry."""
    client: PartyDispenserApiClient
    coordinator: "PartyDispenserCoordinator"


@dataclass
class PartyDispenserState:
    """The coordinator's payload — passed to every entity on each tick."""
    recipes: list[Recipe] = field(default_factory=list)
    queue: list[QueueItem] = field(default_factory=list)
    last_updated: datetime | None = None

    @property
    def current_order(self) -> QueueItem | None:
        """The head of the queue, or None if idle."""
        return self.queue[0] if self.queue else None


type PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]


class PartyDispenserCoordinator(DataUpdateCoordinator[PartyDispenserState]):
    """Polls Party Dispenser backend and merges /recipes + /queue."""

    config_entry: PartyDispenserConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        client: PartyDispenserApiClient,
        scan_interval: int,
    ) -> None:
        super().__init__(
            hass,
            LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=scan_interval),
        )
        self._client = client

    async def _async_update_data(self) -> PartyDispenserState:
        """Fetch /recipes and /queue concurrently; merge into PartyDispenserState."""
        try:
            recipes, queue = await asyncio.gather(
                self._client.list_recipes(),
                self._client.list_queue(),
            )
        except PartyDispenserAuthError as err:
            # 401/403 → triggers re-auth flow in HA UI
            raise ConfigEntryAuthFailed(str(err)) from err
        except PartyDispenserError as err:
            # Transient connection/protocol — coordinator retries automatically
            raise UpdateFailed(str(err)) from err

        return PartyDispenserState(
            recipes=recipes,
            queue=queue,
            last_updated=datetime.now(tz=timezone.utc),
        )
```

### Pattern 2: `async_setup` + `async_setup_entry` — services register once, coordinator per-entry

**What:** HA calls `async_setup(hass, config)` ONCE at startup (before any entries exist) and `async_setup_entry(hass, entry)` once per config entry. Services belong in `async_setup` so they register exactly once; coordinator + platforms belong in `async_setup_entry` so they're per-entry.

**When to use:** Any integration with services that should work across all entries of that domain.

**Example (adapted from Shelly `__init__.py`):**

```python
# custom_components/party_dispenser/__init__.py (Phase 2 version)
"""The Party Dispenser integration (Phase 2 — full setup)."""
from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.const import Platform
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import PartyDispenserApiClient
from .const import (
    CONF_HOST, CONF_JWT, CONF_PORT, CONF_SCAN_INTERVAL, CONF_USE_TLS,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    LOGGER,
)
from .coordinator import PartyDispenserCoordinator, PartyDispenserData
from .services import async_setup_services

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import PartyDispenserConfigEntry

PLATFORMS: list[Platform] = [Platform.SENSOR]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Party Dispenser component (domain-level, once)."""
    async_setup_services(hass)
    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
) -> bool:
    """Set up a single Party Dispenser config entry."""
    scheme = "https" if entry.data.get(CONF_USE_TLS, False) else "http"
    host = entry.data[CONF_HOST]
    port = entry.data[CONF_PORT]
    jwt = entry.data[CONF_JWT]
    base_url = f"{scheme}://{host}:{port}"

    client = PartyDispenserApiClient(
        base_url=base_url,
        jwt=jwt,
        session=async_get_clientsession(hass),
    )

    # Options override data for jwt/scan_interval/use_tls (after options-flow edit)
    scan_interval = entry.options.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
    coordinator = PartyDispenserCoordinator(hass, client, scan_interval=scan_interval)

    entry.runtime_data = PartyDispenserData(client=client, coordinator=coordinator)

    await coordinator.async_config_entry_first_refresh()

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _async_reload_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
) -> None:
    """Reload after options-flow edit (jwt rotation, scan_interval change)."""
    await hass.config_entries.async_reload(entry.entry_id)
```

### Pattern 3: Config flow with `test_connection` before save, using selectors

**What:** Single-step config flow that validates connectivity before creating the entry. Fields use `selector.*` for rich UI (password-masked JWT, number-stepper for port).

**Example (adapted from ludeeus blueprint, with CONTEXT.md field shape):** see **Code Examples → `config_flow.py`** below.

### Pattern 4: Options flow — 2025.12+ pattern (no `self.config_entry =` in `__init__`)

**What:** Since HA 2025.12, the parent `OptionsFlow` class automatically provides `self.config_entry` and `self._config_entry_id`. Handlers MUST NOT set them manually — doing so raises a hard error.

**Example:** see **Code Examples → `config_flow.py` OptionsFlowHandler section** below.

### Pattern 5: Entity base class with shared `DeviceInfo`

**What:** Every sensor inherits a common `PartyDispenserEntity(CoordinatorEntity[...])` base class that sets `_attr_has_entity_name = True` and `_attr_device_info` from the coordinator's config entry. Subclasses only set `entity_description` and override `native_value`.

**Example (adapted from ludeeus `entity.py`):**

```python
# custom_components/party_dispenser/entity.py
"""Base entity for Party Dispenser sensors."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, DOMAIN, MANUFACTURER, MODEL
from .coordinator import PartyDispenserCoordinator


class PartyDispenserEntity(CoordinatorEntity[PartyDispenserCoordinator]):
    """Base class for all Party Dispenser entities."""

    _attr_attribution = ATTRIBUTION
    _attr_has_entity_name = True

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        entry_id = coordinator.config_entry.entry_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name="Party Dispenser",
            manufacturer=MANUFACTURER,
            model=MODEL,
        )
```

### Anti-Patterns to Avoid

- **Storing coordinator in `hass.data[DOMAIN][entry.entry_id]`.** Use `entry.runtime_data`. ([runtime-data rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/runtime-data))
- **Creating `aiohttp.ClientSession()` inside `api.py`.** Use `async_get_clientsession(hass)` — breaks tests otherwise.
- **Registering services inside `async_setup_entry`.** Register in `async_setup` (or an idempotent `async_setup_services(hass)` helper). Registering in `async_setup_entry` double-registers on second entry. ([dev_101_services](https://developers.home-assistant.io/docs/dev_101_services))
- **Setting `self.config_entry = config_entry` in `OptionsFlowHandler.__init__`.** Hard error since HA 2025.12. ([options-flow blog](https://developers.home-assistant.io/blog/2024/11/12/options-flow/))
- **Setting `_attr_name` with a hard-coded string.** Use `_attr_translation_key` + `translations/en.json` for i18n-friendliness.
- **Comparing enums with `==`.** HA 2026.1 migrated to `is`/`is not` for `FlowResultType`, `ConfigEntryState`. Use `result["type"] is FlowResultType.FORM`, not `==`.
- **Using `aiohttp.ClientError` bare in `except` clauses of `api.py`.** Also catch `asyncio.TimeoutError` and `socket.gaierror` — all three surface as connectivity failures. The ludeeus blueprint wraps all three in `CommunicationError`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared HTTP session lifecycle | Your own `aiohttp.ClientSession()` | `homeassistant.helpers.aiohttp_client.async_get_clientsession(hass)` | HA manages lifecycle, SSL context, connection pooling. Also: `aioclient_mock` only patches the HA-managed session. |
| Polling loop + backoff | `asyncio.create_task` + `while True: await sleep(scan_interval)` | `DataUpdateCoordinator` with `update_interval` | Coordinator handles: cancellation on shutdown, `async_request_refresh` debouncing, availability state, startup refresh via `async_config_entry_first_refresh`, failure counting, `always_update` optimization. ([integration_fetching_data](https://developers.home-assistant.io/docs/integration_fetching_data)) |
| Re-auth trigger | `self._attr_available = False` when JWT fails | `raise ConfigEntryAuthFailed(...)` from `_async_update_data` | HA auto-starts the reauth config flow, shows the user a UI card, and pauses polling until resolved. |
| Form validation | Hand-rolled regex + `if len(host) > 255` | `voluptuous` schema + `selector.TextSelector(TextSelectorConfig(type=PASSWORD))` | Selectors render correct UI (password mask, number stepper); voluptuous integrates with HA error pipeline. |
| Device registry plumbing | `await device_registry.async_get_or_create(...)` in `async_setup_entry` | `_attr_device_info = DeviceInfo(identifiers={(DOMAIN, entry.entry_id)}, ...)` on entity | HA auto-creates the device from the first entity that declares it. Cleaner and avoids race conditions. |
| Fake HA instance in tests | `mock.Mock()` for `hass`, hand-rolled fixtures | `pytest-homeassistant-custom-component` `hass` fixture + `aioclient_mock` + `MockConfigEntry` | The plugin EXTRACTS real HA test infrastructure and ships it as a pip package. Using AsyncMocks instead is strictly worse. |
| Semver assertion in tests | Custom regex in test | `AwesomeVersion(str)` — same parser HA uses | Phase 1's bespoke manifest tests already use regex; Phase 2 can continue that pattern (no need to introduce AwesomeVersion just for one check). |
| Type validation of backend payload | Your own `isinstance` checks | `dataclasses.dataclass(frozen=True, slots=True)` + constructor in `api.py` | Dataclasses raise `TypeError` on malformed payloads at the deserialization boundary — explicit errors > silent misbehavior. |

**Key insight:** Every "this seems simple, I'll just write it" temptation in a Home Assistant integration is almost always a re-implementation of a core feature that will bite you at HA version bump time. The coordinator, selector, and runtime_data patterns aren't convenience — they're the only forward-compatible way to write integrations.

## Runtime State Inventory

> Phase 2 is a greenfield-addition phase (adds files rather than renaming existing ones). The minor rename concern — Phase 1's `strings.json` may be deleted or rewritten — is not a runtime-state issue. **No runtime state survives a reinstall of the integration for end users.**

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| **Stored data** | None — party_dispenser has no database tables, no entity-registry records yet (Phase 1 was a no-op stub). HA will create entity-registry entries under `sensor.party_dispenser_*` when Phase 2 ships; those are written by HA, not by us. | None |
| **Live service config** | None — no live HA instance has installed this integration yet (no user base) | None |
| **OS-registered state** | None — not installed on any OS | None |
| **Secrets / env vars** | `party_dispenser_auth_header` in users' `secrets.yaml` (YAML-package users). Phase 2's config flow REPLACES this; the JWT is now stored in HA's config entries (`{entry_id}.json` under `.storage/`). **Migration concern:** YAML-package users will have the old secret alongside the new config entry until they clean up; no active breakage. Phase 6 migration guide handles this. | None for Phase 2; Phase 6 docs |
| **Build artifacts** | Existing `.pytest_cache` and `.ruff_cache` in repo. Phase 2 adds `pytest-homeassistant-custom-component` fixtures which may re-populate caches with stale imports if Python version bumps. | Clear `.pytest_cache` after Python 3.12 → 3.13 switch (one-time, `rm -rf .pytest_cache`) |

**Nothing found in category:** explicitly stated above for the four empty categories.

## Common Pitfalls

### Pitfall 1: Python 3.12 is incompatible with `homeassistant` 2026.1+ (BLOCKING)

**What goes wrong:** First attempt to `pip install pytest-homeassistant-custom-component` on the CI runner fails with:

```
ERROR: Package 'homeassistant' requires a different Python: 3.12.x not in '>=3.13.2'
```

**Why it happens:** HA core moved to Python 3.13.2 floor in 2026.1 (released 2026-01-07), then 3.14.2 in 2026.3 (2026-03-04). Custom integrations pegged at 3.12 can't install any current HA release for testing. The `hacs.json` `homeassistant: 2026.1.0` minimum refers to the END USER's HA install; it has no bearing on what Python version we test against — but it does mean we MUST test against ≥ 2026.1.

**How to avoid:**
1. Bump `pyproject.toml`:
   ```toml
   requires-python = ">=3.13"
   ```
2. Bump `.gitlab-ci.yml` default image:
   ```yaml
   default:
     image: python:3.13-slim
   ```
3. Pin `pytest-homeassistant-custom-component==0.13.316` (not the latest 0.13.324, which requires 3.14). Latest-3.13-compatible version pins `homeassistant==2026.2.3`.
4. Optional: bump `[tool.ruff] target-version = "py313"`.

**Warning signs:** CI fails at `pip install` with a `requires a different Python` error OR `no such option: --target-version py312` from ruff.

**Verification commands:**

```bash
curl -s https://pypi.org/pypi/homeassistant/2026.2.3/json | jq -r '.info.requires_python'
# => >=3.13.2 (NOT 3.12)
```

### Pitfall 2: Setting `self.config_entry` in `OptionsFlowHandler.__init__` — hard error in 2025.12+

**What goes wrong:** Options flow fails with:

```
ValueError: option_flow_init self.config_entry is deprecated and will stop working in Home Assistant 2025.12
```

…and since we're pinned to HA 2026.2.3, the flow outright fails to load.

**Why it happens:** Historic docs (pre-2024.11) show `OptionsFlowHandler(self, config_entry)` with `self.config_entry = config_entry`. HA 2024.11 deprecated this, 2025.1 warned, 2025.12 made it a hard error. The parent `OptionsFlow` class now owns `self.config_entry` via property that reads from `self._config_entry_id`.

**How to avoid:**

```python
# WRONG (pre-2024.11 pattern — do NOT copy)
class OptionsFlowHandler(OptionsFlow):
    def __init__(self, config_entry: ConfigEntry) -> None:
        self.config_entry = config_entry   # ← BANNED

@staticmethod
@callback
def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlowHandler:
    return OptionsFlowHandler(config_entry)   # ← DON'T PASS IT IN


# CORRECT (2025.12+ pattern)
class OptionsFlowHandler(OptionsFlow):
    def __init__(self) -> None:
        # No self.config_entry = ... — parent provides it automatically
        pass

@staticmethod
@callback
def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlowHandler:
    return OptionsFlowHandler()   # ← no args
```

**Warning signs:** Options flow returns `ConfigFlowResult(type=ABORT)` or raises ValueError when opened from the integration card's Options link.

### Pitfall 3: Registering services inside `async_setup_entry` causes double-register on second entry

**What goes wrong:** When a user adds a second Party Dispenser instance, the second `async_setup_entry` tries to register `party_dispenser.order_recipe` again, triggering:

```
HomeAssistantError: Service party_dispenser.order_recipe already registered
```

…which causes Config Entry Setup Error and a broken config entry.

**Why it happens:** `hass.services.async_register` is idempotent-by-overwrite but emits warnings and is not the intended pattern. Core integrations register services at domain level in `async_setup(hass, config)` — which runs exactly once at HA startup regardless of how many config entries exist. Shelly, Nut, and every other core integration with services follow this pattern.

**How to avoid:** Always put service registration in `async_setup`:

```python
# WRONG
async def async_setup_entry(hass, entry):
    hass.services.async_register(DOMAIN, "order_recipe", handler)   # Double-register risk!

# CORRECT
async def async_setup(hass, config):   # Runs ONCE at HA startup
    async_setup_services(hass)   # Defined in services.py
    return True

async def async_setup_entry(hass, entry):
    # ... coordinator, platforms — NO service registration
    ...
```

Defensive guard in `services.py` (belt-and-suspenders — not strictly needed if `async_setup` is used but useful during dev):

```python
def async_setup_services(hass: HomeAssistant) -> None:
    if hass.services.has_service(DOMAIN, SERVICE_ORDER_RECIPE):
        return
    hass.services.async_register(DOMAIN, SERVICE_ORDER_RECIPE, ...)
```

**Warning signs:** Logs show "Service party_dispenser.order_recipe already registered" on the 2nd-N config entry setup.

### Pitfall 4: `aioclient_mock` not intercepting because `api.py` instantiates its own session

**What goes wrong:** Tests pass `aioclient_mock.get(...)` but the test fails with a real DNS error or empty call count:

```
FAILED tests/test_config_flow.py::test_form_happy_path
  - assert aioclient_mock.call_count == 1
  - aioclient_mock.call_count == 0
```

**Why it happens:** `pytest-homeassistant-custom-component`'s `aioclient_mock` fixture patches the shared aiohttp session that HA returns from `async_get_clientsession(hass)`. If `api.py` does `self._session = aiohttp.ClientSession()`, that's a different session — the mock never sees those requests.

**How to avoid:** Always accept `session: aiohttp.ClientSession` as a constructor arg in `PartyDispenserApiClient`; let the caller (coordinator + config-flow-validation) pass `async_get_clientsession(hass)`. See the ludeeus blueprint's `api.py` for the canonical shape.

```python
class PartyDispenserApiClient:
    def __init__(
        self,
        base_url: str,
        jwt: str,
        session: aiohttp.ClientSession,   # ← injected, never created
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._jwt = jwt
        self._session = session
```

**Warning signs:** `aioclient_mock.call_count == 0` despite the test clearly making HTTP calls.

### Pitfall 5: `FlowResultType` comparisons with `==` instead of `is`

**What goes wrong:** Tests pass locally but get a `DeprecationWarning: use 'is' instead of '==' for FlowResultType` that in some HA builds is upgraded to error.

**Why it happens:** HA 2026.1 changelog: "Use `is` over `==` comparison" was applied across core for enum comparisons (FlowResultType, ConfigEntryState, etc.).

**How to avoid:** In test files:

```python
from homeassistant.data_entry_flow import FlowResultType

# WRONG
assert result["type"] == FlowResultType.FORM

# CORRECT
assert result["type"] is FlowResultType.FORM
```

**Warning signs:** DeprecationWarnings in test logs about `FlowResultType` comparison.

### Pitfall 6: Forgetting `translations/en.json` (HA silently uses string keys as labels)

**What goes wrong:** Config flow renders with raw keys as field labels ("host", "port", "jwt") instead of translated strings ("Host", "Port", "API Token").

**Why it happens:** HA Core's translation loader looks for `translations/en.json` FIRST, then falls back to `strings.json`. The ludeeus blueprint ships ONLY `translations/en.json` and it works. But if neither file has the right keys under `config.step.user.data.*`, HA displays the raw key.

**How to avoid:** Phase 2 MUST create `custom_components/party_dispenser/translations/en.json`. The file needs `config.step.user.*`, `config.step.user.data.*`, `config.error.*`, `config.abort.*`, `options.step.init.*`, and `services.*` — see **Code Examples → `translations/en.json`** for the complete file.

**Warning signs:** Visiting the config flow in HA UI shows "host: ___" as the field label instead of "Host: ___".

### Pitfall 7: Services that modify coordinator state must refresh AFTER the API call, not before

**What goes wrong:** Calling `party_dispenser.order_recipe` places the order but the `sensor.party_dispenser_queue_size` stays stale for up to 30 seconds (one polling interval) until the next auto-poll.

**Why it happens:** Coordinator polls on a timer (30s default). The service handler POSTs to the backend, but if it doesn't trigger a coordinator refresh, users see a delay.

**How to avoid:**

```python
async def _async_order_recipe(call: ServiceCall) -> None:
    # Find a config entry (if multiple, pick first — v1 single-dispenser)
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        raise HomeAssistantError("Party Dispenser not configured")
    runtime_data = entries[0].runtime_data
    await runtime_data.client.order_from_recipe(
        recipe_id=call.data["recipe_id"],
        session_uid=call.data.get("session_uid", "home-assistant"),
    )
    # Refresh AFTER the API call so the new order is reflected
    await runtime_data.coordinator.async_request_refresh()
```

**Warning signs:** UI looks "laggy" — tap a recipe, wait 30s for queue to update.

### Pitfall 8: `async_get_clientsession` is called once per-integration-per-HA-boot, NOT per-call

**What goes wrong:** Calling `async_get_clientsession(hass)` every time `list_recipes` runs creates nothing measurable (it's cached per-HA-instance internally) — BUT developers sometimes notice the docstring says "creates a session" and over-optimize by caching it on `self`. That's fine. BUT: storing a session captured in `async_setup_entry` and re-used across reloads can outlive the HA context and trigger a "session is closed" error on reload.

**How to avoid:** Pass the session into `PartyDispenserApiClient.__init__` fresh each time `async_setup_entry` runs (which is exactly once per entry lifetime — reload creates a new client). Don't cache sessions outside the entry's runtime_data.

**Warning signs:** `RuntimeError: Session is closed` after the user edits Options and the entry reloads.

## Code Examples

All code snippets below are **verified 2026 patterns** pulled from either the ludeeus/integration_blueprint (HEAD as of 2026-04-20), core HA integrations (Shelly, Nut, Jewish Calendar), or adapted from the official HA developer docs.

### `custom_components/party_dispenser/const.py` (Phase 2 full content)

```python
"""Constants for the Party Dispenser integration."""
from __future__ import annotations

from logging import Logger, getLogger

DOMAIN = "party_dispenser"
VERSION = "0.2.0"
MANUFACTURER = "PartyDispenser"
MODEL = "Dispenser"
ATTRIBUTION = "Data provided by Party Dispenser backend"

LOGGER: Logger = getLogger(__package__)

# --- Config flow / options keys ---
CONF_HOST = "host"
CONF_PORT = "port"
CONF_JWT = "jwt"
CONF_USE_TLS = "use_tls"
CONF_SCAN_INTERVAL = "scan_interval"

# --- Defaults ---
DEFAULT_PORT = 8000
DEFAULT_SCAN_INTERVAL = 30
DEFAULT_SESSION_UID = "home-assistant"
DEFAULT_TIMEOUT_SECONDS = 10
MIN_SCAN_INTERVAL = 5
MAX_SCAN_INTERVAL = 600

# --- Service names ---
SERVICE_ORDER_RECIPE = "order_recipe"
SERVICE_CANCEL_ORDER = "cancel_order"
SERVICE_REFRESH = "refresh"

# --- Service data keys ---
ATTR_RECIPE_ID = "recipe_id"
ATTR_ORDER_ID = "order_id"
ATTR_SESSION_UID = "session_uid"

# --- Sensor translation keys (used in translations/en.json) ---
SENSOR_KEY_QUEUE_SIZE = "queue_size"
SENSOR_KEY_QUEUE_SUMMARY = "queue_summary"
SENSOR_KEY_MAKEABLE_COUNT = "makeable_count"
SENSOR_KEY_CURRENT_ORDER = "current_order"
SENSOR_KEY_RECIPES = "recipes"
```

### `custom_components/party_dispenser/api.py`

```python
"""REST client for the Party Dispenser backend."""
from __future__ import annotations

import asyncio
import socket
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import aiohttp
import async_timeout

from .const import DEFAULT_SESSION_UID, DEFAULT_TIMEOUT_SECONDS, LOGGER


# ----- Exception hierarchy -----

class PartyDispenserError(Exception):
    """Base exception for all Party Dispenser API errors."""


class PartyDispenserAuthError(PartyDispenserError):
    """401/403 from the backend — JWT is invalid or expired."""


class PartyDispenserConnectionError(PartyDispenserError):
    """Network-level failure (DNS, timeout, connection refused, TLS)."""


class PartyDispenserProtocolError(PartyDispenserError):
    """Backend returned unexpected status (5xx) or malformed JSON."""


# ----- Typed response shapes -----

@dataclass(frozen=True, slots=True)
class RecipeIngredient:
    position: int
    ingredient_id: str
    ingredient_name: str
    amount_ml: float
    requires_dispense: bool
    unit: str | None = None


@dataclass(frozen=True, slots=True)
class Recipe:
    id: str
    name: str
    is_active: bool
    order_count: int
    ingredients: tuple[RecipeIngredient, ...]
    makeable: bool
    missing_ingredients: tuple[str, ...]
    missing_count: int
    description: str | None = None
    created_at: datetime | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Recipe":
        ingredients = tuple(
            RecipeIngredient(
                position=item["position"],
                ingredient_id=item["ingredient_id"],
                ingredient_name=item["ingredient_name"],
                amount_ml=item["amount_ml"],
                requires_dispense=item["requires_dispense"],
                unit=item.get("unit"),
            )
            for item in raw.get("ingredients", [])
        )
        created_at = None
        if raw.get("created_at"):
            try:
                created_at = datetime.fromisoformat(raw["created_at"])
            except ValueError:
                created_at = None
        return cls(
            id=raw["id"],
            name=raw["name"],
            is_active=raw["is_active"],
            order_count=raw.get("order_count", 0),
            ingredients=ingredients,
            makeable=raw["makeable"],
            missing_ingredients=tuple(raw.get("missing_ingredients", [])),
            missing_count=raw.get("missing_count", 0),
            description=raw.get("description"),
            created_at=created_at,
        )


@dataclass(frozen=True, slots=True)
class QueueItem:
    id: str
    recipe_name: str
    state: str
    priority: int
    created_at: datetime
    updated_at: datetime
    recipe_id: str | None = None
    requested_by_session_uid: str | None = None
    items_json: str | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "QueueItem":
        return cls(
            id=raw["id"],
            recipe_name=raw["recipe_name"],
            state=raw["state"],
            priority=raw.get("priority", 0),
            created_at=datetime.fromisoformat(raw["created_at"]),
            updated_at=datetime.fromisoformat(raw["updated_at"]),
            recipe_id=raw.get("recipe_id"),
            requested_by_session_uid=raw.get("requested_by_session_uid"),
            items_json=raw.get("items_json"),
        )


@dataclass(frozen=True, slots=True)
class OrderResult:
    order_id: str
    session_uid: str


# ----- API client -----

class PartyDispenserApiClient:
    """Async client wrapping the 4 Party Dispenser backend endpoints."""

    def __init__(
        self,
        base_url: str,
        jwt: str,
        session: aiohttp.ClientSession,
        timeout: int = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._jwt = jwt
        self._session = session
        self._timeout = timeout

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._jwt}",
            "Content-Type": "application/json",
        }

    async def list_recipes(self) -> list[Recipe]:
        data = await self._request("GET", "/recipes")
        if not isinstance(data, list):
            raise PartyDispenserProtocolError(
                f"Expected list from /recipes, got {type(data).__name__}"
            )
        return [Recipe.from_dict(item) for item in data]

    async def list_queue(self) -> list[QueueItem]:
        data = await self._request("GET", "/queue")
        if not isinstance(data, list):
            raise PartyDispenserProtocolError(
                f"Expected list from /queue, got {type(data).__name__}"
            )
        return [QueueItem.from_dict(item) for item in data]

    async def order_from_recipe(
        self,
        recipe_id: str,
        session_uid: str = DEFAULT_SESSION_UID,
    ) -> OrderResult:
        data = await self._request(
            "POST",
            "/orders/from-recipe",
            json={"recipe_id": recipe_id, "session_uid": session_uid},
        )
        if not isinstance(data, dict) or "order_id" not in data:
            raise PartyDispenserProtocolError(
                f"Unexpected response shape from /orders/from-recipe: {data!r}"
            )
        return OrderResult(
            order_id=data["order_id"],
            session_uid=data.get("session_uid", session_uid),
        )

    async def cancel_order(
        self,
        order_id: str,
        session_uid: str = DEFAULT_SESSION_UID,
    ) -> None:
        await self._request(
            "POST",
            f"/orders/{order_id}/cancel",
            json={"session_uid": session_uid},
        )

    async def _request(
        self,
        method: str,
        path: str,
        json: dict[str, Any] | None = None,
    ) -> Any:
        url = f"{self._base_url}{path}"
        try:
            async with async_timeout.timeout(self._timeout):
                response = await self._session.request(
                    method=method,
                    url=url,
                    headers=self._headers,
                    json=json,
                )
        except asyncio.TimeoutError as err:
            raise PartyDispenserConnectionError(
                f"Timeout after {self._timeout}s requesting {method} {url}"
            ) from err
        except (aiohttp.ClientError, socket.gaierror) as err:
            raise PartyDispenserConnectionError(
                f"Connection error requesting {method} {url}: {err}"
            ) from err

        if response.status in (401, 403):
            raise PartyDispenserAuthError(
                f"Backend rejected JWT ({response.status}) on {method} {url}"
            )
        if response.status >= 500:
            raise PartyDispenserProtocolError(
                f"Backend server error {response.status} on {method} {url}"
            )
        if response.status >= 400:
            raise PartyDispenserProtocolError(
                f"Backend client error {response.status} on {method} {url}"
            )

        try:
            return await response.json()
        except (aiohttp.ContentTypeError, ValueError) as err:
            raise PartyDispenserProtocolError(
                f"Malformed JSON response from {method} {url}: {err}"
            ) from err
```

### `custom_components/party_dispenser/coordinator.py`

```python
"""DataUpdateCoordinator + runtime-data types for Party Dispenser."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserError,
    QueueItem,
    Recipe,
)
from .const import DOMAIN, LOGGER

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant


@dataclass
class PartyDispenserState:
    """The coordinator's payload, passed to every entity on every tick."""

    recipes: list[Recipe] = field(default_factory=list)
    queue: list[QueueItem] = field(default_factory=list)
    last_updated: datetime | None = None

    @property
    def current_order(self) -> QueueItem | None:
        return self.queue[0] if self.queue else None


@dataclass
class PartyDispenserData:
    """Runtime data stored on the ConfigEntry."""

    client: PartyDispenserApiClient
    coordinator: "PartyDispenserCoordinator"


type PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]


class PartyDispenserCoordinator(DataUpdateCoordinator[PartyDispenserState]):
    """Polls /recipes and /queue concurrently."""

    config_entry: PartyDispenserConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        client: PartyDispenserApiClient,
        scan_interval: int,
    ) -> None:
        super().__init__(
            hass,
            LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=scan_interval),
        )
        self._client = client

    async def _async_update_data(self) -> PartyDispenserState:
        try:
            recipes, queue = await asyncio.gather(
                self._client.list_recipes(),
                self._client.list_queue(),
            )
        except PartyDispenserAuthError as err:
            raise ConfigEntryAuthFailed(str(err)) from err
        except PartyDispenserError as err:
            raise UpdateFailed(str(err)) from err

        return PartyDispenserState(
            recipes=recipes,
            queue=queue,
            last_updated=datetime.now(tz=timezone.utc),
        )
```

### `custom_components/party_dispenser/config_flow.py`

```python
"""Config flow + options flow for Party Dispenser."""
from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    PartyDispenserError,
    PartyDispenserProtocolError,
)
from .const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_SCAN_INTERVAL,
    CONF_USE_TLS,
    DEFAULT_PORT,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    LOGGER,
    MAX_SCAN_INTERVAL,
    MIN_SCAN_INTERVAL,
)


# ---------- User step schema builder ----------

def _user_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    defaults = defaults or {}
    return vol.Schema(
        {
            vol.Required(
                CONF_HOST,
                default=defaults.get(CONF_HOST, vol.UNDEFINED),
            ): selector.TextSelector(
                selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT),
            ),
            vol.Required(
                CONF_PORT,
                default=defaults.get(CONF_PORT, DEFAULT_PORT),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1, max=65535, step=1, mode=selector.NumberSelectorMode.BOX,
                ),
            ),
            vol.Required(
                CONF_JWT,
                default=defaults.get(CONF_JWT, vol.UNDEFINED),
            ): selector.TextSelector(
                selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD),
            ),
            vol.Optional(
                CONF_USE_TLS,
                default=defaults.get(CONF_USE_TLS, False),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SCAN_INTERVAL,
                default=defaults.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=MIN_SCAN_INTERVAL,
                    max=MAX_SCAN_INTERVAL,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="s",
                ),
            ),
        }
    )


# ---------- Connectivity probe ----------

async def _validate_connection(
    hass, host: str, port: int, use_tls: bool, jwt: str
) -> None:
    """Raise a specific PartyDispenser*Error subclass if validation fails."""
    scheme = "https" if use_tls else "http"
    base_url = f"{scheme}://{host}:{port}"
    client = PartyDispenserApiClient(
        base_url=base_url,
        jwt=jwt,
        session=async_get_clientsession(hass),
    )
    # list_recipes() is the cheapest happy-path probe
    await client.list_recipes()


# ---------- Config Flow ----------

class PartyDispenserConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the user-initiated config flow for Party Dispenser."""

    VERSION = 1
    MINOR_VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}

        if user_input is not None:
            host = user_input[CONF_HOST]
            port = int(user_input[CONF_PORT])

            # Unique ID = host:port — prevents duplicate dispenser entries
            unique_id = f"{host}:{port}"
            await self.async_set_unique_id(unique_id)
            self._abort_if_unique_id_configured()

            try:
                await _validate_connection(
                    self.hass,
                    host=host,
                    port=port,
                    use_tls=bool(user_input.get(CONF_USE_TLS, False)),
                    jwt=user_input[CONF_JWT],
                )
            except PartyDispenserAuthError:
                errors["base"] = "invalid_auth"
            except PartyDispenserConnectionError:
                errors["base"] = "cannot_connect"
            except PartyDispenserProtocolError:
                errors["base"] = "invalid_response"
            except PartyDispenserError:
                LOGGER.exception("Unexpected Party Dispenser connectivity error")
                errors["base"] = "unknown"
            else:
                return self.async_create_entry(
                    title=f"Party Dispenser ({host}:{port})",
                    data={
                        CONF_HOST: host,
                        CONF_PORT: port,
                        CONF_USE_TLS: bool(user_input.get(CONF_USE_TLS, False)),
                        CONF_JWT: user_input[CONF_JWT],
                    },
                    options={
                        CONF_SCAN_INTERVAL: int(
                            user_input.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
                        ),
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=_user_schema(user_input),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> "OptionsFlowHandler":
        return OptionsFlowHandler()


# ---------- Options Flow (2025.12+ pattern) ----------

class OptionsFlowHandler(OptionsFlow):
    """Options flow: rotate JWT, change scan_interval, toggle TLS.

    Note: self.config_entry is provided by the parent class; do NOT set it here.
    """

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        errors: dict[str, str] = {}

        # Build schema seeded with current data + options
        current = {
            CONF_JWT: self.config_entry.data.get(CONF_JWT, ""),
            CONF_USE_TLS: self.config_entry.data.get(CONF_USE_TLS, False),
            CONF_SCAN_INTERVAL: self.config_entry.options.get(
                CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
            ),
        }

        if user_input is not None:
            # Re-validate new JWT / new TLS setting
            try:
                await _validate_connection(
                    self.hass,
                    host=self.config_entry.data[CONF_HOST],
                    port=self.config_entry.data[CONF_PORT],
                    use_tls=bool(user_input.get(CONF_USE_TLS, False)),
                    jwt=user_input[CONF_JWT],
                )
            except PartyDispenserAuthError:
                errors["base"] = "invalid_auth"
            except PartyDispenserConnectionError:
                errors["base"] = "cannot_connect"
            except PartyDispenserError:
                errors["base"] = "unknown"
            else:
                # Mutate data (jwt, use_tls) via hass.config_entries.async_update_entry
                new_data = dict(self.config_entry.data)
                new_data[CONF_JWT] = user_input[CONF_JWT]
                new_data[CONF_USE_TLS] = bool(user_input.get(CONF_USE_TLS, False))
                self.hass.config_entries.async_update_entry(
                    self.config_entry, data=new_data
                )
                # Save scan_interval in options
                return self.async_create_entry(
                    title="",
                    data={
                        CONF_SCAN_INTERVAL: int(
                            user_input.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
                        ),
                    },
                )

        schema = vol.Schema(
            {
                vol.Required(CONF_JWT, default=current[CONF_JWT]): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD),
                ),
                vol.Optional(
                    CONF_USE_TLS, default=current[CONF_USE_TLS]
                ): selector.BooleanSelector(),
                vol.Optional(
                    CONF_SCAN_INTERVAL, default=current[CONF_SCAN_INTERVAL]
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=MIN_SCAN_INTERVAL,
                        max=MAX_SCAN_INTERVAL,
                        step=1,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="s",
                    ),
                ),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
        )
```

### `custom_components/party_dispenser/entity.py`

```python
"""Base entity for Party Dispenser sensors."""
from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, DOMAIN, MANUFACTURER, MODEL
from .coordinator import PartyDispenserCoordinator


class PartyDispenserEntity(CoordinatorEntity[PartyDispenserCoordinator]):
    """Common base class: shared DeviceInfo + entity-name behaviour."""

    _attr_attribution = ATTRIBUTION
    _attr_has_entity_name = True

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        entry_id = coordinator.config_entry.entry_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name="Party Dispenser",
            manufacturer=MANUFACTURER,
            model=MODEL,
        )
```

### `custom_components/party_dispenser/sensor.py` (one full + 4 abbreviated)

```python
"""Sensor platform — 5 entities reading from coordinator state."""
from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription

from .const import (
    SENSOR_KEY_CURRENT_ORDER,
    SENSOR_KEY_MAKEABLE_COUNT,
    SENSOR_KEY_QUEUE_SIZE,
    SENSOR_KEY_QUEUE_SUMMARY,
    SENSOR_KEY_RECIPES,
)
from .entity import PartyDispenserEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from .coordinator import PartyDispenserConfigEntry, PartyDispenserCoordinator


async def async_setup_entry(
    hass: HomeAssistant,  # noqa: ARG001
    entry: PartyDispenserConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data.coordinator
    async_add_entities(
        [
            QueueSizeSensor(coordinator),
            QueueSummarySensor(coordinator),
            MakeableCountSensor(coordinator),
            CurrentOrderSensor(coordinator),
            RecipesSensor(coordinator),
        ]
    )


# ---- 1 / 5: queue size ----

class QueueSizeSensor(PartyDispenserEntity, SensorEntity):
    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_QUEUE_SIZE,
        translation_key=SENSOR_KEY_QUEUE_SIZE,
        icon="mdi:playlist-music",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = (
            f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_QUEUE_SIZE}"
        )

    @property
    def native_value(self) -> int:
        return len(self.coordinator.data.queue)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        return {
            "queue": [
                {"id": item.id, "recipe_name": item.recipe_name, "state": item.state}
                for item in self.coordinator.data.queue
            ]
        }


# ---- 2 / 5: queue summary (human-readable) ----

class QueueSummarySensor(PartyDispenserEntity, SensorEntity):
    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_QUEUE_SUMMARY,
        translation_key=SENSOR_KEY_QUEUE_SUMMARY,
        icon="mdi:text-box-outline",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = (
            f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_QUEUE_SUMMARY}"
        )

    @property
    def native_value(self) -> str:
        queue = self.coordinator.data.queue
        if not queue:
            return "Queue empty"
        head = queue[0]
        return f"{len(queue)} queued · {head.recipe_name} {head.state}"


# ---- 3 / 5: makeable count ----

class MakeableCountSensor(PartyDispenserEntity, SensorEntity):
    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_MAKEABLE_COUNT,
        translation_key=SENSOR_KEY_MAKEABLE_COUNT,
        icon="mdi:glass-cocktail",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = (
            f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_MAKEABLE_COUNT}"
        )

    @property
    def native_value(self) -> int:
        return sum(1 for r in self.coordinator.data.recipes if r.makeable)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        return {
            "makeable": [r.name for r in self.coordinator.data.recipes if r.makeable]
        }


# ---- 4 / 5: current order ----

class CurrentOrderSensor(PartyDispenserEntity, SensorEntity):
    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_CURRENT_ORDER,
        translation_key=SENSOR_KEY_CURRENT_ORDER,
        icon="mdi:glass-cocktail",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = (
            f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_CURRENT_ORDER}"
        )

    @property
    def native_value(self) -> str:
        current = self.coordinator.data.current_order
        return current.recipe_name if current else "idle"

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        current = self.coordinator.data.current_order
        if not current:
            return {}
        return {
            "order_id": current.id,
            "state": current.state,
            "started_at": current.created_at.isoformat() if current.created_at else None,
        }


# ---- 5 / 5: recipes count ----

class RecipesSensor(PartyDispenserEntity, SensorEntity):
    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_RECIPES,
        translation_key=SENSOR_KEY_RECIPES,
        icon="mdi:clipboard-list-outline",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = (
            f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_RECIPES}"
        )

    @property
    def native_value(self) -> int:
        return len(self.coordinator.data.recipes)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        return {
            "recipes": [
                {"id": r.id, "name": r.name, "makeable": r.makeable}
                for r in self.coordinator.data.recipes
            ]
        }
```

### `custom_components/party_dispenser/services.py`

```python
"""Domain-level services for Party Dispenser (register once at HA startup)."""
from __future__ import annotations

from typing import TYPE_CHECKING

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .api import (
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    PartyDispenserError,
)
from .const import (
    ATTR_ORDER_ID,
    ATTR_RECIPE_ID,
    ATTR_SESSION_UID,
    DEFAULT_SESSION_UID,
    DOMAIN,
    LOGGER,
    SERVICE_CANCEL_ORDER,
    SERVICE_ORDER_RECIPE,
    SERVICE_REFRESH,
)

if TYPE_CHECKING:
    from .coordinator import PartyDispenserConfigEntry, PartyDispenserData


# ---------- Schemas ----------

ORDER_RECIPE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_RECIPE_ID): cv.string,
        vol.Optional(ATTR_SESSION_UID, default=DEFAULT_SESSION_UID): cv.string,
    }
)

CANCEL_ORDER_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ORDER_ID): cv.string,
        vol.Optional(ATTR_SESSION_UID, default=DEFAULT_SESSION_UID): cv.string,
    }
)

REFRESH_SCHEMA = vol.Schema({})


# ---------- Helpers ----------

def _all_runtime_data(hass: HomeAssistant) -> list["PartyDispenserData"]:
    """Return runtime_data for every loaded config entry of this domain."""
    return [
        entry.runtime_data
        for entry in hass.config_entries.async_entries(DOMAIN)
        if hasattr(entry, "runtime_data") and entry.runtime_data is not None
    ]


def _first_runtime_data_or_raise(hass: HomeAssistant) -> "PartyDispenserData":
    """v1: single-dispenser. Multi-dispenser is v2 (MULTI-01)."""
    runtimes = _all_runtime_data(hass)
    if not runtimes:
        raise HomeAssistantError("Party Dispenser is not configured")
    return runtimes[0]


# ---------- Handlers ----------

async def _async_handle_order_recipe(call: ServiceCall) -> None:
    runtime = _first_runtime_data_or_raise(call.hass)
    try:
        await runtime.client.order_from_recipe(
            recipe_id=call.data[ATTR_RECIPE_ID],
            session_uid=call.data.get(ATTR_SESSION_UID, DEFAULT_SESSION_UID),
        )
    except PartyDispenserAuthError as err:
        raise HomeAssistantError(f"Party Dispenser rejected JWT: {err}") from err
    except PartyDispenserConnectionError as err:
        raise HomeAssistantError(
            f"Cannot reach Party Dispenser backend: {err}"
        ) from err
    except PartyDispenserError as err:
        raise HomeAssistantError(f"Party Dispenser error: {err}") from err

    await runtime.coordinator.async_request_refresh()


async def _async_handle_cancel_order(call: ServiceCall) -> None:
    runtime = _first_runtime_data_or_raise(call.hass)
    try:
        await runtime.client.cancel_order(
            order_id=call.data[ATTR_ORDER_ID],
            session_uid=call.data.get(ATTR_SESSION_UID, DEFAULT_SESSION_UID),
        )
    except PartyDispenserError as err:
        raise HomeAssistantError(f"Party Dispenser error: {err}") from err

    await runtime.coordinator.async_request_refresh()


async def _async_handle_refresh(call: ServiceCall) -> None:
    """Force a refresh of every loaded config entry's coordinator."""
    runtimes = _all_runtime_data(call.hass)
    if not runtimes:
        raise HomeAssistantError("Party Dispenser is not configured")
    for runtime in runtimes:
        await runtime.coordinator.async_request_refresh()


# ---------- Public entry point called from __init__.async_setup ----------

@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the 3 domain-level services exactly once."""
    # Guard in case async_setup runs twice (shouldn't, but defensive)
    if hass.services.has_service(DOMAIN, SERVICE_ORDER_RECIPE):
        return

    hass.services.async_register(
        DOMAIN,
        SERVICE_ORDER_RECIPE,
        _async_handle_order_recipe,
        schema=ORDER_RECIPE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CANCEL_ORDER,
        _async_handle_cancel_order,
        schema=CANCEL_ORDER_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH,
        _async_handle_refresh,
        schema=REFRESH_SCHEMA,
    )
    LOGGER.debug("Registered %s services", DOMAIN)
```

### `custom_components/party_dispenser/__init__.py` (Phase 2 full content)

See **Architecture Patterns → Pattern 2** above for the full file. It's the same code; not duplicating here.

### `custom_components/party_dispenser/manifest.json` (Phase 2 deltas)

```json
{
  "domain": "party_dispenser",
  "name": "Party Dispenser",
  "version": "0.2.0",
  "documentation": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd",
  "issue_tracker": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd/-/issues",
  "codeowners": [],
  "requirements": [],
  "dependencies": [],
  "iot_class": "local_polling",
  "integration_type": "hub",
  "config_flow": true
}
```

**Only delta from Phase 1:** `"version": "0.1.0" → "0.2.0"` and `"config_flow": false → true`. The bespoke `tests/test_integration_manifest.py::test_manifest_phase1_overrides` will need loosening — change the `config_flow is False` assertion to `config_flow is True`, and update the assertion name to `test_manifest_phase2_overrides` (or similar). Keep `iot_class: local_polling` (flips to `local_push` in Phase 3 when WS lands).

### `custom_components/party_dispenser/translations/en.json`

```json
{
  "config": {
    "step": {
      "user": {
        "title": "Party Dispenser",
        "description": "Connect Home Assistant to your Party Dispenser backend.",
        "data": {
          "host": "Host",
          "port": "Port",
          "jwt": "API token",
          "use_tls": "Use HTTPS",
          "scan_interval": "Polling interval (seconds)"
        }
      }
    },
    "error": {
      "cannot_connect": "Failed to connect to the backend.",
      "invalid_auth": "The API token was rejected.",
      "invalid_response": "The backend returned an unexpected response.",
      "unknown": "Unexpected error."
    },
    "abort": {
      "already_configured": "This dispenser is already configured."
    }
  },
  "options": {
    "step": {
      "init": {
        "title": "Party Dispenser options",
        "description": "Rotate the API token or change polling behaviour. Host and port cannot be changed here — remove and re-add the integration if they have changed.",
        "data": {
          "jwt": "API token",
          "use_tls": "Use HTTPS",
          "scan_interval": "Polling interval (seconds)"
        }
      }
    },
    "error": {
      "cannot_connect": "Failed to connect to the backend.",
      "invalid_auth": "The API token was rejected.",
      "unknown": "Unexpected error."
    }
  },
  "services": {
    "order_recipe": {
      "name": "Order recipe",
      "description": "Place an order on the dispenser from an existing recipe.",
      "fields": {
        "recipe_id": {
          "name": "Recipe ID",
          "description": "The UUID of the recipe to order."
        },
        "session_uid": {
          "name": "Session UID",
          "description": "Identifier stored on the order — defaults to \"home-assistant\"."
        }
      }
    },
    "cancel_order": {
      "name": "Cancel order",
      "description": "Cancel a queued or in-progress order.",
      "fields": {
        "order_id": {
          "name": "Order ID",
          "description": "The UUID of the order to cancel."
        },
        "session_uid": {
          "name": "Session UID",
          "description": "Must match the session UID the order was placed with — defaults to \"home-assistant\"."
        }
      }
    },
    "refresh": {
      "name": "Refresh",
      "description": "Force an immediate refresh of the Party Dispenser state (sensors)."
    }
  },
  "entity": {
    "sensor": {
      "queue_size": {
        "name": "Queue size"
      },
      "queue_summary": {
        "name": "Queue summary"
      },
      "makeable_count": {
        "name": "Makeable recipes"
      },
      "current_order": {
        "name": "Current order"
      },
      "recipes": {
        "name": "Recipes"
      }
    }
  }
}
```

### `custom_components/party_dispenser/strings.json`

Phase 1 shipped a partial `strings.json`. For Phase 2 we have two choices:
- **Option A** (canonical 2026): delete `strings.json`, ship only `translations/en.json`. This is what the ludeeus blueprint does.
- **Option B** (CONTEXT.md locks "both"): keep `strings.json` with IDENTICAL content to `translations/en.json`.

**Recommendation:** Option A. The ludeeus blueprint, Shelly, Nut, and virtually every 2026 core integration ship only `translations/en.json`. HA's translation loader checks `translations/` first. Keeping a stale `strings.json` risks divergence. If the planner disagrees, keep them byte-identical to avoid translation confusion.

### `custom_components/party_dispenser/services.yaml` (optional but recommended)

HA uses this file in the Developer Tools → Services UI for inline docs. All human-readable strings come from `translations/en.json::services.*` — this file is just the field SCHEMA for UI rendering.

```yaml
order_recipe:
  fields:
    recipe_id:
      required: true
      selector:
        text:
    session_uid:
      required: false
      default: home-assistant
      selector:
        text:

cancel_order:
  fields:
    order_id:
      required: true
      selector:
        text:
    session_uid:
      required: false
      default: home-assistant
      selector:
        text:

refresh: {}
```

### `tests/conftest.py` (Phase 2 — extends Phase 1)

```python
"""Pytest configuration for Phase 2 tests.

Phase 1 conftest ran without HA installed and only validated static artifacts.
Phase 2 adds pytest-homeassistant-custom-component which brings the `hass` fixture.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Ensure repo root on sys.path for `import custom_components.party_dispenser`
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


# pytest-homeassistant-custom-component requires `enable_custom_integrations`
# to be active for every test that touches hass. Making it autouse removes
# the need to remember it in each test.
@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    yield
```

### `tests/test_api.py`

```python
"""Unit tests for PartyDispenserApiClient (use aioclient_mock for HTTP layer)."""
from __future__ import annotations

import pytest
from aiohttp import ClientError

from custom_components.party_dispenser.api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    PartyDispenserProtocolError,
    Recipe,
)

BASE = "http://dispenser.local:8000"
JWT = "fake-jwt-token"


async def test_list_recipes_happy_path(hass, aioclient_mock) -> None:
    aioclient_mock.get(
        f"{BASE}/recipes",
        json=[
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "name": "Margarita",
                "is_active": True,
                "order_count": 3,
                "ingredients": [],
                "makeable": True,
                "missing_ingredients": [],
                "missing_count": 0,
            }
        ],
    )
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    recipes = await client.list_recipes()
    assert len(recipes) == 1
    assert isinstance(recipes[0], Recipe)
    assert recipes[0].name == "Margarita"
    assert recipes[0].makeable is True
    # Confirm we sent Authorization: Bearer <jwt>
    call = aioclient_mock.mock_calls[0]
    assert call[3]["Authorization"] == f"Bearer {JWT}"


async def test_list_recipes_401_raises_auth_error(hass, aioclient_mock) -> None:
    aioclient_mock.get(f"{BASE}/recipes", status=401)
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    with pytest.raises(PartyDispenserAuthError):
        await client.list_recipes()


async def test_list_recipes_connection_error_raises(hass, aioclient_mock) -> None:
    aioclient_mock.get(f"{BASE}/recipes", exc=ClientError("boom"))
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    with pytest.raises(PartyDispenserConnectionError):
        await client.list_recipes()


async def test_list_recipes_500_raises_protocol_error(hass, aioclient_mock) -> None:
    aioclient_mock.get(f"{BASE}/recipes", status=500)
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    with pytest.raises(PartyDispenserProtocolError):
        await client.list_recipes()


async def test_order_from_recipe_sends_session_uid(hass, aioclient_mock) -> None:
    aioclient_mock.post(
        f"{BASE}/orders/from-recipe",
        json={"order_id": "22222222-2222-2222-2222-222222222222", "session_uid": "home-assistant"},
    )
    from homeassistant.helpers.aiohttp_client import async_get_clientsession
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    result = await client.order_from_recipe("11111111-1111-1111-1111-111111111111")
    assert result.order_id == "22222222-2222-2222-2222-222222222222"
    # aioclient_mock.mock_calls tuple: (method, url, data, headers)
    call = aioclient_mock.mock_calls[0]
    assert call[2]["recipe_id"] == "11111111-1111-1111-1111-111111111111"
    assert call[2]["session_uid"] == "home-assistant"
```

### `tests/test_config_flow.py`

```python
"""Tests for the config flow (happy path + sad paths + unique_id dedupe)."""
from __future__ import annotations

from unittest.mock import patch

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.const import (
    CONF_HOST, CONF_JWT, CONF_PORT, CONF_SCAN_INTERVAL, CONF_USE_TLS, DOMAIN,
)

VALID_INPUT = {
    CONF_HOST: "dispenser.local",
    CONF_PORT: 8000,
    CONF_JWT: "real-jwt",
    CONF_USE_TLS: False,
    CONF_SCAN_INTERVAL: 30,
}


async def test_show_user_form(hass) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {}


async def test_happy_path_creates_entry(hass, aioclient_mock) -> None:
    aioclient_mock.get("http://dispenser.local:8000/recipes", json=[])

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"], VALID_INPUT
    )

    assert result2["type"] is FlowResultType.CREATE_ENTRY
    assert result2["title"] == "Party Dispenser (dispenser.local:8000)"
    assert result2["data"][CONF_HOST] == "dispenser.local"
    assert result2["data"][CONF_PORT] == 8000
    assert result2["data"][CONF_JWT] == "real-jwt"
    assert result2["options"][CONF_SCAN_INTERVAL] == 30


async def test_invalid_auth_shows_error(hass, aioclient_mock) -> None:
    aioclient_mock.get("http://dispenser.local:8000/recipes", status=401)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"], VALID_INPUT
    )

    assert result2["type"] is FlowResultType.FORM
    assert result2["errors"] == {"base": "invalid_auth"}


async def test_cannot_connect_shows_error(hass, aioclient_mock) -> None:
    from aiohttp import ClientError
    aioclient_mock.get("http://dispenser.local:8000/recipes", exc=ClientError("boom"))

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"], VALID_INPUT
    )

    assert result2["type"] is FlowResultType.FORM
    assert result2["errors"] == {"base": "cannot_connect"}


async def test_duplicate_aborts(hass, aioclient_mock) -> None:
    aioclient_mock.get("http://dispenser.local:8000/recipes", json=[])

    # First entry
    existing = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={**VALID_INPUT},
    )
    existing.add_to_hass(hass)

    # Attempt to add the same host:port
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(
        result["flow_id"], VALID_INPUT
    )

    assert result2["type"] is FlowResultType.ABORT
    assert result2["reason"] == "already_configured"


async def test_options_flow_jwt_rotation(hass, aioclient_mock) -> None:
    aioclient_mock.get("http://dispenser.local:8000/recipes", json=[])

    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local", CONF_PORT: 8000,
            CONF_JWT: "old-jwt", CONF_USE_TLS: False,
        },
        options={CONF_SCAN_INTERVAL: 30},
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.party_dispenser.async_setup_entry", return_value=True
    ):
        result = await hass.config_entries.options.async_init(entry.entry_id)
        assert result["type"] is FlowResultType.FORM
        result2 = await hass.config_entries.options.async_configure(
            result["flow_id"],
            {CONF_JWT: "new-jwt", CONF_USE_TLS: False, CONF_SCAN_INTERVAL: 60},
        )
        assert result2["type"] is FlowResultType.CREATE_ENTRY
        # New JWT in data (via async_update_entry)
        assert entry.data[CONF_JWT] == "new-jwt"
        # New scan_interval in options
        assert result2["data"][CONF_SCAN_INTERVAL] == 60
```

### `tests/test_coordinator.py`

```python
"""Tests for PartyDispenserCoordinator."""
from __future__ import annotations

from unittest.mock import AsyncMock

import pytest
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import UpdateFailed
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    QueueItem,
    Recipe,
)
from custom_components.party_dispenser.const import (
    CONF_HOST, CONF_JWT, CONF_PORT, CONF_USE_TLS, DOMAIN,
)
from custom_components.party_dispenser.coordinator import PartyDispenserCoordinator


def _sample_recipe() -> Recipe:
    return Recipe(
        id="11111111-1111-1111-1111-111111111111",
        name="Margarita",
        is_active=True,
        order_count=0,
        ingredients=(),
        makeable=True,
        missing_ingredients=(),
        missing_count=0,
    )


async def _build_coordinator(hass, client) -> PartyDispenserCoordinator:
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local", CONF_PORT: 8000,
            CONF_JWT: "jwt", CONF_USE_TLS: False,
        },
    )
    entry.add_to_hass(hass)
    coord = PartyDispenserCoordinator(hass, client, scan_interval=30)
    coord.config_entry = entry  # normally assigned by HA during setup
    return coord


async def test_successful_update_populates_state(hass) -> None:
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.return_value = [_sample_recipe()]
    client.list_queue.return_value = []

    coord = await _build_coordinator(hass, client)
    state = await coord._async_update_data()

    assert len(state.recipes) == 1
    assert state.queue == []
    assert state.current_order is None
    assert state.last_updated is not None


async def test_auth_error_raises_config_entry_auth_failed(hass) -> None:
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.side_effect = PartyDispenserAuthError("bad jwt")
    client.list_queue.return_value = []

    coord = await _build_coordinator(hass, client)
    with pytest.raises(ConfigEntryAuthFailed):
        await coord._async_update_data()


async def test_connection_error_raises_update_failed(hass) -> None:
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.side_effect = PartyDispenserConnectionError("boom")
    client.list_queue.return_value = []

    coord = await _build_coordinator(hass, client)
    with pytest.raises(UpdateFailed):
        await coord._async_update_data()


async def test_queue_head_becomes_current_order(hass) -> None:
    from datetime import datetime, timezone
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.return_value = [_sample_recipe()]
    client.list_queue.return_value = [
        QueueItem(
            id="33333333-3333-3333-3333-333333333333",
            recipe_name="Margarita",
            state="QUEUED",
            priority=0,
            created_at=datetime.now(tz=timezone.utc),
            updated_at=datetime.now(tz=timezone.utc),
        ),
    ]

    coord = await _build_coordinator(hass, client)
    state = await coord._async_update_data()

    assert state.current_order is not None
    assert state.current_order.state == "QUEUED"
```

### `tests/test_services.py`

```python
"""Tests for party_dispenser.order_recipe / cancel_order / refresh services."""
from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.const import (
    ATTR_ORDER_ID, ATTR_RECIPE_ID,
    CONF_HOST, CONF_JWT, CONF_PORT, CONF_USE_TLS, DOMAIN,
    SERVICE_CANCEL_ORDER, SERVICE_ORDER_RECIPE, SERVICE_REFRESH,
)


async def _install_fake_entry(hass):
    """Set up an entry with a fake coordinator + client attached to runtime_data."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local", CONF_PORT: 8000,
            CONF_JWT: "jwt", CONF_USE_TLS: False,
        },
    )
    entry.add_to_hass(hass)

    # Patch async_setup_entry so HA doesn't actually call the real code path
    with patch(
        "custom_components.party_dispenser.async_setup_entry", return_value=True
    ):
        await hass.config_entries.async_setup(entry.entry_id)

    # Inject fake runtime_data manually (since we patched real setup)
    fake_client = AsyncMock()
    fake_coordinator = MagicMock()
    fake_coordinator.async_request_refresh = AsyncMock()
    from custom_components.party_dispenser.coordinator import PartyDispenserData
    entry.runtime_data = PartyDispenserData(
        client=fake_client, coordinator=fake_coordinator
    )
    return entry, fake_client, fake_coordinator


async def test_order_recipe_calls_api_then_refresh(hass) -> None:
    from custom_components.party_dispenser.services import async_setup_services
    async_setup_services(hass)
    entry, fake_client, fake_coord = await _install_fake_entry(hass)

    await hass.services.async_call(
        DOMAIN, SERVICE_ORDER_RECIPE,
        {ATTR_RECIPE_ID: "11111111-1111-1111-1111-111111111111"},
        blocking=True,
    )

    fake_client.order_from_recipe.assert_called_once_with(
        recipe_id="11111111-1111-1111-1111-111111111111",
        session_uid="home-assistant",
    )
    fake_coord.async_request_refresh.assert_called_once()


async def test_cancel_order_calls_api_then_refresh(hass) -> None:
    from custom_components.party_dispenser.services import async_setup_services
    async_setup_services(hass)
    entry, fake_client, fake_coord = await _install_fake_entry(hass)

    await hass.services.async_call(
        DOMAIN, SERVICE_CANCEL_ORDER,
        {ATTR_ORDER_ID: "22222222-2222-2222-2222-222222222222"},
        blocking=True,
    )

    fake_client.cancel_order.assert_called_once_with(
        order_id="22222222-2222-2222-2222-222222222222",
        session_uid="home-assistant",
    )
    fake_coord.async_request_refresh.assert_called_once()


async def test_refresh_triggers_coordinator(hass) -> None:
    from custom_components.party_dispenser.services import async_setup_services
    async_setup_services(hass)
    entry, fake_client, fake_coord = await _install_fake_entry(hass)

    await hass.services.async_call(DOMAIN, SERVICE_REFRESH, {}, blocking=True)

    fake_coord.async_request_refresh.assert_called_once()


async def test_service_raises_when_no_entries(hass) -> None:
    from custom_components.party_dispenser.services import async_setup_services
    from homeassistant.exceptions import HomeAssistantError
    async_setup_services(hass)

    with pytest.raises(HomeAssistantError, match="not configured"):
        await hass.services.async_call(DOMAIN, SERVICE_REFRESH, {}, blocking=True)
```

### `tests/test_sensor.py`

```python
"""Tests for the 5 sensor entities — verify each reads from coordinator state."""
from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock

from custom_components.party_dispenser.api import QueueItem, Recipe
from custom_components.party_dispenser.coordinator import PartyDispenserState
from custom_components.party_dispenser.sensor import (
    CurrentOrderSensor, MakeableCountSensor, QueueSizeSensor, QueueSummarySensor,
    RecipesSensor,
)


def _mock_coordinator(state: PartyDispenserState) -> MagicMock:
    coord = MagicMock()
    coord.data = state
    coord.config_entry.entry_id = "entry-abc"
    return coord


def _sample_recipes() -> list[Recipe]:
    return [
        Recipe(id="r1", name="Margarita", is_active=True, order_count=0,
               ingredients=(), makeable=True, missing_ingredients=(), missing_count=0),
        Recipe(id="r2", name="Mojito", is_active=True, order_count=0,
               ingredients=(), makeable=False, missing_ingredients=("Rum",), missing_count=1),
    ]


def test_queue_size_reads_len() -> None:
    state = PartyDispenserState(
        recipes=_sample_recipes(),
        queue=[
            QueueItem(id="o1", recipe_name="Margarita", state="QUEUED", priority=0,
                      created_at=datetime.now(tz=timezone.utc),
                      updated_at=datetime.now(tz=timezone.utc)),
            QueueItem(id="o2", recipe_name="Mojito", state="IN_PROGRESS", priority=0,
                      created_at=datetime.now(tz=timezone.utc),
                      updated_at=datetime.now(tz=timezone.utc)),
        ],
    )
    sensor = QueueSizeSensor(_mock_coordinator(state))
    assert sensor.native_value == 2
    assert len(sensor.extra_state_attributes["queue"]) == 2


def test_queue_summary_empty() -> None:
    state = PartyDispenserState(recipes=[], queue=[])
    assert QueueSummarySensor(_mock_coordinator(state)).native_value == "Queue empty"


def test_queue_summary_with_head() -> None:
    state = PartyDispenserState(
        recipes=[],
        queue=[
            QueueItem(id="o1", recipe_name="Margarita", state="QUEUED", priority=0,
                      created_at=datetime.now(tz=timezone.utc),
                      updated_at=datetime.now(tz=timezone.utc)),
        ],
    )
    value = QueueSummarySensor(_mock_coordinator(state)).native_value
    assert "Margarita" in value
    assert "QUEUED" in value


def test_makeable_count_filters() -> None:
    state = PartyDispenserState(recipes=_sample_recipes(), queue=[])
    sensor = MakeableCountSensor(_mock_coordinator(state))
    assert sensor.native_value == 1  # only Margarita is makeable
    assert sensor.extra_state_attributes["makeable"] == ["Margarita"]


def test_current_order_idle() -> None:
    state = PartyDispenserState(recipes=[], queue=[])
    assert CurrentOrderSensor(_mock_coordinator(state)).native_value == "idle"


def test_current_order_with_head() -> None:
    state = PartyDispenserState(
        recipes=[],
        queue=[
            QueueItem(id="o1", recipe_name="Margarita", state="IN_PROGRESS",
                      priority=0,
                      created_at=datetime.now(tz=timezone.utc),
                      updated_at=datetime.now(tz=timezone.utc)),
        ],
    )
    sensor = CurrentOrderSensor(_mock_coordinator(state))
    assert sensor.native_value == "Margarita"
    attrs = sensor.extra_state_attributes
    assert attrs["order_id"] == "o1"
    assert attrs["state"] == "IN_PROGRESS"


def test_recipes_count() -> None:
    state = PartyDispenserState(recipes=_sample_recipes(), queue=[])
    sensor = RecipesSensor(_mock_coordinator(state))
    assert sensor.native_value == 2
    assert len(sensor.extra_state_attributes["recipes"]) == 2


def test_device_info_stable_across_sensors() -> None:
    state = PartyDispenserState(recipes=[], queue=[])
    coord = _mock_coordinator(state)
    sensors = [
        QueueSizeSensor(coord), QueueSummarySensor(coord),
        MakeableCountSensor(coord), CurrentOrderSensor(coord),
        RecipesSensor(coord),
    ]
    # All 5 share the same device identity
    device_ids = {tuple(s._attr_device_info["identifiers"]) for s in sensors}
    assert len(device_ids) == 1
```

### `pyproject.toml` deltas

```toml
[project]
name = "party_dispenser"
version = "0.2.0"                       # bumped from 0.1.0
requires-python = ">=3.13"              # BUMPED from >=3.12 (Pitfall 1)

[project.optional-dependencies]
dev = [
    "pytest-homeassistant-custom-component==0.13.316",   # pins HA 2026.2.3, pytest-asyncio 1.3.0, pytest 9.0.0
    "ruff==0.15.11",                                     # same as Phase 1
]

[tool.ruff]
target-version = "py313"                # BUMPED from py312

# ... rest unchanged from Phase 1 ...

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
# Optional: faster iteration
addopts = ["-q", "--tb=short"]
```

### `.gitlab-ci.yml` deltas

```yaml
# Phase 2 CI — same 2-stage pipeline, but python:3.13-slim + .[dev] install.
# Real hassfest + HACS action remain deferred to Phase 5 (GitHub mirror).

default:
  image: python:3.13-slim             # BUMPED from 3.12-slim (Pitfall 1)
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

pytest:
  stage: test
  script:
    - pip install --quiet -e ".[dev]"   # BUMPED from "pip install pytest"
    - pytest tests/ -v
  # Expect ~60-90s on cold cache (HA install ~200MB deps), ~25-35s with warm pip cache.
  # Total pipeline still well under the 2-minute budget.
```

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| `hass.data[DOMAIN][entry_id] = coordinator` | `entry.runtime_data = MyData(coordinator=...)` + `type MyConfigEntry = ConfigEntry[MyData]` | HA 2024.5 | Bronze-tier quality-scale rule. Type-safe, auto-cleaned on unload. |
| `OptionsFlowHandler(config_entry=entry)` with `self.config_entry = config_entry` | `OptionsFlowHandler()` (no args); parent class sets `self.config_entry` | HA 2024.11 deprecated, 2025.12 hard-error | Options flows that ignore this won't load at all on HA 2025.12+. |
| `_attr_name = "Queue size"` in Python | `_attr_has_entity_name = True` + `_attr_translation_key = "queue_size"` + entry in `translations/en.json` | HA 2023.8 | i18n-ready; user-facing strings centralized. Core integrations progressively migrated. |
| `strings.json` as primary translation source | `translations/en.json` (canonical); `strings.json` is legacy fallback | Since HA 2023.4 the translation build system prefers `translations/` | Shipping both is fine; shipping only `translations/` is 2026 canonical. |
| `result["type"] == FlowResultType.FORM` | `result["type"] is FlowResultType.FORM` | HA 2026.1 | Deprecation warning upgraded to stricter enforcement; `is` semantics match intent. |
| Register services inside `async_setup_entry` | Register in `async_setup(hass, config)` via `async_setup_services(hass)` helper | Core integrations migrated through 2026.2–2026.3 (30+ "Move service registration" PRs) | Per-entry register double-registers on second entry; single-call from `async_setup` is the explicit canonical form. |
| `aiohttp.ClientSession()` per integration | `async_get_clientsession(hass)` (shared HA session) | Long-standing best practice, upgraded to a [quality-scale rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/inject-websession/) | Reuses connection pool, ties lifecycle to HA, required for `aioclient_mock` test fixture to function. |
| `pytest-asyncio` default mode | `asyncio_mode = "auto"` in `pyproject.toml` | pytest-asyncio 0.21 migration (2023) | `pytest-homeassistant-custom-component` explicitly requires this; tests silently skip without it. |
| Python 3.12 floor for HA | Python 3.13 floor (HA 2026.1+) / 3.14 floor (HA 2026.3+) | HA 2026.1 (3.13), 2026.3 (3.14) | Custom integrations that pin `>=3.12` cannot install any HA ≥ 2026.1 for testing. MUST bump. |

**Deprecated / outdated (do NOT copy from stale tutorials):**
- Anything using `async_add_entities(True)` (the `update_before_add=True` arg) — use coordinator's `async_config_entry_first_refresh` instead.
- Any `config_flow.py` that subclasses `FlowHandler` directly — use `config_entries.ConfigFlow`.
- Any service schema using `vol.All(cv.string, vol.Length(min=1))` — use `cv.string` + a `selector.text` in `services.yaml`; voluptuous will enforce the string type and the UI selector does the length hint.
- `load_platform` or `discovery_info=None` — Phase 1 is config-flow-only, `load_platform` is for legacy YAML integrations.
- `setup.py` for the integration package itself — only `pyproject.toml` needed for custom integrations.

## Open Questions

1. **Should Phase 2 keep `strings.json` or delete it?**
   - What we know: CONTEXT.md says keep both. Ludeeus blueprint ships only `translations/en.json`. Keeping both means identical content or risk drift.
   - What's unclear: Does the user prefer maximum back-compat (both) or canonical simplicity (one)?
   - Recommendation: Planner picks. Safe default — ship both with byte-identical content. Aggressive default — delete `strings.json` and note in plan that Phase 1's stub was a Phase-1-era approach; `translations/` is 2026 canonical.

2. **How to handle "makeable" flag for sensor.party_dispenser_recipes state_attributes?**
   - CONTEXT.md says `{recipes: [full list with makeable flags]}`. That could be large (e.g., 50 recipes × 10 ingredients each = multi-KB).
   - What's unclear: HA has a 16 KB soft limit on state attributes before performance degrades. If the backend has 100+ recipes, attributes may bloat.
   - Recommendation: In the sensor plan, include only `{id, name, makeable}` (not full ingredient list) in `state_attributes`. Full ingredient data is only needed by the card (Phase 4), which can fetch directly from the coordinator via a template sensor or WebSocket API. Flag to planner: this is a performance knob.

3. **Should the `party_dispenser.order_recipe` service accept a `session_uid` override?**
   - CONTEXT.md says yes. The backend accepts it. But in v1 single-dispenser, there's no real use case for changing `session_uid` — the card always wants "home-assistant".
   - Recommendation: Keep the schema field (`vol.Optional(ATTR_SESSION_UID, default=DEFAULT_SESSION_UID)`), default to "home-assistant". Harmless, forward-compat for multi-tenant v2 (MULTI-01).

4. **Does the bespoke `test_integration_manifest.py` from Phase 1 need Phase 2 updates?**
   - What we know: Phase 1 test asserts `config_flow is False`. Phase 2 flips to `True`.
   - What's unclear: Should the test be parameterized (allow either), or hard-asserted on Phase 2 value?
   - Recommendation: In Phase 2 plans, include a task step to change the assertion in `test_manifest_phase1_overrides`:
     ```python
     def test_manifest_phase2_overrides() -> None:
         ...
         assert manifest.get("config_flow") is True, "Phase 2: config_flow flipped to true"
         assert manifest.get("version") == "0.2.0", "Phase 2: version bumped to 0.2.0"
     ```

5. **Phase 2 does not add a `binary_sensor.connected` — is the sensor platform alone correct?**
   - What we know: CONTEXT.md defers binary_sensor to Phase 3 (RT-03).
   - What's unclear: HA UI may show the integration as "Connection: Unknown" without it. Acceptable for v0.2.0?
   - Recommendation: Yes, acceptable. Phase 3 lands the binary_sensor. Phase 2 `PLATFORMS = [Platform.SENSOR]` is correct.

6. **Is it safe to assume `/recipes` backend endpoint is unauthenticated?**
   - What we know: Backend source shows no auth dep on `list_recipes`. But: some deployments may put nginx+auth in front of the backend.
   - Recommendation: Always send `Authorization: Bearer <jwt>` — harmless to an unauthenticated handler, necessary if proxy enforces. This is what the existing YAML package does.

## Environment Availability

Phase 2 does NOT introduce new OS-level or CI-level external dependencies beyond what's already accounted for in Phase 1 + the Python 3.13 bump. No databases, no Docker services, no external CLIs beyond what `pip install` pulls in.

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Python 3.13 | pytest-homeassistant-custom-component + homeassistant 2026.2.3 | ✓ (via `python:3.13-slim` on GitLab CI; locally via pyenv/asdf/system) | 3.13.x | Python 3.14-slim is also viable — wider compatibility with HA 2026.3+. |
| `pip` with --cache-dir | CI job caching | ✓ (configured in Phase 1 `.gitlab-ci.yml`) | — | — |
| `glab` CLI (for fetching backend source during research) | Research only — NOT required for Phase 2 builds | ✓ (user confirmed configured) | — | Can re-read the backend schemas from memory (captured in this research doc). |
| GitLab CI runner (Kubernetes executor, no DinD) | CI pipeline | ✓ (Phase 1 validated) | — | — |
| Docker for `hassfest` | Was Phase 1 ambition; deferred | ✗ (DinD disallowed) | — | Bespoke `tests/test_integration_manifest.py` continues Phase 2 (already in place). Real hassfest stays Phase 5 against GitHub mirror. |
| Network access to PyPI from CI | `pip install -e ".[dev]"` | ✓ (Phase 1 validated) | — | Plan for offline wheelhouse if this ever changes. |
| Running Party Dispenser backend on localhost/LAN | End-user runtime — NOT needed for Phase 2 tests (all HTTP mocked) | — | — | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Docker for canonical hassfest (bespoke tests cover structural invariants; real hassfest deferred to Phase 5 via GitHub mirror's GitHub Actions runner which has native DinD).

## Validation Architecture

Nyquist validation is enabled in `.planning/config.json` (`workflow.nyquist_validation = true`). This section maps each Phase 2 requirement to an automated test.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | `pytest 9.0.0` + `pytest-asyncio 1.3.0` + `pytest-homeassistant-custom-component 0.13.316` |
| Config file | `pyproject.toml` (`[tool.pytest.ini_options]` with `asyncio_mode = "auto"`) |
| Quick run command | `pytest tests/ -v -x --tb=short` |
| Full suite command | `pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| CFG-01 | Config flow collects host/port/JWT/TLS; validates connectivity before saving | unit + integration (mocked HTTP) | `pytest tests/test_config_flow.py::test_happy_path_creates_entry -x` | ❌ Wave 0 |
| CFG-01 | Config flow rejects invalid JWT with `invalid_auth` error | unit + integration | `pytest tests/test_config_flow.py::test_invalid_auth_shows_error -x` | ❌ Wave 0 |
| CFG-01 | Config flow rejects unreachable host with `cannot_connect` error | unit + integration | `pytest tests/test_config_flow.py::test_cannot_connect_shows_error -x` | ❌ Wave 0 |
| CFG-01 | Config flow deduplicates on `{host}:{port}` unique_id | integration | `pytest tests/test_config_flow.py::test_duplicate_aborts -x` | ❌ Wave 0 |
| CFG-02 | Options flow allows JWT rotation, re-validates on save | integration | `pytest tests/test_config_flow.py::test_options_flow_jwt_rotation -x` | ❌ Wave 0 |
| CFG-03 | No YAML required — config flow is the only setup path | structural | `pytest tests/test_integration_manifest.py::test_manifest_phase2_overrides -x` (checks `config_flow: true`) | ❌ Wave 0 (modify existing test) |
| INT-01 | One device per config entry labeled "Party Dispenser" | unit | `pytest tests/test_sensor.py::test_device_info_stable_across_sensors -x` | ❌ Wave 0 |
| INT-02 | All 5 sensors exist, read correct coordinator state | unit (x5) | `pytest tests/test_sensor.py -v -x` | ❌ Wave 0 |
| INT-03 | `party_dispenser.order_recipe` calls `api.order_from_recipe` + triggers refresh | integration | `pytest tests/test_services.py::test_order_recipe_calls_api_then_refresh -x` | ❌ Wave 0 |
| INT-04 | `party_dispenser.cancel_order` calls `api.cancel_order` + triggers refresh | integration | `pytest tests/test_services.py::test_cancel_order_calls_api_then_refresh -x` | ❌ Wave 0 |
| INT-05 | `party_dispenser.refresh` triggers coordinator refresh on all entries | integration | `pytest tests/test_services.py::test_refresh_triggers_coordinator -x` | ❌ Wave 0 |
| INT-05 | `party_dispenser.refresh` raises when no entries configured | integration | `pytest tests/test_services.py::test_service_raises_when_no_entries -x` | ❌ Wave 0 |
| QA-01 | Coordinator handles auth / connection errors correctly | unit | `pytest tests/test_coordinator.py -v -x` | ❌ Wave 0 |
| QA-01 | API client maps HTTP status to typed exceptions | unit | `pytest tests/test_api.py -v -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `pytest tests/test_<module-under-edit>.py -x --tb=short` — 5–15s per module
- **Per wave merge:** `pytest tests/ -v` — full suite, target < 60s
- **Phase gate:** Full suite green before `/gsd:verify-work`; coverage check via `pytest --cov=custom_components.party_dispenser tests/ --cov-report=term-missing` targeting ≥ 80% on `config_flow.py`, `api.py`, `coordinator.py`, `services.py`

### Wave 0 Gaps

- [ ] Bump `pyproject.toml` `requires-python = ">=3.13"` (Pitfall 1)
- [ ] Bump `.gitlab-ci.yml` default image to `python:3.13-slim` (Pitfall 1)
- [ ] Add `[project.optional-dependencies] dev = ["pytest-homeassistant-custom-component==0.13.316", "ruff==0.15.11"]` to `pyproject.toml`
- [ ] Update `.gitlab-ci.yml` `pytest` job: `pip install --quiet -e ".[dev]"` (replaces bare `pip install pytest`)
- [ ] Extend `tests/conftest.py` with autouse `auto_enable_custom_integrations(enable_custom_integrations)` fixture
- [ ] Create `tests/fixtures/recipes.json` and `tests/fixtures/queue.json` — canned backend responses for `aioclient_mock`
- [ ] `tests/test_api.py` — create module: 5 tests (happy path, 401, connection error, 500, POST with session_uid)
- [ ] `tests/test_config_flow.py` — create module: 6 tests (show form, happy, invalid_auth, cannot_connect, duplicate_abort, options_flow)
- [ ] `tests/test_coordinator.py` — create module: 4 tests (success, auth error, connection error, queue head)
- [ ] `tests/test_services.py` — create module: 4 tests (order, cancel, refresh, no-entries-raises)
- [ ] `tests/test_sensor.py` — create module: 7 tests (one per sensor + device_info stability test)
- [ ] Modify `tests/test_integration_manifest.py::test_manifest_phase1_overrides` to expect `config_flow: true` + `version: 0.2.0` (rename to `test_manifest_phase2_overrides`)
- [ ] Clear `.pytest_cache/` once after Python 3.12 → 3.13 switch (stale cached import maps)

**Framework install:** Covered by `pip install -e ".[dev]"` — no separate step.

## Sources

### Primary (HIGH confidence)

**HA developer docs (current, live):**
- [Config flow handler](https://developers.home-assistant.io/docs/config_entries_config_flow_handler) — async_step_user, unique_id, errors pattern (fetched 2026-04-20)
- [Config entries options flow handler](https://developers.home-assistant.io/docs/config_entries_options_flow_handler) — OptionsFlow class (fetched 2026-04-20)
- [Options flow blog post (2024-11-12)](https://developers.home-assistant.io/blog/2024/11/12/options-flow/) — the 2025.12 deprecation and new pattern (fetched 2026-04-20)
- [Integration fetching data](https://developers.home-assistant.io/docs/integration_fetching_data) — DataUpdateCoordinator, ConfigEntryAuthFailed, UpdateFailed (fetched 2026-04-20)
- [Store runtime data inside config entry (2024-04-30)](https://developers.home-assistant.io/blog/2024/04/30/store-runtime-data-inside-config-entry/) — runtime_data pattern + type alias (fetched 2026-04-20)
- [Device registry index](https://developers.home-assistant.io/docs/device_registry_index) — DeviceInfo fields (fetched 2026-04-20)
- [Entity naming](https://developers.home-assistant.io/docs/core/entity/#entity-naming) — _attr_has_entity_name, _attr_translation_key (fetched 2026-04-20)
- [Integration service actions](https://developers.home-assistant.io/docs/dev_101_services) — async_register, services.yaml (fetched 2026-04-20)
- [Integration quality scale — runtime-data rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/runtime-data) — "no exceptions" Bronze-tier rule (fetched 2026-04-20)
- [Integration quality scale — inject-websession rule](https://developers.home-assistant.io/docs/core/integration-quality-scale/rules/inject-websession/) — why async_get_clientsession (fetched 2026-04-20)
- [Creating integration manifest](https://developers.home-assistant.io/docs/creating_integration_manifest) — manifest fields, iot_class, integration_type (fetched 2026-04-20)

**HA core source code (live, dev branch):**
- [Shelly `__init__.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/shelly/__init__.py) — `async_setup` + `async_setup_services` pattern (fetched 2026-04-20)
- [Shelly `services.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/shelly/services.py) — canonical service registration with schema + handler (fetched 2026-04-20)
- [Shelly `config_flow.py`](https://github.com/home-assistant/core/blob/dev/homeassistant/components/shelly/config_flow.py) — 2025.12+ OptionsFlow pattern, async_get_options_flow (fetched 2026-04-20)

**ludeeus/integration_blueprint (canonical template, HEAD):**
- [ludeeus/integration_blueprint — api.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/api.py)
- [ludeeus/integration_blueprint — config_flow.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/config_flow.py)
- [ludeeus/integration_blueprint — coordinator.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/coordinator.py)
- [ludeeus/integration_blueprint — data.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/data.py)
- [ludeeus/integration_blueprint — entity.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/entity.py)
- [ludeeus/integration_blueprint — sensor.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/sensor.py)
- [ludeeus/integration_blueprint — __init__.py](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/__init__.py)
- [ludeeus/integration_blueprint — translations/en.json](https://github.com/ludeeus/integration_blueprint/blob/main/custom_components/integration_blueprint/translations/en.json)

**pytest-homeassistant-custom-component:**
- [MatthewFlamm/pytest-homeassistant-custom-component — README](https://github.com/MatthewFlamm/pytest-homeassistant-custom-component) — fixtures, gotchas, asyncio_mode (fetched 2026-04-20)
- [test_config_flow.py example](https://github.com/MatthewFlamm/pytest-homeassistant-custom-component/blob/master/tests/test_config_flow.py) — canonical config-flow test
- [test_sensor.py example](https://github.com/MatthewFlamm/pytest-homeassistant-custom-component/blob/master/tests/test_sensor.py) — canonical sensor test with MockConfigEntry

**Backend source (GitLab project 11):**
- `backend/app/api/schemas.py` — RecipeOut, DrinkOrderOut, CreateOrderFromRecipeIn, CancelOrderIn, CreateOrderOut (fetched via `glab api` 2026-04-20)
- `backend/app/api/routes/recipes.py::list_recipes` — GET /recipes endpoint handler
- `backend/app/api/routes/queue.py::get_queue` — GET /queue endpoint handler
- `backend/app/api/routes/orders.py::create_order_from_recipe` / `cancel_order` — POST /orders/from-recipe and POST /orders/{id}/cancel handlers
- `backend/app/api/deps.py` — JWT auth via `HTTPBearer(auto_error=False)` + `jose.jwt.decode`
- `config/packages/party_dispenser.yaml` — existing YAML-package contract (confirms 4 endpoints, `session_uid: "home-assistant"` convention, bearer header)

**PyPI metadata (version pinning):**
- `curl https://pypi.org/pypi/homeassistant/2026.2.3/json` — requires_python >=3.13.2 (verified 2026-04-20)
- `curl https://pypi.org/pypi/pytest-homeassistant-custom-component/0.13.316/json` — pins homeassistant==2026.2.3, pytest-asyncio==1.3.0, pytest==9.0.0 (verified 2026-04-20)
- `curl https://pypi.org/pypi/aiohttp/json` — 3.13.5 (2026-03-31)

### Secondary (MEDIUM confidence)

- [HA 2026.1 changelog](https://www.home-assistant.io/changelogs/core-2026.1/) — `is` over `==` for enums, Python 3.13 floor (summarized from WebFetch, 2026-04-20)
- [HA 2026.2 changelog](https://www.home-assistant.io/changelogs/core-2026.2/) — service-registration refactors across core (summarized from WebFetch, 2026-04-20)
- [HA 2026.3 changelog](https://www.home-assistant.io/changelogs/core-2026.3/) — Python 3.14 default, service-registration migration pattern across 30+ integrations (summarized from WebFetch, 2026-04-20)
- [Real-world custom integration test_config_flow.py (ollo69/ha_asuswrt_custom)](https://github.com/ollo69/ha_asuswrt_custom/blob/master/tests/test_config_flow.py) — confirms MockConfigEntry + data_entry_flow.FlowResultType test pattern is widely used

### Tertiary (LOW confidence — flagged for validation)

- Exact pin for `pytest-homeassistant-custom-component` — `0.13.316` is the latest compatible with Python 3.13. We picked this specific minor (2026-02-21) because it pins HA 2026.2.3 (latest 3.13-compat). **Flag:** upstream updates daily; by the time Phase 2 ships, a newer 0.13.31x may exist that still pins a 3.13-compat HA — planner can verify with the same `curl | jq` commands in **Standard Stack → Version verification**. Low risk: 0.13.316 is stable and widely used.
- `entry.runtime_data` type-alias pattern using `type` keyword — requires Python 3.12+ `type` statement ([PEP 695](https://peps.python.org/pep-0695/)). We're already on 3.13 so this is fine. **Flag:** If CONTEXT ever rolls back to 3.11, switch to `TypeAlias`.
- The claim that `/recipes` and `/queue` are "auth-optional" (no `Depends(require_admin)` on handler) — verified against `backend/app/api/routes/{recipes,queue}.py` at commit on `main` 2026-04-20. **Flag:** backend may add auth in future; always sending the JWT header is the safe stance regardless.
- `services.yaml` format — the HA docs page has evolved and the format includes new `target:` field and `filter:` field. We included a minimal services.yaml that matches the docs as of 2026-04-20. **Flag:** Planner should verify against current HA docs just before implementation in case minor schema tweaks landed in 2026.4.

## Metadata

**Confidence breakdown:**
- Standard stack (Python + pytest-HA + HA versions): **HIGH** — cross-verified against live PyPI metadata 2026-04-20.
- Architecture (runtime_data, options flow 2025.12, service placement): **HIGH** — verified against live core source (Shelly), blueprint source (ludeeus), and developer-docs blog posts.
- Backend API contract: **HIGH** — pulled verbatim from `backend/app/api/schemas.py` and route handlers via `glab api` against project 11 `main` branch 2026-04-20.
- Pitfalls: **HIGH** — each pitfall has a concrete failure mode verified against changelog or docs (Python 3.12 incompat verified via PyPI metadata; options-flow deprecation cross-referenced in the blog post + HACS bug report; service double-register confirmed in Shelly source comments).
- Code examples: **HIGH** — adapted directly from blueprint/Shelly patterns; all imports, type hints, and method signatures verified against current HA core `dev` branch.
- Test examples: **MEDIUM-HIGH** — follow pytest-HA-custom README patterns exactly; slight risk that `aioclient_mock.mock_calls` tuple indexing (`call[3]` for headers) may change minor version — planner should verify with `print(aioclient_mock.mock_calls[0])` on first test run.
- Environment availability: **HIGH** — same constraints as Phase 1, no new external deps.

**Research date:** 2026-04-20

**Valid until:** ~2026-05-15 for stable parts; **7 days** for pinned version numbers (pytest-homeassistant-custom-component updates daily; verify pin is still current before Phase 2 execution).

## RESEARCH COMPLETE
