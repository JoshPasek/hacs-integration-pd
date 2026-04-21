// src/components/pd-queue-list.ts
// UI-SPEC §6.4 (pd-queue-list) + §10.1 (aria-live="polite" for screen readers) + §11.3 (empty state)
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedTokens } from '../styles/tokens';
import './pd-queue-item';
import type { QueueItem } from '../types';

@customElement('pd-queue-list')
export class PdQueueList extends LitElement {
  @property({ attribute: false }) public queue: QueueItem[] = [];
  @property({ type: String }) public currentOrderId: string | null = null;

  protected render() {
    if (this.queue.length === 0) {
      return html`
        <div class="empty" role="status">
          <ha-icon icon="mdi:cup-outline" class="empty-icon"></ha-icon>
          <p class="empty-heading">Queue empty</p>
          <p class="empty-body">Pick a recipe to get started.</p>
        </div>
      `;
    }

    return html`
      <div class="list" role="list" aria-label="Live queue" aria-live="polite">
        ${this.queue.map(item => html`
          <pd-queue-item
            .item=${item}
            .isCurrent=${item.id === this.currentOrderId}
          ></pd-queue-item>
        `)}
      </div>
    `;
  }

  static styles = [
    sharedTokens,
    css`
      .list {
        display: flex;
        flex-direction: column;
        gap: var(--pd-space-sm, 8px);
        padding: var(--pd-space-lg, 16px);
      }
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--pd-space-xl, 24px) var(--pd-space-lg, 16px);
        text-align: center;
        color: var(--secondary-text-color, inherit);
      }
      .empty-icon { --mdc-icon-size: 32px; color: var(--secondary-text-color, inherit); }
      .empty-heading { margin: var(--pd-space-md, 12px) 0 var(--pd-space-xs, 4px) 0; font-size: var(--pd-font-size-heading, 1.25rem); color: var(--primary-text-color, inherit); }
      .empty-body { margin: 0; font-size: var(--pd-font-size-body, 1rem); }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-queue-list': PdQueueList;
  }
}
