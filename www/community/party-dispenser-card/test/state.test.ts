// test/state.test.ts
import { expect } from '@esm-bundle/chai';
import { deriveState } from '../src/state';
import type { CardConfig } from '../src/types';
import { buildHassLoading } from './fixtures/hass-loading';
import { buildHassHappy } from './fixtures/hass-happy';
import { buildHassDisconnected } from './fixtures/hass-disconnected';
import { buildHassEmpty } from './fixtures/hass-empty';

const baseConfig: CardConfig = { type: 'custom:party-dispenser-card' };

describe('deriveState', () => {
  it('returns loading=true when entities undefined', () => {
    const d = deriveState(buildHassLoading(), baseConfig);
    expect(d.loading).to.be.true;
    expect(d.recipes).to.deep.equal([]);
    expect(d.queue).to.deep.equal([]);
    expect(d.connected).to.be.false;
  });

  it('extracts 3 recipes + 1 queue item from happy fixture', () => {
    const d = deriveState(buildHassHappy(), baseConfig);
    expect(d.loading).to.be.false;
    expect(d.recipes).to.have.lengthOf(3);
    expect(d.recipes[0].name).to.equal('Margarita');
    expect(d.recipes[0].makeable).to.be.true;
    expect(d.queue).to.have.lengthOf(1);
    expect(d.queueSize).to.equal(1);
    expect(d.makeableCount).to.equal(2);
    expect(d.currentOrderId).to.equal('order-abc');
    expect(d.connected).to.be.true;
  });

  it('coerces connected=false when binary sensor state is off', () => {
    const d = deriveState(buildHassDisconnected(), baseConfig);
    expect(d.connected).to.be.false;
    // Other data still flows (polling fallback works)
    expect(d.recipes).to.have.lengthOf(3);
  });

  it('handles empty recipes and queue', () => {
    const d = deriveState(buildHassEmpty(), baseConfig);
    expect(d.loading).to.be.false;
    expect(d.recipes).to.deep.equal([]);
    expect(d.queue).to.deep.equal([]);
    expect(d.queueSize).to.equal(0);
    expect(d.makeableCount).to.equal(0);
    expect(d.currentOrderId).to.be.null;
  });

  it('defaults currentOrderId to null when current_order attrs empty', () => {
    const hass = buildHassEmpty();
    const d = deriveState(hass, baseConfig);
    expect(d.currentOrderId).to.be.null;
  });
});
