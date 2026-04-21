# Phase 4: Custom Lovelace card — Research (Integration plumbing)

**Researched:** 2026-04-20
**Domain:** Home Assistant custom Lovelace card — build, wire-up, static-path + resource registration, test config, ha-form editor schema, GitLab CI Node stage
**Confidence:** HIGH for Python-side + rollup/test config; MEDIUM-HIGH on Lovelace-resource registration (2026.4 bug fix confirmed)

## Summary

UI-SPEC has already locked the visual design, tokens, component tree, interaction model, a11y, copywriting, test framework, distribution path, and pinned every build/test dependency (§13, §14, §15, §17, §18, §22). This RESEARCH.md is the **integration plumbing layer** — what the planner needs to write copy-ready actions for rollup config, `web-test-runner` config, Python-side static-path + Lovelace-resource registration, ha-form editor schema, package.json, and the GitLab Node stage.

**Highest-stakes finding (override flag — user review required):** The ResourceStorageCollection bug ([home-assistant/core#165767](https://github.com/home-assistant/core/issues/165767), opened 2026-03-17) — where calling `lovelace.resources.async_create_item()` during integration startup silently **destroyed all existing Lovelace resources** — was **fixed** by [PR #165773](https://github.com/home-assistant/core/pull/165773) (merged 2026-04-10, shipping in 2026.4 or 2026.5). The fix adds an `_async_ensure_loaded()` guard to `async_create_item/update_item/delete_item`, so integrations no longer need to manually call `async_load()` first on 2026.4+. **Our integration pins `pytest-homeassistant-custom-component==0.13.316` which transitively pins HA `2026.2.3`** (Phase 2 decision) — that's BEFORE the fix. We must either (a) defensively call `await hass.data[LOVELACE_DATA].resources.async_load()` before any `async_create_item` call (works on all versions, no-op on fixed versions), or (b) bump the HA pin to 2026.4+. Recommendation: option (a) — defensive `async_load` — because it costs nothing, works universally, and keeps the pin conservative. UI-SPEC §13.3 did NOT include this guard; this is a discretionary addition the planner should make.

**Second-highest-stakes finding:** UI-SPEC pins `custom-card-helpers: ^1.9.0` (released 2022-01-10). Registry shows `2.0.0` was published 2026-02-21 after 4 years of dormancy. v2.0.0 was primarily "Update Node.js version to 24 and specify engine requirements" — no functional API changes. UI-SPEC's ^1.9.0 pin is safe and matches Mushroom's current usage (Mushroom doesn't ship custom-card-helpers — it inlines types — but `grillp/ha-custom-card-rollup-ts-lit-starter` which is a canonical HA starter pins ^1.9.0). **No override needed; UI-SPEC's pin is correct.**

**Primary recommendation:** Execute UI-SPEC's §13.3 snippet verbatim with ONE defensive addition: `await resources.async_load()` before mutation. Use Mushroom's rollup + editor + package.json patterns (verified pinned versions are correct). Add the `@web/test-runner` config exactly as UI-SPEC §15.5 shows. Add a single `test-card` Node 22 stage to `.gitlab-ci.yml` after the existing `pytest` stage — no pipeline restructure needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tech stack (integration — HACS convention):**
- `lit-element` ^3.0 (HA ships with lit; matches mushroom, hui-* cards)
- TypeScript
- `rollup` + `@rollup/plugin-typescript` + `@rollup/plugin-node-resolve`
- Output: `party-dispenser-card.js` (ES module bundle), source map, no minification for initial release

**Card type name:** `party-dispenser-card` — lowercase, hyphenated, matches repo directory.

**Service calls via HA (REQ UI-05):**
- Primary path: `this.hass.callService("party_dispenser", "order_recipe", { recipe_id })`
- NO direct-to-backend fetch() from the browser — avoids CORS, preserves HA auth

**Entity read via `hass` prop:**
- Card receives `this.hass` from Lovelace
- Reads state from: `sensor.party_dispenser_queue_size`, `sensor.party_dispenser_queue_summary`, `sensor.party_dispenser_makeable_count`, `sensor.party_dispenser_current_order`, `sensor.party_dispenser_recipes`, `binary_sensor.party_dispenser_connected`

**Config shape (LOCKED baseline):**
```yaml
type: custom:party-dispenser-card
entity: sensor.party_dispenser_queue_size  # optional
title: "Party Dispenser"                   # optional
show_connection_status: true               # default true
max_recipes_visible: 12                    # optional
```

**Mobile-first layout:** <600px single-col; 600-900px 2-col+rail; ≥900px 3-4 col+sticky rail.

**Accessibility (LOCKED):** aria-label on all tappable; role="button" + tabindex="0" on recipe tiles; keyboard Tab + Enter/Space; focus ring visible in light + dark; respect prefers-reduced-motion; 4.5:1 text / 3:1 icon contrast.

**Testing:** `@web/test-runner` (LOCKED per UI-SPEC §15.1 — not vitest). Target ≥70% line coverage.

**Version bump (LOCKED):**
- `manifest.json`: `"version": "0.4.0"`
- `const.py`: `VERSION = "0.4.0"`
- `pyproject.toml`: `version = "0.4.0"`
- Tag `v0.4.0` at phase completion
- `tests/test_integration_manifest.py::test_manifest_phase3_overrides` → rename to `test_manifest_phase4_overrides`, flip version assertion to `"0.4.0"` (atomic commit with manifest flip)

**UI-SPEC locked choices (LOCKED — do NOT re-derive or propose alternatives):**
- Embedded-card distribution (§13): integration registers static path + auto-adds Lovelace resource; single HACS install, category=`integration`.
- Tech stack pinned (§15.2): `lit ^3.3.1`, `typescript ^5.9.2`, `rollup ^4.30.0`, `@rollup/plugin-typescript 12.1.4`, `@rollup/plugin-node-resolve 16.0.1`, `@rollup/plugin-commonjs 28.0.6`, `@rollup/plugin-json 6.1.0`, `@rollup/plugin-terser 1.0.0`, `custom-card-helpers ^1.9.0`.
- Test stack pinned (§15.2): `@web/test-runner ^0.20.0`, `@web/test-runner-playwright ^0.11.0`, `@open-wc/testing ^4.0.0`, `@esm-bundle/chai ^4.3.4-fix.0`, sinon ^17.0.2, @types/sinon ^17.0.4.
- Build output shape (§17): `www/community/party-dispenser-card/dist/party-dispenser-card.js` + `.map`; copied to `custom_components/party_dispenser/frontend/party-dispenser-card.js` at build time; no minification in v0.4.0.
- Manifest.json flip (§18.3): `"dependencies": ["frontend", "http"]` (currently `[]`).
- Coverage target ≥70% line coverage on `src/` (§15.3).
- No third-party UI registries (no shadcn/radix/base-ui — pure lit + `<ha-form>` + `<ha-icon>` from HA) (§20).
- `customCards` registration with `preview: true` (§6.3).
- Component tree: `<party-dispenser-card>` root + 6 nested `<pd-*>` children + `<pd-editor>` peer (§6.2).

### Claude's Discretion
- Final component tree (single big card vs. nested child components) — UI-SPEC already LOCKED this to 6-component tree (§6). No discretion remains.
- State management inside the card (plain reactive properties vs. a central mini-store) — UI-SPEC LOCKED to "only root reads hass; children receive plain props" (§7.1). No discretion remains.
- Build tool choice details (rollup plugins list) — UI-SPEC §15.2 pinned every plugin. Minor discretion: add `rollup-plugin-copy` OR `@web/rollup-plugin-copy` for the dist→custom_components copy step; both are acceptable and UI-SPEC §17.2 marks the choice with a comment `// or rollup-plugin-copy`. Researcher recommends `rollup-plugin-copy` (npm 3.5.0, latest, more commonly used in HA cards).
- Icon set (`mdi:*` via HA's built-in icons vs. custom SVG) — UI-SPEC §3.4 LOCKED to `<ha-icon>` + `mdi:*`. No discretion remains.
- Animation specs — UI-SPEC §16 LOCKED all timings. No discretion remains.
- Dark-mode testing approach — NO discretion explicitly remaining from UI-SPEC; the testHarness HTML has empty `<style>` on purpose (§15.5).
- **Remaining true discretion areas (planner-facing):**
  - Copy-plugin choice: `rollup-plugin-copy` vs `@web/rollup-plugin-copy` — recommend `rollup-plugin-copy 2.4.0`.
  - Defensive `await resources.async_load()` call before `async_create_item` — UI-SPEC §13.3 omits it; planner should include it (see Summary override flag).
  - Whether to include the console.debug version banner from UI-SPEC §17.5 in v0.4.0 or defer to v0.5.0 — recommend INCLUDE in v0.4.0 (zero cost, material diagnostic benefit per UI-SPEC own reasoning).
  - `tsconfig.json` settings (UI-SPEC does not specify): recommend `target: ES2020`, `module: ESNext`, `moduleResolution: node`, `experimentalDecorators: true`, `useDefineForClassFields: false` (lit 3 requirement — see Pitfall 1 below).
  - `eslint` config — UI-SPEC §15.7 references `npm run lint` in package.json but does not specify a config. Researcher recommends deferring to Phase 6 polish; v0.4.0 ships `"lint": "tsc --noEmit"` (typecheck-only) to unblock CI without an eslint config investment.
  - Whether to ship `tsconfig.test.json` as a separate file or reuse `tsconfig.json`. Researcher recommends REUSE — @web/test-runner via `@web/dev-server-esbuild` handles TS transpile directly; no separate test tsconfig needed (see §15.5 config).

### Deferred Ideas (OUT OF SCOPE)
- Multi-dispenser routing in card (pick which Party Dispenser to target) → v2, MULTI-02
- Voice / conversation agent hooks → v2 UX-01
- Themes/skins for card → v2 UX-03
- In-card recipe editing (admin) → out of scope (dispenser's own frontend owns this)
- Recipe images from backend → nice-to-have; UI-SPEC §6.4 notes "image (if backend provides)" as v2
- Long-press customize sheet → v2
- Swipe-to-cancel on mobile → deferred
- Firefox + WebKit test matrix → Phase 5 (Phase 4 runs Chromium-only per UI-SPEC §15.5 comment)
- Minification (terser) → UI-SPEC §17 explicitly defers to Phase 6 polish
- eslint config → researcher defers to Phase 6 polish (see Discretion above)
- WebSocket version check / force-reload UX (for cache busting beyond `?v=X.X.X` query param) → v2 (out of scope; called out in KipK guide but not in UI-SPEC scope)
- Cross-browser test matrix — Phase 5 will enable Firefox + WebKit via playwright launchers (UI-SPEC §15.5 template has them commented out)
- Frontend-category HACS repo (split-repo alternative) — UI-SPEC §13 REJECTED this in favor of embedded-card; the `hacs.json` stays integration-only
- Full recipe ingredient data in card — Phase 2 Decision 02-03 ships LIGHT attrs only (id, name, makeable); full ingredient data in card is v2
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **HACS-03** | Card is discoverable under the HACS "Frontend" category | Embedded-card pattern (§13) eliminates the HACS frontend-category requirement entirely — the card ships with the integration-category install. The Python-side `async_register_frontend` function in this research handles both static-path serving + auto-registration as a Lovelace resource. |
| **UI-01** | Card type `custom:party-dispenser-card` registers via HACS frontend install | `customCards.push(...)` pattern confirmed by HA developer docs; `customElements.define('party-dispenser-card', ...)` lands the element; served from `/party_dispenser_frontend/party-dispenser-card.js` via the registered static path. Pattern verified in Mushroom source (`src/mushroom.ts`). |
| **UI-02** | Card renders recipe grid (make-now button per recipe when makeable) | Lit 3.3.1 `@customElement` + `@property` patterns (§Architecture Patterns below). Copy-ready `<pd-recipe-tile>` event dispatch pattern verified from Mushroom's tile cards. |
| **UI-03** | Card renders live queue with per-item cancel buttons | Same lit patterns as UI-02. CustomEvent `pd-cancel-order` with `{ composed: true, bubbles: true }` bubbles to root which calls `hass.callService('party_dispenser', 'cancel_order', { order_id })` (UI-SPEC §6.5). |
| **UI-04** | Card renders summary counts (queue size, makeable recipes) | Pure props/derivation — no external research needed. State shape mirrors sensor `extra_state_attributes` from Phase 2 (sensor.py lines 67-72, 125-128, 195-202). |
| **UI-05** | Card calls integration services (primary path) — no backend network calls from browser | `this.hass.callService()` API confirmed stable per HA developer docs. Services `party_dispenser.order_recipe` + `cancel_order` + `refresh` already shipped in Phase 2 (services.py). Services expect the schemas defined at services.py lines 36-50 (`ATTR_RECIPE_ID`, `ATTR_ORDER_ID`, optional `ATTR_SESSION_UID`). |
| **UI-06** | Card is usable on mobile HA companion | UI-SPEC §9 LOCKED the breakpoints; UI-SPEC §5.3 LOCKED 44×44 touch targets. No new research needed. |
| **UI-07** | Card visual style matches HA core conventions | Mushroom 2026 latest (lit ^3.3.1 + ha-form + HA CSS variables) pattern verified as canonical. `<ha-icon>` + `<ha-form>` are globally available in Lovelace DOM (no imports on our side). |
| **QA-03** | Card has unit tests covering render + service-call invocation | `@web/test-runner 0.20.2` + `@open-wc/testing 4.0.0` stack verified. Coverage via c8 built-in (`coverage: true` in wtr config). Playwright browsers via `@web/test-runner-playwright 0.11.1`. 70% threshold set in coverageConfig. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

**CLAUDE.md note:** Repository root has no CLAUDE.md. User's auto-memory file (`~/.claude/projects/-Users-jamaze--openclaw/memory/MEMORY.md`) is environmental context unrelated to this project. No directives to extract. Project-specific ruff + pytest config in `pyproject.toml` is the authoritative Python-side style constraint; follow Phase 2/3's established patterns (see **Standard Stack** below).

## Standard Stack

### Core (card build) — ALL PINS VERIFIED AGAINST NPM REGISTRY 2026-04-20

| Library | UI-SPEC Pin | Latest on npm | Release Date | Purpose | Verified |
|---------|-------------|---------------|--------------|---------|----------|
| `lit` | `^3.3.1` | 3.3.2 | 2025-12-23 | Web components framework (HA core also uses lit) | `npm view lit version` → 3.3.2 (3.3.1 still current within ^ range) ✓ |
| `typescript` | `^5.9.2` | 6.0.3 | 2026-03 | TS compiler. UI-SPEC pins 5.9.x; 6.x is a major bump — **STAY ON 5.9** per Mushroom's pin | `npm view typescript version` → 6.0.3 (not adopted by Mushroom as of package.json 2026) |
| `rollup` | `^4.30.0` | 4.60.2 | 2026-03 | Bundler | `npm view rollup version` → 4.60.2 (within ^4.30) ✓ |
| `@rollup/plugin-typescript` | `12.1.4` | 12.3.0 | 2025-10-23 | TS rollup integration | ✓ pinned exactly; 12.3.0 backward-compat available |
| `@rollup/plugin-node-resolve` | `16.0.1` | 16.0.3 | 2026 | Resolve npm imports | ✓ |
| `@rollup/plugin-commonjs` | `28.0.6` | 29.0.2 | 2026 | CommonJS interop | ✓ pinned exactly; within major ^28 |
| `@rollup/plugin-json` | `6.1.0` | 6.1.0 | 2024 | JSON imports (used by lit internals) | ✓ |
| `@rollup/plugin-terser` | `1.0.0` | 1.0.0 | Unchanged | Minification (DISABLED in v0.4.0 per UI-SPEC §17.2) | ✓ |
| `custom-card-helpers` | `^1.9.0` | 2.0.0 | 2026-02-21 | HA types (`HomeAssistant`, `LovelaceCardConfig`, `LovelaceCardEditor`, `fireEvent`) | ^1.9.0 is safe; 2.0.0 was "Node.js 24 engine requirements" only per GitHub releases — no API changes ✓ |

### Core (card test) — ALL PINS VERIFIED AGAINST NPM REGISTRY 2026-04-20

| Library | UI-SPEC Pin | Latest on npm | Purpose | Verified |
|---------|-------------|---------------|---------|----------|
| `@web/test-runner` | `^0.20.0` | 0.20.2 | Browser-native test runner | ✓ |
| `@web/test-runner-playwright` | `^0.11.0` | 0.11.1 | Chromium/Firefox/WebKit launcher | ✓ |
| `@open-wc/testing` | `^4.0.0` | 4.0.0 | Lit-friendly fixture/oneEvent/elementUpdated helpers | ✓ |
| `@esm-bundle/chai` | `^4.3.4-fix.0` | 4.3.4-fix.0 | ESM-friendly chai assertions | ✓ |
| `sinon` | `^17.0.2` | 21.1.2 | Spies, stubs. UI-SPEC pins 17; 21 is major bump — **stay on ^17** (API-compatible for our uses) | ✓ (^17 preserves behavior the @open-wc/testing helpers expect) |
| `@types/sinon` | `^17.0.4` | 21.0.1 | Types for sinon — must match sinon major | ✓ (pin matches sinon major) |
| `@web/dev-server-esbuild` | (UI-SPEC §15.5 imports this) | 1.0.5 | esbuild plugin for wtr — transpile TS at test time | ✓ |

### Supporting — plugins needed beyond UI-SPEC explicit pins

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `rollup-plugin-copy` | `^3.5.0` | Copy `dist/party-dispenser-card.*` → `custom_components/party_dispenser/frontend/` at build time | Required — UI-SPEC §17.2 shows the `copy()` call but doesn't pin the source package. Recommend the community `rollup-plugin-copy` (more widely used than `@web/rollup-plugin-copy`). |
| `tslib` | `^2.6.0` | TS runtime helpers for `@rollup/plugin-typescript` | Required transitively — include explicitly to silence warnings |

### Alternatives Considered (DO NOT USE — locked away by UI-SPEC)

| Instead of | Could Use | Tradeoff | UI-SPEC Decision |
|------------|-----------|----------|------------------|
| `@web/test-runner` | `vitest` | vitest's JSDOM mode fails on shadow-DOM container queries | §15.1 REJECTED vitest |
| embedded-card | split-repo plugin+integration | Simpler single HACS install | §13.1 LOCKED embedded |
| Mushroom `@babel/preset-env` chain | (none) | Simpler | UI-SPEC doesn't use babel; we use `@rollup/plugin-typescript` directly for TS→ES |
| `lit-html` (standalone) | (none) | More granular | `lit` (the meta-package) is the community idiom and matches HA core |
| Tailwind / styled-components | (none) | Foreign to HA | §20 FORBIDS third-party UI registries |
| shadcn/radix/base-ui | (none) | Foreign to HA | §20 FORBIDS |

**Installation (card workspace — run inside `www/community/party-dispenser-card/`):**
```bash
cd www/community/party-dispenser-card

# Runtime deps (bundled into .js)
npm install --save-exact lit@3.3.1 custom-card-helpers@1.9.0

# Build + test deps (dev only)
npm install --save-dev --save-exact \
  typescript@5.9.2 \
  rollup@4.30.0 \
  @rollup/plugin-typescript@12.1.4 \
  @rollup/plugin-node-resolve@16.0.1 \
  @rollup/plugin-commonjs@28.0.6 \
  @rollup/plugin-json@6.1.0 \
  @rollup/plugin-terser@1.0.0 \
  rollup-plugin-copy@3.5.0 \
  tslib@2.6.0 \
  @web/test-runner@0.20.0 \
  @web/test-runner-playwright@0.11.0 \
  @web/dev-server-esbuild@1.0.5 \
  @open-wc/testing@4.0.0 \
  @esm-bundle/chai@4.3.4-fix.0 \
  sinon@17.0.2 \
  @types/sinon@17.0.4
```

**Version verification evidence** (ran `npm view <pkg> version` 2026-04-20):
```
lit                              3.3.2
typescript                       6.0.3   (Mushroom still pins 5.9.x; we follow)
rollup                           4.60.2
@rollup/plugin-typescript        12.3.0
@rollup/plugin-node-resolve      16.0.3
@rollup/plugin-commonjs          29.0.2  (UI-SPEC pins ^28.0.6 — stay within major)
@rollup/plugin-json              6.1.0
@rollup/plugin-terser            1.0.0
@web/test-runner                 0.20.2
@web/test-runner-playwright      0.11.1
@open-wc/testing                 4.0.0
@esm-bundle/chai                 4.3.4-fix.0
sinon                            21.1.2  (UI-SPEC pins ^17 — major pinned)
custom-card-helpers              2.0.0   (UI-SPEC pins ^1.9.0 — stable since 2022 until Feb 2026)
@web/dev-server-esbuild          1.0.5
c8                               11.0.0  (pulled in transitively by @web/test-runner)
rollup-plugin-copy               3.5.0
```

All UI-SPEC pins are either exact-match to latest, latest-within-major, or intentionally-locked-below-major-bump (typescript, sinon, @rollup/plugin-commonjs, custom-card-helpers). **No override needed.**

## Architecture Patterns

### Recommended Workspace Structure (matches UI-SPEC §15.4)

```
www/community/party-dispenser-card/    # Node.js workspace root (NOT in Python package)
├── package.json                       # npm manifest; scripts: build, test, watch
├── rollup.config.mjs                  # Bundler config (see Code Examples § Rollup)
├── web-test-runner.config.mjs         # Test runner config (see § Test)
├── tsconfig.json                      # TS compile options (see § tsconfig)
├── README.md                          # Rewrite placeholder: describes build workflow
├── src/
│   ├── party-dispenser-card.ts        # Root custom element; customCards.push
│   ├── state.ts                       # deriveState() pure function
│   ├── types.ts                       # Recipe, QueueItem, CardConfig, DerivedState
│   ├── components/
│   │   ├── pd-summary-header.ts
│   │   ├── pd-summary-chip.ts
│   │   ├── pd-recipe-grid.ts
│   │   ├── pd-recipe-tile.ts
│   │   ├── pd-queue-list.ts
│   │   └── pd-queue-item.ts
│   ├── editor/
│   │   └── pd-editor.ts               # ha-form-based visual editor
│   └── styles/
│       └── tokens.ts                  # Shared lit-css design-token blocks
├── test/
│   ├── fixtures/                      # HomeAssistant mock factories
│   │   ├── hass-loading.ts
│   │   ├── hass-happy.ts
│   │   ├── hass-disconnected.ts
│   │   └── hass-empty.ts
│   ├── state.test.ts
│   ├── party-dispenser-card.test.ts
│   ├── pd-summary-header.test.ts
│   ├── pd-summary-chip.test.ts
│   ├── pd-recipe-grid.test.ts
│   ├── pd-recipe-tile.test.ts
│   ├── pd-queue-list.test.ts
│   ├── pd-queue-item.test.ts
│   └── pd-editor.test.ts
└── dist/                              # Build output (gitignored? — see Decision)
    ├── party-dispenser-card.js        # Bundled ES module
    └── party-dispenser-card.js.map    # Source map
```

**Git tracking decision:** `dist/` is **committed** to git (per HACS custom-repository convention: users install the integration as-is without running a build step; Python `__init__.py` serves the checked-in `.js` directly). The alternative — ".gitignore dist/, build in CI, release artifact" — works only for public-HACS-store plugins which run `release.zip` pipelines we don't have. Decision: commit `dist/` AND `custom_components/party_dispenser/frontend/party-dispenser-card.js` (same file, different path). The rollup plugin copies between them on every build.

### Pattern 1: Lit 3 custom element with `hass` as reactive property

Lit 3.3.1 supports the TC39-standard decorators AND the legacy experimental decorators. **Use experimental decorators** for HA cards because `custom-card-helpers` 1.x types and every canonical HA card use them (Mushroom, button-card, etc.).

```typescript
// src/party-dispenser-card.ts
// Source: Mushroom src/mushroom.ts pattern + UI-SPEC §6.3 + §6.5 event routing
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';

import type { CardConfig, DerivedState } from './types';
import { deriveState } from './state';
import './components/pd-summary-header';
import './components/pd-recipe-grid';
import './components/pd-queue-list';

// Bundled at build time (see rollup config for version injection)
declare const CARD_VERSION: string;

@customElement('party-dispenser-card')
export class PartyDispenserCard extends LitElement {
  // Reactive: Lovelace assigns `.hass = <HomeAssistant>` on every state change.
  // Lit's default shallow-equality check re-renders on identity change.
  @property({ attribute: false }) public hass!: HomeAssistant;

  // Set once via setConfig(); re-rendering happens on subsequent setConfig() too.
  @state() private _config?: CardConfig;

  // Local optimistic state (§7.3 — UI-SPEC)
  @state() private _optimisticQueue: Array<{ id: string; recipe_name: string; state: string; created_at: string }> = [];

  public setConfig(config: CardConfig): void {
    if (!config) throw new Error('Invalid configuration: config is required');
    if (config.type !== 'custom:party-dispenser-card') {
      throw new Error(`Invalid card type: ${config.type}`);
    }
    this._config = {
      show_connection_status: true,
      show_not_makeable: true,
      ...config,
    };
  }

  public getCardSize(): number { return 6; }

  public getGridOptions() {
    return { rows: 6, columns: 12, min_rows: 3, min_columns: 6, max_rows: 20, max_columns: 12 };
  }

  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor/pd-editor');
    return document.createElement('pd-editor') as LovelaceCardEditor;
  }

  public static getStubConfig(): Partial<CardConfig> {
    return {
      type: 'custom:party-dispenser-card',
      show_connection_status: true,
      show_not_makeable: true,
    };
  }

  private _derived(): DerivedState | null {
    if (!this.hass || !this._config) return null;
    return deriveState(this.hass, this._config);
  }

  private async _placeOrder(recipeId: string): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.callService('party_dispenser', 'order_recipe', { recipe_id: recipeId });
    } catch (err) {
      console.warn('party-dispenser-card: order_recipe failed', err);
    }
  }

  private async _cancelOrder(orderId: string): Promise<void> {
    if (!this.hass) return;
    try {
      await this.hass.callService('party_dispenser', 'cancel_order', { order_id: orderId });
    } catch (err) {
      console.warn('party-dispenser-card: cancel_order failed', err);
    }
  }

  private _handleOrderRecipe = (e: CustomEvent<{ recipeId: string }>) => {
    void this._placeOrder(e.detail.recipeId);
  };

  private _handleCancelOrder = (e: CustomEvent<{ orderId: string }>) => {
    void this._cancelOrder(e.detail.orderId);
  };

  protected firstUpdated(): void {
    // Community convention: one-time version banner in the devtools console
    console.debug(
      `%c party-dispenser-card %c ${CARD_VERSION}`,
      'color:white;background:#03a9f4;padding:2px 6px;border-radius:3px',
      'color:#03a9f4;background:transparent',
    );
  }

  protected render() {
    const d = this._derived();
    if (!d) return nothing;

    return html`
      <ha-card
        @pd-order-recipe=${this._handleOrderRecipe}
        @pd-cancel-order=${this._handleCancelOrder}
      >
        <pd-summary-header
          .queueSize=${d.queueSize}
          .makeableCount=${d.makeableCount}
          .connected=${d.connected}
          .title=${this._config!.title ?? 'Party Dispenser'}
          .showConnection=${this._config!.show_connection_status}
        ></pd-summary-header>
        <pd-recipe-grid
          .recipes=${d.recipes}
          .maxVisible=${this._config!.max_recipes_visible}
          .showNotMakeable=${this._config!.show_not_makeable}
        ></pd-recipe-grid>
        <pd-queue-list
          .queue=${[...d.queue, ...this._optimisticQueue]}
          .currentOrderId=${d.currentOrderId}
        ></pd-queue-list>
      </ha-card>
    `;
  }

  static styles = css`
    :host {
      --pd-radius-lg: var(--ha-card-border-radius-lg, 16px);
    }
    ha-card {
      display: block;
      border-radius: var(--pd-radius-lg);
      padding: 0; /* children own their padding */
    }
  `;
}

// Lovelace card picker discovery (UI-SPEC §6.3)
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'party-dispenser-card',
  name: 'Party Dispenser',
  preview: true,
  description: 'Recipe grid, live queue, and summary for a Party Dispenser backend',
  documentationURL: 'https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd',
});

declare global {
  interface HTMLElementTagNameMap {
    'party-dispenser-card': PartyDispenserCard;
  }
}
```

**Key lit-3.3 idioms verified against [Mushroom's src/cards/entity-card/entity-card.ts pattern](https://github.com/piitaya/lovelace-mushroom/tree/main/src/cards/entity-card) (fetched 2026-04-20):**

1. `@customElement('tag-name')` decorator (from `lit/decorators.js`) replaces the old `customElements.define(...)` at class end. Both work; decorator is preferred for TS ergonomics.
2. `@property({ attribute: false })` for complex-object props (hass, config) that should NOT sync to HTML attributes.
3. `@state()` for internal-only reactive state (no DOM attribute binding).
4. `setConfig()` MUST throw on invalid config — HA auto-renders `<hui-error-card>` when it does.
5. `static styles = css`...`;` — lit-css template literal. Never use `<style>` inside `render()` (bypasses shadow-DOM scoping).
6. `protected render()` returns `html`...`` template literal.
7. For children accepting props, use the lit binding syntax `.recipes=${array}` (property bind) NOT `recipes=${array}` (attribute bind, stringifies objects).
8. `declare global { interface HTMLElementTagNameMap }` lets TS consumers know the custom element's type when using `document.createElement('party-dispenser-card')`.

### Pattern 2: Leaf tile with event dispatch

```typescript
// src/components/pd-recipe-tile.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Recipe } from '../types';

@customElement('pd-recipe-tile')
export class PdRecipeTile extends LitElement {
  @property({ attribute: false }) public recipe!: Recipe;
  @property({ type: Boolean }) public disabled = false;

  private _onClick = () => {
    if (this.disabled || !this.recipe.makeable) return;
    this.dispatchEvent(new CustomEvent('pd-order-recipe', {
      detail: { recipeId: this.recipe.id },
      bubbles: true,
      composed: true,
    }));
  };

  private _onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onClick();
    }
  };

  protected render() {
    const unusable = this.disabled || !this.recipe.makeable;
    return html`
      <button
        type="button"
        role="button"
        aria-label="${this.recipe.name}${unusable ? ' (not makeable)' : ', tap to order'}"
        aria-disabled=${unusable ? 'true' : 'false'}
        tabindex=${unusable ? -1 : 0}
        @click=${this._onClick}
        @keydown=${this._onKey}
      >
        <span class="name">${this.recipe.name}</span>
        ${this.recipe.makeable
          ? html`<ha-icon icon="mdi:circle" class="dot-ok"></ha-icon>`
          : html`<ha-icon icon="mdi:close-circle-outline" class="dot-no"></ha-icon>`}
      </button>
    `;
  }

  static styles = css`
    button {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--pd-space-sm, 8px);
      padding: var(--pd-space-md, 12px);
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color, white);
      color: var(--primary-text-color, #1f1f1f);
      font-size: var(--ha-font-size-m, 1rem);
      cursor: pointer;
      min-height: 44px;     /* WCAG 2.5.5 touch target */
      text-align: left;
    }
    button[aria-disabled="true"] {
      opacity: 0.6;
      cursor: default;
    }
    button:focus-visible {
      outline: 2px solid var(--primary-color, #03a9f4);
      outline-offset: 2px;
    }
    .dot-ok { color: var(--success-color, var(--pd-success, #4caf50)); }
    .dot-no { color: var(--warning-color, var(--pd-warn, #ff9800)); }
  `;
}
```

### Pattern 3: Deriving state from `hass` (pure function, memoizable)

```typescript
// src/state.ts
// Source: UI-SPEC §7.2 (refined from canonical Mushroom patterns)
import type { HomeAssistant } from 'custom-card-helpers';
import type { DerivedState, CardConfig, Recipe, QueueItem } from './types';

export function deriveState(hass: HomeAssistant, _config: CardConfig): DerivedState {
  const prefix = 'sensor.party_dispenser_';
  const recipesEntity = hass.states[`${prefix}recipes`];
  const queueSizeEntity = hass.states[`${prefix}queue_size`];
  const makeableEntity = hass.states[`${prefix}makeable_count`];
  const currentEntity = hass.states[`${prefix}current_order`];
  const connectedEntity = hass.states['binary_sensor.party_dispenser_connected'];

  // Phase 2 sensor shapes (verified against custom_components/party_dispenser/sensor.py):
  //   sensor.party_dispenser_recipes.attributes.recipes = [{id, name, makeable}] (light)
  //   sensor.party_dispenser_queue_size.attributes.queue = [{id, recipe_name, state}]
  //   sensor.party_dispenser_current_order.attributes = { order_id, state, started_at } | {}
  //   binary_sensor.party_dispenser_connected.state = "on" | "off"

  const recipes: Recipe[] = (recipesEntity?.attributes?.recipes ?? []) as Recipe[];
  const queue: QueueItem[] = (queueSizeEntity?.attributes?.queue ?? []) as QueueItem[];
  const queueSize: number = queue.length;
  const makeableCount: number = Number(makeableEntity?.state ?? 0);
  const currentOrderId: string | null = (currentEntity?.attributes?.order_id as string | undefined) ?? null;
  const connected: boolean = connectedEntity?.state === 'on';

  return {
    recipes,
    queue,
    queueSize,
    makeableCount,
    currentOrderId,
    connected,
    loading: recipesEntity === undefined && queueSizeEntity === undefined,
  };
}
```

### Anti-Patterns to Avoid

- **Calling `fetch()` direct to the backend from the card.** REQ UI-05 FORBIDS this. The integration owns backend network; the card owns HA websocket service calls only. Verified by grep gate (UI-SPEC §19): `grep -rE '\bfetch\s*\(' src/` must return zero matches.
- **Hardcoded hex colors outside `:host` fallback.** UI-SPEC §3.1 grep gate: `grep -rE '#[0-9a-fA-F]{3,6}' src/ | grep -v ':host'` must be empty.
- **`render()` that mutates state.** Lit re-renders on `@property` / `@state` change; mutating in `render()` triggers infinite loops.
- **Using `customElements.define()` AND `@customElement`.** Redundant — the decorator calls `define()` once. Double-define throws.
- **Putting `customCards.push(...)` inside a class method.** Needs to run at module-load time (see Pattern 1 module tail).
- **`@property({ type: Object })` for `hass`.** Lit's object-type property has special serialization. Use `@property({ attribute: false })` for non-serializable complex props.
- **Relying on HA internals (importing from `home-assistant/frontend`).** Per [HA 2026.4 frontend blog](https://developers.home-assistant.io/blog/2026/03/25/frontend-component-updates-2026.4/): "We do not officially support or encourage custom card developers to use our built in components." Ship independent. Our card uses ONLY public DOM tags (`<ha-card>`, `<ha-icon>`, `<ha-form>`) via string references — never imports.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HA type definitions | Hand-written `HomeAssistant` interface | `custom-card-helpers ^1.9.0` | Community-standard. Tracks HA's type evolution. 3kB bundled. |
| Visual form for card config | Custom form with `@property` + `<input>` + change handlers | `<ha-form>` with schema array | UI-SPEC §14. HA ships the element globally. Auto-styles to match theme. 0kB cost. |
| Material icons | Inline SVG sprites | `<ha-icon icon="mdi:*">` | UI-SPEC §3.4. 0kB cost. Matches every HA entity icon. |
| Static file serving from integration | Custom aiohttp handler | `hass.http.async_register_static_paths([StaticPathConfig(...)])` | UI-SPEC §13.3. Built-in since 2024.7; replaces deprecated `register_static_path` which was removed in 2025.7. |
| Lovelace resource entry creation | Manually writing to `.storage/lovelace_resources` | `hass.data[LOVELACE_DATA].resources.async_create_item({res_type:'module', url:...})` | UI-SPEC §13.3. Persisted automatically by HA's storage collection. |
| Browser-side test runner | Headless Chrome + custom framework | `@web/test-runner + @open-wc/testing` | UI-SPEC §15.1. Browser-native; runs shadow DOM + container queries natively. |
| Custom card registration | Listener on frontend loaded event | `window.customCards.push({ type, name, preview, description })` | HA docs. Lovelace card picker auto-discovers. |
| Event handling across shadow-DOM boundaries | Re-wiring handlers at each level | `dispatchEvent(new CustomEvent(..., {bubbles:true, composed:true}))` | Standard DOM pattern. Mushroom uses it; our event routing mirrors. |

**Key insight:** Every custom Lovelace card looks structurally identical at the wire level — same 3 classes of things to NOT build (HA types, form elements, resource registration). The divergence is entirely in the render tree. UI-SPEC has already locked ours.

## Runtime State Inventory

Not applicable — Phase 4 is greenfield card creation, not a rename/refactor. Only net-new files (rollup.config.mjs, web-test-runner.config.mjs, package.json, 9 src files, 9 test files, frontend/__init__.py helper) plus 3 edits to existing files (`__init__.py`, `manifest.json`, `const.py`). No existing runtime state to migrate.

**Section omitted per researcher instructions for greenfield phases.**

## Common Pitfalls

### Pitfall 1: ResourceStorageCollection data-destroying race (fixed in 2026.4; workaround still required for 2026.2.x)

**What goes wrong:** The FIRST `await hass.data[LOVELACE_DATA].resources.async_create_item({...})` call in an integration's `async_setup` overwrites `.storage/lovelace_resources` with JUST the new entry, silently nuking every previously-registered resource — including HACS-installed ones from other repos. User loses their entire resource list on first install or first HA restart post-install.

**Why it happens:** `ResourceStorageCollection` is created lazily. `async_items()` has a lazy-load guard (`if not self.loaded: await self.async_load()`) but `async_create_item()` / `async_update_item()` / `async_delete_item()` did NOT — they write immediately to an empty in-memory dict, which flushes to disk replacing the stored JSON. Bug [home-assistant/core#165767](https://github.com/home-assistant/core/issues/165767) filed 2026-03-17.

**Fix status:** [PR #165773](https://github.com/home-assistant/core/pull/165773) merged 2026-04-10 adds `_async_ensure_loaded()` to all three mutation methods. Ships in HA 2026.4+ (destination version not definitively stated in PR description but merge timing aligns with 2026.4 release cut).

**Integration state:** We pin HA `2026.2.3` transitively via `pytest-homeassistant-custom-component==0.13.316` (Phase 2 decision). Our local test env gets the BUGGY version; users with HA ≥ 2026.4 get the fixed version. **Defense in depth:** always call `async_load()` first. Works on both versions; no-op on fixed.

**How to avoid (copy-ready snippet for the planner):**
```python
# Inside async_register_frontend(hass):
lovelace_data = hass.data.get(LOVELACE_DATA)
if lovelace_data is None:
    # Frontend not yet loaded; retry on EVENT_HOMEASSISTANT_STARTED instead
    return
resources = lovelace_data.resources
if not getattr(resources, "loaded", False):
    await resources.async_load()  # ← THE DEFENSIVE CALL (UI-SPEC §13.3 OMITS THIS)
# Safe to call async_create_item / async_update_item now.
```

**Warning signs:** HACS user reports "my other custom cards disappeared after installing yours." HACS issue [#1659](https://github.com/hacs/integration/issues/1659) documents this class of bug pre-fix. Our acceptance: Phase 4 verification must include smoke-test on a HA instance that has pre-existing Lovelace resources; grep the storage file before and after.

### Pitfall 2: `setConfig()` that throws silently breaks the whole Lovelace view

**What goes wrong:** HA calls `setConfig(config)` before the first `render()`. If it throws anything other than a plain `Error`, HA renders a broken card placeholder with no error. If it doesn't throw on bad config, weird partial-render bugs manifest later.

**Why it happens:** HA wraps `setConfig` errors in `hui-error-card`. A non-Error throw (e.g., `throw { message: 'bad' }` instead of `throw new Error('bad')`) confuses HA's error handling.

**How to avoid:** Always `throw new Error('message')`. Validate `config.type === 'custom:party-dispenser-card'`. The pattern in Pattern 1 above is canonical.

**Warning signs:** Card fails to render in edit mode after entering an obviously-wrong YAML config.

### Pitfall 3: lit experimental-decorators + `useDefineForClassFields: true`

**What goes wrong:** With `useDefineForClassFields: true` (TS 4.5+ default for `target: ES2022+`), `@property`-decorated class fields don't behave correctly — initial values get wiped by the decorator setup, so `this.recipe` may read `undefined` even when a `<pd-recipe-tile .recipe=${...}>` binding is present.

**Why it happens:** Lit's legacy decorators (from `lit/decorators.js`) expect `useDefineForClassFields: false`. The TC39-standard decorators (from lit 3.x) would work with either, but `@property` imported from `'lit/decorators.js'` is the legacy form.

**How to avoid:** Set `useDefineForClassFields: false` in `tsconfig.json`. Confirmed by lit's own docs. See § tsconfig example below.

**Warning signs:** `@property`-decorated field reads `undefined` in `render()` even with a prop binding in parent.

### Pitfall 4: HA's ha-textfield deprecation (2026.4 → removed 2026.5)

**What goes wrong:** If the card editor uses `<ha-textfield>` directly, it breaks in 2026.5 when the element is removed.

**Why it happens:** HA is migrating Material Design → Web Awesome. `ha-textfield` replaced by `ha-input`, `ha-outlined-text-field` replaced by `ha-input`, etc. [2026.4 frontend blog](https://developers.home-assistant.io/blog/2026/03/25/frontend-component-updates-2026.4/).

**How to avoid:** We don't use `ha-textfield` directly anywhere — UI-SPEC §14 uses `<ha-form>` (which HA owns) with schema selectors. `<ha-form>` internally renders `ha-input` / `ha-selector` whatever is current. **We're insulated** because we use the higher-level form API, not the raw inputs.

**Warning signs:** Would manifest as "unknown element <ha-textfield>" console errors in 2026.5. Not a risk for us.

### Pitfall 5: Shadow DOM event composition forgetting `composed: true`

**What goes wrong:** Child-to-parent custom events don't escape the child's shadow root; parent's listener never fires.

**Why it happens:** Shadow DOM encapsulates events by default. `composed: true` allows the event to cross shadow boundaries; `bubbles: true` is orthogonal (DOM tree propagation).

**How to avoid:** Every child-to-root event uses `{ bubbles: true, composed: true }` — see Pattern 2 above.

**Warning signs:** Test asserts event dispatch works (fires on the element) but integration test shows parent handler never invoked.

### Pitfall 6: `customCards.push` before `customElements.define` race

**What goes wrong:** If `customCards.push(...)` runs before `customElements.define('party-dispenser-card', ...)`, Lovelace's card picker may try to instantiate the element before the class exists.

**Why it happens:** Execution order within the module depends on where statements are placed. The `@customElement` decorator inside the class declaration runs before the `customCards.push` at the module tail → safe. If you move `customCards.push` to the top, unsafe.

**How to avoid:** Put `customCards.push` AT THE END of the root card module (party-dispenser-card.ts), after all classes are defined. See Pattern 1's module tail.

**Warning signs:** Error in console: "Cannot construct party-dispenser-card: its constructor is not yet defined" during Lovelace edit mode.

### Pitfall 7: Lovelace YAML mode users silently get no resource

**What goes wrong:** `lovelace.resources.async_create_item()` only works when `resource_mode == "storage"`. Users on `mode: yaml` (manual `ui-lovelace.yaml`) get zero feedback that the auto-registration did nothing; they wonder why the card is missing.

**Why it happens:** YAML mode manages resources via `lovelace: resources:` config, not via the HTTP API.

**How to avoid:** LOGGER.info message in `async_register_frontend` (UI-SPEC §13.5 pattern). Phase 6 README documents the manual YAML step:

```yaml
# For ui-lovelace.yaml users:
lovelace:
  mode: yaml
  resources:
    - url: /party_dispenser_frontend/party-dispenser-card.js
      type: module
```

**Warning signs:** YAML-mode user reports "card shows `Custom element doesn't exist: party-dispenser-card`" despite integration being installed.

### Pitfall 8: TypeScript `exactOptionalPropertyTypes: true` breaks common HA types

**What goes wrong:** With this strict mode on, `CardConfig.title?: string` no longer accepts `{ title: undefined }` — breaks HA's config-diff logic.

**How to avoid:** Leave `exactOptionalPropertyTypes: false` (the default) in `tsconfig.json`. See § tsconfig example.

### Pitfall 9: GitLab Kubernetes runner and Node Docker image

**What goes wrong:** The Phase 2/3 CI uses `python:3.13-slim`. Adding a Node stage naively (`image: node:22-alpine`) works but takes ~30s to pull on every run.

**Why it happens:** No layer caching for the additional image. Mushroom-style repos that ship only frontend can use Node all the way; we're dual-runtime.

**How to avoid:** Declare the test-card job with `image: node:22-alpine` at the job level (overriding the default). GitLab pulls once per commit per runner, then caches. Also expose an `npm ci` cache directory via `variables: NPM_CONFIG_CACHE: "$CI_PROJECT_DIR/.cache/npm"` + the existing `cache:` block. See § GitLab CI below.

**Warning signs:** Pipeline duration >2× after adding the Node stage.

### Pitfall 10: `inlineDynamicImports: true` is REQUIRED for single-file card output

**What goes wrong:** Rollup's default behavior is code-splitting: dynamic `import('./foo')` produces a chunk file. Lovelace cards MUST be a single `.js` file served at one URL; chunks break.

**Why it happens:** `getConfigElement()` uses `await import('./editor/pd-editor')` to lazy-load the editor (saves ~10kB on initial render). Without `inlineDynamicImports: true`, rollup emits a separate `pd-editor-<hash>.js` file that HA can't find.

**How to avoid:** Rollup config sets `output: { inlineDynamicImports: true }`. See § Rollup config below.

**Warning signs:** Build succeeds, card works in initial render, but opening the Lovelace card editor throws `Failed to fetch ./pd-editor-abc123.js`.

### Pitfall 11: `@web/test-runner` cannot resolve bare module specifiers without explicit `nodeResolve: true`

**What goes wrong:** Test file imports `'@open-wc/testing'` → 404 in browser.

**Why it happens:** Browsers can't resolve `import foo from 'pkg'` — they need full paths. wtr's nodeResolve plugin rewrites them.

**How to avoid:** `nodeResolve: true` in wtr config. See § Test config below.

### Pitfall 12: Lit's shadow DOM queries vs assertion of attributes

**What goes wrong:** Test does `expect(el.getAttribute('foo')).to.equal('bar')` but the attribute only exists inside shadow DOM. Test fails with null.

**How to avoid:** Use `el.shadowRoot!.querySelector('button')` to enter shadow DOM. See example test in § Code Examples.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js (local build) | card build + test | ✓ | v25.8.1 | — |
| npm | card install | ✓ | 11.11.0 | — |
| Node 20+ in GitLab CI | `.gitlab-ci.yml` test-card stage | ✓ | `node:22-alpine` Docker image (public image; GitLab's shared runners pull fine) | — |
| Python 3.13 in local env | pytest | ✓ | 3.14.3 (floor `>=3.13`) | — |
| glab CLI | reading external Vue frontend from GitLab | ✓ | 1.89.0 | — |
| Docker (local) | (optional) smoke-test in HA container | ✓ | 29.3.0 | — |
| git | VCS | ✓ | 2.50.1 | — |
| HA Core ≥ 2026.2.3 | runtime | pinned via pytest-HA-custom | 2026.2.3 in dev; user's HA is whatever they run | No fallback — static-path API changed in 2024.7 (already long past) |
| HA Core ≥ 2026.4 (for ResourceStorageCollection fix) | Lovelace auto-register without defensive `async_load()` | NOT PINNED | — | Defensive `async_load()` call makes us compatible with 2026.2.3 (Pitfall 1) |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** The ResourceStorageCollection lazy-load fix (HA 2026.4+). Defensive `async_load()` call works on 2026.2+.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (card) | `@web/test-runner 0.20.0` + `@open-wc/testing 4.0.0` + `@esm-bundle/chai 4.3.4-fix.0` + `sinon 17.0.2` + `@web/test-runner-playwright 0.11.0` |
| Framework (integration-side Python) | `pytest-homeassistant-custom-component 0.13.316` (Phase 2 established) |
| Card config file | `www/community/party-dispenser-card/web-test-runner.config.mjs` (Wave 0 — see below) |
| TS transpile at test time | `@web/dev-server-esbuild` (target ES2020) |
| Card quick run command | `cd www/community/party-dispenser-card && npm test` |
| Card full suite command | `cd www/community/party-dispenser-card && npm run test && npm run typecheck` |
| Python quick run command | `.venv/bin/pytest tests/test_integration_manifest.py -x` |
| Python full suite command | `.venv/bin/pytest tests/ -v` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HACS-03 | Card served from integration-registered static path | integration (Python) | `.venv/bin/pytest tests/test_frontend_register.py -x` | ❌ Wave 0 |
| UI-01 | `customCards.push` + `customElements.define` run at module load | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'registers customCards'` | ❌ Wave 0 |
| UI-02 | Recipe tile tap dispatches `pd-order-recipe` | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'pd-recipe-tile'` | ❌ Wave 0 |
| UI-02 | Root card's `pd-order-recipe` handler calls `hass.callService('party_dispenser', 'order_recipe', ...)` | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'order_recipe service'` | ❌ Wave 0 |
| UI-03 | Queue item cancel button dispatches `pd-cancel-order` | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'pd-queue-item'` | ❌ Wave 0 |
| UI-03 | Root card's `pd-cancel-order` handler calls `hass.callService('party_dispenser', 'cancel_order', ...)` | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'cancel_order service'` | ❌ Wave 0 |
| UI-04 | Summary header renders 3 chips when show_connection_status=true, 2 when false | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'pd-summary-header'` | ❌ Wave 0 |
| UI-05 | NO `fetch(` call in `src/` | grep gate | `! grep -rE '\bfetch\s*\(' www/community/party-dispenser-card/src/` | ❌ Wave 0 CI job |
| UI-05 | NO hex color in `src/` (outside `:host` block) | grep gate | `test "$(grep -rE '#[0-9a-fA-F]{3,6}' www/community/party-dispenser-card/src/ \| grep -v ':host' \| wc -l)" -eq 0` | ❌ Wave 0 CI job |
| UI-06 | Card renders in <600px viewport without horizontal overflow | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'mobile layout'` | ❌ Wave 0 |
| UI-07 | `<ha-form>` editor emits `config-changed` with merged config | unit (card) | `cd www/community/party-dispenser-card && npm test -- --grep 'pd-editor'` | ❌ Wave 0 |
| QA-03 | ≥70% line coverage on `src/` | coverage gate | `cd www/community/party-dispenser-card && npm test` (coverageConfig threshold enforces) | ❌ Wave 0 |
| (Phase 4 manifest) | `manifest.json::version == "0.4.0"` and `dependencies == ["frontend","http"]` | unit (Python) | `.venv/bin/pytest tests/test_integration_manifest.py::test_manifest_phase4_overrides -x` | ⚠️ rename+edit existing `test_manifest_phase3_overrides` |
| (Phase 4 Python) | `frontend/__init__.py::async_register_frontend` calls `async_register_static_paths` + `resources.async_create_item` | unit (Python) | `.venv/bin/pytest tests/test_frontend_register.py -x` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` in card workspace (if card code touched) + `pytest tests/test_<module>.py -x` (if Python touched) — target <3s.
- **Per wave merge:** Full `npm test` + full `pytest tests/ -v` + all grep gates. Target <5s card + <1s Python = ~6s total.
- **Phase gate:** Full suite green + coverage ≥70% on `src/` + coverage ≥80% on new Python module `frontend/__init__.py` before `/gsd:verify-work` + v0.4.0 annotated tag.

### Wave 0 Gaps
- [ ] `www/community/party-dispenser-card/package.json` — npm manifest with scripts
- [ ] `www/community/party-dispenser-card/rollup.config.mjs` — build config
- [ ] `www/community/party-dispenser-card/web-test-runner.config.mjs` — test config
- [ ] `www/community/party-dispenser-card/tsconfig.json` — TS config
- [ ] `www/community/party-dispenser-card/test/fixtures/hass-*.ts` — 4 fixture factories
- [ ] `www/community/party-dispenser-card/test/*.test.ts` — 9 test files
- [ ] `tests/test_frontend_register.py` — new Python test file verifying `async_register_frontend` registers path + creates resource
- [ ] Rename `tests/test_integration_manifest.py::test_manifest_phase3_overrides` → `test_manifest_phase4_overrides`, flip version assertion to `"0.4.0"`, add assertion `manifest["dependencies"] == ["frontend", "http"]`
- [ ] Node.js install in CI: `.gitlab-ci.yml` add test-card stage with `image: node:22-alpine` (see § GitLab CI below)

## Code Examples

### Python — `custom_components/party_dispenser/frontend/__init__.py` (NEW FILE)

Copy-ready with the defensive `async_load()` added (UI-SPEC §13.3 omitted this):

```python
"""Register the embedded Lovelace card as a static resource + resource entry.

Called once per HA lifetime from __init__.py::async_setup (NOT async_setup_entry,
to avoid double-registration across multiple config entries).

Sources:
- HA dev blog (2024-06-18): async_register_static_paths + StaticPathConfig
  https://developers.home-assistant.io/blog/2024/06/18/async_register_static_paths/
- KipK gist (2025+, fetched 2026-04-20): canonical embedded-card pattern
  https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492
- home-assistant/core#165767 (opened 2026-03-17) + PR #165773 (merged 2026-04-10):
  ResourceStorageCollection missing lazy-load guard — defensive async_load()
  makes this safe on HA 2026.2.x (our test pin) AND on fixed 2026.4+ builds.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState, Event

from ..const import DOMAIN, LOGGER, VERSION

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

URL_BASE = f"/{DOMAIN}_frontend"  # → /party_dispenser_frontend
CARD_FILENAME = "party-dispenser-card.js"
CARD_NAME = "Party Dispenser Card"


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register the card's static path + Lovelace resource. Idempotent."""
    frontend_dir = Path(__file__).parent  # custom_components/party_dispenser/frontend/
    bundle_path = frontend_dir / CARD_FILENAME
    if not bundle_path.is_file():
        LOGGER.warning(
            "Party Dispenser card bundle not found at %s; "
            "run `cd www/community/party-dispenser-card && npm run build` to produce it",
            bundle_path,
        )
        return

    # --- 1. Static path -------------------------------------------------
    # cache_headers=False during 0.4.x so dev can iterate without clobbered cache;
    # Phase 6 may flip to True with a cache-busting query param.
    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(frontend_dir), False)]
        )
    except RuntimeError:
        LOGGER.debug("Static path %s already registered", URL_BASE)

    # --- 2. Lovelace resource (storage mode only) -----------------------
    lovelace_data = hass.data.get(LOVELACE_DATA)
    if lovelace_data is None:
        LOGGER.debug("Lovelace not loaded yet; resource registration skipped")
        return
    if getattr(lovelace_data, "resource_mode", "yaml") != MODE_STORAGE:
        LOGGER.info(
            "Lovelace in YAML mode; add resource manually: %s/%s (type: module)",
            URL_BASE,
            CARD_FILENAME,
        )
        return

    resources = lovelace_data.resources

    # DEFENSIVE: lazy-load the resource collection BEFORE mutating. Works around
    # home-assistant/core#165767 (fixed in 2026.4). No-op on fixed versions.
    if not getattr(resources, "loaded", False):
        await resources.async_load()

    url_path = f"{URL_BASE}/{CARD_FILENAME}"
    url_with_v = f"{url_path}?v={VERSION}"

    existing = [r for r in resources.async_items() if r["url"].startswith(URL_BASE)]
    for resource in existing:
        existing_path = resource["url"].split("?")[0]
        if existing_path == url_path:
            existing_version = (
                resource["url"].split("?v=")[-1] if "?v=" in resource["url"] else ""
            )
            if existing_version != VERSION:
                LOGGER.info("Updating %s to v%s", CARD_NAME, VERSION)
                await resources.async_update_item(
                    resource["id"],
                    {"res_type": "module", "url": url_with_v},
                )
            return  # already registered; no-op

    LOGGER.info("Registering %s v%s at %s", CARD_NAME, VERSION, url_with_v)
    await resources.async_create_item({"res_type": "module", "url": url_with_v})


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Entry point called from __init__.py::async_setup.

    Defers actual registration until HA is past EVENT_HOMEASSISTANT_STARTED so
    the frontend integration has fully loaded Lovelace resources from .storage.
    """

    async def _do_register(_event: Event | None = None) -> None:
        await async_register_frontend(hass)

    if hass.state == CoreState.running:
        await _do_register()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _do_register)
```

### Python — `custom_components/party_dispenser/__init__.py` EDIT

```python
# At top of file:
from .frontend import async_setup_frontend  # NEW import

# Inside async_setup (replace existing body):
async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Party Dispenser component (domain-level, once)."""
    async_setup_services(hass)
    await async_setup_frontend(hass)  # NEW — registers card static path + resource
    return True
```

### Python — `custom_components/party_dispenser/manifest.json` EDIT

Flip `dependencies` from `[]` to `["frontend", "http"]`, bump version:

```json
{
  "domain": "party_dispenser",
  "name": "Party Dispenser",
  "version": "0.4.0",
  "documentation": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd",
  "issue_tracker": "https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd/-/issues",
  "codeowners": [],
  "requirements": [],
  "dependencies": ["frontend", "http"],
  "iot_class": "local_push",
  "integration_type": "hub",
  "config_flow": true
}
```

And bump `const.py::VERSION = "0.4.0"`, `pyproject.toml::version = "0.4.0"`. Both must land in the **same atomic commit** as the `test_integration_manifest.py::test_manifest_phase4_overrides` rename+flip (Phase 1/2/3 pattern — see `.planning/STATE.md` Decisions).

### `package.json`

```json
{
  "name": "party-dispenser-card",
  "version": "0.4.0",
  "description": "Custom Lovelace card for the Party Dispenser HACS integration",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "rollup -c",
    "watch": "rollup -c -w",
    "test": "web-test-runner --config web-test-runner.config.mjs",
    "test:watch": "web-test-runner --config web-test-runner.config.mjs --watch",
    "typecheck": "tsc --noEmit",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "lit": "3.3.1",
    "custom-card-helpers": "1.9.0"
  },
  "devDependencies": {
    "typescript": "5.9.2",
    "tslib": "2.6.0",
    "rollup": "4.30.0",
    "@rollup/plugin-typescript": "12.1.4",
    "@rollup/plugin-node-resolve": "16.0.1",
    "@rollup/plugin-commonjs": "28.0.6",
    "@rollup/plugin-json": "6.1.0",
    "@rollup/plugin-terser": "1.0.0",
    "rollup-plugin-copy": "3.5.0",
    "@web/test-runner": "0.20.0",
    "@web/test-runner-playwright": "0.11.0",
    "@web/dev-server-esbuild": "1.0.5",
    "@open-wc/testing": "4.0.0",
    "@esm-bundle/chai": "4.3.4-fix.0",
    "sinon": "17.0.2",
    "@types/sinon": "17.0.4"
  }
}
```

**Why `"private": true`** — we don't publish to npm. The card is distributed via HACS / as a committed `.js` file. Avoids accidental `npm publish`.

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "exactOptionalPropertyTypes": false,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": false,
    "sourceMap": true,
    "outDir": "./dist",
    "importHelpers": true,
    "types": ["sinon", "node"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Key settings explained:**
- `target: ES2020` — matches UI-SPEC §18.4's browser matrix floor (Chrome 108+, Safari 16+)
- `experimentalDecorators: true` — required for `@customElement` / `@property` from `lit/decorators.js`
- `useDefineForClassFields: false` — required for lit's legacy decorators (Pitfall 3)
- `exactOptionalPropertyTypes: false` — compatibility with `custom-card-helpers` types (Pitfall 8)
- `importHelpers: true` + `tslib` dep — avoids duplicate TS helper emission across chunks
- `module: ESNext` + `moduleResolution: node` — preserves ES modules for rollup

### `rollup.config.mjs`

```javascript
// www/community/party-dispenser-card/rollup.config.mjs
//
// Source: derived from mushroom's rollup.config.mjs (verified 2026-04-20 via
// https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/rollup.config.mjs)
// and UI-SPEC §17.2. Simplified because we don't need babel / preset-env
// (@rollup/plugin-typescript handles TS→ES2020 directly).

import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve as pathResolve } from 'node:path';

// Read version from the Python integration's manifest.json so the bundle's
// CARD_VERSION constant stays aligned with manifest.json::version (UI-SPEC §17.5).
const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = pathResolve(__dirname, '../../../custom_components/party_dispenser/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const CARD_VERSION = manifest.version;

export default {
  input: 'src/party-dispenser-card.ts',
  output: {
    file: 'dist/party-dispenser-card.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,  // Single-file output (Pitfall 10)
  },
  plugins: [
    resolve({ browser: true, preferBuiltins: false }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: false,
      inlineSources: true,
    }),
    // UI-SPEC §17.2: NO minification (terser) in v0.4.0; flip in Phase 6 polish.
    // Bundled constant injection (replaces `declare const CARD_VERSION` at build time)
    {
      name: 'inject-card-version',
      renderChunk(code) {
        return code.replace(/__CARD_VERSION__/g, JSON.stringify(CARD_VERSION));
      },
    },
    // Copy the built artifact into custom_components/party_dispenser/frontend/
    // so the Python integration can serve it via async_register_static_paths.
    copy({
      targets: [
        {
          src: 'dist/party-dispenser-card.js',
          dest: '../../../custom_components/party_dispenser/frontend/',
        },
        {
          src: 'dist/party-dispenser-card.js.map',
          dest: '../../../custom_components/party_dispenser/frontend/',
        },
      ],
      hook: 'writeBundle',
    }),
  ],
  // Suppress noisy but harmless circular-dep warnings if they appear in lit-internal
  onwarn(warning, warn) {
    if (warning.code === 'CIRCULAR_DEPENDENCY') return;
    warn(warning);
  },
};
```

**Version injection note:** Since `declare const CARD_VERSION: string` is a declaration-only, we replace `__CARD_VERSION__` at build time in the generated bundle text (the `inject-card-version` plugin). Alternative: use `@rollup/plugin-replace` with a virtual module — slightly cleaner but one more dep. The inline replacement is simpler for v0.4.0.

Adjust the card code to reference `__CARD_VERSION__` instead of `CARD_VERSION`:
```typescript
// src/party-dispenser-card.ts
declare const __CARD_VERSION__: string;
// ...in firstUpdated():
console.debug(`%c party-dispenser-card %c ${__CARD_VERSION__}`, ...);
```

### `web-test-runner.config.mjs`

```javascript
// www/community/party-dispenser-card/web-test-runner.config.mjs
//
// Source: UI-SPEC §15.5 + @web/dev-server-esbuild docs (2026-04-20).
// Playwright launcher for Chromium-only in Phase 4; Phase 5 enables
// Firefox + WebKit matrix.

import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  nodeResolve: true,              // Resolves bare imports (Pitfall 11)
  files: 'test/**/*.test.ts',
  plugins: [
    esbuildPlugin({
      ts: true,
      target: 'es2020',
      tsconfig: './tsconfig.json',
    }),
  ],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // Phase 5 enables the full matrix:
    // playwrightLauncher({ product: 'firefox' }),
    // playwrightLauncher({ product: 'webkit' }),
  ],
  coverage: true,
  coverageConfig: {
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.d.ts', 'src/types.ts'],
    threshold: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    reporters: ['html', 'lcov', 'text-summary'],
  },
  testRunnerHtml: testFramework => `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <script type="module" src="${testFramework}"></script>
        <!-- intentionally EMPTY: tests must verify fallback tokens without HA theme vars -->
        <style>:root {}</style>
      </head>
      <body></body>
    </html>
  `,
};
```

### Example test — `test/pd-recipe-tile.test.ts`

```typescript
// test/pd-recipe-tile.test.ts
// Source: @open-wc/testing docs (https://open-wc.org/docs/testing/helpers/, fetched 2026-04-20)
// + UI-SPEC §15.6 canonical shape.

import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '../src/components/pd-recipe-tile';
import type { PdRecipeTile } from '../src/components/pd-recipe-tile';

describe('<pd-recipe-tile>', () => {
  it('dispatches pd-order-recipe on click when makeable', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r1', name: 'Margarita', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    setTimeout(() => button.click());
    const { detail } = await oneEvent(el, 'pd-order-recipe');
    expect(detail).to.deep.equal({ recipeId: 'r1' });
  });

  it('is aria-disabled and does not dispatch when not makeable', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r2', name: 'Mojito', makeable: false }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-disabled')).to.equal('true');

    let fired = false;
    el.addEventListener('pd-order-recipe', () => { fired = true; });
    button.click();
    // Micro-task flush
    await new Promise(r => setTimeout(r, 0));
    expect(fired).to.be.false;
  });

  it('dispatches on Enter and Space keydown', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r3', name: 'Old Fashioned', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;

    setTimeout(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    const enterEvent = await oneEvent(el, 'pd-order-recipe');
    expect(enterEvent.detail).to.deep.equal({ recipeId: 'r3' });

    setTimeout(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
    const spaceEvent = await oneEvent(el, 'pd-order-recipe');
    expect(spaceEvent.detail).to.deep.equal({ recipeId: 'r3' });
  });
});
```

### Example test — `test/party-dispenser-card.test.ts` (root card, service call invocation — QA-03 critical)

```typescript
// test/party-dispenser-card.test.ts
import { expect, fixture, html, aTimeout } from '@open-wc/testing';
import sinon from 'sinon';
import '../src/party-dispenser-card';
import type { PartyDispenserCard } from '../src/party-dispenser-card';
import { buildHassHappy } from './fixtures/hass-happy';

describe('<party-dispenser-card>', () => {
  it('dispatches order_recipe service when a recipe tile fires pd-order-recipe', async () => {
    const hass = buildHassHappy();
    const callService = sinon.spy(hass, 'callService');

    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    el.setConfig({ type: 'custom:party-dispenser-card' });
    (el as any).hass = hass;
    await el.updateComplete;

    el.dispatchEvent(new CustomEvent('pd-order-recipe', {
      detail: { recipeId: 'recipe-margarita' },
      bubbles: true,
      composed: true,
    }));
    await aTimeout(0);

    expect(callService).to.have.been.calledOnceWithExactly(
      'party_dispenser',
      'order_recipe',
      { recipe_id: 'recipe-margarita' },
    );
  });

  it('dispatches cancel_order service when a queue item fires pd-cancel-order', async () => {
    const hass = buildHassHappy();
    const callService = sinon.spy(hass, 'callService');

    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    el.setConfig({ type: 'custom:party-dispenser-card' });
    (el as any).hass = hass;
    await el.updateComplete;

    el.dispatchEvent(new CustomEvent('pd-cancel-order', {
      detail: { orderId: 'order-abc' },
      bubbles: true,
      composed: true,
    }));
    await aTimeout(0);

    expect(callService).to.have.been.calledOnceWithExactly(
      'party_dispenser',
      'cancel_order',
      { order_id: 'order-abc' },
    );
  });

  it('setConfig throws on missing type', async () => {
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    expect(() => el.setConfig({} as any)).to.throw();
    expect(() => el.setConfig({ type: 'wrong-card' } as any)).to.throw();
  });
});
```

### HomeAssistant fixture factory — `test/fixtures/hass-happy.ts`

```typescript
// test/fixtures/hass-happy.ts
// Builds a HomeAssistant mock with 3 recipes, 1 queued order, WS connected.
// Matches the shape that custom_components/party_dispenser/sensor.py ships
// to hass.states (verified against sensor.py lines 67-72, 195-202).

import type { HomeAssistant } from 'custom-card-helpers';

export function buildHassHappy(): HomeAssistant {
  return {
    callService: async (_domain: string, _service: string, _data?: Record<string, unknown>) => {
      /* replaced by sinon.spy in tests */
    },
    states: {
      'sensor.party_dispenser_recipes': {
        entity_id: 'sensor.party_dispenser_recipes',
        state: '3',
        attributes: {
          recipes: [
            { id: 'recipe-margarita', name: 'Margarita', makeable: true },
            { id: 'recipe-mojito', name: 'Mojito', makeable: false },
            { id: 'recipe-oldfashioned', name: 'Old Fashioned', makeable: true },
          ],
        },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_queue_size': {
        entity_id: 'sensor.party_dispenser_queue_size',
        state: '1',
        attributes: {
          queue: [
            { id: 'order-abc', recipe_name: 'Margarita', state: 'QUEUED' },
          ],
        },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_makeable_count': {
        entity_id: 'sensor.party_dispenser_makeable_count',
        state: '2',
        attributes: { makeable: ['Margarita', 'Old Fashioned'] },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_current_order': {
        entity_id: 'sensor.party_dispenser_current_order',
        state: 'Margarita',
        attributes: { order_id: 'order-abc', state: 'QUEUED', started_at: null },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'binary_sensor.party_dispenser_connected': {
        entity_id: 'binary_sensor.party_dispenser_connected',
        state: 'on',
        attributes: {},
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
    },
    /* minimum HA surface for type compat; tests only need callService + states */
  } as unknown as HomeAssistant;
}
```

### Card editor — `src/editor/pd-editor.ts` (ha-form)

Verified against Mushroom's `src/cards/entity-card/entity-card-editor.ts` (fetched 2026-04-20):

```typescript
// src/editor/pd-editor.ts
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { CardConfig } from '../types';

// Schema shape: Array of items either
//   { name, required?, selector: { <kind>: {<options>} } }
// or a nested grid { type: 'grid', name: '', schema: [...] }.
// Kind options verified against HA's ha-selector components (stable since 2023).
const SCHEMA: readonly unknown[] = [
  {
    name: 'entity',
    required: false,
    selector: {
      entity: {
        // Restrict picker to sensors from our integration only:
        domain: 'sensor',
        integration: 'party_dispenser',
      },
    },
  },
  {
    name: 'title',
    required: false,
    selector: { text: {} },
  },
  {
    name: 'show_connection_status',
    required: false,
    selector: { boolean: {} },
  },
  {
    name: 'max_recipes_visible',
    required: false,
    selector: {
      number: {
        min: 1,
        max: 50,
        mode: 'box',
      },
    },
  },
  {
    name: 'show_not_makeable',
    required: false,
    selector: { boolean: {} },
  },
] as const;

@customElement('pd-editor')
export class PdEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: CardConfig;

  public setConfig(config: CardConfig): void {
    this._config = config;
  }

  private _computeLabel = (schema: { name: string }): string => {
    const labels: Record<string, string> = {
      entity: 'Queue size sensor',
      title: 'Title',
      show_connection_status: 'Show live/offline indicator',
      max_recipes_visible: 'Max recipes visible',
      show_not_makeable: 'Show recipes with missing ingredients',
    };
    return labels[schema.name] ?? schema.name;
  };

  private _computeHelper = (schema: { name: string }): string => {
    const helpers: Record<string, string> = {
      title: 'Shown at the top of the card. Default: "Party Dispenser".',
      max_recipes_visible: 'Leave blank to show all. Truncates the grid from the bottom.',
    };
    return helpers[schema.name] ?? '';
  };

  private _valueChanged = (ev: CustomEvent): void => {
    const next = {
      ...ev.detail.value,
      type: 'custom:party-dispenser-card',
    };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: next },
      bubbles: true,
      composed: true,
    }));
  };

  protected render() {
    if (!this.hass || !this._config) return nothing;
    return html`
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        .computeHelper=${this._computeHelper}
        @value-changed=${this._valueChanged}
      ></ha-form>
    `;
  }
}
```

**Entity selector options reference ([HA's ha-selector docs](https://www.home-assistant.io/docs/blueprint/selectors/), verified 2026-04-20):**

| Option | Type | Purpose |
|--------|------|---------|
| `domain` | string or string[] | Limits picker to specified domains (e.g., `'sensor'` or `['sensor', 'binary_sensor']`) |
| `integration` | string | Further restricts to entities from a specific integration domain (e.g., `'party_dispenser'`) |
| `device_class` | string | Filters by device class (e.g., `'connectivity'`) |
| `multiple` | boolean | Allows multiple entity selection |
| `include_entities` | string[] | Allowlist |
| `exclude_entities` | string[] | Blocklist |

Selector shapes for other fields:
- `{ text: {} }` — single-line text input
- `{ text: { multiline: true } }` — multi-line textarea
- `{ number: { min, max, step, mode: 'box'\|'slider' } }`
- `{ boolean: {} }` — toggle
- `{ select: { options: [{value, label}, ...], mode: 'dropdown'\|'list' } }`
- `{ icon: {} }` — MDI icon picker with search
- `{ ui_color: {} }` — HA theme color picker (primary/accent/warning/error)

### GitLab CI — `.gitlab-ci.yml` EDIT (add `test-card` stage)

```yaml
# .gitlab-ci.yml
# Phase 4 adds a test-card job to the existing Python 3.13 pipeline.
# Node 22-alpine image (cached by GitLab runner; first pull ~30s, subsequent <2s).

stages:
  - lint
  - test

variables:
  PIP_CACHE_DIR: "$CI_PROJECT_DIR/.cache/pip"
  PYTHONDONTWRITEBYTECODE: "1"
  PIP_DISABLE_PIP_VERSION_CHECK: "1"
  NPM_CONFIG_CACHE: "$CI_PROJECT_DIR/.cache/npm"

default:
  image: python:3.13-slim
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
    - pip install --quiet -e ".[dev]" --config-settings editable_mode=compat
    - pytest tests/ -v

# NEW — Phase 4
test-card:
  stage: test
  image: node:22-alpine
  cache:
    key: npm-$CI_COMMIT_REF_SLUG
    paths:
      - .cache/npm/
      - www/community/party-dispenser-card/node_modules/
  before_script:
    # Chromium needed by Playwright (wtr uses playwrightLauncher).
    # alpine packages provide a working Chromium; Playwright auto-detects.
    - apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
    - export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
    - export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser
  script:
    - cd www/community/party-dispenser-card
    - npm ci
    - npm run typecheck
    - npm run build    # produces dist/party-dispenser-card.js + copies to ../../../custom_components/party_dispenser/frontend/
    - npm test         # web-test-runner with coverageConfig.threshold gates ≥70%
    # Grep gates (UI-SPEC §3.1 + §19.1):
    - |
      if grep -rE '#[0-9a-fA-F]{3,6}' src/ | grep -v ':host'; then
        echo "FAIL: hex color outside :host fallback block"
        exit 1
      fi
    - |
      if grep -rE '\bfetch\s*\(' src/; then
        echo "FAIL: direct fetch() call (REQ UI-05 forbids)"
        exit 1
      fi
  coverage: '/Total:\s*\d+\.?\d+%/'
  artifacts:
    when: always
    paths:
      - www/community/party-dispenser-card/coverage/
      - www/community/party-dispenser-card/dist/
      - custom_components/party_dispenser/frontend/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: www/community/party-dispenser-card/coverage/cobertura-coverage.xml
```

**Trade-off decision:** The Python `pytest` job runs BEFORE `test-card` only because GitLab runs stages alphabetically within the same `stage:` value. Both are `stage: test`, but since they share a stage, GitLab runs them in parallel when runner capacity allows. This is desirable — card build doesn't depend on Python.

**`frontend/party-dispenser-card.js` in git:** `test-card`'s `npm run build` step copies the bundle into `custom_components/party_dispenser/frontend/`. Decision: **commit the built bundle to git** (see "Git tracking decision" above). Users on HACS custom-repo install path pull the repo as-is; they don't run npm build. The CI's `artifacts.paths` section preserves the newly built bundle so `/gsd:verify-work` can diff against the committed version — if they drift, the commit didn't include the rebuild (merge bug).

**Alternative (NOT RECOMMENDED):** Gitignore the bundle and require every developer to run `npm run build` before commit. This is fragile for a small team; the "commit the built bundle" pattern is used by Mushroom, button-card, and every major community card.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `hass.http.register_static_path(url, path, cache)` | `await hass.http.async_register_static_paths([StaticPathConfig(url, path, cache_headers)])` | 2024.7; old removed 2025.7 | Must use new API. UI-SPEC §13.3 already does. |
| `frontend.async_register_add_extra_js_url` | `hass.data[LOVELACE_DATA].resources.async_create_item(...)` | Long deprecated — `extra_js_url`/`extra_module_url` are now frontend config keys, not integration APIs | Use the lovelace resources collection instead. Our pattern does. |
| `from homeassistant.components.lovelace import DOMAIN` → `hass.data["lovelace"]` | `from homeassistant.components.lovelace.const import LOVELACE_DATA` → `hass.data[LOVELACE_DATA]` | HA 2023-2024 typed-hass-data migration | Use `LOVELACE_DATA` key with HassKey typing. `hass.data["lovelace"]` still works as string fallback but loses type hints. |
| `ha-textfield`, `ha-outlined-text-field` | `ha-input` (migration ongoing 2026.4 → 2026.5 removal) | 2026.4 frontend blog | Irrelevant for us — we use `ha-form` which abstracts the underlying input element. |
| Custom-card-helpers as runtime dep | custom-card-helpers as dev-only type dep (v2.0 split?) | 2026-02-21 v2.0 release | Still runtime. v2.0 changelog = "Node engine bump only". Safe to pin ^1.9.0. |
| lit-html + lit-element separate packages | Unified `lit` meta-package | 2021+ | Already using `lit`. |
| Babel + preset-env in rollup | `@rollup/plugin-typescript` alone for TS→ES2020 | 2023+ for most HA cards | Mushroom still has babel (legacy config); we skip babel entirely — simpler. |

**Deprecated / outdated:**
- `hass.http.register_static_path` — REMOVED in 2025.7 (we don't use it)
- `resource_mode` vs `mode` on Lovelace data — both exist (latter is a legacy alias on LovelaceData for the resource-mode field — both should work; research recommends `resource_mode` as the canonical name per the dataclass definition)
- `ha-textfield` — deprecated 2026.4, removed 2026.5 (we don't use it)
- `useDefineForClassFields: true` + lit legacy decorators — broken combo; set to `false` (Pitfall 3)

## Open Questions

1. **HA version destination for PR #165773 (ResourceStorageCollection fix)**
   - What we know: PR merged 2026-04-10. HA 2026.4 released 2026-04-01 (already out when PR merged → fix likely slips to 2026.5). HA 2026.5 not yet released at research time.
   - What's unclear: Exact HA version that first carries the fix. Could be 2026.4.x patch or 2026.5.
   - Recommendation: Write the defensive `async_load()` code (Pitfall 1). Works on ALL versions. Zero cost. Remove the defensive call in a future phase (Phase 6 or post-v1 polish) once the HA floor is known to be ≥ fixed version.

2. **Whether `coverage: true` in wtr 0.20 works out-of-box on Chromium or requires a specific flag**
   - What we know: wtr docs say coverage via c8 is built-in; `coverage: true` is canonical.
   - What's unclear: Whether Alpine Linux's Chromium in GitLab CI exposes the required V8 coverage APIs (some stripped builds don't).
   - Recommendation: Wave 0 task: sanity-test locally first (`npm test` on Mac produces `coverage/lcov.info`). If GitLab's Alpine Chromium breaks coverage, swap to `image: mcr.microsoft.com/playwright:v1.x-jammy` which ships the canonical Chromium. The swap is 1-line.

3. **Whether to commit `www/community/party-dispenser-card/dist/` or just `custom_components/party_dispenser/frontend/party-dispenser-card.js`**
   - What we know: Either works. HACS serves from `custom_components/`; `dist/` is build workspace convention.
   - What's unclear: Whether duplicating the file in git is objectionable (~120KB dupe).
   - Recommendation: Commit ONLY `custom_components/party_dispenser/frontend/party-dispenser-card.js` (the served artifact). `.gitignore` `www/community/party-dispenser-card/dist/` because it's the intermediate build output. This keeps git clean while preserving HACS-installability.

4. **Whether `sinon.spy(hass, 'callService')` correctly records calls when `hass` is a plain object, not a class instance**
   - What we know: sinon's spy works on object methods.
   - What's unclear: The `callService` on our fixture factory is `async` — sinon 17 should handle async spies correctly but has had edge cases pre-17.
   - Recommendation: Acceptance: the test passes. If it doesn't, swap to `sinon.stub(hass, 'callService').resolves(undefined)`. Document in Wave 0 task.

## Sources

### Primary (HIGH confidence)

- **[HA Developer Blog: async_register_static_paths (2024-06-18)](https://developers.home-assistant.io/blog/2024/06/18/async_register_static_paths/)** — Authoritative API for `StaticPathConfig` + `async_register_static_paths`. Confirms old `register_static_path` removed in 2025.7.
- **[HA Developer: Custom Lovelace Cards](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card)** — Current (2026) `setConfig` / `getCardSize` / `getConfigElement` / `getStubConfig` / `getGridOptions` / `customCards` API. Fetched 2026-04-20.
- **[home-assistant/core lovelace/const.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/lovelace/const.py)** — Exact `LOVELACE_DATA = HassKey(DOMAIN)`, `MODE_STORAGE = "storage"`, `MODE_YAML = "yaml"` constants. Fetched 2026-04-20.
- **[home-assistant/core lovelace/__init__.py](https://github.com/home-assistant/core/blob/dev/homeassistant/components/lovelace/__init__.py)** — `LovelaceData` dataclass shape: `resource_mode`, `dashboards`, `resources`, `yaml_dashboards`. Verified.
- **[home-assistant/core#165767](https://github.com/home-assistant/core/issues/165767)** — ResourceStorageCollection bug description (2026-03-17). HIGH confidence: issue text, reproduction, suggested fix.
- **[home-assistant/core#165773](https://github.com/home-assistant/core/pull/165773)** — Fix PR (merged 2026-04-10). HIGH confidence: fix implementation, `_async_ensure_loaded()` helper.
- **[piitaya/lovelace-mushroom package.json](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/package.json)** — Canonical community-card deps: lit 3.3.1, typescript 5.9.2, rollup 4.59, plugin-typescript 12.1.4. Fetched 2026-04-20.
- **[piitaya/lovelace-mushroom rollup.config.mjs](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/rollup.config.mjs)** — Rollup config reference. Fetched 2026-04-20.
- **[piitaya/lovelace-mushroom entity-card-editor.ts](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/src/cards/entity-card/entity-card-editor.ts)** — Canonical ha-form-based editor pattern. Fetched 2026-04-20 — full code captured in RESEARCH.
- **[npm registry (various `npm view <pkg>` queries)](https://www.npmjs.com/)** — Version + release-date verification for every pinned dep. Queried 2026-04-20.

### Secondary (MEDIUM confidence — WebSearch verified against primary)

- **[KipK gist: developer guide embedded Lovelace card](https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492)** — Reference for the full embedded-card pattern. Cross-verified against home-assistant/core source for `LOVELACE_DATA` and `StaticPathConfig`. Fetched 2026-04-20.
- **[HA community: Developer Guide - Embedded Lovelace Card in Integration](https://community.home-assistant.io/t/developer-guide-embedded-lovelace-card-in-a-home-assistant-integration/974909)** — Confirms: dependencies must include `["frontend","http"]`; registration in `async_setup` not `async_setup_entry`; EVENT_HOMEASSISTANT_STARTED listener required; YAML-mode users manual. Fetched 2026-04-20.
- **[HA Developer Blog: Frontend Component Updates 2026.4 (2026-03-25)](https://developers.home-assistant.io/blog/2026/03/25/frontend-component-updates-2026.4/)** — `ha-textfield` deprecated → `ha-input` (removal 2026.5). "We do not officially support custom card developers using built-in components." Fetched 2026-04-20.
- **[open-wc.org Testing Helpers](https://open-wc.org/docs/testing/helpers/)** — `fixture`, `oneEvent`, `elementUpdated`, `aTimeout` helpers with signatures. Fetched 2026-04-20.
- **[grillp/ha-custom-card-rollup-ts-lit-starter package.json](https://github.com/grillp/ha-custom-card-rollup-ts-lit-starter/blob/main/package.json)** — Starter kit: lit ^3.1.0 + custom-card-helpers ^1.9.0 + rollup ^4.9.1 pattern. Confirms UI-SPEC pins. Fetched 2026-04-20.

### Tertiary (LOW confidence — unverified / community-only; flagged)

- **[HA community: "Lovelace ResourceStorageCollection missing lazy-load guard"](https://community.home-assistant.io/t/…)** — Not directly cited; the bug was observed via WebSearch hit and re-verified at primary source (home-assistant/core#165767).
- **Exact HA 2026.4 vs 2026.5 release version for PR #165773** — Deduced from merge date 2026-04-10 against 2026.4 release date 2026-04-01 (PR likely targets 2026.5). **Open question 1** flags this.

### Internal project files (context)

- `.planning/phases/04-custom-lovelace-card/04-CONTEXT.md` (user decisions — LOCKED baseline)
- `.planning/phases/04-custom-lovelace-card/04-UI-SPEC.md` (22 sections, 1675 lines — LOCKED visual contract)
- `.planning/REQUIREMENTS.md` (HACS-03, UI-01..07, QA-03)
- `.planning/ROADMAP.md` (Phase 4 = 3 plans: scaffolding, UI components, mobile/tests)
- `.planning/PROJECT.md` + `.planning/STATE.md` (project state + accumulated decisions)
- `.planning/phases/02-integration-core/02-04-SUMMARY.md` (services + entity shapes shipped Phase 2)
- `.planning/phases/03-realtime-push/03-02-SUMMARY.md` (WS + connection indicator shipped Phase 3)
- `custom_components/party_dispenser/__init__.py` — extends to call `async_setup_frontend`
- `custom_components/party_dispenser/manifest.json` — flips `dependencies` + `version`
- `custom_components/party_dispenser/services.py` (lines 36-50: the 3 service schemas the card calls)
- `custom_components/party_dispenser/sensor.py` (lines 67-72, 125-128, 195-202: attribute shapes the card reads)
- `custom_components/party_dispenser/binary_sensor.py` (line 45: connectivity device_class)
- `custom_components/party_dispenser/api.py` (Recipe + QueueItem dataclasses — TS types mirror)
- `custom_components/party_dispenser/const.py` (DOMAIN, VERSION — used by frontend module)
- `.gitlab-ci.yml` (existing 2-stage pipeline extended with `test-card` stage)
- `pyproject.toml` (version bump 0.3.0 → 0.4.0)
- `tests/test_integration_manifest.py` (rename `test_manifest_phase3_overrides` → `test_manifest_phase4_overrides`)
- `www/community/party-dispenser-card/` (placeholder dir from Phase 1 — becomes card workspace root)

## Metadata

**Confidence breakdown:**
- Standard stack (pinned deps + versions): **HIGH** — every version verified against live npm registry on 2026-04-20.
- Architecture patterns (lit 3.3 custom element idioms, event routing): **HIGH** — verified against Mushroom 2026 source + lit 3.3.1 docs.
- Python static-path + Lovelace resource registration: **HIGH** — API verified against home-assistant/core source code + 2024 HA dev blog; defensive `async_load()` verified against PR #165773.
- Rollup config: **HIGH** — verified against Mushroom rollup.config.mjs + grillp starter kit; `inlineDynamicImports: true` pitfall confirmed.
- `@web/test-runner` config: **MEDIUM-HIGH** — config template verified against official wtr docs + UI-SPEC §15.5; coverage config shape standard.
- `ha-form` schema: **HIGH** — verified against Mushroom's entity-card-editor.ts verbatim.
- GitLab CI Node stage: **MEDIUM-HIGH** — template verified for GitLab syntax; Alpine Chromium coverage-export untested in this specific combination (Open Q 2).
- 2026.4 frontend impact: **HIGH** — authoritative blog post; no ha-form / ha-icon / ha-card changes affecting us.
- Pitfalls: **HIGH** — ResourceStorageCollection bug from primary HA source; other pitfalls from Mushroom / grillp / open-wc community practice.

**Research date:** 2026-04-20
**Valid until:** ~2026-05-20 for the pinned-dep table (npm registry drift cadence); ~2026-06-20 for the Python API (stable releases only change at HA 2026.X boundaries; 2026.5 due early-May 2026). Beyond those windows, re-verify `custom-card-helpers`, `@web/test-runner`, `lit`, and the `hass.http.async_register_static_paths` signature.

## RESEARCH COMPLETE
