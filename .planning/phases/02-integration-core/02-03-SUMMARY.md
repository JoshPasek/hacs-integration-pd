---
phase: 02-integration-core
plan: 03
subsystem: entities
tags: [homeassistant, sensor_platform, coordinator_entity, translations, device_registry]

# Dependency graph
requires:
  - phase: 02-integration-core
    plan: 02
    provides: "entity.py (PartyDispenserEntity base with shared DeviceInfo + has_entity_name), coordinator.py (PartyDispenserCoordinator + PartyDispenserState.current_order property + PartyDispenserConfigEntry type alias), api.py (Recipe + QueueItem dataclasses with id/name/makeable + recipe_name/state/created_at fields), const.py (SENSOR_KEY_QUEUE_SIZE, SENSOR_KEY_QUEUE_SUMMARY, SENSOR_KEY_MAKEABLE_COUNT, SENSOR_KEY_CURRENT_ORDER, SENSOR_KEY_RECIPES), __init__.py::PLATFORMS = [Platform.SENSOR], translations/en.json::entity.sensor.* name keys"
provides:
  - "custom_components/party_dispenser/sensor.py — 5 SensorEntity subclasses (QueueSizeSensor, QueueSummarySensor, MakeableCountSensor, CurrentOrderSensor, RecipesSensor) + async_setup_entry"
  - "Full INT-01 compliance (single device per config entry via shared DeviceInfo inheritance from PartyDispenserEntity)"
  - "Full INT-02 compliance (5 specific entity_ids via SENSOR_KEY_* translation_keys)"
  - "All 5 entities are i18n-ready — entity names come from translations/en.json, not hardcoded _attr_name strings"
  - "RecipesSensor state_attributes is LIGHT (id+name+makeable only, no ingredients) per Open Question 2 resolution — stays well under HA's 16KB soft limit on state attributes"
affects: [02-04-services-and-tests, 04-custom-card]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SensorEntityDescription at class-level (entity_description = SensorEntityDescription(key=..., translation_key=..., icon=...)) — recommended HA style since 2022.11; read-only declarative descriptor, all instances share one object"
    - "MRO order: PartyDispenserEntity first (for DeviceInfo + has_entity_name + CoordinatorEntity machinery), SensorEntity second (state pipeline)"
    - "Stable unique_id pattern: f'{coordinator.config_entry.entry_id}_{SENSOR_KEY_<X>}' — scoped by entry_id so HA's entity registry survives renames/reconfigurations"
    - "Coordinator lookup via entry.runtime_data.coordinator (Bronze quality-scale — NO hass.data[DOMAIN])"
    - "Translation keys mirror SENSOR_KEY_* constants 1:1 — one source of truth for the 5 entity identifiers"

key-files:
  created:
    - custom_components/party_dispenser/sensor.py
  modified: []

key-decisions:
  - "Removed the research code's '# noqa: ARG001' suppression on async_setup_entry's hass parameter — ARG is not in the project's selected ruff rules, so the suppression was a dead-code directive (RUF100). The hass param is retained (HA's platform signature requires it); ruff is fine with it because ARG001 isn't firing in the first place."
  - "Kept RecipesSensor attribute payload LIGHT ({id, name, makeable} only) — research Open Question 2 resolution. Full ingredient data (potentially 10+ ingredients × 50+ recipes) would breach HA's 16KB state-attribute soft limit; Phase 4's custom card can read coordinator state directly for full recipe detail."
  - "All 5 sensors inherit from PartyDispenserEntity FIRST, SensorEntity SECOND — MRO ensures CoordinatorEntity's __init__ + the shared DeviceInfo from the base class take precedence, with SensorEntity's state/value machinery layered on top. Matches HA's documented convention for coordinator-based platforms."

patterns-established:
  - "Pattern: One SensorEntityDescription per sensor class at class-level — key + translation_key + icon declared once, shared across instances"
  - "Pattern: Thin __init__ override — only to set _attr_unique_id; all other attrs come from the class-level entity_description or the base class"
  - "Pattern: native_value + extra_state_attributes both read from self.coordinator.data — coordinator is the single source of truth, sensors are pure projections"

requirements-completed: [INT-01, INT-02]

# Metrics
duration: 2min
completed: 2026-04-20
---

# Phase 02 Plan 03: Sensor platform (5 entities + shared device) Summary

**Delivered the 5 Party Dispenser SensorEntity subclasses in a single file — each subclasses PartyDispenserEntity+SensorEntity, sets _attr_translation_key + stable _attr_unique_id scoped by entry_id, and reads native_value/extra_state_attributes from coordinator.data — completing INT-01 (one device per entry) and INT-02 (5 specific entity_ids) and unblocking a usable v0.2.0 release the moment 02-04 lands services + tests.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-20T19:06:11Z
- **Completed:** 2026-04-20T19:07:52Z
- **Tasks:** 1
- **Files created:** 1 (202 lines)

## Accomplishments

- `custom_components/party_dispenser/sensor.py` created with the 5 canonical sensor classes (`QueueSizeSensor`, `QueueSummarySensor`, `MakeableCountSensor`, `CurrentOrderSensor`, `RecipesSensor`), each subclassing `PartyDispenserEntity, SensorEntity` in that order so MRO delegates DeviceInfo + `_attr_has_entity_name = True` to the base and state-pipeline machinery to the platform.
- `async_setup_entry(hass, entry, async_add_entities)` reads `entry.runtime_data.coordinator` (Bronze quality-scale compliant — no `hass.data[DOMAIN]`) and registers all 5 entities in one `async_add_entities([...])` call.
- Each sensor sets `_attr_unique_id = f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_<X>}"` — stable across config reloads, scoped by entry, HA's entity registry handles any future rename cleanly.
- `entity_description = SensorEntityDescription(key=SENSOR_KEY_<X>, translation_key=SENSOR_KEY_<X>, icon="mdi:…")` at class level for each — one descriptor shared across instances, matches HA's recommended 2022.11+ style.
- **RecipesSensor attribute payload kept LIGHT** — `[{"id": r.id, "name": r.name, "makeable": r.makeable} for r in …]`. NO `ingredients` field (Open Question 2 resolution — HA's 16KB state-attribute soft limit would be breached for catalogs >~50 recipes).
- **Grep-verified acceptance:** 5 classes with the exact `(PartyDispenserEntity, SensorEntity)` base tuple, 5 `translation_key=SENSOR_KEY` occurrences, 5 `_attr_unique_id` assignments, 5 `coordinator.config_entry.entry_id` references, 0 `"ingredients":` keys in extra_state_attributes.
- `ruff format --check .` → green. `ruff check .` → all checks passed. `pytest tests/` → 27/27 pass (no regressions).

## Task Commits

1. **Task 1: sensor.py creation** — `bdc85be` (feat)
   — 202-line single-file commit containing all 5 sensor classes + async_setup_entry

**Plan metadata commit:** (follow-up commit with SUMMARY.md + STATE.md + ROADMAP.md + REQUIREMENTS.md updates)

## Files Created/Modified

### Created
- `custom_components/party_dispenser/sensor.py` — 202 lines: async_setup_entry + 5 SensorEntity subclasses (QueueSizeSensor / QueueSummarySensor / MakeableCountSensor / CurrentOrderSensor / RecipesSensor). Each class declares its entity_description at class level, sets _attr_unique_id in a thin __init__, and exposes native_value + (where applicable) extra_state_attributes as @property methods reading from self.coordinator.data.

### Modified
None — this plan was purely additive. `entity.py`, `coordinator.py`, `const.py`, `__init__.py` (PLATFORMS), and `translations/en.json` were all already prepared by 02-02 with the exact surface this plan consumed.

## Decisions Made

- **Removed research code's `# noqa: ARG001` suppression.** The `async def async_setup_entry(hass, …)` signature in the research (02-RESEARCH.md line 1604) had `# noqa: ARG001` to silence an unused-argument warning. But `ARG` is NOT in this project's selected ruff rule groups (pyproject.toml `tool.ruff.lint.select` has `E, W, F, I, N, UP, B, ASYNC, S, SIM, T20, RUF` — no `ARG`), so the noqa was suppressing nothing. Ruff's `RUF100` (unused-noqa) fired on it. Resolved by deleting the comment — `hass` is retained (HA platform signature mandates it); ruff is perfectly happy because ARG001 isn't a selected rule. This is a **[Rule 1 - Bug]** deviation from the research code (not from the plan's `<verify>` step, which only requires ruff green; the plan's `<action>` block echoed the research code verbatim).
- **Kept RecipesSensor attrs LIGHT** — explicit 3-field dict `{id, name, makeable}` per recipe. The plan and Open Question 2 both prescribe this. Full ingredient lists (RecipeIngredient has 6 fields × up to N ingredients per recipe) would push the state attribute payload past HA's 16KB soft limit on a 50-recipe catalog. Phase 4's custom card reads from the coordinator directly — no data loss.
- **Retained research's MRO ordering** (`class X(PartyDispenserEntity, SensorEntity):`). PartyDispenserEntity first ensures CoordinatorEntity's `__init__` runs and `_attr_has_entity_name = True` + `_attr_attribution` + `_attr_device_info` inherit correctly. SensorEntity second adds state_class/native_value machinery. Swapping the order would lose the DeviceInfo sharing (one of INT-01's locked invariants).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Research copy-ready `# noqa: ARG001` triggered RUF100 (unused-noqa)**
- **Found during:** Task 1 (first ruff run after file creation)
- **Issue:** Research code at 02-RESEARCH.md line 1604 has `hass: HomeAssistant,  # noqa: ARG001` on the async_setup_entry signature. The plan's action block (Task 1, line 171) prescribes this verbatim with a note explaining it "silences ruff warning about unused hass arg". However, this project's pyproject.toml does NOT include `ARG` in `[tool.ruff.lint] select`, so ARG001 never fires — the noqa is suppressing a rule that isn't active. Ruff's RUF100 rule (which IS active, via the `RUF` group) flagged it as unused. This is the same class of bug as 02-02's UP041/UP017/F401 deviations (latent ruff findings in the copy-ready code).
- **Fix:** Removed the `# noqa: ARG001` comment; `hass` parameter itself is retained (HA platform signature requires it — async_setup_entry(hass, entry, async_add_entities) is the documented contract). No runtime or behavioral change; purely strips a dead directive.
- **Files modified:** custom_components/party_dispenser/sensor.py
- **Verification:** `ruff format --check .` → green. `ruff check .` → "All checks passed!". `python -c "import ast; ast.parse(...)"` → syntactically valid. `pytest tests/` → 27/27 pass.
- **Committed in:** bdc85be (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 Rule 1 - Bug)
**Impact on plan:** Auto-fix was necessary for CI compliance (ruff check blocks on any RUF100 finding). No scope creep — single-line comment deletion. Echoes 02-02's pattern of latent ruff findings in research code: the Phase 2 research was not run through this project's ruff config before being captured, so copy-ready snippets sometimes carry findings that `ruff check` will surface on first invocation. Flagging to 02-04 planner for any remaining copy-ready code.

## Issues Encountered

- **Plan's alternative verify step (`python -c "from custom_components.party_dispenser.sensor import …"`) cannot succeed during 02-03 execution** — the plan acknowledges this in the Task 1 body (line 239-243): importing any submodule triggers the package __init__.py, which imports `from .services import async_setup_services`, which will not exist until 02-04 Task 2. Additionally, __init__.py imports `homeassistant.*` at runtime, unavailable in CI stage 1. The plan explicitly recommends the AST-based syntax check as the actual verification (line 242), which I used. Once 02-04 lands services.py AND adds pytest-homeassistant-custom-component to dev deps AND bumps CI to install `.[dev]`, a full runtime `from custom_components.party_dispenser.sensor import …` will succeed — that's when tests/test_sensor.py (created by 02-04) can import the sensor classes under the HA-powered fixture set.

## User Setup Required

None — no external service configuration required. Tests for these 5 sensors land in 02-04.

## Next Phase Readiness

**Plan 02-04 (services + pytest suite) is unblocked AND will resolve the forward reference.**

- 02-04 Task 2 must create `custom_components/party_dispenser/services.py` exporting `async_setup_services(hass)` — __init__.py::async_setup already imports it. Once it lands, `import custom_components.party_dispenser` will succeed, enabling full-runtime tests.
- `tests/test_sensor.py` (02-04 Task 3) will import `from custom_components.party_dispenser.sensor import QueueSizeSensor, QueueSummarySensor, MakeableCountSensor, CurrentOrderSensor, RecipesSensor, async_setup_entry` and exercise the 7+1 scenarios from 02-VALIDATION.md:
  - `test_queue_size_reads_len` — assert QueueSizeSensor.native_value == len(coordinator.data.queue)
  - `test_queue_summary_empty` — assert "Queue empty" when queue is []
  - `test_queue_summary_with_head` — assert "{n} queued · {recipe} {state}" format
  - `test_makeable_count_filters` — assert counts only where r.makeable is True
  - `test_current_order_idle` — assert "idle" when queue is []
  - `test_current_order_with_head` — assert queue[0].recipe_name
  - `test_recipes_count` — assert RecipesSensor.native_value == len(recipes)
  - `test_device_info_stable_across_sensors` — assert set-of-identifiers across all 5 entities has size 1 (INT-01 invariant)
- Test fixtures will use `MockConfigEntry` + the plugin's `hass` fixture + pre-populated coordinator state.
- All 5 sensor classes are already pre-positioned to pass those 8 tests — native_value + extra_state_attributes are deterministic pure functions of coordinator.data.

**Plan 02-04 additional unblockers this plan delivers:**
- `async_setup_entry` correctly wires into HA's platform forwarding (`hass.config_entries.async_forward_entry_setups(entry, [Platform.SENSOR])` from __init__.py) — no missing glue needed.
- All 5 sensors share ONE DeviceInfo via base class inheritance — INT-01 device-registry invariant structurally guaranteed (no per-sensor duplication possible).
- `_attr_unique_id` pattern is uniform across all 5 — HA's entity registry uniqueness requirements honored.

**Notes to 02-04 planner:**
- When adding pytest-homeassistant-custom-component to dev deps, run `.venv/bin/pytest tests/test_sensor.py -v` will light up all 8 sensor tests; no changes to sensor.py itself should be needed.
- If 02-04 discovers any copy-ready code from 02-RESEARCH.md for services.py that uses `# noqa: ARG001` or `asyncio.TimeoutError`/`timezone.utc`, apply the same Rule 1 - Bug fix (see my fix + 02-02's UP041/UP017/F401 deviations for precedent).
- Ruff now covers 6 source files in custom_components/party_dispenser/ (api.py + coordinator.py + entity.py + __init__.py + config_flow.py + sensor.py + const.py) — 02-04 adds services.py making it 8. Total line count of custom_components/party_dispenser/ is ~1000+ LOC of real code.

---

## Self-Check: PASSED

- File `custom_components/party_dispenser/sensor.py` exists (verified: 202 lines)
- Commit `bdc85be` resolves (verified via `git log --oneline`)
- `grep -c "class .*Sensor(PartyDispenserEntity, SensorEntity):" custom_components/party_dispenser/sensor.py` → **5** (matches expected count)
- All 5 class names present: QueueSizeSensor, QueueSummarySensor, MakeableCountSensor, CurrentOrderSensor, RecipesSensor (all FOUND via grep)
- `grep -q "async def async_setup_entry"` → present (line 25)
- `grep -q "entry.runtime_data.coordinator"` → present (line 31)
- `grep -c "translation_key=SENSOR_KEY"` → **5** (every sensor i18n-ready)
- `grep -c "_attr_unique_id"` → **5** (every sensor sets unique_id)
- `grep -c "coordinator.config_entry.entry_id"` → 5 occurrences
- `grep -q "return len(self.coordinator.data.queue)"` → present (QueueSizeSensor.native_value, line 63)
- `grep -q '"Queue empty"'` → present (QueueSummarySensor empty state, line 98)
- `grep -q '"idle"'` → present (CurrentOrderSensor idle state, line 152)
- `grep -q "current_order"` → present (reads PartyDispenserState.current_order property, lines 151 + 157)
- `grep '"ingredients":' custom_components/party_dispenser/sensor.py` → **0 matches** (Open Question 2 compliance: RecipesSensor attrs LIGHT)
- All 5 `SENSOR_KEY_*` imports found (QUEUE_SIZE, QUEUE_SUMMARY, MAKEABLE_COUNT, CURRENT_ORDER, RECIPES)
- `python3 -c "import ast; ast.parse(open(...).read())"` → syntactically valid
- `ruff format --check .` → exit 0
- `ruff check .` → "All checks passed!"
- `pytest tests/` → 27 passed, 0 failed (no regressions from Phase 1 or earlier Phase 2 plans)
- All 5 `entity.sensor.*.name` translation keys present in translations/en.json (queue_size, queue_summary, makeable_count, current_order, recipes)
- `Platform.SENSOR` is in __init__.py::PLATFORMS (confirmed by grep)

---
*Phase: 02-integration-core*
*Completed: 2026-04-20*
