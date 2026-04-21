# Phase 4: Custom Lovelace card — Context

**Gathered:** 2026-04-20
**Status:** Ready for UI research
**Source:** Synthesized from PROJECT.md + REQUIREMENTS.md + existing Vue frontend reference in `ava-organization/party-dispenser/party-dispenser-main:frontend/src/` + HA Lovelace conventions

<domain>
## Phase Boundary

Phase 4 delivers `custom:party-dispenser-card` — a purpose-built Lovelace card that renders the recipe grid, live queue, and summary inside a Home Assistant dashboard. The card calls integration services (Phase 2 delivered these) to place/cancel orders, and reads entity state from the coordinator (Phase 2 polling + Phase 3 WebSocket push combined). This is the final user-facing piece of the plugin.

**In scope:**
- Card source at `www/community/party-dispenser-card/` (placeholder dir scaffolded in Phase 1)
- Tech stack: lit-element 3.x + TypeScript + rollup (HA convention; matches most HACS frontend plugins)
- Build output: single bundled `party-dispenser-card.js` + source map
- Registered as a custom Lovelace card via `window.customCards.push({ type: "party-dispenser-card", ... })`
- Three main sub-components:
  - **Summary header** — queue size + makeable-count chips, live connection indicator (reads `binary_sensor.party_dispenser_connected`)
  - **Recipe grid** — makeable recipes first, disabled tiles for non-makeable, tap = place order (calls `party_dispenser.order_recipe`)
  - **Queue list** — live queue items with current-order highlight, cancel button per item (calls `party_dispenser.cancel_order`)
- Service invocation via HA's websocket API (not direct backend HTTP calls): `hass.callService("party_dispenser", "order_recipe", { recipe_id })`. This matches REQUIREMENT UI-05 (card → HA services → integration → backend).
- Responsive layout: mobile single-column (<600px) and desktop grid (≥600px). Works in HA Companion app on iOS + Android.
- HA theme awareness: use HA's CSS variables (`--primary-color`, `--card-background-color`, `--divider-color`, etc.) — NO hardcoded colors
- Accessible: proper ARIA labels on buttons, keyboard-focusable tiles, sufficient contrast in both light + dark themes
- Card editor / yaml-only: ship a minimal card `getConfigElement` returning a visual config editor (entity picker for the `binary_sensor.party_dispenser_connected` and the 5 sensors)
- HACS frontend category alternative: research to confirm whether to ship (a) as an embedded card served by the integration (integration auto-registers the Lovelace resource at startup — single HACS install) OR (b) as a separate HACS plugin-category repo. Phase 1 research leaned toward (a) but Phase 4 is where we commit.
- Unit tests: `@web/test-runner` or `vitest` (decide in research) — covering render + service-call invocation + state change reactivity

**Out of scope:**
- GitHub mirror CI (Phase 5)
- Real hassfest validation (Phase 5)
- Full README / install docs (Phase 6)
- Multi-dispenser support in card (v2)
- i18n beyond English (v2)
- Historical order log / analytics in card (v2+)
- In-card recipe editing (that's the dispenser's own frontend's job — the HA card is a dashboard, not an admin panel)

</domain>

<decisions>
## Implementation Decisions (research will refine)

### Tech stack (LOCKED — HACS convention)
- `lit-element` ^3.0 (HA ships with lit; matches mushroom, hui-* cards, community plugins)
- TypeScript
- `rollup` + `@rollup/plugin-typescript` + `@rollup/plugin-node-resolve` (the HACS standard)
- Output: `party-dispenser-card.js` (ES module bundle), source map, no minification for initial release (easier debugging)

### Card type name (LOCKED)
`party-dispenser-card` — lowercase, hyphenated, matches the repo directory. Registers via `customElements.define("party-dispenser-card", PartyDispenserCard)`.

### Service calls via HA (LOCKED — REQUIREMENT UI-05)
- Primary path: `this.hass.callService("party_dispenser", "order_recipe", { recipe_id })` — HA handles auth, retries, error surfaces
- NO direct-to-backend fetch() from the browser — avoids CORS, preserves HA auth model
- Exception: if backend exposes a public health endpoint later, the card may show an inline reachability hint — deferred to v2

### Entity read via `hass` prop (LOCKED)
- Card receives `this.hass` from Lovelace (HA convention)
- Reads state from: `hass.states["sensor.party_dispenser_queue_size"]`, `sensor.party_dispenser_queue_summary`, `sensor.party_dispenser_makeable_count`, `sensor.party_dispenser_current_order`, `sensor.party_dispenser_recipes`, `binary_sensor.party_dispenser_connected`
- No direct coordinator access — HA gives us everything via entity states + attributes (recipes are in `sensor.recipes.attributes.recipes`)

### Config shape (LOCKED baseline — research confirms final)
```yaml
type: custom:party-dispenser-card
entity: sensor.party_dispenser_queue_size  # acts as the "device pointer" — optional; if omitted card finds the first party_dispenser entity
title: "Party Dispenser"                   # optional override
show_connection_status: true               # default true
max_recipes_visible: 12                    # optional; truncates recipe grid
```

### HACS distribution path (OPEN — UI researcher to recommend final)
Two paths carried forward from Phase 1 research:
- **(a) Embedded card:** integration registers `/hacsfiles/...` static path and auto-adds `/local/community/party-dispenser-card/party-dispenser-card.js` as a Lovelace resource on `async_setup_entry`. Single HACS install (integration category). User doesn't manually add the resource.
- **(b) Split-repo:** this repo keeps the integration under HACS "integration" category. A SEPARATE repo (e.g., `hacs-card-pd`) goes under HACS "plugin" category. User adds both as custom repositories. Two installs.
Lock the choice in the UI-SPEC. Phase 4 implementation assumes whichever the researcher picks — both are supported by our directory layout.

### Visual direction (LOCKED baseline — UI-SPEC will detail)
Inspiration from the existing dispenser Vue frontend (`ava-organization/party-dispenser/party-dispenser-main:frontend/src/features/recipes/`):
- `RecipesPage.vue` → overall layout: featured carousel + recipe groups
- `FeaturedRecipeCarousel.vue` → horizontal scroller of hero recipes
- `RecipeGroupsList.vue` → grouped-by-collection grid
- Color palette: use HA's `--primary-color` as accent; the dispenser's brand accent is secondary
- Recipe tiles: image (if backend provides) + name + makeable indicator (green dot) + tap to order
- Queue items: chip-style with recipe name + state + cancel X button

### Mobile-first layout (LOCKED)
- <600px: single column, recipe tiles 2-up grid, queue below full-width
- 600–900px: 2-col recipe grid, queue in right rail
- ≥900px: 3–4 col recipe grid, queue right rail sticky
- Test on HA Companion iOS + Android (physical or simulator) — QA acceptance

### Accessibility (LOCKED baseline)
- `aria-label` on all tappable elements
- Recipe tile: `role="button"` + `tabindex="0"`
- Keyboard: Tab to navigate, Enter/Space to activate
- Focus ring visible in both light + dark themes
- Respects `prefers-reduced-motion`
- Contrast ratio ≥ 4.5:1 for text / ≥ 3:1 for icons

### Testing (LOCKED baseline)
- `@web/test-runner` OR `vitest` (UI researcher picks — leaning `@web/test-runner` because it's HA/Lovelace community standard)
- Tests cover: render smoke, recipe tile click → service call invoked, queue cancel button → service call invoked, state change → DOM update, mobile/desktop media query shape
- Target coverage: ≥ 70% on TypeScript source (cards historically don't hit 80% because of custom-elements lifecycle noise)

### Version bump (LOCKED)
- `manifest.json`: `"version": "0.4.0"`
- `const.py`: `VERSION = "0.4.0"`
- `pyproject.toml`: `version = "0.4.0"`
- Tag `v0.4.0` at phase completion
- `tests/test_integration_manifest.py::test_manifest_phase3_overrides` → rename to `test_manifest_phase4_overrides`, flip version assertion to `"0.4.0"` (atomic commit with manifest flip)

### Lessons from Phases 1–3 (LOCKED)
- `ruff format .` + `ruff check .` before every Python commit (Python side may see small const.py/init.py edits)
- Atomic manifest.json + test_integration_manifest.py commits
- If embedded-card path chosen, the integration Python side needs to register a static path via `hass.http.register_static_path(...)` and add the Lovelace resource via `frontend.async_register_built_in_panel` or equivalent — research confirms exact API
- If embedded-card path chosen, card files must be copied to `custom_components/party_dispenser/frontend/` at build time so they ship with the HACS integration-category install

### Research-backed overrides applied (LOCKED)

Added after 04-RESEARCH.md produced (2026-04-20). Supersede any earlier drafts in UI-SPEC:

1. **Defensive `await resources.async_load()` before `async_create_item` in Python static-path registration.** HA core issue #165767 (fix PR #165773 merged 2026-04-10) — pre-fix versions silently DESTROY all existing Lovelace resources on `async_create_item` without `async_load` first. Our CI pins HA 2026.2.3 via pytest-HA-custom, which is the buggy version. Cost: 1 extra line. Risk of omission: user loses every Lovelace resource in their dashboard on first integration load.
2. **Node 22-alpine for GitLab CI card-build stage**, with `mcr.microsoft.com/playwright:v1.x-jammy` fallback documented in the `.gitlab-ci.yml` commentary if Alpine Chromium's V8 coverage API proves unreliable on the self-hosted runner.
3. **`tsconfig.json`** — `"useDefineForClassFields": false` + `"experimentalDecorators": true` — required for lit's legacy decorator system. UI-SPEC didn't specify; research does.
4. **`rollup-plugin-copy 3.5.0`** for copying the built bundle from `www/community/party-dispenser-card/dist/` → `custom_components/party_dispenser/frontend/` at build time.
5. **`eslint` deferred to Phase 6 polish.** Phase 4 CI uses `tsc --noEmit` as the `lint` step. UI-SPEC §15.7 mentioned eslint without a config; rather than invent one now, we typecheck only.
6. **`dist/` NOT committed.** Source-controlled files: `www/community/party-dispenser-card/src/` + config + tests. Build output: `custom_components/party_dispenser/frontend/party-dispenser-card.js` + `.js.map` (these ARE committed, because Python serves them and CI builds once per release). `www/community/party-dispenser-card/dist/` is `.gitignore`'d (already is — Phase 1 set this).

### Claude's Discretion
- Final component tree (single big card vs. nested child components)
- State management inside the card (plain reactive properties vs. a central mini-store)
- Build tool choice details (rollup plugins list)
- Icon set (mdi:* via HA's built-in icons vs. custom SVG)
- Animation specs (subtle pulse on new queue item?)
- Dark-mode testing approach

</decisions>

<canonical_refs>
## Canonical References

**UI researcher MUST read these before producing UI-SPEC.md.**

### Project context (internal)
- `.planning/PROJECT.md` — Vision, core value
- `.planning/REQUIREMENTS.md` — Phase 4 covers HACS-03, UI-01..07, QA-03
- `.planning/ROADMAP.md` — Phase 4 goal + 6 success criteria
- `.planning/phases/01-foundation-hacs-scaffolding/01-RESEARCH.md` — Phase 1 researched the HACS embedded-card-vs-split-repo tradeoff; read its "State of the Art" + related sections for prior context
- `.planning/phases/02-integration-core/02-SUMMARY.md` — Phase 2 delivered the services the card calls
- `.planning/phases/03-realtime-push/03-01-SUMMARY.md` + `03-02-SUMMARY.md` — Phase 3 delivered `binary_sensor.party_dispenser_connected` + WS-driven sensor updates
- `custom_components/party_dispenser/services.py` — the 3 services the card calls
- `custom_components/party_dispenser/sensor.py` — the 5 sensor entity_ids + their attribute shapes
- `custom_components/party_dispenser/binary_sensor.py` — the connection indicator
- `www/community/party-dispenser-card/` — placeholder dir from Phase 1 (just README + .gitkeep)

### External reference: existing Party Dispenser Vue frontend
Located in `ava-organization/party-dispenser/party-dispenser-main:frontend/src/` on `gitlab.paskiemgmt.com`. Use `glab api --hostname gitlab.paskiemgmt.com "projects/11/repository/files/<url-encoded-path>/raw?ref=main"` to read:
- `frontend/src/App.vue` — overall shell / nav
- `frontend/src/features/recipes/RecipesPage.vue` — layout
- `frontend/src/features/recipes/FeaturedRecipeCarousel.vue` — hero tile pattern
- `frontend/src/features/recipes/RecipeGroupsList.vue` — grid of grouped recipes
- `frontend/src/features/recipes/types.ts` — TS types we can mirror (Recipe, Order, etc.)
- `frontend/src/components/*.vue` — dialog / form patterns
- `frontend/src/style.css` + `frontend/src/assets/` — color palette, typography, spacing tokens — INSPIRATION ONLY (HA card must use HA CSS vars for theme awareness; this just guides hierarchy and brand feel)

### HA + Lovelace card reference (external)
- Lovelace custom card docs: https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card
- HA frontend's lit repo examples: https://github.com/home-assistant/frontend
- Official community card conventions (mushroom cards as exemplar): https://github.com/piitaya/lovelace-mushroom
- HACS frontend plugin docs: https://www.hacs.xyz/docs/publish/plugin/
- HA CSS variables: https://developers.home-assistant.io/docs/frontend/data/theme
- `customCards` registration: https://developers.home-assistant.io/docs/frontend/custom-ui/registering-resources

### Accessibility reference
- WAI-ARIA Authoring Practices 1.3 — Button pattern
- HA accessibility guidelines: https://developers.home-assistant.io/docs/frontend/accessibility

</canonical_refs>

<specifics>
## Specific Ideas to Probe in UI Research

**Component hierarchy (researcher to lock):**
- `<party-dispenser-card>` — root, receives `hass` + `config` from Lovelace
- `<pd-summary-header>` — chips for queue size, makeable count, connection state
- `<pd-recipe-grid>` — recipe tiles in responsive grid
- `<pd-recipe-tile>` — single recipe (image, name, makeable dot, tap-to-order)
- `<pd-queue-list>` — list of current queue items
- `<pd-queue-item>` — single queue item (recipe, state, cancel X)

**State shape (flowing down from `hass`):**
```ts
{
  queue: QueueItem[];           // from sensor.party_dispenser_recipes attrs
  recipes: Recipe[];            // from sensor.party_dispenser_recipes attrs
  queueSize: number;            // from sensor.party_dispenser_queue_size
  makeableCount: number;        // from sensor.party_dispenser_makeable_count
  currentOrder: QueueItem|null; // from sensor.party_dispenser_current_order
  connected: boolean;           // from binary_sensor.party_dispenser_connected
}
```

**Interaction specs:**
- Tap recipe tile → `hass.callService("party_dispenser", "order_recipe", { recipe_id: r.id })` → optimistic "queued" chip appears; WS push fires within ~200ms replacing optimistic state with real
- Tap queue cancel → `hass.callService("party_dispenser", "cancel_order", { order_id: q.id })` → item fades out; WS push confirms
- Long-press recipe tile (future v2) → show customize sheet — deferred
- Swipe left on queue item (mobile) → cancel shortcut — nice-to-have, defer to researcher

**Empty states:**
- No recipes → "No recipes configured. Open the dispenser app to add some."
- No queue → "Queue empty. Pick a recipe below to get started."
- Disconnected → gray-out queue + disable tiles + show "Reconnecting..." in header

**Loading / skeleton:**
- Initial load (before first coordinator fetch): show skeleton placeholders for 4 recipe tiles + 2 queue slots
- Subsequent: no skeleton, just smooth state transitions

**Animation:**
- New queue item: slide-in from top (250ms, ease-out)
- Cancelled queue item: fade-out (200ms, ease-in)
- Recipe tile state change (makeable ↔ not): brief pulse on the dot indicator
- Respect `prefers-reduced-motion: reduce` → disable slide/fade, use opacity snap

</specifics>

<deferred>
## Deferred

- Multi-dispenser routing in card (pick which Party Dispenser to target) → v2, MULTI-02
- Voice / conversation agent hooks → v2 UX-01
- Themes/skins for card → v2 UX-03
- In-card recipe editing (admin) → out of scope (dispenser's own frontend owns this)
- Recipe images from backend → nice-to-have, researcher to decide MVP vs. defer
- Long-press customize sheet → v2
- Swipe-to-cancel on mobile → researcher decides MVP vs. Phase 6 polish

---

*Phase: 04-custom-lovelace-card*
*Context gathered: 2026-04-20*
