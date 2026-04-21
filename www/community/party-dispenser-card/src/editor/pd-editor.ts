// src/editor/pd-editor.ts
// Source: 04-RESEARCH lines 1377-1481 + UI-SPEC §14.2 (5-field schema, ha-form)
// Verified against Mushroom's src/cards/entity-card/entity-card-editor.ts pattern
import { LitElement, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { HomeAssistant, LovelaceCardEditor } from 'custom-card-helpers';
import type { CardConfig } from '../types';

const SCHEMA: readonly unknown[] = [
  {
    name: 'entity',
    required: false,
    selector: {
      entity: {
        domain: 'sensor',
        integration: 'party_dispenser',
      },
    },
  },
  { name: 'title', required: false, selector: { text: {} } },
  { name: 'show_connection_status', required: false, selector: { boolean: {} } },
  {
    name: 'max_recipes_visible',
    required: false,
    selector: { number: { min: 1, max: 50, mode: 'box' } },
  },
  { name: 'show_not_makeable', required: false, selector: { boolean: {} } },
] as const;

@customElement('pd-editor')
export class PdEditor extends LitElement implements LovelaceCardEditor {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @state() private _config?: CardConfig;

  public setConfig(config: CardConfig): void {
    this._config = config;
  }

  private _computeLabel = (schema: { name: string }): string => {
    const labels: Record<string, string> = {
      entity: 'Queue size sensor',
      title: 'Title',
      show_connection_status: 'Show live/offline indicator',
      max_recipes_visible: 'Max recipes visible',
      show_not_makeable: 'Show recipes with missing ingredients',
    };
    return labels[schema.name] ?? schema.name;
  };

  private _computeHelper = (schema: { name: string }): string => {
    const helpers: Record<string, string> = {
      title: 'Shown at the top of the card. Default: "Party Dispenser".',
      max_recipes_visible: 'Leave blank to show all. Truncates the grid from the bottom.',
    };
    return helpers[schema.name] ?? '';
  };

  private _valueChanged = (ev: CustomEvent): void => {
    const next = {
      ...ev.detail.value,
      type: 'custom:party-dispenser-card',
    };
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config: next },
      bubbles: true,
      composed: true,
    }));
  };

  protected render() {
    if (!this.hass || !this._config) return nothing;
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
}

declare global {
  interface HTMLElementTagNameMap {
    'pd-editor': PdEditor;
  }
}
