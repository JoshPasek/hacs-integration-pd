// src/components/pd-recipe-grid.ts
// UI-SPEC §6.4 (pd-recipe-grid) + §9 (responsive layout) + §11.2 (empty state)
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { sharedTokens } from '../styles/tokens';
import './pd-recipe-tile';
import type { Recipe } from '../types';

@customElement('pd-recipe-grid')
export class PdRecipeGrid extends LitElement {
  @property({ attribute: false }) public recipes: Recipe[] = [];
  @property({ type: Number }) public maxVisible: number | undefined;
  @property({ type: Boolean }) public showNotMakeable = true;

  private _visible(): Recipe[] {
    let list = this.showNotMakeable ? this.recipes : this.recipes.filter(r => r.makeable);
    // Sort makeable first (UI-SPEC §2.2 "makeable recipes feel alive")
    list = [...list].sort((a, b) => Number(b.makeable) - Number(a.makeable));
    if (typeof this.maxVisible === 'number' && this.maxVisible > 0) {
      list = list.slice(0, this.maxVisible);
    }
    return list;
  }

  protected render() {
    const visible = this._visible();
    if (visible.length === 0) {
      return html`
        <div class="empty" role="status">
          <ha-icon icon="mdi:glass-cocktail-off" class="empty-icon"></ha-icon>
          <p class="empty-heading">No recipes yet</p>
          <p class="empty-body">Open the dispenser app to add recipes. They'll appear here automatically.</p>
        </div>
      `;
    }

    return html`
      <div class="grid" role="list" aria-label="Recipes">
        ${visible.map(recipe => html`
          <div role="listitem">
            <pd-recipe-tile .recipe=${recipe}></pd-recipe-tile>
          </div>
        `)}
      </div>
    `;
  }

  static styles = [
    sharedTokens,
    css`
      .grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: var(--pd-space-md, 12px);
        padding: var(--pd-space-lg, 16px);
      }
      @container pd-card (min-width: 900px)  { .grid { grid-template-columns: repeat(3, 1fr); } }
      @container pd-card (min-width: 1200px) { .grid { grid-template-columns: repeat(4, 1fr); } }

      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--pd-space-3xl, 48px) var(--pd-space-lg, 16px);
        text-align: center;
        color: var(--secondary-text-color, inherit);
      }
      .empty-icon { --mdc-icon-size: 48px; color: var(--secondary-text-color, inherit); }
      .empty-heading { margin: var(--pd-space-md, 12px) 0 var(--pd-space-xs, 4px) 0; font-size: var(--pd-font-size-heading, 1.25rem); color: var(--primary-text-color, inherit); }
      .empty-body { margin: 0; font-size: var(--pd-font-size-body, 1rem); max-width: 40ch; }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-recipe-grid': PdRecipeGrid;
  }
}
