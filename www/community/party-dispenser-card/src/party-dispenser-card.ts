// src/party-dispenser-card.ts
// Sources:
//   - 04-RESEARCH Pattern 1 (lines 271-425) — core structure
//   - UI-SPEC §6.3 (customCards registration at module tail)
//   - UI-SPEC §6.5 (event routing via composed:true,bubbles:true; @-prefixed listeners at root)
//   - UI-SPEC §7.3 (_optimisticQueue local state; reconciled within 2s via _mergedQueue)
//   - UI-SPEC §8.1 / §8.2 (_placeOrder / _cancelOrder flows; optimistic + hass.callService)
//   - UI-SPEC §9.2 (container-type inline-size on :host for responsive layout)
//   - UI-SPEC §17.5 (version banner via __CARD_VERSION__ replaced by rollup at build time)

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';

import { sharedTokens } from './styles/tokens';
import { deriveState } from './state';
import type { CardConfig, DerivedState, QueueItem } from './types';

import './components/pd-summary-header';
import './components/pd-recipe-grid';
import './components/pd-queue-list';

// Replaced at build time by rollup's inject-card-version plugin (rollup.config.mjs)
declare const __CARD_VERSION__: string;

@customElement('party-dispenser-card')
export class PartyDispenserCard extends LitElement {
  // Lovelace assigns .hass on every state change. Shallow-equality on the object
  // reference means lit re-renders when HA pushes a new state.
  @property({ attribute: false }) public hass!: HomeAssistant;

  // Set via setConfig(); re-render on any subsequent setConfig call.
  @state() private _config?: CardConfig;

  // Local optimistic entries (UI-SPEC §7.3); reconciled within 2s when real queue lands.
  @state() private _optimisticQueue: QueueItem[] = [];

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

  private _derive(): DerivedState | null {
    if (!this.hass || !this._config) return null;
    return deriveState(this.hass, this._config);
  }

  private _mergedQueue(derived: DerivedState): QueueItem[] {
    // Drop optimistic entries that have a matching real queue item (within 2s window)
    // per UI-SPEC §7.3 reconciliation rule.
    const now = Date.now();
    const reconciledIds = new Set<string>();
    for (const optItem of this._optimisticQueue) {
      const match = derived.queue.find(q => {
        if (q.recipe_name !== optItem.recipe_name) return false;
        if (!q.created_at) return true;  // sensor may not ship created_at; assume match
        return (now - new Date(q.created_at).getTime()) < 2000;
      });
      if (match) reconciledIds.add(optItem.id);
    }
    const active = this._optimisticQueue.filter(i => !reconciledIds.has(i.id));
    return [...derived.queue, ...active];
  }

  private _placeOrder = async (recipeId: string): Promise<void> => {
    if (!this.hass) return;
    const derived = this._derive();
    const recipe = derived?.recipes.find(r => r.id === recipeId);
    if (!recipe || !recipe.makeable) return;

    // Optimistic entry (UI-SPEC §8.1 step 2)
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
    // Auto-expire after 5s if reconciliation never arrives
    setTimeout(() => {
      this._optimisticQueue = this._optimisticQueue.filter(i => i.id !== optId);
    }, 5000);

    try {
      await this.hass.callService('party_dispenser', 'order_recipe', { recipe_id: recipeId });
    } catch (err) {
      // HA's built-in error toast already fires on rejected callService; we just log.
      console.warn('[party-dispenser-card] order_recipe failed:', err);
    }
  };

  private _cancelOrder = async (orderId: string): Promise<void> => {
    if (!this.hass) return;
    try {
      await this.hass.callService('party_dispenser', 'cancel_order', { order_id: orderId });
    } catch (err) {
      console.warn('[party-dispenser-card] cancel_order failed:', err);
    }
  };

  private _handleOrderRecipe = (e: CustomEvent<{ recipeId: string }>) => {
    void this._placeOrder(e.detail.recipeId);
  };

  private _handleCancelOrder = (e: CustomEvent<{ orderId: string }>) => {
    void this._cancelOrder(e.detail.orderId);
  };

  protected firstUpdated(): void {
    // Community convention: one-time version banner in devtools console (UI-SPEC §17.5)
    console.debug(
      `%c party-dispenser-card %c ${__CARD_VERSION__}`,
      'color:white;background:var(--primary-color, currentColor);padding:2px 6px;border-radius:3px',
      'color:var(--primary-color, currentColor);background:transparent',
    );
  }

  protected render() {
    const d = this._derive();
    if (!d || !this._config) return nothing;

    const mergedQueue = this._mergedQueue(d);

    return html`
      <ha-card
        role="region"
        aria-label=${this._config.title ?? 'Party Dispenser'}
        @pd-order-recipe=${this._handleOrderRecipe}
        @pd-cancel-order=${this._handleCancelOrder}
      >
        <div class="layout">
          <pd-summary-header
            class="slot-header"
            .queueSize=${d.queueSize}
            .makeableCount=${d.makeableCount}
            .connected=${d.connected}
            .title=${this._config.title ?? 'Party Dispenser'}
            .showConnection=${this._config.show_connection_status ?? true}
          ></pd-summary-header>
          <pd-recipe-grid
            class="slot-grid"
            .recipes=${d.recipes}
            .maxVisible=${this._config.max_recipes_visible}
            .showNotMakeable=${this._config.show_not_makeable ?? true}
          ></pd-recipe-grid>
          <pd-queue-list
            class="slot-queue"
            .queue=${mergedQueue}
            .currentOrderId=${d.currentOrderId}
          ></pd-queue-list>
        </div>
      </ha-card>
    `;
  }

  static styles = [
    sharedTokens,
    css`
      :host {
        display: block;
        container-type: inline-size;
        container-name: pd-card;
      }
      ha-card {
        display: block;
        border-radius: var(--pd-radius-lg, 16px);
        overflow: hidden;
      }

      /* Mobile default: stacked single column */
      .layout {
        display: grid;
        grid-template-columns: 1fr;
        grid-template-areas:
          "header"
          "grid"
          "queue";
      }
      .slot-header { grid-area: header; }
      .slot-grid   { grid-area: grid; }
      .slot-queue  { grid-area: queue; }

      /* Tablet + Desktop: header full-width, grid + queue side-by-side right rail */
      @container pd-card (min-width: 600px) {
        .layout {
          grid-template-columns: 60% 40%;
          grid-template-areas:
            "header header"
            "grid   queue";
        }
      }
      @container pd-card (min-width: 900px) {
        .layout {
          grid-template-columns: 65% 35%;
        }
      }
      @container pd-card (min-width: 1200px) {
        .layout {
          grid-template-columns: 70% 30%;
        }
      }

      /* Fallback for browsers without container queries (rare on HA-compatible in 2026) */
      @supports not (container-type: inline-size) {
        @media (min-width: 600px) {
          .layout {
            grid-template-columns: 60% 40%;
            grid-template-areas:
              "header header"
              "grid   queue";
          }
        }
        @media (min-width: 900px)  { .layout { grid-template-columns: 65% 35%; } }
        @media (min-width: 1200px) { .layout { grid-template-columns: 70% 30%; } }
      }
    `,
  ];
}

// Lovelace card picker discovery (UI-SPEC §6.3)
// MUST be at module tail — after class definition — or Lovelace may try to construct
// the card before customElements has the definition (Pitfall 6).
(window as unknown as { customCards?: unknown[] }).customCards =
  (window as unknown as { customCards?: unknown[] }).customCards || [];
(window as unknown as { customCards: unknown[] }).customCards.push({
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
