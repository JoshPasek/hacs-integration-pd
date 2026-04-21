---
phase: 04-custom-lovelace-card
plan: 02
subsystem: ui
tags: [lit, typescript, rollup, lovelace, custom-element, ha-form, event-bubbling, container-queries, optimistic-ui]

requires:
  - phase: 04-01-SUMMARY.md
    provides: card workspace scaffold (package.json, tsconfig, rollup, wtr), src/types.ts, 4 test fixtures, Python frontend/__init__.py, manifest v0.4.0
provides:
  - src/state.ts (pure deriveState function)
  - src/styles/tokens.ts (typographyTokens, spacingTokens, sharedTokens lit-css)
  - 6 leaf components: pd-summary-chip, pd-summary-header, pd-recipe-tile, pd-recipe-grid, pd-queue-item, pd-queue-list
  - src/editor/pd-editor.ts (ha-form 5-field schema)
  - src/party-dispenser-card.ts (root custom element, customCards.push)
  - custom_components/party_dispenser/frontend/party-dispenser-card.js (built bundle, 46 KB)
  - custom_components/party_dispenser/frontend/party-dispenser-card.js.map
affects: [04-03-PLAN.md]

tech-stack:
  added: []
  patterns:
    - deriveState pure function — extracts DerivedState from hass.states without mutation; memoizable by lit property hasChanged
    - sharedTokens lit-css block — all components compose via static styles = [sharedTokens, css`...`]
    - composed+bubbles event dispatch — pd-order-recipe and pd-cancel-order dispatched with {composed:true, bubbles:true}; root listens once
    - optimistic queue state — _optimisticQueue local @state with 2s reconciliation window + 5s auto-expire
    - container-type inline-size on :host — enables child @container pd-card queries for responsive layout
    - __CARD_VERSION__ rollup injection — version string replaced at build time from manifest.json

key-files:
  created:
    - www/community/party-dispenser-card/src/state.ts
    - www/community/party-dispenser-card/src/styles/tokens.ts
    - www/community/party-dispenser-card/src/components/pd-summary-chip.ts
    - www/community/party-dispenser-card/src/components/pd-summary-header.ts
    - www/community/party-dispenser-card/src/components/pd-recipe-tile.ts
    - www/community/party-dispenser-card/src/components/pd-recipe-grid.ts
    - www/community/party-dispenser-card/src/components/pd-queue-item.ts
    - www/community/party-dispenser-card/src/components/pd-queue-list.ts
    - www/community/party-dispenser-card/src/editor/pd-editor.ts
    - www/community/party-dispenser-card/src/party-dispenser-card.ts
    - custom_components/party_dispenser/frontend/party-dispenser-card.js
    - custom_components/party_dispenser/frontend/party-dispenser-card.js.map
  modified: []

key-decisions:
  - "Removed _nothing private field from pd-recipe-grid.ts (Rule 1 cleanup) — the field referenced lit's nothing export but was never read; removed to keep class clean; nothing import dropped too"
  - "Rollup sourcemap warning from inject-card-version is cosmetic — plugin does string replacement without sourcemap continuation; warning acknowledged and documented; build exit 0, bundle functional"

patterns-established:
  - "Lit component event dispatch: new CustomEvent('pd-*', {detail: ..., bubbles: true, composed: true}) from leaf -> root @pd-* listener -> hass.callService"
  - "Optimistic queue pattern: local @state _optimisticQueue + _mergedQueue reconciles within 2s window; 5s setTimeout auto-expires unreconciled entries"
  - "Container query responsive layout: :host { container-type: inline-size; container-name: pd-card } on root enables @container pd-card (min-width: 900px) in children"

requirements-completed: [UI-02, UI-03, UI-04, UI-05, UI-07]

duration: 4min
completed: "2026-04-21T01:57:10Z"
---

# Phase 4 Plan 2: Custom Lovelace Card TypeScript Implementation Summary

**10 TypeScript source files + 46 KB rollup bundle delivering the full `custom:party-dispenser-card` component tree — recipe grid, live queue, summary header, and ha-form editor — with hass.callService wiring for order_recipe and cancel_order.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-21T01:52:40Z
- **Completed:** 2026-04-21T01:57:10Z
- **Tasks:** 3 (+ 1 split build commit)
- **Files modified:** 12

## Accomplishments
- Pure `deriveState(hass, config)` function reads 5 HA entity states into typed `DerivedState`; no mutation
- 7 lit custom elements (6 leaf + editor) with HA CSS variable theming, ARIA roles, keyboard navigation, and `{composed:true, bubbles:true}` event dispatch
- Root `<party-dispenser-card>` routes `pd-order-recipe` / `pd-cancel-order` events to `hass.callService`; optimistic queue state reconciles within 2s
- 46 KB unminified bundle committed to `custom_components/party_dispenser/frontend/` — Python integration now serves it via registered static path; no more WARNING log at startup
- All grep gates pass: no `fetch()` in src/, no hex colors outside `:host` fallback blocks
- 68/68 Python tests still green (zero Python regressions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Shared modules — state.ts + tokens.ts** - `793d17d` (feat)
2. **Task 2: Six leaf components + editor** - `3127dfc` (feat)
3. **Task 3: Root element source** - `8c7ba7f` (feat)
4. **Task 3b: Built bundle artifact** - `0f61b72` (feat)

## Files Created/Modified

- `www/community/party-dispenser-card/src/state.ts` — pure deriveState; reads sensor.party_dispenser_* + binary_sensor.party_dispenser_connected
- `www/community/party-dispenser-card/src/styles/tokens.ts` — typographyTokens + spacingTokens + sharedTokens lit-css; HA-native vars with --pd-* fallbacks
- `www/community/party-dispenser-card/src/components/pd-summary-chip.ts` — pill chip; 3 tone variants; role=status; aria-live for connection
- `www/community/party-dispenser-card/src/components/pd-summary-header.ts` — 2 or 3 chips; role=group; mdi:wifi/mdi:wifi-off; Reconnecting… copy
- `www/community/party-dispenser-card/src/components/pd-recipe-tile.ts` — button; role=button; aria-disabled; Enter/Space keyboard; dispatches pd-order-recipe
- `www/community/party-dispenser-card/src/components/pd-recipe-grid.ts` — 2/3/4-col container query grid; makeable-first sort; empty state
- `www/community/party-dispenser-card/src/components/pd-queue-item.ts` — name+state+cancel; dispatches pd-cancel-order; highlights current order
- `www/community/party-dispenser-card/src/components/pd-queue-list.ts` — stacked items; aria-live=polite; empty state
- `www/community/party-dispenser-card/src/editor/pd-editor.ts` — ha-form; 5-field schema; emits config-changed
- `www/community/party-dispenser-card/src/party-dispenser-card.ts` — root element; setConfig; getCardSize; getConfigElement; _placeOrder; _cancelOrder; _mergedQueue; customCards.push
- `custom_components/party_dispenser/frontend/party-dispenser-card.js` — 46717-byte bundle; version 0.4.0 injected 2x
- `custom_components/party_dispenser/frontend/party-dispenser-card.js.map` — source map

## Decisions Made

- **Rollup sourcemap warning acknowledged:** The `inject-card-version` renderChunk plugin does string replacement without generating an accompanying sourcemap delta. Rollup emits a cosmetic "(!) Broken sourcemap" warning. Build exits 0 and the bundle is functional. Deferring sourcemap precision fix to Phase 6 polish (same as terser/eslint deferral).
- **_nothing field removed from pd-recipe-grid.ts:** Initial draft included `protected _nothing = nothing` as a workaround reference; realized `nothing` was imported but unused in the grid (empty state returns a real element, not `nothing`). Removed import + field; typecheck green.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed unused `nothing` import and `_nothing` field from pd-recipe-grid.ts**
- **Found during:** Task 2 — reviewing component after initial write
- **Issue:** `nothing` from lit was imported and assigned to a private `_nothing` property. The grid component's render method never returns `nothing` (it uses an empty-state div, not `nothing`). Unused import that would have caused a TS strict warning.
- **Fix:** Removed `nothing` from the import and deleted the `protected _nothing = nothing` field.
- **Files modified:** `www/community/party-dispenser-card/src/components/pd-recipe-grid.ts`
- **Verification:** `npm run typecheck` exits 0.
- **Committed in:** 3127dfc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - unused import/field cleanup)
**Impact on plan:** Trivial cleanup; no behavior change, no scope change.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS (exit 0) |
| `npm run build` | PASS (exit 0, 46717 bytes) |
| Grep gate: no fetch() in src/ | PASS |
| Grep gate: no hex outside :host | PASS |
| `grep -c '"0.4.0"' ...party-dispenser-card.js` | 2 (PASS) |
| `custom_components/party_dispenser/frontend/party-dispenser-card.js` exists | PASS |
| `custom_components/party_dispenser/frontend/party-dispenser-card.js.map` exists | PASS |
| `git ls-files www/community/party-dispenser-card/dist/` | empty (PASS) |
| `git ls-files ...party-dispenser-card.js` | in git (PASS) |
| `pytest tests/ -v` | 68/68 PASS |
| `ruff check .` | PASS |
| `ruff format --check .` | PASS |

## Issues Encountered
None — plan executed cleanly. Sourcemap warning from rollup is cosmetic; noted in Decisions.

## Known Stubs
None — all components are fully wired. The card reads live HA entity states, dispatches real callService calls, and the bundle is committed and served. Plan 04-03 adds the test suite to assert this behavior.

## Next Phase Readiness
- Plan 04-03 (test suite + mobile CSS polish + v0.4.0 tag) can begin immediately
- All 10 source files exist; 4 test fixtures from Plan 04-01 are ready for `@web/test-runner` consumption
- No blockers: bundle is present, Python integration serves it, Python pytest still 68/68

---
*Phase: 04-custom-lovelace-card*
*Completed: 2026-04-21*
