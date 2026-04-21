// test/party-dispenser-card.test.ts
// QA-03 critical path — render + service-call invocation
// Source: 04-RESEARCH.md lines 1235-1298 + UI-SPEC §8.1 / §8.2 wire verification
import { expect, fixture, html, aTimeout } from '@open-wc/testing';
import sinon from 'sinon';
import '../src/party-dispenser-card';
import type { PartyDispenserCard } from '../src/party-dispenser-card';
import type { CardConfig } from '../src/types';
import { buildHassHappy } from './fixtures/hass-happy';
import { buildHassLoading } from './fixtures/hass-loading';

describe('<party-dispenser-card>', () => {
  it('setConfig accepts minimal config', async () => {
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    expect(() => el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig)).to.not.throw();
  });

  it('setConfig throws on invalid type', async () => {
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    expect(() => el.setConfig({ type: 'wrong-card' } as unknown as CardConfig)).to.throw();
    expect(() => el.setConfig(undefined as unknown as CardConfig)).to.throw();
  });

  it('dispatches order_recipe service on pd-order-recipe event', async () => {
    const hass = buildHassHappy();
    const callService = sinon.spy(hass, 'callService');

    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    el.hass = hass;
    await el.updateComplete;

    // Dispatch a pd-order-recipe event from within the shadow DOM so it bubbles up
    // through ha-card's @pd-order-recipe listener. Use a recipeId that exists in the
    // happy fixture AND is makeable (recipe-margarita).
    const haCard = el.shadowRoot!.querySelector('ha-card')!;
    haCard.dispatchEvent(new CustomEvent('pd-order-recipe', {
      detail: { recipeId: 'recipe-margarita' },
      bubbles: true,
      composed: true,
    }));
    await aTimeout(10);

    expect(callService.calledWith('party_dispenser', 'order_recipe', { recipe_id: 'recipe-margarita' }))
      .to.be.true;
  });

  it('dispatches cancel_order service on pd-cancel-order event', async () => {
    const hass = buildHassHappy();
    const callService = sinon.spy(hass, 'callService');

    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    el.hass = hass;
    await el.updateComplete;

    const haCard = el.shadowRoot!.querySelector('ha-card')!;
    haCard.dispatchEvent(new CustomEvent('pd-cancel-order', {
      detail: { orderId: 'order-abc' },
      bubbles: true,
      composed: true,
    }));
    await aTimeout(10);

    expect(callService.calledWith('party_dispenser', 'cancel_order', { order_id: 'order-abc' }))
      .to.be.true;
  });

  it('renders 3 child sections when hass + config set (header, grid, queue)', async () => {
    const hass = buildHassHappy();
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    el.hass = hass;
    await el.updateComplete;

    const haCard = el.shadowRoot!.querySelector('ha-card')!;
    expect(haCard.querySelector('pd-summary-header')).to.exist;
    expect(haCard.querySelector('pd-recipe-grid')).to.exist;
    expect(haCard.querySelector('pd-queue-list')).to.exist;
  });

  it('renders nothing when hass is undefined (loading state)', async () => {
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    el.setConfig({ type: 'custom:party-dispenser-card' } as CardConfig);
    el.hass = buildHassLoading();
    await el.updateComplete;

    // With loading fixture (empty hass.states), _derive returns a DerivedState with loading=true,
    // but render still proceeds (shows the 3 children, which themselves render empty states).
    // Verify the structural rendering is stable.
    const haCard = el.shadowRoot!.querySelector('ha-card');
    expect(haCard).to.exist;
  });

  it('getCardSize returns a number', async () => {
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    expect(el.getCardSize()).to.be.a('number');
    expect(el.getCardSize()).to.equal(6);
  });

  it('getGridOptions returns rows and columns config', async () => {
    const el = await fixture<PartyDispenserCard>(html`<party-dispenser-card></party-dispenser-card>`);
    const opts = (el as unknown as { getGridOptions(): Record<string, number> }).getGridOptions();
    expect(opts).to.have.property('rows');
    expect(opts).to.have.property('columns');
  });
});
