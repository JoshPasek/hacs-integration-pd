---
phase: 04-custom-lovelace-card
plan: 03
subsystem: ui
tags: [lit, typescript, rollup, lovelace, web-test-runner, open-wc, sinon, container-queries, coverage]

requires:
  - phase: 04-02-SUMMARY.md
    provides: 10 TypeScript source files, 46 KB rollup bundle, all 6 leaf components + editor + root card

provides:
  - www/community/party-dispenser-card/test/state.test.ts (5 tests — deriveState pure function)
  - www/community/party-dispenser-card/test/pd-summary-chip.test.ts (3 tests)
  - www/community/party-dispenser-card/test/pd-summary-header.test.ts (3 tests)
  - www/community/party-dispenser-card/test/pd-recipe-tile.test.ts (6 tests — tap/keyboard/aria)
  - www/community/party-dispenser-card/test/pd-recipe-grid.test.ts (4 tests — N tiles/truncation/filter/empty)
  - www/community/party-dispenser-card/test/pd-queue-item.test.ts (3 tests — cancel/aria/state-copy)
  - www/community/party-dispenser-card/test/pd-queue-list.test.ts (3 tests — N items/current/empty)
  - www/community/party-dispenser-card/test/pd-editor.test.ts (3 tests — ha-form/config-changed/type)
  - www/community/party-dispenser-card/test/party-dispenser-card.test.ts (8 tests — setConfig/service calls/render)
  - www/community/party-dispenser-card/web-test-runner.config.mjs (updated with __CARD_VERSION__ define)
  - www/community/party-dispenser-card/src/party-dispenser-card.ts (updated with .layout responsive CSS)
  - www/community/party-dispenser-card/src/components/pd-queue-list.ts (updated with sticky rail CSS)
  - custom_components/party_dispenser/frontend/party-dispenser-card.js (rebuilt bundle, 48527 bytes)
  - v0.4.0 annotated tag (pushed to origin)

affects: [Phase 5 — CI + GitHub mirror + release automation]

tech-stack:
  added: []
  patterns:
    - wtr esbuildPlugin define — provide __CARD_VERSION__ stub at test time so firstUpdated version banner works without ReferenceError
    - shadow-DOM event dispatch in tests — dispatch events from inside shadowRoot (ha-card) so lit @event listeners on shadow children catch them
    - CSS grid-template-areas swap — .layout container uses @container pd-card breakpoints to swap from single-column (mobile) to side-by-side rail (600px+)

key-files:
  created:
    - www/community/party-dispenser-card/test/state.test.ts
    - www/community/party-dispenser-card/test/pd-summary-chip.test.ts
    - www/community/party-dispenser-card/test/pd-summary-header.test.ts
    - www/community/party-dispenser-card/test/pd-recipe-tile.test.ts
    - www/community/party-dispenser-card/test/pd-recipe-grid.test.ts
    - www/community/party-dispenser-card/test/pd-queue-item.test.ts
    - www/community/party-dispenser-card/test/pd-queue-list.test.ts
    - www/community/party-dispenser-card/test/pd-editor.test.ts
    - www/community/party-dispenser-card/test/party-dispenser-card.test.ts
  modified:
    - www/community/party-dispenser-card/web-test-runner.config.mjs
    - www/community/party-dispenser-card/src/party-dispenser-card.ts
    - www/community/party-dispenser-card/src/components/pd-queue-list.ts
    - custom_components/party_dispenser/frontend/party-dispenser-card.js

key-decisions:
  - "Added __CARD_VERSION__ define to wtr esbuildPlugin — rollup injects this global at build time but WTR's esbuildPlugin doesn't; firstUpdated() threw ReferenceError during fixture instantiation; fixed by adding define: { __CARD_VERSION__: JSON.stringify('test') } to the esbuildPlugin config (Rule 1 auto-fix)"
  - "Event dispatch in party-dispenser-card.test.ts targets ha-card inside shadowRoot — the @pd-order-recipe/@pd-cancel-order listeners are bound to ha-card in the shadow DOM; dispatching from el (light DOM host) doesn't reach them; dispatching from el.shadowRoot.querySelector('ha-card') does (Rule 1 auto-fix)"
  - "Installed Playwright Chromium browser via npx playwright install chromium — the ms-playwright/chromium-headless-shell binary was missing on this machine (playwright was installed as a package dep but browser not downloaded); Rule 3 blocking issue auto-fixed"
  - "Test count 38 (plan targeted 36) — added getCardSize and getGridOptions tests to push functions coverage from 69% to 86%; threshold requires 70%; 2 extra tests were cheaper than weakening the threshold"

metrics:
  duration: ~20min
  completed: "2026-04-21T02:06:30Z"
  tasks: 3
  files: 12
---

# Phase 4 Plan 3: Mobile CSS Refinement + Full Test Suite + v0.4.0 Tag Summary

**38 tests across 9 files passing at 96% statement coverage + responsive grid-template-areas CSS swap + rebuilt 48KB bundle + annotated v0.4.0 pushed — Phase 4 complete.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-21T01:58:00Z
- **Completed:** 2026-04-21T02:06:30Z
- **Tasks:** 3 (+ Playwright install auto-fix)
- **Files modified:** 12

## Accomplishments

- Root card gets a `.layout` grid wrapper with `grid-template-areas` responsive swap: mobile (< 600px) stacks header/grid/queue; tablet (600px+) puts grid+queue side by side (60/40); desktop (900px+) tightens to 65/35; wide (1200px+) to 70/30. `@supports not (container-type: inline-size)` fallback included.
- `pd-queue-list` gains `max-height: 600px; overflow-y: auto` at `@container pd-card (min-width: 900px)` — queue right rail scrolls independently on desktop.
- 9 test files, 38 total tests: 5+3+3+6+4+3+3+3+8 across state derivation, all 6 leaf components, editor, and root card.
- `party-dispenser-card.test.ts` uses `sinon.spy(hass, 'callService')` to assert `order_recipe` and `cancel_order` service dispatches — QA-03 critical path verified.
- Coverage: 96.07% statements, 90.47% branches, 86.11% functions, 96.07% lines (all above 70/60/70/70 thresholds).
- Rebuilt 48527-byte bundle reflects final mobile CSS; contains version 0.4.0, grid-template-areas, order_recipe, cancel_order.
- Annotated tag v0.4.0 pushed to origin. Tag message contains all 9 requirement IDs (HACS-03, UI-01..07, QA-03).
- 68/68 Python tests still green. ruff check + format clean.

## Task Commits

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Mobile + desktop CSS refinement | `31fa228` | party-dispenser-card.ts, pd-queue-list.ts |
| 2 | 9 test files + coverage >=70% | `996d01b` | 9 test/*.test.ts, web-test-runner.config.mjs |
| 3 | Rebuilt bundle | `9eb353b` | custom_components/party_dispenser/frontend/party-dispenser-card.js |
| — | v0.4.0 annotated tag | tag `v0.4.0` | pointing to 9eb353b |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Playwright Chromium browser not installed**
- **Found during:** Task 2 first `npm test` run
- **Issue:** `@web/test-runner-playwright` installed as npm package but the actual Chromium headless shell binary was not downloaded to `~/.cache/ms-playwright/`. WTR failed immediately with "Executable doesn't exist" on all 9 test files.
- **Fix:** Ran `npx playwright install chromium` inside the card workspace directory.
- **Impact:** None on plan scope; install succeeded, tests ran normally.
- **Committed in:** Fix not committed (runtime tool installation, not source change).

**2. [Rule 1 - Bug] `__CARD_VERSION__` ReferenceError in tests**
- **Found during:** Task 2 first test run after Playwright fix
- **Issue:** `party-dispenser-card.ts::firstUpdated()` references `__CARD_VERSION__` which rollup injects at build time via `inject-card-version` plugin. WTR's esbuildPlugin doesn't apply rollup plugins, so the global was undefined in the test environment — threw `ReferenceError` on every `fixture<PartyDispenserCard>(...)` instantiation.
- **Fix:** Added `define: { __CARD_VERSION__: JSON.stringify('test') }` to the `esbuildPlugin` configuration in `web-test-runner.config.mjs`.
- **Files modified:** `www/community/party-dispenser-card/web-test-runner.config.mjs`
- **Committed in:** `996d01b` (Task 2 commit)

**3. [Rule 1 - Bug] Service call events dispatched from wrong DOM scope**
- **Found during:** Task 2 first test run (3 failures: order_recipe + cancel_order asserts not met)
- **Issue:** `party-dispenser-card.test.ts` dispatched `pd-order-recipe` and `pd-cancel-order` from `el` (the host element in the light DOM). The `@pd-order-recipe` / `@pd-cancel-order` Lit event listeners are bound to `<ha-card>` inside the shadow root. Events dispatched from the light-DOM host don't bubble INTO the shadow DOM — they bubble UP from it. So the listeners on `ha-card` never fired.
- **Fix:** Changed event dispatch target from `el` to `el.shadowRoot!.querySelector('ha-card')!`. Events dispatched from inside the shadow root bubble naturally through `ha-card`, triggering the `@pd-order-recipe` / `@pd-cancel-order` handlers.
- **Files modified:** `www/community/party-dispenser-card/test/party-dispenser-card.test.ts`
- **Committed in:** `996d01b` (Task 2 commit)

**4. [Rule 2 - Coverage] Added 2 extra tests to push functions coverage above 70%**
- **Found during:** Task 2 first clean test run after fixes 1-3 — functions coverage at 69.44% (1 test short of 86% required)
- **Issue:** `getCardSize()` and `getGridOptions()` on PartyDispenserCard were uncovered (and `getStubConfig()` / `getConfigElement()` partially). Functions threshold requires 70%; 69.44% missed by 0.56%.
- **Fix:** Added 2 tests (`getCardSize returns a number`, `getGridOptions returns rows and columns config`) to `party-dispenser-card.test.ts`. Final functions coverage: 86.11%.
- **Files modified:** `www/community/party-dispenser-card/test/party-dispenser-card.test.ts`
- **Committed in:** `996d01b` (Task 2 commit)

---

**Total deviations:** 1 Rule 3 (blocking browser install), 3 Rule 1/2 auto-fixes in test code/wtr config.
**Impact on plan:** Minimal — all deviations were test infrastructure issues, not behavioral changes to production code. Source components are unchanged from Plan 04-02 except the CSS additions in Task 1.

## Verification Results

| Check | Result |
|-------|--------|
| `npm run typecheck` | PASS (exit 0) |
| `npm run build` | PASS (exit 0, 48527 bytes) |
| `npm test` | PASS (38/38 tests, coverage 96% stmts, 86% funcs, 90% branches) |
| Grep gate: no `fetch(` in src/ | PASS |
| Grep gate: no hex outside `:host` | PASS |
| `grep -c '"0.4.0"' ...party-dispenser-card.js` | 2 (PASS) |
| `grep -q 'grid-template-areas' ...party-dispenser-card.js` | PASS |
| Bundle size < 150KB | PASS (48527 bytes) |
| `git cat-file -t v0.4.0` | `tag` (annotated — PASS) |
| `git ls-remote --tags origin v0.4.0` | PASS (present on remote) |
| `.venv/bin/pytest tests/ -v` | 68/68 PASS |
| `ruff check .` | PASS |
| `ruff format --check .` | PASS |
| version alignment (manifest/const/pyproject) | 0.4.0 (PASS) |

## Known Stubs

None — all components are fully wired to live HA entity state. Service calls tested with sinon.spy. Coverage >=70% on all metrics. Bundle is built, committed, and served by Python integration.

## Self-Check

Checking created files exist and commits are present:

- `www/community/party-dispenser-card/test/state.test.ts` — FOUND
- `www/community/party-dispenser-card/test/party-dispenser-card.test.ts` — FOUND
- `custom_components/party_dispenser/frontend/party-dispenser-card.js` — FOUND
- Commit `31fa228` — FOUND (feat: mobile CSS)
- Commit `996d01b` — FOUND (test: 38 tests)
- Commit `9eb353b` — FOUND (chore: rebuild bundle)
- Tag `v0.4.0` (annotated) — FOUND and pushed to origin
