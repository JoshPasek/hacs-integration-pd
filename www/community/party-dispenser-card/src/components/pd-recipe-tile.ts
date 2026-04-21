// src/components/pd-recipe-tile.ts
// Source: 04-RESEARCH lines 442-514 (Pattern 2: leaf with event dispatch + ARIA + keyboard)
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedTokens } from '../styles/tokens';
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

  static styles = [
    sharedTokens,
    css`
      button {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: var(--pd-space-sm, 8px);
        width: 100%;
        padding: var(--pd-space-md, 12px);
        border: 1px solid var(--divider-color, transparent);
        border-radius: var(--pd-radius-md, 12px);
        background: var(--card-background-color, transparent);
        color: var(--primary-text-color, inherit);
        font-size: var(--pd-font-size-body, 1rem);
        cursor: pointer;
        min-height: 44px;
        text-align: left;
      }
      button[aria-disabled="true"] {
        opacity: 0.6;
        cursor: default;
      }
      button:focus-visible {
        outline: 2px solid var(--primary-color, currentColor);
        outline-offset: 2px;
      }
      .dot-ok { color: var(--success-color, currentColor); }
      .dot-no { color: var(--warning-color, currentColor); }
      ha-icon { --mdc-icon-size: 20px; }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-recipe-tile': PdRecipeTile;
  }
}
