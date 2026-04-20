---
phase: 4
slug: custom-lovelace-card
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-20
---

# Phase 4 — UI Design Contract: `custom:party-dispenser-card`

> Visual and interaction contract for the Party Dispenser custom Lovelace card (lit-element + TypeScript + rollup). This document is the downstream source of truth for the planner (who inlines contract snippets into plan `<action>` blocks) and the executor (who implements against it). Citations are end-of-line; every external claim links to a URL that was fetched on 2026-04-20.

---

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Visual Direction](#2-visual-direction)
3. [Design System Tokens](#3-design-system-tokens)
4. [Typography Scale](#4-typography-scale)
5. [Spacing Scale](#5-spacing-scale)
6. [Component Hierarchy](#6-component-hierarchy)
7. [State Ownership & Data Flow](#7-state-ownership--data-flow)
8. [Interaction Specs](#8-interaction-specs)
9. [Responsive Layout](#9-responsive-layout)
10. [Accessibility Contract](#10-accessibility-contract)
11. [Empty / Error / Loading States](#11-empty--error--loading-states)
12. [Copywriting Contract](#12-copywriting-contract)
13. [HACS Distribution Path](#13-hacs-distribution-path-decision)
14. [Card Editor (`getConfigElement`)](#14-card-editor-getconfigelement)
15. [Test Coverage Requirements (QA-03)](#15-test-coverage-requirements-qa-03)
16. [Animation / Transition Specs](#16-animation--transition-specs)
17. [Build Output Shape](#17-build-output-shape)
18. [Integration Quality Scale Considerations](#18-integration-quality-scale-considerations)
19. [Per-Requirement UI Mapping](#19-per-requirement-ui-mapping)
20. [Registry Safety](#20-registry-safety)
21. [Checker Sign-Off](#21-checker-sign-off)
22. [Sources](#22-sources)

---

## 1. Executive Summary

**The card is a single lit-element web component (`party-dispenser-card`) composed of 6 nested sub-elements (`pd-summary-header`, `pd-recipe-grid`, `pd-recipe-tile`, `pd-queue-list`, `pd-queue-item`, `pd-editor`).** Root owns all derived state; children are pure props/events. Theming is 100% driven by Home Assistant CSS variables (`--primary-color`, `--card-background-color`, etc.) with fallback palette defined at `:host` for preview harnesses. Distribution: **embedded-card pattern** — the Python integration registers a static path and auto-creates the Lovelace resource at startup (single HACS install, category = `integration`). Testing: `@web/test-runner` (HA/Lovelace community standard) with `@open-wc/testing` helpers, coverage target ≥70% on TypeScript source. Interactions are optimistic with WS reconciliation: tap recipe → service call → optimistic "queued" chip → backend's `queue_updated` WS event arrives within ~200ms → coordinator refresh → sensor state update → card re-renders with real queue.

**Visual direction:** Hybrid (c) — the card structurally matches Home Assistant's **Mushroom chip-and-card convention** (horizontally scrolling chips for the summary, stacked cards for recipes and queue), but visual accents (soft glow on featured tiles, status pill styling, the specific copy voice) are pulled from the dispenser's Vue frontend so users recognize the brand language. All colors use HA theme variables — the Vue frontend's amber `#f3b366` and teal `#8dc7c5` palette is inspiration only, never hard-coded.

**Non-negotiable contracts established here:**
- Spacing uses HA-native `--ha-space-*` scale when present, falls back to project-local `--pd-space-*` tokens (4/8/12/16/24/32/48).
- Typography uses HA-native `--ha-font-size-*` when present, falls back to explicit rem values (0.75/0.875/1/1.25rem).
- No hardcoded hex colors anywhere in `.ts` or `.css` under `src/`. Grep gate: `grep -rE '#[0-9a-fA-F]{3,6}' src/` must return zero matches except inside `.storybook/` or test-fixture JSON.
- All interactive elements have `aria-label` AND visible focus ring that contrasts against both light and dark themes.
- Reduced-motion: all transitions/animations are gated behind `@media (prefers-reduced-motion: no-preference)`; reduced motion snaps state instantly.

---

## 2. Visual Direction

### 2.1 Direction Chosen: (c) Hybrid — Mushroom structure + dispenser-brand voice

**Reasoning:**
- **Structural match to Mushroom (option a):** Mushroom is the de facto community exemplar for Lovelace cards that feel "native" to HA — it's referenced in every HA frontend tutorial, uses Lit 3.3.1 + rollup + pure HA CSS variables, and has 5k+ GitHub stars [(piitaya/lovelace-mushroom)](https://github.com/piitaya/lovelace-mushroom). Users' dashboards already contain Mushroom chips; our card blending in instead of looking bespoke is an unqualified win for mobile companion UX. [REQ UI-07]
- **Voice match to dispenser Vue frontend (option b):** The existing dispenser frontend (fetched via `glab api ... projects/11/repository/files/frontend%2F...`) uses confident hospitality-industry copy ("Featured pours", "Service rail", "Ready to pour", "Awaiting the next pour"). Adopting that voice preserves brand identity across the dispenser's own UI and the HA dashboard — users see the same product, not two unrelated UIs. This is a CONTEXT-locked direction.
- **Why NOT pure option a:** Vanilla Mushroom voice is inert utility ("3 items in queue"); the dispenser has a specific party/bar identity worth carrying over.
- **Why NOT pure option b:** The Vue frontend's gorgeous dark-glass aesthetic (radial gradients, backdrop-filter blur, custom serif font pairing) is incompatible with HA's theme system. Replicating it would require hardcoded colors that break when users switch themes. HA is the chrome; the card is the content — we respect that hierarchy.

### 2.2 Mood

*Think: a crisp chip rail at the top that reads like a line of cocktail coasters laid out on a bar — queue size, makeable count, and connection status as three peer pieces of information. Below it, a grid of recipe tiles where makeable recipes feel alive (full color, subtle hover lift) and not-makeable recipes feel muted (60% opacity, no lift, shows the missing-count as a chip overlay). A "Place order" interaction never requires a second tap — single-gesture commitment, optimistic "Queued" chip appears instantly. On the side (or below, on mobile) the queue list feels like a receipt printer: each item stacked with recipe name, state (Queued / Preparing / Pouring / Ready), and a single X to cancel. The current order pulses gently at the top to signal "this is what's happening right now." Disconnected state is not catastrophic — the card doesn't hide, it just desaturates and shows a subtle "Reconnecting…" caption, because the polling fallback continues working.*

*The overall feel: quiet, confident, service-industry UI. Not a dashboard trying to be clever; a piece of equipment that does one job well. Same design language spec as Mushroom's "utility" cards, but with the dispenser's warmth in the copy.*

---

## 3. Design System Tokens

**Rule:** All color, spacing, typography, and radius values resolve through CSS variable fallbacks:

```css
/* Pattern used everywhere in src/*.ts lit-css blocks */
color: var(--primary-text-color, var(--pd-text-primary, #1f1f1f));
background: var(--card-background-color, var(--pd-surface, #ffffff));
```

This ensures: (1) HA theme support is automatic; (2) card still renders correctly in the `@web/test-runner` harness (no HA shell = no variables), via the project-local `--pd-*` fallback layer; (3) the final hardcoded literal is a last-resort safety net only.

### 3.1 HA Theme Variables — What the card reads

Verified against the HA frontend source at [home-assistant/frontend:src/resources/styles.ts](https://github.com/home-assistant/frontend) (properties confirmed present in 2026.4 via WebFetch):

| Role | HA Variable | Fallback (`:host` scope) | Usage |
|------|-------------|--------------------------|-------|
| Text primary | `--primary-text-color` | `--pd-text-primary: #1f1f1f` (light) / `#e1e1e1` (dark, via `prefers-color-scheme`) | Recipe names, queue item names, headers |
| Text secondary | `--secondary-text-color` | `--pd-text-secondary: #6a6a6a` | Subtitles, metadata, "Queued 30s ago" |
| Text muted / disabled | `--disabled-text-color` (HA) / `--secondary-text-color` fallback | `--pd-text-muted: rgba(106,106,106,0.6)` | Disabled recipe tiles, dimmed queue items |
| Surface / card bg | `--card-background-color` | `--pd-surface: #ffffff` (light) / `#1e1e1e` (dark) | Card root background |
| Surface elevated | `--ha-card-background` (alias; HA sets this to `--card-background-color` with subtle elevation) | `--pd-surface-elevated: #ffffff` | Recipe tiles, queue items |
| Surface hairline | `--divider-color` | `--pd-divider: rgba(0,0,0,0.12)` / dark: `rgba(255,255,255,0.12)` | Borders, separators |
| Accent (primary) | `--primary-color` | `--pd-accent: #03a9f4` (HA's default primary blue) | Primary CTA (Order button), focus ring, "current order" pulse |
| Accent (secondary/warn) | `--warning-color` | `--pd-warn: #ff9800` | "Preparing" state chip, "not makeable" hints |
| Accent (success) | `--success-color` (introduced in HA 2024+) | `--pd-success: #4caf50` | Connected indicator dot, "Ready to pour" chip |
| Accent (danger/destructive) | `--error-color` | `--pd-danger: #f44336` | Cancel button hover, "Disconnected" chip, error banners |
| Chip bg (subtle) | `--secondary-background-color` | `--pd-chip-bg: rgba(0,0,0,0.06)` / dark: `rgba(255,255,255,0.06)` | Summary chip backgrounds |
| State inactive | `--state-inactive-color` | `--pd-text-muted` | Not-makeable recipe tile text |
| State active | `--state-active-color` | `--pd-accent` | Makeable recipe tile accent line |

**Rule:** No hex literal appears OUTSIDE the `:host` fallback block. Grep gate in CI:
```bash
# Run from card workspace root (www/community/party-dispenser-card/ or similar):
test $(grep -rE '#[0-9a-fA-F]{3,8}' src/ | grep -v ':host' | wc -l) -eq 0
```

### 3.2 Radius tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--pd-radius-sm` | `6px` (fallback) / `var(--ha-border-radius-sm, 6px)` | Chips, small indicators |
| `--pd-radius-md` | `12px` / `var(--ha-card-border-radius, 12px)` | Recipe tiles, queue items, buttons |
| `--pd-radius-lg` | `16px` / `var(--ha-card-border-radius-lg, 16px)` | Root card container |

HA's `--ha-card-border-radius` exists and is used by core cards; fallback at 12px matches HA core card default in 2026.4.

### 3.3 Shadow tokens

HA's stock cards rely on the container's elevation; we defer entirely. Our card does NOT set `box-shadow` on the root — the parent `<ha-card>` wrapper (or the Lovelace view) owns chrome. Interior elements (recipe tiles, queue items) use a soft hairline `border: 1px solid var(--divider-color)` instead of shadow — matches Mushroom's approach and avoids double-shadow conflicts.

### 3.4 Icon library

**Decision:** Use HA's built-in `<ha-icon>` element with Material Design Icons (`mdi:*` names). [REQ UI-07]

- No custom SVG shipped in the bundle (keeps bundle small, keeps visual consistency with every other HA entity)
- `<ha-icon>` is globally available in the Lovelace DOM; no import needed on our side
- Icon set used:
  | Element | Icon |
  |---------|------|
  | Queue summary chip | `mdi:playlist-music` (matches existing sensor icon in `sensor.py` line 52) |
  | Makeable count chip | `mdi:glass-cocktail` (matches `sensor.py` line 112) |
  | Connected (on) | `mdi:wifi` |
  | Connected (off) | `mdi:wifi-off` |
  | Recipe tile, makeable | `mdi:circle` (tiny, green dot overlay) |
  | Recipe tile, not makeable | `mdi:close-circle-outline` (with missing count) |
  | Queue cancel button | `mdi:close` |
  | Queue state Preparing | `mdi:progress-clock` |
  | Queue state Pouring | `mdi:cup-water` |
  | Queue state Ready | `mdi:check-circle` |

### 3.5 Font

No custom font shipped. Use `var(--paper-font-body1_-_font-family, var(--ha-font-family-body, var(--mdc-typography-font-family, inherit)))` — chain falls through HA's layered font token system, verified against [home-assistant/frontend:src/resources/styles.ts](https://github.com/home-assistant/frontend). Ultimate fallback: `inherit` (picks up dashboard/page font).

### 3.6 Design System Summary Table

| Property | Value |
|----------|-------|
| Tool | None — hand-rolled lit-element card shipping no third-party UI framework |
| Preset | Not applicable (no shadcn/radix/base-ui) |
| Component library | Lit 3.3.1 (HA convention; matches Mushroom's Lit version) |
| Icon library | HA's built-in `<ha-icon>` + MDI icon set (`mdi:*`) — zero bundle cost |
| Font | Inherited via HA CSS variable chain — no webfont shipped |
| Theme variables | HA CSS custom properties (`--primary-color`, `--card-background-color`, etc.) with project-local `--pd-*` fallbacks scoped to `:host` |

---

## 4. Typography Scale

### 4.1 Decision: HA-relative with explicit-fallback pairing

The card declares 4 semantic typography levels, each resolved via a two-layer CSS variable chain: HA's native `--ha-font-size-*` (introduced in 2024+) first, project-local `--pd-font-size-*` second, hardcoded rem literal last. This satisfies REQ UI-07 ("match HA core conventions") while keeping the card testable in harnesses where HA variables don't exist.

### 4.2 Scale

| Role | Font Size (fallback) | Weight (fallback) | Line Height | Usage |
|------|---------------------|-------------------|-------------|-------|
| Caption | `var(--ha-font-size-s, 0.75rem)` — **12px** | `var(--ha-font-weight-normal, 400)` | 1.4 | Metadata ("Queued 30s ago"), missing-ingredient chips |
| Label | `var(--ha-font-size-m, 0.875rem)` — **14px** | `var(--ha-font-weight-medium, 500)` | 1.5 | Chip labels, button text, queue state indicator |
| Body | `var(--ha-font-size-m, 1rem)` — **16px** | `var(--ha-font-weight-normal, 400)` | 1.5 | Recipe names, queue item names (default reading) |
| Heading | `var(--ha-font-size-l, 1.25rem)` — **20px** | `var(--ha-font-weight-medium, 500)` | 1.3 | Card title ("Party Dispenser"), section eyebrows |

**Four sizes, two weights.** No "Display" size (the card never owns the top-of-page hero slot in a Lovelace dashboard; dashboards have their own view titles).

### 4.3 Lit-css block (authoritative copy)

```typescript
// src/styles/tokens.ts
import { css } from 'lit';

export const typographyTokens = css`
  :host {
    --pd-font-size-caption: var(--ha-font-size-s, 0.75rem);
    --pd-font-size-label:   var(--ha-font-size-m, 0.875rem);
    --pd-font-size-body:    var(--ha-font-size-m, 1rem);
    --pd-font-size-heading: var(--ha-font-size-l, 1.25rem);

    --pd-font-weight-normal: var(--ha-font-weight-normal, 400);
    --pd-font-weight-medium: var(--ha-font-weight-medium, 500);

    --pd-line-height-tight:  1.3;
    --pd-line-height-normal: 1.5;
    --pd-line-height-loose:  1.6;
  }
`;
```

---

## 5. Spacing Scale

### 5.1 Decision: 4-point grid, 7 tokens

Base unit 4px. Rejected the 8-point scale because HA's own `--ha-space-*` tokens (verified in `material_colors.ts` fetch) are 4-point-based (`--ha-space-2` = 8px, `--ha-space-10` = 40px — a clear 4px grid).

### 5.2 Tokens

| Token | Value | HA chain | Usage |
|-------|-------|----------|-------|
| `--pd-space-xs` | `4px` | `var(--ha-space-1, 4px)` | Icon gap inside a chip, border thickness |
| `--pd-space-sm` | `8px` | `var(--ha-space-2, 8px)` | Inline padding on small buttons, gap between chips in the summary rail |
| `--pd-space-md` | `12px` | `var(--ha-space-3, 12px)` | Recipe tile inner padding, queue item vertical padding |
| `--pd-space-lg` | `16px` | `var(--ha-space-4, 16px)` | Default element spacing, section padding |
| `--pd-space-xl` | `24px` | `var(--ha-space-6, 24px)` | Gap between grid rows, card outer padding |
| `--pd-space-2xl` | `32px` | `var(--ha-space-8, 32px)` | Major section breaks (header ↔ grid, grid ↔ queue) |
| `--pd-space-3xl` | `48px` | `var(--ha-space-12, 48px)` | Empty-state illustration padding |

### 5.3 Exceptions

**Touch targets must be ≥44×44px** per WCAG 2.5.5 Level AAA and Apple HIG (iOS Companion app is our primary mobile target). The recipe tile's tap area is the entire tile — naturally ≥44×44px at all breakpoints. The queue item's cancel X button is a 32×32px icon centered in a 44×44px tap shell:

```css
.cancel-button {
  /* Visible icon: 32x32. Tap surface: 44x44 via negative margin offset. */
  width: 32px;
  height: 32px;
  margin: -6px;       /* Push the tap hit-zone outward by 6px all sides */
  padding: 6px;       /*   "                  "                       */
}
```

---

## 6. Component Hierarchy

### 6.1 Decision: Nested 6-component tree

Rejected the "flatten into one big component" alternative. Nesting wins because:
1. **Testability:** Each sub-component can be unit-tested in isolation (target ≥70% coverage per QA-03 is materially easier).
2. **Memoization:** Lit's reactive updates only re-render changed sub-trees. A single big component re-renders the entire DOM on every coordinator tick.
3. **Readability:** Each file ≤ 150 lines vs. a 600+ line monolith.

### 6.2 Tree

```
<party-dispenser-card>                   [src/party-dispenser-card.ts]
├── <pd-summary-header>                  [src/components/pd-summary-header.ts]
│   ├── <pd-summary-chip> (queue size)
│   ├── <pd-summary-chip> (makeable count)
│   └── <pd-summary-chip> (connected indicator)
├── <pd-recipe-grid>                     [src/components/pd-recipe-grid.ts]
│   └── <pd-recipe-tile>  (N instances)  [src/components/pd-recipe-tile.ts]
└── <pd-queue-list>                      [src/components/pd-queue-list.ts]
    └── <pd-queue-item>   (M instances)  [src/components/pd-queue-item.ts]
```

`<pd-editor>` (the visual config editor) is a peer custom element registered separately, not a child of `<party-dispenser-card>`.

### 6.3 Custom element registration

```typescript
// src/party-dispenser-card.ts — top of file, after class declaration
customElements.define('party-dispenser-card', PartyDispenserCard);
customElements.define('pd-summary-header', PdSummaryHeader);
customElements.define('pd-summary-chip',   PdSummaryChip);
customElements.define('pd-recipe-grid',    PdRecipeGrid);
customElements.define('pd-recipe-tile',    PdRecipeTile);
customElements.define('pd-queue-list',     PdQueueList);
customElements.define('pd-queue-item',     PdQueueItem);
customElements.define('pd-editor',         PdEditor);

// customCards registration (Lovelace card picker discovery)
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'party-dispenser-card',
  name: 'Party Dispenser',
  preview: true,
  description: 'Recipe grid, live queue, and summary for a Party Dispenser backend',
  documentationURL: 'https://gitlab.paskiemgmt.com/ava-organization/party-dispenser/hacs-integration-pd',
});
```

Per [developers.home-assistant.io/docs/frontend/custom-ui/custom-card](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card), the `customCards` global is the discovery hook. `preview: true` opts the card into the Lovelace card picker's live preview grid; `description` shows in the picker tooltip.

### 6.4 Per-component responsibilities

| Component | Responsibility | Inputs (props) | Outputs (events) |
|-----------|---------------|---------------|-----------------|
| `<party-dispenser-card>` | Root; receives `hass` + `config` from Lovelace; computes derived state; handles service calls; re-renders children on hass change | `hass: HomeAssistant`, `config: CardConfig` | (none — emits only log calls on service errors) |
| `<pd-summary-header>` | Chip rail at top of card | `queueSize: number`, `makeableCount: number`, `connected: boolean`, `title: string` | (none — pure display) |
| `<pd-summary-chip>` | Single pill-shaped chip (icon + label + value) | `icon: string`, `label: string`, `value: string`, `tone: 'neutral'\|'success'\|'danger'` | (none) |
| `<pd-recipe-grid>` | Responsive grid container; hides non-makeable recipes below the "all/makeable" toggle | `recipes: Recipe[]`, `maxVisible?: number` | `pd-order-recipe` (detail: `{recipeId: string}`) |
| `<pd-recipe-tile>` | Single tile; image (if backend ships one — v2), name, makeable dot, tap area | `recipe: Recipe`, `disabled: boolean` | `pd-order-recipe` (detail: `{recipeId: string}`) |
| `<pd-queue-list>` | Container; stacks queue items; highlights current-order at top | `queue: QueueItem[]`, `currentOrderId: string\|null` | `pd-cancel-order` (detail: `{orderId: string}`) |
| `<pd-queue-item>` | Single item; recipe name, state chip, cancel X | `item: QueueItem`, `isCurrent: boolean` | `pd-cancel-order` (detail: `{orderId: string}`) |
| `<pd-editor>` | Visual config editor (see §14) | `hass: HomeAssistant`, `config: CardConfig` | `config-changed` (HA convention) |

### 6.5 Event bubbling pattern

All child-to-root events use `composed: true, bubbles: true` so the root can listen once at `<party-dispenser-card>` scope without passing handlers down the tree:

```typescript
// Inside pd-recipe-tile.ts — firing the event
private _onClick() {
  if (this.disabled) return;
  this.dispatchEvent(new CustomEvent('pd-order-recipe', {
    detail: { recipeId: this.recipe.id },
    bubbles: true,
    composed: true,
  }));
}

// Inside party-dispenser-card.ts — listening at the root
@eventOptions({ passive: false })
private _handleOrderRecipe(e: CustomEvent<{recipeId: string}>) {
  this._placeOrder(e.detail.recipeId);
}

render() {
  return html`
    <div @pd-order-recipe=${this._handleOrderRecipe}
         @pd-cancel-order=${this._handleCancelOrder}>
      ${/* ... children ... */}
    </div>`;
}
```

This keeps state ownership centralized (only root talks to `hass.callService`) without prop-drilling handlers.

---

## 7. State Ownership & Data Flow

### 7.1 Ownership rule

**Only `<party-dispenser-card>` reads `hass`. Children receive plain props.**

```
hass (from Lovelace) ──► <party-dispenser-card>
                              │
                              │ derives state (pure functions)
                              ▼
                         ┌─────────────┐
                         │ derivedState │
                         │ ─────────── │
                         │ recipes      │
                         │ queue        │
                         │ queueSize    │
                         │ makeable     │
                         │ currentOrder │
                         │ connected    │
                         └──────┬──────┘
                                │ passed as props
                                ▼
                      sub-components (pure)
```

### 7.2 Derivation layer (`src/state.ts`)

```typescript
import type { HomeAssistant } from 'custom-card-helpers';
import type { Recipe, QueueItem, DerivedState, CardConfig } from './types';

export function deriveState(hass: HomeAssistant, config: CardConfig): DerivedState {
  const prefix = 'sensor.party_dispenser_';
  const recipesEntity = hass.states[`${prefix}recipes`];
  const queueEntity = hass.states[`${prefix}queue_size`];
  const makeableEntity = hass.states[`${prefix}makeable_count`];
  const currentEntity = hass.states[`${prefix}current_order`];
  const connectedEntity = hass.states['binary_sensor.party_dispenser_connected'];

  const recipes: Recipe[] = recipesEntity?.attributes?.recipes ?? [];
  const queue: QueueItem[] = queueEntity?.attributes?.queue ?? [];
  const queueSize: number = queue.length;   // derived from the same attribute
  const makeableCount: number = Number(makeableEntity?.state ?? 0);
  const currentOrderId: string | null = currentEntity?.attributes?.order_id ?? null;
  const connected: boolean = connectedEntity?.state === 'on';

  return {
    recipes,
    queue,
    queueSize,
    makeableCount,
    currentOrderId,
    connected,
    loading: recipesEntity === undefined && queueEntity === undefined,
  };
}
```

**Critical invariants:**
- The card NEVER mutates `hass.states` — Lit's reactive update happens automatically when the parent Lovelace dashboard swaps in a new `hass` prop (which it does on every state change push from HA's WS).
- Derivation is memoized via a shallow-compare on `hass.states` entity references. Lit's `@property({ hasChanged })` guard prevents re-derivation on unrelated state ticks.
- When any referenced entity is `undefined` (card mounted before integration loaded), `loading: true` is set and the card shows skeleton placeholders (§11).

### 7.3 Optimistic local state

The card carries ONE piece of local state: `_optimisticQueue: QueueItem[]`. When the user taps a recipe, we instantly push a synthetic queue item with `state: 'QUEUED_OPTIMISTIC'` and `id: 'optimistic-${uuid}'`. The next `hass` update that contains a real queue item with matching recipe_id within the last 2s causes the optimistic entry to be dropped (reconciled).

```typescript
@state()
private _optimisticQueue: QueueItem[] = [];

private _mergedQueue(derived: DerivedState): QueueItem[] {
  // If real queue has any QUEUED item with matching recipe_id created
  // within the last 2s, drop the optimistic entry for it.
  const reconciledIds = new Set<string>();
  const now = Date.now();
  for (const optItem of this._optimisticQueue) {
    const match = derived.queue.find(q =>
      q.recipe_name === optItem.recipe_name &&
      (now - new Date(q.created_at).getTime()) < 2000
    );
    if (match) reconciledIds.add(optItem.id);
  }
  const activeOpt = this._optimisticQueue.filter(i => !reconciledIds.has(i.id));
  return [...derived.queue, ...activeOpt];
}
```

Optimistic entries auto-expire after 5s if no reconciliation arrives (indicates service call failed silently — unlikely, but defensive):

```typescript
private _placeOrder(recipeId: string) {
  const recipe = this._derived.recipes.find(r => r.id === recipeId);
  if (!recipe) return;
  const optId = `optimistic-${Date.now()}`;
  this._optimisticQueue = [
    ...this._optimisticQueue,
    { id: optId, recipe_name: recipe.name, state: 'QUEUED_OPTIMISTIC', created_at: new Date().toISOString() } as QueueItem,
  ];
  setTimeout(() => {
    this._optimisticQueue = this._optimisticQueue.filter(i => i.id !== optId);
  }, 5000);
  this.hass.callService('party_dispenser', 'order_recipe', { recipe_id: recipeId });
}
```

### 7.4 Type definitions (`src/types.ts`)

Mirrors `custom_components/party_dispenser/api.py` dataclass shapes exactly (RecipeIngredient, Recipe, QueueItem) — TS is the single source of truth for card-side shapes. The sensor's `extra_state_attributes["recipes"]` ships LIGHT recipes (id, name, makeable only — per Phase 2 Decision 02-03 for the 16KB state-attribute limit), so the card's `Recipe` type is the LIGHT variant; full recipe data with ingredients is not available to the card in v1.

```typescript
// src/types.ts
import type { HomeAssistant } from 'custom-card-helpers';

export interface Recipe {
  id: string;
  name: string;
  makeable: boolean;
  // NOTE: ingredients/description intentionally NOT available at card level in v1
  // (sensor ships light attrs only to stay under HA's 16KB attr limit).
  // v2 may add a websocket subscription to fetch full detail on-demand.
}

export interface QueueItem {
  id: string;
  recipe_name: string;
  state: 'QUEUED' | 'PREPARING' | 'POURING' | 'READY' | 'QUEUED_OPTIMISTIC';
  created_at: string;   // ISO 8601
}

export interface CardConfig {
  type: 'custom:party-dispenser-card';
  entity?: string;           // sensor.party_dispenser_queue_size (optional — card auto-discovers)
  title?: string;            // default "Party Dispenser"
  show_connection_status?: boolean;  // default true
  max_recipes_visible?: number;      // default Infinity (show all); truncation is section §9
  show_not_makeable?: boolean;       // default true; false hides non-makeable tiles entirely
}

export interface DerivedState {
  recipes: Recipe[];
  queue: QueueItem[];
  queueSize: number;
  makeableCount: number;
  currentOrderId: string | null;
  connected: boolean;
  loading: boolean;
}

export type { HomeAssistant };
```

We use the `custom-card-helpers` npm package ([GitHub](https://github.com/custom-cards/custom-card-helpers)) for the `HomeAssistant` type — it's the community-standard typing surface for Lovelace cards, pinned ^1.9.0 at time of writing.

---

## 8. Interaction Specs

### 8.1 Place order (tap recipe tile)

| Step | What happens |
|------|--------------|
| 1. Trigger | User taps `<pd-recipe-tile>` where `recipe.makeable === true` |
| 2. Optimistic UI | Within 16ms, a new `<pd-queue-item>` with `state: 'QUEUED_OPTIMISTIC'` appears at the bottom of the queue list with a 250ms slide-down animation (no animation if `prefers-reduced-motion`) |
| 3. Service call | `this.hass.callService('party_dispenser', 'order_recipe', { recipe_id: recipe.id })` — fire-and-forget Promise |
| 4. WS reconciliation | Backend broadcasts `queue_updated` → Phase 3 WS client receives → `coordinator.async_request_refresh()` → `sensor.party_dispenser_queue_size.attributes.queue` mutates → HA pushes new `hass` to Lovelace → our card re-derives state → `_mergedQueue()` drops the optimistic entry (real queue now contains the match) |
| 5. Expected latency | <500ms end-to-end on a local LAN; measurable via timestamp diff between `_placeOrder` call and next `hass` update containing the reconciled entry |
| 6. Error handling | If `hass.callService` returns a rejected promise (HA raised `HomeAssistantError`), optimistic entry stays visible for its 5s TTL then disappears. An HA toast appears automatically (HA's default service-failure behavior — we don't need to handle it). We log to `console.warn` for debugging. |

Exact code:

```typescript
private async _placeOrder(recipeId: string) {
  const recipe = this._derived.recipes.find(r => r.id === recipeId);
  if (!recipe || !recipe.makeable) return;

  // 1. Optimistic state (instant)
  const optId = `optimistic-${recipeId}-${Date.now()}`;
  this._optimisticQueue = [
    ...this._optimisticQueue,
    {
      id: optId,
      recipe_name: recipe.name,
      state: 'QUEUED_OPTIMISTIC',
      created_at: new Date().toISOString(),
    },
  ];
  // 2. Auto-expire optimistic entry if reconciliation never arrives
  setTimeout(() => {
    this._optimisticQueue = this._optimisticQueue.filter(i => i.id !== optId);
  }, 5000);

  // 3. Fire service call
  try {
    await this.hass.callService('party_dispenser', 'order_recipe', { recipe_id: recipeId });
  } catch (err) {
    console.warn('[party-dispenser-card] order_recipe failed:', err);
    // HA's built-in error toast already fired; we just log for devs.
  }
}
```

### 8.2 Cancel order (tap queue item X button)

| Step | What happens |
|------|--------------|
| 1. Trigger | User taps the X button on `<pd-queue-item>` |
| 2. Confirmation | **None** — single-tap cancels. Rationale: canceling a queued cocktail is low-stakes and reversible (user can re-order). Adding a confirmation dialog adds friction for the 99% case. If post-launch telemetry shows accidental cancels are a problem, add a 3-second undo toast in v2. |
| 3. Optimistic UI | Queue item fades out over 200ms (opacity 1 → 0.3, no DOM removal yet — keeps layout stable); when fade completes, the DOM node is removed |
| 4. Service call | `this.hass.callService('party_dispenser', 'cancel_order', { order_id: item.id })` |
| 5. WS reconciliation | Backend broadcasts `queue_updated` → coordinator refresh → item truly gone from `hass.states` → card re-derives → fade-out element now coincides with absence in the real data; no rebound |
| 6. Error handling | If service call fails, the fading item snaps back (opacity 1); HA toast shows error |

### 8.3 Refresh (no user interaction — automatic)

The integration's coordinator polls every 30s by default (DEFAULT_SCAN_INTERVAL in `const.py`) AND receives WS pushes for every queue change. The card does NOTHING explicit for refresh — Lit re-renders automatically whenever Lovelace swaps `hass` in. There is NO user-facing "Refresh" button in v1; users who need to force a refresh can call `party_dispenser.refresh` from Developer Tools.

### 8.4 Connection-status interaction

The `connected` chip shows:
- `mdi:wifi` icon + "Live" label + success-tone (green dot) when `connected === true`
- `mdi:wifi-off` icon + "Reconnecting…" label + danger-tone (red dot) when `connected === false`

Tapping the chip does nothing in v1. (v2 idea: tap opens a tooltip with WS reconnect attempt count + last-connected timestamp — deferred.)

### 8.5 Not supported in v1

| Interaction | Why Deferred |
|-------------|-------------|
| Long-press recipe tile → customize sheet | v2 UX-02 territory — would need ingredient editing; out of card scope (dispenser's own admin UI does this) |
| Swipe-left queue item → cancel shortcut | Polished but adds ~200 LOC + gesture library; single-tap X is the floor |
| Multi-dispenser routing dropdown | v2 MULTI-02 |
| Voice/conversation agent button | v2 UX-01 |
| Drag-to-reorder queue priority | Backend doesn't expose priority mutation yet |

---

## 9. Responsive Layout

### 9.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | `< 600px` | Single-column stack: header → recipe grid (2 cols) → queue (full width below) |
| Tablet | `≥ 600px and < 900px` | Two-column: header full-width, then recipe grid (2 cols, 60% width) + queue rail (40% width, right) |
| Desktop | `≥ 900px and < 1200px` | Three-column grid: header full-width, then recipe grid (3 cols, 65%) + queue rail (35%, right) |
| Wide | `≥ 1200px` | Four-column grid: header full-width, then recipe grid (4 cols, 70%) + queue rail (30%, right) |

These breakpoints are embedded in the card's host shadow DOM via container queries where supported (all modern HA-compatible browsers as of 2026) with media-query fallback. Container queries are correct here because a user may place the card in a 400px-wide Lovelace grid-view cell even on a desktop — we want the mobile layout in that case, not the desktop one based on viewport.

### 9.2 CSS implementation

```css
:host {
  container-type: inline-size;
  container-name: pd-card;
}

/* Mobile default (no container-size conditions) */
.layout {
  display: grid;
  grid-template-areas:
    "header"
    "grid"
    "queue";
  gap: var(--pd-space-lg);
}
.recipe-grid { grid-template-columns: repeat(2, 1fr); }

/* Tablet */
@container pd-card (min-width: 600px) {
  .layout {
    grid-template-areas:
      "header header"
      "grid   queue";
    grid-template-columns: 60% 40%;
  }
  .recipe-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Desktop */
@container pd-card (min-width: 900px) {
  .layout { grid-template-columns: 65% 35%; }
  .recipe-grid { grid-template-columns: repeat(3, 1fr); }
}

/* Wide */
@container pd-card (min-width: 1200px) {
  .layout { grid-template-columns: 70% 30%; }
  .recipe-grid { grid-template-columns: repeat(4, 1fr); }
}

/* Fallback for browsers without container-queries (extremely rare on HA-compatible
   platforms in 2026; HA Companion iOS 16+ supports them) — use viewport media query */
@supports not (container-type: inline-size) {
  @media (min-width: 600px) {
    .layout {
      grid-template-areas: "header header" "grid queue";
      grid-template-columns: 60% 40%;
    }
    .recipe-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 900px) {
    .layout { grid-template-columns: 65% 35%; }
    .recipe-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (min-width: 1200px) {
    .layout { grid-template-columns: 70% 30%; }
    .recipe-grid { grid-template-columns: repeat(4, 1fr); }
  }
}
```

### 9.3 Tested shapes

Each test shape is a dimension the QA plan and executor verify manually against the HA Companion app + browser:

| Width | Device target | Shape to verify |
|-------|---------------|-----------------|
| 375px | iPhone SE / 12/13 mini Portrait Companion | Single column, 2-col recipe grid, queue full-width below. Chips wrap onto 2 lines if needed. All tap targets ≥44×44px. |
| 414px | iPhone Pro Portrait Companion | Same as 375px; verify headers don't truncate "Party Dispenser" |
| 600px | iPad Mini Portrait / narrow Lovelace column | Two-column shape kicks in; queue rail 40% width |
| 900px | iPad Landscape / Lovelace desktop default | Three-col recipe grid; queue rail 35% |
| 1200px | Desktop Lovelace main view | Four-col recipe grid; queue rail 30% |

### 9.4 Companion app considerations

- **Safe-area insets** (iOS notch, Android navigation bar): the card defers entirely to HA's Companion app — HA applies `--safe-area-inset-*` vars at the shell level, not at the card. We do NOT set padding based on safe-area.
- **Scroll containment:** the queue list's overflow is scroll-y inside its container; the recipe grid never scrolls (it expands the card height). This prevents nested-scroll confusion on Companion app's native scroll gestures.
- **Pull-to-refresh:** Companion app's pull-to-refresh applies to the whole dashboard, not individual cards. We do NOT implement our own.

---

## 10. Accessibility Contract

All rules below satisfy REQ UI-07 (match HA core conventions; HA core meets WCAG 2.1 AA) and the card-specific expectations in CONTEXT.md §Accessibility (LOCKED baseline).

### 10.1 Per-component ARIA contract

| Component | Role | ARIA attributes | Keyboard |
|-----------|------|-----------------|----------|
| `<party-dispenser-card>` | `region` | `aria-label="{title}"` where title = config.title \|\| "Party Dispenser" | (container only) |
| `<pd-summary-header>` | `group` | `aria-label="Summary"` | (no interactive children unless `show_connection_status: false` overrides) |
| `<pd-summary-chip>` | `status` (for connected) or no role (for queue-size/makeable-count which are pure info) | `aria-label="{label}: {value}"` e.g. "Queue size: 3"; connected chip uses `aria-live="polite"` | Not focusable (info only) |
| `<pd-recipe-grid>` | `list` | `aria-label="Recipes"` | Tab enters the list; arrow keys move between tiles (see 10.3) |
| `<pd-recipe-tile>` | `listitem` wrapping a `button` | Tile wraps a `<button>` child; aria-label on button = `"{recipe.name}, {makeable ? 'ready to pour' : 'missing ingredients'}"`; `aria-disabled="true"` when not makeable | Enter or Space activates; Tab skips non-makeable tiles |
| `<pd-queue-list>` | `list` | `aria-label="Live queue"`; `aria-live="polite"` so screen readers announce new items arriving | Tab enters the list |
| `<pd-queue-item>` | `listitem` | `aria-label="{recipe_name}, {state}"` e.g. "Margarita, Preparing" | Cancel button is the focusable child (see below) |
| Queue item cancel button | `button` | `aria-label="Cancel {recipe_name} order"` | Enter or Space activates |

### 10.2 Contrast requirements

- Text primary on card background: ≥ 4.5:1 (WCAG AA). HA's default themes already meet this; our fallback `--pd-*` values are chosen to meet 4.5:1 on both `#ffffff` and `#1e1e1e`.
- Icon on chip background: ≥ 3:1 (WCAG AA for graphical elements).
- Focus ring: ≥ 3:1 against every possible background the focused element can sit against.

Verification approach (in test plan — see §15):
- Add a Playwright-driven Lighthouse audit run in CI (Phase 5 tail) against a minimal HA docker instance with the card loaded. Audit fails the build if contrast violations appear. This is deferred to Phase 5; Phase 4 tests assert the CSS variable chain is used correctly but don't run Lighthouse.

### 10.3 Keyboard navigation

| Keystroke | Effect |
|-----------|--------|
| Tab | Move focus forward through: recipe tiles (makeable only) → queue cancel buttons → (none else) |
| Shift+Tab | Reverse |
| Enter / Space on recipe tile | Place order (same as tap) |
| Enter / Space on cancel button | Cancel order |
| Arrow keys on recipe grid | Move focus between tiles in grid order (Up/Down = row, Left/Right = column) |
| Escape | Blur current element (standard) |

Arrow-key navigation within the recipe grid is implemented with a roving tabindex pattern per [W3C ARIA Authoring Practices 1.3 (grid/listbox pattern)](https://www.w3.org/WAI/ARIA/apg/patterns/). One tile has `tabindex="0"` at a time; siblings have `tabindex="-1"`. Arrow keys shift the tabindex-0 between tiles + set focus. This gives keyboard users the same "move around the grid" mental model that mouse users get from hover.

### 10.4 Focus management

- **After placing an order:** focus stays on the recipe tile (user can press Enter again for another round). Do NOT move focus to the new queue item — that would be jarring.
- **After canceling an order:** focus moves to the next queue item if one exists, else to the previous one, else to the first makeable recipe tile (graceful recovery).
- **Focus ring style:** 2px solid `var(--primary-color, var(--pd-accent, #03a9f4))`, 2px offset. Never suppress with `outline: none`.

```css
/* Global focus-ring in host styles — applies to all interactive elements */
:host *:focus-visible {
  outline: 2px solid var(--primary-color, var(--pd-accent, #03a9f4));
  outline-offset: 2px;
  border-radius: var(--pd-radius-sm);
}
```

### 10.5 `prefers-reduced-motion`

All animations/transitions are wrapped in `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users see:
- No slide-in on new queue items (snap appearance)
- No fade-out on cancel (DOM removal is instant)
- No pulse on current-order (static highlight instead)
- No hover-lift on recipe tiles (flat appearance)

Implementation:

```css
.queue-item { transition: opacity 0.2s ease-in; }
@media (prefers-reduced-motion: reduce) {
  .queue-item { transition: none; }
  .queue-item.fading { opacity: 0; }  /* Still fade logically, just instant */
}

.current-order { animation: pulse 2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .current-order { animation: none; background: var(--pd-current-order-static-bg); }
}
```

### 10.6 Screen-reader expectations

- Connected chip uses `aria-live="polite"` so transitions from "Live" → "Reconnecting…" are announced without interrupting.
- Queue list uses `aria-live="polite"` so new queue items are announced (not shouted — `assertive` would be wrong).
- `<pd-recipe-tile>` in not-makeable state has `aria-disabled="true"` + `aria-describedby` pointing to a visually-hidden span listing the missing-count (`"Missing 2 ingredients"`). This gives screen-reader users the same info sighted users see in the chip overlay.

---

## 11. Empty / Error / Loading States

### 11.1 Loading (initial mount before coordinator first-refresh)

Triggered by: `derived.loading === true` (all entity states `undefined`).

Visual:
- Skeleton header: 3 chip-shaped grey boxes (width 80px/60px/80px, height 28px)
- Skeleton grid: 4 tile-shaped grey boxes (width 100%, height 72px) arranged in a 2×2 grid
- Skeleton queue: 2 item-shaped grey boxes (width 100%, height 48px)
- Grey = `var(--divider-color, rgba(0,0,0,0.08))`
- Subtle pulse animation (opacity 0.4 → 0.8) — disabled under reduced-motion

Copy: (none — skeleton is silent)

### 11.2 No recipes configured

Triggered by: `derived.recipes.length === 0` AND `derived.loading === false`.

Visual:
- Recipe grid area shows a centered empty-state block
- Icon: `mdi:glass-cocktail-off` (48px, muted tone)
- Padding: `--pd-space-3xl` top and bottom

Copy:
- Heading: **"No recipes yet"**
- Body: **"Open the dispenser app to add recipes. They'll appear here automatically."**

### 11.3 Empty queue

Triggered by: `derived.queue.length === 0 && derived.loading === false`.

Visual:
- Queue list area shows a centered empty-state block
- Icon: `mdi:cup-outline` (32px, muted tone)
- Padding: `--pd-space-xl`

Copy:
- Heading: **"Queue empty"**
- Body: **"Pick a recipe to get started."**

### 11.4 Disconnected (WS offline)

Triggered by: `derived.connected === false` AND `derived.loading === false`. The integration's polling fallback continues; recipes and queue remain interactive. But recent data may be stale, so:

Visual:
- Connected chip shows `mdi:wifi-off` + "Reconnecting…" + danger tone (red dot)
- Recipe tiles: full opacity (still interactive — polling works)
- Queue items: full opacity (still interactive)
- Non-blocking banner in the header: muted text "Live updates paused — retrying"

Copy:
- Connected chip: **"Reconnecting…"** (not "Offline" — implies transient)
- Banner (optional, shows only when disconnected > 30s): **"Live updates paused — retrying. Actions still work via polling."**

**Explicit non-behavior:** We do NOT grey-out the entire card on disconnect. The integration's polling coordinator continues working (Phase 3 ensures `local_push` has `local_polling` as a fallback). Disabling tiles would make the card useless during brief network hiccups. Only the "Live" badge changes. This is a departure from the CONTEXT.md specific draft ("gray-out queue + disable tiles") — the researcher's recommendation, based on the integration's actual polling-fallback behavior.

### 11.5 Error: service call failed

Triggered by: `hass.callService` promise rejects with `HomeAssistantError` (JWT revoked, backend 500, etc.).

Visual:
- HA's native error toast appears (we do NOT render our own banner — toast is HA's standard UX)
- The optimistic queue entry (if any) expires after 5s and disappears silently
- Connected chip may flip to "Reconnecting…" depending on the underlying failure

Copy: (HA owns the toast copy via the exception's `str()`; our handlers raise descriptive messages like "Party Dispenser rejected JWT: …" per `services.py` lines 87–92)

### 11.6 Error: integration not configured

Triggered by: No party_dispenser config entry loaded → entity states are undefined → `derived.loading` never flips to `false`.

Visual:
- After 5s of still-loading, card shows the "No integration" fallback:
- Icon: `mdi:alert-circle-outline` (48px, warning tone)
- Centered block

Copy:
- Heading: **"Party Dispenser not set up"**
- Body: **"Install the integration in Settings → Devices & Services."**

---

## 12. Copywriting Contract

English-only v1 per CONTEXT.md `<domain>` out-of-scope. Tone: **confident, service-industry, concise**. Draws from the Vue frontend's voice ("Featured pours", "Service rail") while keeping things tight enough to fit chip widths on 375px screens.

### 12.1 All strings

| Location | Copy |
|----------|------|
| Card title (default) | **Party Dispenser** |
| Card title (user-overridable via `config.title`) | User-defined |
| Summary chip: queue size | label: **Queue**  ·  value: `{N}` |
| Summary chip: makeable count | label: **Ready**  ·  value: `{N}` |
| Summary chip: connected (on) | label: **Live**  ·  value: `{mdi:wifi}` |
| Summary chip: connected (off) | label: **Reconnecting…**  ·  value: `{mdi:wifi-off}` |
| Recipe tile: makeable label | **Ready to pour** |
| Recipe tile: not makeable label | **Missing {N}** ingredients (N from `missing_count` — but sensor ships LIGHT recipes without missing_count, so fallback to **Not available** if N undefined) |
| Primary CTA | **Order** (button text on hover/focus of a makeable tile; the entire tile is clickable — button label is for screen readers) |
| Primary CTA (screen reader aria-label) | **Order {recipe_name}** |
| Queue item: state QUEUED | **Queued** |
| Queue item: state PREPARING | **Preparing** |
| Queue item: state POURING | **Pouring** |
| Queue item: state READY | **Ready** |
| Queue item: state QUEUED_OPTIMISTIC (our synthetic state) | **Sending…** |
| Queue item: cancel button | icon only (`mdi:close`); aria-label: **Cancel {recipe_name} order** |
| Empty recipes heading | **No recipes yet** |
| Empty recipes body | **Open the dispenser app to add recipes. They'll appear here automatically.** |
| Empty queue heading | **Queue empty** |
| Empty queue body | **Pick a recipe to get started.** |
| Not-configured heading | **Party Dispenser not set up** |
| Not-configured body | **Install the integration in Settings → Devices & Services.** |
| Disconnected banner (stale >30s) | **Live updates paused — retrying. Actions still work via polling.** |
| Editor: entity field label | **Queue size sensor** |
| Editor: title field label | **Title** |
| Editor: title field helper | **Shown at the top of the card. Default: "Party Dispenser".** |
| Editor: show_connection_status label | **Show live/offline indicator** |
| Editor: max_recipes_visible label | **Max recipes visible** |
| Editor: max_recipes_visible helper | **Leave blank to show all. Truncates the grid from the bottom.** |
| Editor: show_not_makeable label | **Show recipes with missing ingredients** |

### 12.2 Destructive actions

There is exactly ONE destructive action in v1: **Cancel order**. Per §8.2, we do NOT show a confirmation dialog in v1 (low-stakes, reversible by re-ordering). This is an intentional simplification logged for review — if post-launch telemetry shows accidental cancels are a pain, v2 adds a 3-second undo toast.

### 12.3 Error messages

All error copy comes from the integration's `HomeAssistantError` subclasses (see `services.py` lines 87–92). The card does NOT generate its own error copy — it relies entirely on HA's toast rendering of the raised exception's message. Rationale: consistency with HA's service-call error patterns, and no i18n complications (HA handles translation).

---

## 13. HACS Distribution Path Decision

### 13.1 Decision: (a) Embedded card

**The Python integration registers a static HTTP path and auto-adds the card as a Lovelace resource at `async_setup`.** Single HACS install, category = `integration`. The card's source tree lives at `www/community/party-dispenser-card/` for development (and matches the Phase 1 placeholder); the build script copies the bundled `.js` into `custom_components/party_dispenser/frontend/` at build time, where Python serves it.

### 13.2 Reasoning

| Factor | Embedded (a) | Split-repo (b) |
|--------|--------------|-----------------|
| HACS installs | 1 | 2 (and the user must add both custom repo URLs) |
| User Lovelace resource config | Automatic | Manual (unless we ship an extra HACS plugin repo too, which is more work than embedded) |
| Version skew risk | Zero (single version in manifest) | Real (card v0.4 with integration v0.3) |
| HACS category | `integration` (no conflict) | integration + plugin (separate repos) |
| CI complexity | Single pipeline | Two (GitLab + GitHub mirror for each) |
| HA 2026 support | Full — `async_register_static_paths` is GA since 2024.7 | Full |
| Quality-scale implication | Bronze-clean | Bronze-clean |
| CONTEXT.md bias | "leaned toward (a)" | Alternative |

**Decisive:** eliminating the "add two custom repositories" onboarding friction is worth the small amount of extra Python code to register the static path + resource. Phase 1 already landed a no-op Python module (`__init__.py`); extending it to register a static path is 30 lines of additional code, following the canonical pattern documented at [gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492](https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492) (verified 2026-04-20).

The HACS limitation "one category per repo" ([hacs.xyz/docs/publish/plugin](https://www.hacs.xyz/docs/publish/plugin/), and Phase 1 research Pitfall 1) makes option (b) strictly worse absent a very strong reason — there isn't one.

### 13.3 Implementation outline (for planner, executor)

Python side (new file `custom_components/party_dispenser/frontend/__init__.py`):

```python
"""Register the embedded Lovelace card as a static resource."""
from __future__ import annotations
from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.components.http import StaticPathConfig
from homeassistant.core import CoreState, callback
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED

from ..const import DOMAIN, LOGGER, VERSION

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

URL_BASE = f"/{DOMAIN}_frontend"  # becomes /party_dispenser_frontend/party-dispenser-card.js
CARD_FILENAME = "party-dispenser-card.js"
CARD_NAME = "Party Dispenser Card"


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register the card's static path + Lovelace resource. Idempotent."""
    frontend_dir = Path(__file__).parent  # this __file__ lives in frontend/__init__.py
    if not (frontend_dir / CARD_FILENAME).is_file():
        LOGGER.warning("Party Dispenser card bundle not found at %s; skipping register", frontend_dir)
        return

    # 1. Static path registration — idempotent: HA raises RuntimeError if already registered
    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(URL_BASE, str(frontend_dir), cache_headers=False)]
        )
    except RuntimeError:
        LOGGER.debug("Static path %s already registered", URL_BASE)

    # 2. Lovelace resource — only in storage mode; YAML users add it manually
    lovelace = hass.data.get("lovelace")
    if not lovelace:
        LOGGER.debug("Lovelace not yet loaded; resource registration skipped")
        return
    resource_mode = getattr(lovelace, "mode", None) or getattr(lovelace, "resource_mode", "yaml")
    if resource_mode != "storage":
        LOGGER.info("Lovelace in YAML mode; add resource manually: %s/%s", URL_BASE, CARD_FILENAME)
        return
    if not lovelace.resources.loaded:
        LOGGER.debug("Lovelace resources still loading; retrying on EVENT_HOMEASSISTANT_STARTED")
        return

    url = f"{URL_BASE}/{CARD_FILENAME}?v={VERSION}"
    existing = [r for r in lovelace.resources.async_items() if r["url"].startswith(URL_BASE)]
    for resource in existing:
        if resource["url"].split("?")[0] == f"{URL_BASE}/{CARD_FILENAME}":
            # Update if version changed
            current_version = resource["url"].split("?v=")[-1] if "?v=" in resource["url"] else ""
            if current_version != VERSION:
                LOGGER.info("Updating %s resource to v%s", CARD_NAME, VERSION)
                await lovelace.resources.async_update_item(resource["id"], {"res_type": "module", "url": url})
            return
    # Not found → create
    LOGGER.info("Registering %s v%s", CARD_NAME, VERSION)
    await lovelace.resources.async_create_item({"res_type": "module", "url": url})
```

Wire into `__init__.py::async_setup` (called once per HA lifetime, not per config entry):

```python
# Add to existing __init__.py
from .frontend import async_register_frontend

async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Global setup — register services + frontend resources."""
    async_setup_services(hass)  # existing; Phase 2

    # Register card resource now if HA is already running, else on startup event
    async def _register(_event: Event | None = None) -> None:
        await async_register_frontend(hass)

    if hass.state == CoreState.running:
        await _register()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _register)
    return True
```

Add `"frontend"` and `"http"` to `manifest.json::dependencies`:

```json
{
  "dependencies": ["frontend", "http"],
  ...
}
```

The existing `manifest.json` already has `"dependencies": []`; planner will flip this.

Build step (Task in 04-02 plan) copies `www/community/party-dispenser-card/dist/party-dispenser-card.js` (rollup output) to `custom_components/party_dispenser/frontend/party-dispenser-card.js` (served path). Done in the same commit as the card code to keep the HA install atomic.

### 13.4 What Phase 1 left behind

- `www/community/party-dispenser-card/` — keep as the card source-of-truth workspace (where rollup runs, where `package.json` lives, where tests run). Does NOT ship to HACS in its built form.
- The README at that path is stale ("Phase 1 placeholder") — Phase 4 will rewrite it to describe the build workflow.
- `hacs.json` stays as-is at the root (integration category only; no "plugin" category added — not needed for embedded-card pattern).

### 13.5 YAML-mode Lovelace users

HA has two Lovelace modes: `storage` (default; edits via UI) and `yaml` (user edits `ui-lovelace.yaml` directly). Our auto-registration only works in storage mode. YAML users will see a LOGGER.info message:

> "Lovelace in YAML mode; add resource manually: /party_dispenser_frontend/party-dispenser-card.js"

And we'll document this in the Phase 6 README.

---

## 14. Card Editor (`getConfigElement`)

### 14.1 Scope for v1

Keep minimal. The visual editor is a legitimate nice-to-have for REQ HACS-03 (makes the card discoverable in Lovelace's card picker with GUI-editable config), but over-investing wastes Phase 4 effort. Four fields:

1. **Entity** (queue size sensor) — auto-discovered default; user rarely changes
2. **Title** — optional string override
3. **Show connection status** — boolean toggle
4. **Max recipes visible** — optional integer
5. **Show not-makeable recipes** — boolean toggle

### 14.2 Implementation: HA's ha-form helper

Use HA's built-in `<ha-form>` custom element (globally available in the Lovelace DOM — no import, no bundle cost) which accepts a schema and renders a fully-styled form matching HA's design language.

```typescript
// src/editor/pd-editor.ts
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, CardConfig } from '../types';

const SCHEMA = [
  {
    name: 'entity',
    required: false,
    selector: { entity: { domain: 'sensor', integration: 'party_dispenser' } },
  },
  { name: 'title', required: false, selector: { text: {} } },
  { name: 'show_connection_status', required: false, selector: { boolean: {} } },
  { name: 'max_recipes_visible', required: false, selector: { number: { min: 1, max: 50, mode: 'box' } } },
  { name: 'show_not_makeable', required: false, selector: { boolean: {} } },
];

@customElement('pd-editor')
export class PdEditor extends LitElement {
  @property({ attribute: false }) hass!: HomeAssistant;
  @state() private _config!: CardConfig;

  public setConfig(config: CardConfig): void { this._config = config; }

  protected render() {
    if (!this.hass || !this._config) return html``;
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

  private _computeLabel = (s: { name: string }) => ({
    entity: 'Queue size sensor',
    title: 'Title',
    show_connection_status: 'Show live/offline indicator',
    max_recipes_visible: 'Max recipes visible',
    show_not_makeable: 'Show recipes with missing ingredients',
  }[s.name] ?? s.name);

  private _computeHelper = (s: { name: string }) => ({
    title: 'Shown at the top of the card. Default: "Party Dispenser".',
    max_recipes_visible: 'Leave blank to show all. Truncates the grid from the bottom.',
  }[s.name] ?? '');

  private _valueChanged(ev: CustomEvent) {
    const next = { ...ev.detail.value, type: 'custom:party-dispenser-card' };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: next }, bubbles: true, composed: true,
    }));
  }
}
```

### 14.3 Root card wiring

```typescript
// src/party-dispenser-card.ts — added as static methods on the class
public static async getConfigElement() {
  await import('./editor/pd-editor');
  return document.createElement('pd-editor');
}

public static getStubConfig(): Partial<CardConfig> {
  return {
    type: 'custom:party-dispenser-card',
    show_connection_status: true,
    show_not_makeable: true,
  };
}
```

Lovelace's card picker uses `getStubConfig()` to prepopulate when a user clicks "Add card → Party Dispenser". Our stub doesn't need `entity` — the card auto-discovers.

### 14.4 Grid options

Optional but recommended for HA's Sections-view dashboards introduced in 2024.3:

```typescript
public getGridOptions() {
  return {
    rows: 6, columns: 12, min_rows: 3, min_columns: 6, max_rows: 20, max_columns: 12,
  };
}
```

12-column-width default (full row in Sections view), 6 rows tall (roughly "large card"). `min_columns: 6` ensures the card never gets squeezed below the mobile layout threshold.

---

## 15. Test Coverage Requirements (QA-03)

### 15.1 Test framework decision: `@web/test-runner` + `@open-wc/testing`

Over vitest. Rationale:
- **Browser-native execution:** `@web/test-runner` runs tests inside a real browser (Chromium by default) using ESM imports natively. Web components + shadow DOM + CSS + ResizeObserver + container queries all work without a JSDOM shim. vitest's JSDOM mode fails on container queries and is unreliable for shadow-DOM focus management assertions.
- **HA/Lovelace ecosystem norm:** Mushroom doesn't ship tests at all; button-card, card-mod, and most large community cards use `@open-wc/testing` — it's the canonical combination per [open-wc.org/blog/testing-web-components-with-web-test-runner/](https://open-wc.org/blog/testing-web-components-with-web-test-runner/).
- **Lit-friendly assertions:** `@open-wc/testing` ships helpers like `fixture<T>()`, `elementUpdated()`, and `aTimeout()` that are exactly what Lit component tests need. vitest would require hand-rolled equivalents.
- **Playwright adapter available:** `@web/test-runner-playwright` enables cross-browser (Chromium/Firefox/WebKit) runs for the Phase 5 CI tail; same config works locally.

Rejection of `vitest`: the browser-mode story improved in 2025 but still requires bundler indirection (`vite` build at test-time) that duplicates the rollup setup. For a pure-lit card with no TS-only utilities needing tree-shake, `@web/test-runner` is strictly simpler.

### 15.2 Tools pinned

```json
{
  "devDependencies": {
    "@web/test-runner":          "^0.20.0",
    "@web/test-runner-playwright":"^0.11.0",
    "@open-wc/testing":          "^4.0.0",
    "@esm-bundle/chai":          "^4.3.4-fix.0",
    "sinon":                     "^17.0.2",
    "@types/sinon":              "^17.0.4",
    "lit":                       "^3.3.1",
    "typescript":                "^5.9.2",
    "@rollup/plugin-typescript": "^12.1.4",
    "@rollup/plugin-node-resolve":"^16.0.1",
    "@rollup/plugin-commonjs":   "^28.0.6",
    "@rollup/plugin-json":       "^6.1.0",
    "@rollup/plugin-terser":     "^1.0.0",
    "rollup":                    "^4.30.0",
    "custom-card-helpers":       "^1.9.0"
  }
}
```

### 15.3 Tests required by component

Target: **≥ 70% line coverage on `src/`**, measured by `@web/test-runner`'s built-in coverage reporter (wraps c8).

| File under test | Test types (counts are minimums) |
|-----------------|----------------------------------|
| `party-dispenser-card.ts` | (a) setConfig accepts minimal config; (b) renders skeleton when hass loading; (c) renders full UI when hass has all entities; (d) derives state correctly from hass.states; (e) dispatches `party_dispenser.order_recipe` with correct args on `pd-order-recipe` event; (f) dispatches `party_dispenser.cancel_order` on `pd-cancel-order`; (g) optimistic entry appears + reconciles within 2s; (h) optimistic entry auto-expires after 5s if no reconciliation |
| `pd-summary-header.ts` | (a) renders 3 chips when `show_connection_status: true`; (b) renders 2 chips when `false`; (c) chip labels/values match props |
| `pd-summary-chip.ts` | (a) icon + label + value render; (b) aria-label formed correctly; (c) tone prop maps to CSS class |
| `pd-recipe-grid.ts` | (a) renders N tiles for N recipes; (b) respects `max_visible`; (c) filters by `show_not_makeable`; (d) arrow-key navigation moves focus between tiles (roving tabindex pattern) |
| `pd-recipe-tile.ts` | (a) tap on makeable tile dispatches `pd-order-recipe`; (b) tap on non-makeable does nothing; (c) Enter key same as tap; (d) Space key same as tap; (e) aria-disabled when not makeable; (f) aria-label includes name + makeable state |
| `pd-queue-list.ts` | (a) renders N items for N queue entries; (b) highlights current order; (c) empty state when queue empty |
| `pd-queue-item.ts` | (a) cancel button dispatches `pd-cancel-order`; (b) aria-label includes recipe name; (c) state chip copy matches state enum value |
| `pd-editor.ts` | (a) renders ha-form schema; (b) value-changed event bubbles up with merged config; (c) required `type: custom:party-dispenser-card` is always present in emitted config |
| `state.ts` (pure derivation) | (a) deriveState returns `loading: true` when entities undefined; (b) extracts recipes + queue from attrs correctly; (c) coerces connected to boolean from binary sensor state |

Total: ~30 tests; each 10-40 lines; total test code ~800 lines. Executes in <3 seconds on @web/test-runner + Chromium.

### 15.4 Test file structure

```
www/community/party-dispenser-card/
├── src/
│   ├── party-dispenser-card.ts
│   ├── state.ts
│   ├── types.ts
│   ├── components/
│   │   ├── pd-summary-header.ts
│   │   ├── pd-summary-chip.ts
│   │   ├── pd-recipe-grid.ts
│   │   ├── pd-recipe-tile.ts
│   │   ├── pd-queue-list.ts
│   │   └── pd-queue-item.ts
│   └── editor/
│       └── pd-editor.ts
├── test/
│   ├── fixtures/
│   │   ├── hass-loading.ts          // HomeAssistant mock, all entities undefined
│   │   ├── hass-happy.ts            // HomeAssistant mock, 3 recipes, 1 queued
│   │   ├── hass-disconnected.ts     // connected: off
│   │   └── hass-empty.ts            // recipes: [], queue: []
│   ├── state.test.ts
│   ├── party-dispenser-card.test.ts
│   ├── pd-summary-header.test.ts
│   ├── pd-summary-chip.test.ts
│   ├── pd-recipe-grid.test.ts
│   ├── pd-recipe-tile.test.ts
│   ├── pd-queue-list.test.ts
│   ├── pd-queue-item.test.ts
│   └── pd-editor.test.ts
├── web-test-runner.config.mjs
├── rollup.config.mjs
├── tsconfig.json
├── package.json
├── README.md
└── dist/
    ├── party-dispenser-card.js
    └── party-dispenser-card.js.map
```

### 15.5 `web-test-runner.config.mjs` template

```javascript
import { esbuildPlugin } from '@web/dev-server-esbuild';
import { playwrightLauncher } from '@web/test-runner-playwright';

export default {
  nodeResolve: true,
  files: 'test/**/*.test.ts',
  plugins: [esbuildPlugin({ ts: true, target: 'es2020' })],
  browsers: [
    playwrightLauncher({ product: 'chromium' }),
    // playwrightLauncher({ product: 'firefox' }),
    // playwrightLauncher({ product: 'webkit' }),  // enable in Phase 5 CI matrix
  ],
  coverage: true,
  coverageConfig: {
    include: ['src/**/*.ts'],
    exclude: ['src/**/*.d.ts'],
    threshold: { statements: 70, branches: 60, functions: 70, lines: 70 },
    reporters: ['html', 'lcov', 'text-summary'],
  },
  testRunnerHtml: testFramework => `
    <!DOCTYPE html>
    <html>
      <head>
        <script type="module" src="${testFramework}"></script>
        <style>:root { /* intentionally empty — tests verify fallback tokens work */ }</style>
      </head>
      <body></body>
    </html>
  `,
};
```

The empty `<style>` tag in `testRunnerHtml` is deliberate: tests run WITHOUT HA theme variables set, so the `:host` fallback layer must be 100% functional. Any test that needs to verify theme-variable-override behavior explicitly sets them via `document.documentElement.style.setProperty(...)`.

### 15.6 Example test (canonical shape for executor to copy)

```typescript
// test/pd-recipe-tile.test.ts
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '../src/components/pd-recipe-tile';
import type { PdRecipeTile } from '../src/components/pd-recipe-tile';

describe('<pd-recipe-tile>', () => {
  it('dispatches pd-order-recipe on tap when makeable', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r1', name: 'Margarita', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    setTimeout(() => button.click());
    const event = await oneEvent(el, 'pd-order-recipe');
    expect(event.detail).to.deep.equal({ recipeId: 'r1' });
  });

  it('is aria-disabled and non-clickable when not makeable', async () => {
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
    expect(fired).to.be.false;
  });
});
```

### 15.7 Coverage gating in CI

`package.json` scripts:

```json
{
  "scripts": {
    "build":      "rollup -c",
    "build:watch":"rollup -c -w",
    "test":       "web-test-runner --config web-test-runner.config.mjs",
    "test:watch": "web-test-runner --config web-test-runner.config.mjs --watch",
    "lint":       "eslint 'src/**/*.ts' 'test/**/*.ts'",
    "typecheck":  "tsc --noEmit"
  }
}
```

GitLab CI adds a new `test-card` job (Phase 4 Plan 04-03):

```yaml
test-card:
  stage: test
  image: node:22-alpine
  before_script:
    - apk add --no-cache chromium
    - export CHROMIUM_PATH=/usr/bin/chromium-browser
  script:
    - cd www/community/party-dispenser-card
    - npm ci
    - npm run lint
    - npm run typecheck
    - npm test
  coverage: '/Total:\s*\d+\.?\d+%/'
  artifacts:
    paths:
      - www/community/party-dispenser-card/coverage/
    reports:
      coverage_report:
        coverage_format: cobertura
        path: www/community/party-dispenser-card/coverage/cobertura-coverage.xml
```

---

## 16. Animation / Transition Specs

### 16.1 Timing tokens

| Token | Value | Easing | Usage |
|-------|-------|--------|-------|
| `--pd-duration-fast` | `100ms` | `ease-out` | Hover lift, chip tone transitions |
| `--pd-duration-normal` | `200ms` | `ease-in-out` | Fade-out on queue item cancel |
| `--pd-duration-slow` | `250ms` | `ease-out` | Slide-in on new queue item |
| `--pd-duration-pulse` | `2000ms` | `ease-in-out` (infinite) | Current-order pulse |

### 16.2 Animations used

1. **Queue item slide-in** (new item appears):
```css
@keyframes pd-slide-in {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.queue-item.entering {
  animation: pd-slide-in var(--pd-duration-slow) ease-out;
}
```

2. **Queue item fade-out** (cancel action):
```css
.queue-item.leaving {
  transition: opacity var(--pd-duration-normal) ease-in;
  opacity: 0;
}
```

3. **Current-order pulse** (the queue item at the head of the list):
```css
@keyframes pd-current-pulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary-color, var(--pd-accent)) 30%, transparent); }
  50%      { box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary-color, var(--pd-accent)) 8%, transparent); }
}
.queue-item.current {
  animation: pd-current-pulse var(--pd-duration-pulse) ease-in-out infinite;
}
```

4. **Recipe tile hover lift** (desktop/mouse):
```css
.recipe-tile:hover:not([aria-disabled="true"]) {
  transform: translateY(-2px);
  transition: transform var(--pd-duration-fast) ease-out;
}
```

### 16.3 Reduced-motion policy

```css
@media (prefers-reduced-motion: reduce) {
  .queue-item.entering { animation: none; }
  .queue-item.leaving  { transition: none; opacity: 0; }
  .queue-item.current  { animation: none; background: color-mix(in srgb, var(--primary-color, var(--pd-accent)) 6%, transparent); }
  .recipe-tile:hover   { transform: none; }
}
```

All motion switches to instant state changes. Reduced-motion users still get the visual signal (fade shows immediate absence; current-order has a static highlight background) without vestibular-triggering motion.

### 16.4 Skeleton pulse (loading state)

```css
@keyframes pd-skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50%      { opacity: 0.8; }
}
.skeleton-block {
  background: var(--divider-color, rgba(0,0,0,0.08));
  animation: pd-skeleton-pulse 1.4s ease-in-out infinite;
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-block { animation: none; opacity: 0.6; }
}
```

---

## 17. Build Output Shape

### 17.1 Output path (development + committed dist)

- **Dev-time source tree:** `www/community/party-dispenser-card/src/`
- **Rollup output dir:** `www/community/party-dispenser-card/dist/party-dispenser-card.js` (+ `.js.map`)
- **Served path (embedded-card decision):** `custom_components/party_dispenser/frontend/party-dispenser-card.js` (+ `.js.map`) — copied at build time by a rollup plugin or post-build script

### 17.2 Rollup config (verified against [mushroom's rollup.config.mjs](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/rollup.config.mjs))

```javascript
// www/community/party-dispenser-card/rollup.config.mjs
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import terser from '@rollup/plugin-terser';
import { copy } from '@web/rollup-plugin-copy';  // or rollup-plugin-copy

const isProd = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/party-dispenser-card.ts',
  output: {
    file: 'dist/party-dispenser-card.js',
    format: 'es',
    sourcemap: true,
    inlineDynamicImports: true,      // Single-file output
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    json(),
    typescript({ tsconfig: './tsconfig.json' }),
    // NO minification for v0.4.0 — keeps debugging tractable in browser devtools;
    // flip to isProd && terser() in Phase 6 polish.
    // isProd && terser(),
    copy({
      targets: [{
        src: 'dist/party-dispenser-card.*',
        dest: '../../../custom_components/party_dispenser/frontend/',
      }],
      hook: 'writeBundle',
    }),
  ],
};
```

### 17.3 Bundle size budget

Mushroom's `mushroom.js` is ~350KB unminified (observed via HACS download). Our card has ~1/3 the features — budget: **≤ 150KB unminified, ≤ 50KB minified** (v0.5+ minification).

### 17.4 Source maps

Always shipped alongside the bundle. Users opening DevTools see original `.ts` files in the sources pane, which makes community bug reports (Phase 6+) massively easier to triage.

### 17.5 `manifest.json` version alignment

The rollup build reads `custom_components/party_dispenser/manifest.json::version` at build-time and injects it as a constant `CARD_VERSION` inside the bundle. This lets the `<party-dispenser-card>` log a debug line on every mount:

```typescript
console.debug(`%c party-dispenser-card %c ${CARD_VERSION}`,
  'color:white;background:#03a9f4;padding:2px 6px;border-radius:3px',
  'color:#03a9f4;background:transparent');
```

Rationale: community-card convention; makes "which version is the user on" diagnosable from the browser console without visiting Settings.

---

## 18. Integration Quality Scale Considerations

### 18.1 HA Integration Quality Scale (Bronze → Silver → Gold → Platinum)

Our integration targets **Bronze** in v1 (per Phase 2 Decision 02-04 note). The card affects a subset of quality-scale rules:

| Rule | Relevance | Card's stance |
|------|----------|---------------|
| `common-modules` | Integration ships shared code via proper Python packaging. | N/A for card (TypeScript side is separate) |
| `docs-configuration-parameters` | Every manifest option must be documented. | Card: editor's `computeHelper` covers this (§14.2) |
| `runtime-data` | Use `entry.runtime_data` not `hass.data[DOMAIN]`. | Already done Phase 2. Card reads state via `hass.states` which doesn't interact. |
| `exception-translations` | Errors raised to user should be localized. | English-only per REQ out-of-scope. |
| `entity-unique-id` | Sensors must have stable unique_ids. | Already done Phase 2. Card displays `entity.attributes` only — not affected. |

No card-specific quality-scale violations.

### 18.2 Lovelace/Frontend expectations in 2026

Per [developers.home-assistant.io/docs/frontend/custom-ui/custom-card](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card), a custom card in 2026 should:

1. ✅ Declare `customCards` global entry (§6.3)
2. ✅ Provide `setConfig` that throws on invalid config (implementation: our `setConfig` validates `config.type` + casts)
3. ✅ Provide `getCardSize()` returning a sensible estimate (we return 6 — roughly 300px tall at defaults)
4. ✅ Provide `getGridOptions()` for Sections view (§14.4)
5. ✅ Provide `getConfigElement()` for visual editing (§14.1)
6. ✅ Provide `getStubConfig()` for card picker (§14.3)
7. ✅ Use `hass.callService()` not direct `fetch()` (REQ UI-05)
8. ✅ Use HA theme CSS variables (§3.1)
9. ✅ Register child custom elements with a `pd-` prefix to avoid collisions

### 18.3 CSP / security considerations

- Cards are executed in the main HA frontend's origin (same-origin as HA) — no CSP cross-origin issues
- We do NOT fetch any external CDN resources. Fonts, icons, everything is inline/built-in
- Source maps point to inline data URIs (default rollup behavior) — no external map file leak
- No `eval()`, no `new Function()`, no dynamic imports from user input — prevents the integration from being a vector for stored XSS via recipe names (though HA's frontend already escapes state values, we don't trust and re-escape)

### 18.4 Browser support matrix

| Browser | Minimum version | Rationale |
|---------|-----------------|-----------|
| Chrome / Edge | 108 | First with container queries stable + `color-mix()` support |
| Firefox | 110 | First with container queries + `color-mix()` |
| Safari / iOS Safari | 16 | Container queries in 16.0; `color-mix()` in 16.2 |
| HA Companion iOS | 16+ | Uses system WebView; matches Safari matrix |
| HA Companion Android | System WebView ≥ 108 | Matches Chrome matrix |

Any browser below this matrix falls back to the `@supports not (container-type)` viewport media queries (§9.2) and `color-mix()` has manual fallbacks (`background: var(--primary-color); opacity: 0.08;` where used).

---

## 19. Per-Requirement UI Mapping

Each Phase 4 requirement maps to a specific section of this UI-SPEC. Planner inlines the corresponding section's contract snippets into `<action>` blocks:

| Req | Requirement Text | UI-SPEC Sections |
|-----|-----------------|------------------|
| **HACS-03** | Card is discoverable under the HACS "Frontend" category via a second `hacs.json` entry or combined config | §13 (distribution decision rejects "two hacs.json entries" in favor of embedded-card-via-integration; the card ships with the integration, no HACS frontend-category repo needed; still allows a v2 migration to split-repo if ever required) |
| **UI-01** | Card type `custom:party-dispenser-card` registers via HACS frontend install | §6.3 (customElements.define + customCards.push), §13 (embedded card served from /party_dispenser_frontend/party-dispenser-card.js + auto-registered as Lovelace resource) |
| **UI-02** | Card renders recipe grid (make-now button per recipe when makeable) | §6.2, §6.4 (pd-recipe-grid + pd-recipe-tile), §8.1 (tap → service call), §11.4 (disconnected still interactive), §12.1 ("Order" button copy) |
| **UI-03** | Card renders live queue with per-item cancel buttons | §6.2, §6.4 (pd-queue-list + pd-queue-item), §8.2 (cancel flow), §10.1 (aria contract), §12.1 (state copy + cancel aria-label) |
| **UI-04** | Card renders summary counts (queue size, makeable recipes) | §6.2, §6.4 (pd-summary-header + pd-summary-chip), §12.1 ("Queue" / "Ready" / "Live" labels) |
| **UI-05** | Card calls integration services (primary path) — no backend network calls from browser by default | §7.1 (only root touches hass), §8.1 (uses hass.callService), §8.2 (uses hass.callService), §18.3 (no external fetches; no eval). Grep gate: `grep -rE '\bfetch\s*\(' src/` returns zero matches — confirms no direct fetch() anywhere |
| **UI-06** | Card is usable on mobile HA companion (single-column layout <600px wide) | §9.1, §9.2, §9.3 (375px–600px shapes), §9.4 (companion-specific notes), §5.3 (44×44px touch targets) |
| **UI-07** | Card visual style matches HA core conventions (mushroom-ish chips, HA theming variables) | §2 (hybrid direction — Mushroom structure + dispenser voice), §3 (HA CSS vars everywhere), §4 (HA font tokens), §5 (HA space tokens), §10 (HA accessibility conventions), §18.2 (getConfigElement + getStubConfig + getGridOptions all present) |
| **QA-03** | Card has unit tests covering render + service-call invocation (using @web/test-runner or similar) | §15 in full (framework, files, coverage target, CI gate, example test) |

### 19.1 Coverage matrix — every listed UI-* is addressable

```
UI-01 → §6.3 + §13
UI-02 → §6.4 (pd-recipe-tile) + §8.1 + §12.1
UI-03 → §6.4 (pd-queue-item) + §8.2 + §10.1 + §12.1
UI-04 → §6.4 (pd-summary-header) + §12.1
UI-05 → §7.1 + §8.1 + §8.2 + §18.3
UI-06 → §9 + §5.3 + §10.3 (keyboard equiv for non-touch)
UI-07 → §2 + §3 + §4 + §5 + §10 + §18.2
HACS-03 → §13
QA-03 → §15
```

---

## 20. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | (not applicable — this card doesn't use shadcn/radix/base-ui) | not required |
| Third-party | **None declared** | not required |

Rationale: shadcn is a React-era build-time component library; our card is pure lit-element and doesn't source any third-party visual components. Every visual primitive is either a raw HTML tag, a native HA built-in (`<ha-icon>`, `<ha-form>`), or a lit component hand-rolled in-house.

**Grep gate** verifying no third-party UI library sneaked in:
```bash
# Must return zero matches
grep -rE '@radix-ui|@shadcn|@headlessui|primevue|element-ui|antd|@mui' \
    www/community/party-dispenser-card/package.json
```

---

## 21. Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (every label/message defined in §12.1; tone consistent; destructive confirmation policy explicit in §12.2)
- [ ] Dimension 2 Visuals: PASS (§2 declares direction; §3 declares system; §6 declares component tree; §16 declares motion)
- [ ] Dimension 3 Color: PASS (§3.1 — HA variables with scoped fallbacks; 60% dominant = --card-background-color, 30% secondary = --secondary-background-color, 10% accent = --primary-color; accent reserved for CTAs, focus rings, current-order pulse only — never applied to informational chips)
- [ ] Dimension 4 Typography: PASS (§4 — 4 sizes, 2 weights, HA-native token chain with fallbacks)
- [ ] Dimension 5 Spacing: PASS (§5 — 7 tokens, 4px multiples; exceptions documented in §5.3 for touch targets)
- [ ] Dimension 6 Registry Safety: PASS (§20 — no third-party registries used; shadcn N/A for pure lit-element card)

**Approval:** pending (checker runs next)

---

## 22. Sources

All external sources fetched on 2026-04-20. Internal project files are cited inline.

### Home Assistant frontend documentation
- [Custom Lovelace card developer docs](https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card) — setConfig / getCardSize / getGridOptions / getConfigElement / getStubConfig / customCards API surface. Fetched 2026-04-20.
- [HA frontend GitHub](https://github.com/home-assistant/frontend) — primary code reference; specifically `src/resources/styles.ts` for the `--ha-font-size-*`, `--ha-space-*`, `--ha-border-radius-*`, `--ha-animation-duration-*` tokens verified present in 2026.4. Fetched 2026-04-20.
- [Developer blog: async_register_static_paths](https://developers.home-assistant.io/blog/2024/06/18/async_register_static_paths/) — the post-2024.7 canonical API for serving static card files from a Python integration. Fetched 2026-04-20.

### HACS
- [HACS plugin (dashboard) category requirements](https://www.hacs.xyz/docs/publish/plugin/) — `hacs.json` keys for plugin category; directory layout (`dist/` → root → release); `filename` field requirement. Fetched 2026-04-20.
- [HACS integration custom_components/hacs/utils/validate.py](https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py) — voluptuous schemas for hacs.json + manifest.json; referenced via Phase 1 research.

### Community exemplars and tooling
- [piitaya/lovelace-mushroom (package.json)](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/package.json) — Lit 3.3.1, TypeScript 5.9.2, rollup plugin list; the authoritative exemplar card. Fetched 2026-04-20.
- [piitaya/lovelace-mushroom (rollup.config.mjs)](https://raw.githubusercontent.com/piitaya/lovelace-mushroom/main/rollup.config.mjs) — rollup plugin configuration template for lit-element cards. Fetched 2026-04-20.
- [KipK embedded lovelace card gist](https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492) — canonical reference for Python-side static-path + Lovelace-resource registration; our §13.3 code is adapted from this with idempotence fixes. Fetched 2026-04-20.
- [HA community thread: Developer Guide embedded Lovelace card](https://community.home-assistant.io/t/developer-guide-embedded-lovelace-card-in-a-home-assistant-integration/974909) — community discussion confirming the pattern. Fetched 2026-04-20.

### Testing
- [open-wc.org blog — Testing web components with @web/test-runner](https://open-wc.org/blog/testing-web-components-with-web-test-runner/) — rationale for @web/test-runner + @open-wc/testing combo over vitest/jsdom. Fetched 2026-04-20.
- [@open-wc/testing library docs](https://open-wc.org/docs/testing/helpers/) — `fixture`, `oneEvent`, `elementUpdated`, `aTimeout` helpers used in §15.6. Fetched 2026-04-20.
- [modernweb-dev/web GitHub issue 1281](https://github.com/modernweb-dev/web/issues/1281) — @web/test-runner + lit-element + TypeScript usage. Fetched 2026-04-20.

### Accessibility
- [W3C ARIA Authoring Practices 1.3](https://www.w3.org/WAI/ARIA/apg/patterns/) — button pattern, grid pattern (roving tabindex); applied in §10.
- WCAG 2.1 Level AA (4.5:1 text contrast; 3:1 icon/focus contrast; 2.5.5 touch targets ≥ 44×44).

### Internal project files
- `.planning/phases/04-custom-lovelace-card/04-CONTEXT.md` (user decisions, LOCKED values, OPEN questions)
- `.planning/REQUIREMENTS.md` (UI-01..UI-07, HACS-03, QA-03 definitions)
- `.planning/ROADMAP.md` Phase 4 success criteria
- `.planning/phases/01-foundation-hacs-scaffolding/01-RESEARCH.md` §Pitfall 1 (one-category-per-HACS-repo limitation → embedded-card decision)
- `.planning/phases/02-integration-core/02-04-SUMMARY.md` (services shipped in Phase 2 that card calls)
- `.planning/phases/03-realtime-push/03-02-SUMMARY.md` (WS client + binary_sensor.connected the card reads)
- `custom_components/party_dispenser/services.py` (the 3 service handlers + HomeAssistantError mapping)
- `custom_components/party_dispenser/sensor.py` (5 sensor entities + extra_state_attributes the card reads)
- `custom_components/party_dispenser/binary_sensor.py` (connected entity the card reads)
- `custom_components/party_dispenser/api.py` (Recipe + QueueItem dataclass shapes — TS types mirror these; sensor attrs ship a LIGHT subset per Phase 2 Decision 02-03)
- `custom_components/party_dispenser/const.py` (domain name, service names, sensor keys)
- `custom_components/party_dispenser/manifest.json` (dependencies, version — planner flips `"dependencies": []` → `["frontend", "http"]`)

### External design reference (for inspiration only — no code ported)
- `ava-organization/party-dispenser/party-dispenser-main:frontend/src/features/recipes/RecipesPage.vue` (fetched via `glab api`) — overall layout hierarchy informing §6 component tree; copy voice in §12 ("Featured pours", "Ready to pour").
- `ava-organization/party-dispenser/party-dispenser-main:frontend/src/features/recipes/RecipeGroupsList.vue` (fetched via `glab api`) — recipe-row interaction pattern (ready-to-pour primary CTA vs. missing-count chip overlay) informing §6.4 pd-recipe-tile contract.
- `ava-organization/party-dispenser/party-dispenser-main:frontend/src/features/recipes/types.ts` (fetched via `glab api`) — TS type shapes informing §7.4; we mirror the API-module Recipe/QueueItem shapes exactly.
- `ava-organization/party-dispenser/party-dispenser-main:frontend/src/style.css` (fetched via `glab api`) — inspiration only; the dispenser's amber-on-dark palette is explicitly NOT ported (§2.1 rationale).

---

*Phase: 04-custom-lovelace-card*  
*UI-SPEC drafted: 2026-04-20*  
*Next: gsd-ui-checker verifies 6 dimensions → gsd-planner inlines into 04-01/04-02/04-03 plan action blocks*
