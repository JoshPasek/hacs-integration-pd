// src/components/pd-summary-header.ts
// UI-SPEC §6.4 (pd-summary-header) + §12.1 (copy)
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedTokens } from '../styles/tokens';
import './pd-summary-chip';

@customElement('pd-summary-header')
export class PdSummaryHeader extends LitElement {
  @property({ type: Number }) public queueSize = 0;
  @property({ type: Number }) public makeableCount = 0;
  @property({ type: Boolean }) public connected = false;
  @property({ type: String }) public title = 'Party Dispenser';
  @property({ type: Boolean }) public showConnection = true;

  protected render() {
    return html`
      <div class="header" role="group" aria-label="Summary">
        <h3 class="title">${this.title}</h3>
        <div class="chips">
          <pd-summary-chip
            icon="mdi:playlist-music"
            label="Queue"
            .value=${this.queueSize}
            tone="neutral"
          ></pd-summary-chip>
          <pd-summary-chip
            icon="mdi:glass-cocktail"
            label="Ready"
            .value=${this.makeableCount}
            tone="neutral"
          ></pd-summary-chip>
          ${this.showConnection
            ? html`<pd-summary-chip
                icon=${this.connected ? 'mdi:wifi' : 'mdi:wifi-off'}
                label=${this.connected ? 'Live' : 'Reconnecting\u2026'}
                value=""
                tone=${this.connected ? 'success' : 'danger'}
                .live=${true}
              ></pd-summary-chip>`
            : ''}
        </div>
      </div>
    `;
  }

  static styles = [
    sharedTokens,
    css`
      .header {
        display: flex;
        flex-direction: column;
        gap: var(--pd-space-sm, 8px);
        padding: var(--pd-space-lg, 16px);
        border-bottom: 1px solid var(--divider-color, transparent);
      }
      .title {
        margin: 0;
        font-size: var(--pd-font-size-heading, 1.25rem);
        font-weight: var(--pd-font-weight-medium, 500);
        color: var(--primary-text-color, inherit);
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: var(--pd-space-sm, 8px);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-summary-header': PdSummaryHeader;
  }
}
