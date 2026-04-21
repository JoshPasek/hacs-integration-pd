// test/pd-editor.test.ts
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '../src/editor/pd-editor';
import type { PdEditor } from '../src/editor/pd-editor';
import type { CardConfig } from '../src/types';
import { buildHassHappy } from './fixtures/hass-happy';

describe('<pd-editor>', () => {
  it('renders ha-form when hass + config are set', async () => {
    const el = await fixture<PdEditor>(html`<pd-editor></pd-editor>`);
    el.hass = buildHassHappy();
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('ha-form')!;
    expect(form).to.exist;
  });

  it('bubbles config-changed with merged config on value-changed', async () => {
    const el = await fixture<PdEditor>(html`<pd-editor></pd-editor>`);
    el.hass = buildHassHappy();
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('ha-form')!;

    setTimeout(() => form.dispatchEvent(new CustomEvent('value-changed', {
      detail: { value: { title: 'Bar A', show_connection_status: false } },
      bubbles: true,
      composed: true,
    })));

    const { detail } = await oneEvent(el, 'config-changed');
    expect(detail.config).to.deep.equal({
      type: 'custom:party-dispenser-card',
      title: 'Bar A',
      show_connection_status: false,
    });
  });

  it('always includes type=custom:party-dispenser-card in emitted config', async () => {
    const el = await fixture<PdEditor>(html`<pd-editor></pd-editor>`);
    el.hass = buildHassHappy();
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    await el.updateComplete;
    const form = el.shadowRoot!.querySelector('ha-form')!;

    setTimeout(() => form.dispatchEvent(new CustomEvent('value-changed', {
      // Simulate a value-changed WITHOUT type (realistic — ha-form doesn't always echo type)
      detail: { value: { show_not_makeable: true } },
      bubbles: true,
      composed: true,
    })));

    const { detail } = await oneEvent(el, 'config-changed');
    expect(detail.config.type).to.equal('custom:party-dispenser-card');
  });
});
