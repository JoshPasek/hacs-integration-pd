// src/components/pd-queue-item.ts
// UI-SPEC §6.4 (pd-queue-item) + §8.2 (cancel flow) + §10.1 (aria) + §12.1 (copy)
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedTokens } from '../styles/tokens';
import type { QueueItem } from '../types';

const STATE_COPY: Record<QueueItem['state'], string> = {
  QUEUED: 'Queued',
  PREPARING: 'Preparing',
  POURING: 'Pouring',
  READY: 'Ready',
  QUEUED_OPTIMISTIC: 'Sending\u2026',
};

@customElement('pd-queue-item')
export class PdQueueItem extends LitElement {
  @property({ attribute: false }) public item!: QueueItem;
  @property({ type: Boolean }) public isCurrent = false;

  private _onCancel = () => {
    this.dispatchEvent(new CustomEvent('pd-cancel-order', {
      detail: { orderId: this.item.id },
      bubbles: true,
      composed: true,
    }));
  };

  private _onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._onCancel();
    }
  };

  protected render() {
    const copy = STATE_COPY[this.item.state] ?? this.item.state;
    const aria = `${this.item.recipe_name}, ${copy}`;
    return html`
      <div class="item ${this.isCurrent ? 'current' : ''}" role="listitem" aria-label=${aria}>
        <span class="name">${this.item.recipe_name}</span>
        <span class="state">${copy}</span>
        <button
          type="button"
          class="cancel"
          aria-label="Cancel ${this.item.recipe_name} order"
          @click=${this._onCancel}
          @keydown=${this._onKey}
        >
          <ha-icon icon="mdi:close"></ha-icon>
        </button>
      </div>
    `;
  }

  static styles = [
    sharedTokens,
    css`
      .item {
        display: grid;
        grid-template-columns: 1fr auto auto;
        align-items: center;
        gap: var(--pd-space-md, 12px);
        padding: var(--pd-space-md, 12px) var(--pd-space-lg, 16px);
        border: 1px solid var(--divider-color, transparent);
        border-radius: var(--pd-radius-md, 12px);
        background: var(--card-background-color, transparent);
        color: var(--primary-text-color, inherit);
        font-size: var(--pd-font-size-body, 1rem);
      }
      .item.current {
        border-color: var(--primary-color, currentColor);
      }
      .name { font-weight: var(--pd-font-weight-medium, 500); }
      .state {
        font-size: var(--pd-font-size-label, 0.875rem);
        color: var(--secondary-text-color, inherit);
        padding: var(--pd-space-xs, 4px) var(--pd-space-sm, 8px);
        background: var(--secondary-background-color, transparent);
        border-radius: var(--pd-radius-sm, 6px);
      }
      .cancel {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin: -6px;
        padding: 6px;
        background: transparent;
        border: none;
        color: var(--secondary-text-color, inherit);
        cursor: pointer;
        border-radius: 50%;
      }
      .cancel:hover { color: var(--error-color, currentColor); }
      .cancel:focus-visible {
        outline: 2px solid var(--primary-color, currentColor);
        outline-offset: 2px;
      }
      ha-icon { --mdc-icon-size: 20px; }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-queue-item': PdQueueItem;
  }
}
