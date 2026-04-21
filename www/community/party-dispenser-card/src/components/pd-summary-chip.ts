// src/components/pd-summary-chip.ts
// UI-SPEC §6.4 row 3 (pd-summary-chip) + §10.1 aria contract
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedTokens } from '../styles/tokens';

@customElement('pd-summary-chip')
export class PdSummaryChip extends LitElement {
  @property({ type: String }) public icon = '';
  @property({ type: String }) public label = '';
  @property({ type: String }) public value: string | number = '';
  @property({ type: String }) public tone: 'neutral' | 'success' | 'danger' = 'neutral';
  @property({ type: Boolean }) public live = false;  // true for connection-status chip -> aria-live="polite"

  protected render() {
    const ariaLabel = `${this.label}: ${this.value}`;
    return html`
      <div
        class="chip tone-${this.tone}"
        role="status"
        aria-label=${ariaLabel}
        aria-live=${this.live ? 'polite' : nothing}
      >
        ${this.icon ? html`<ha-icon icon=${this.icon}></ha-icon>` : nothing}
        <span class="label">${this.label}</span>
        <span class="value">${this.value}</span>
      </div>
    `;
  }

  static styles = [
    sharedTokens,
    css`
      :host { display: inline-flex; }
      .chip {
        display: inline-flex;
        align-items: center;
        gap: var(--pd-space-xs, 4px);
        padding: var(--pd-space-xs, 4px) var(--pd-space-sm, 8px);
        background: var(--secondary-background-color, rgba(0,0,0,0.06));
        color: var(--primary-text-color, inherit);
        border-radius: var(--pd-radius-sm, 6px);
        font-size: var(--pd-font-size-label, 0.875rem);
        font-weight: var(--pd-font-weight-medium, 500);
        min-height: 28px;
      }
      .chip .label { color: var(--secondary-text-color, inherit); }
      .chip .value { color: var(--primary-text-color, inherit); font-weight: var(--pd-font-weight-medium, 500); }
      .tone-success { color: var(--success-color, inherit); }
      .tone-danger  { color: var(--error-color, inherit); }
      ha-icon { --mdc-icon-size: 16px; }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-summary-chip': PdSummaryChip;
  }
}
