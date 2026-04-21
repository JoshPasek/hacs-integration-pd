// test/pd-recipe-tile.test.ts
// Source: 04-RESEARCH.md lines 1177-1232 + UI-SPEC §15.6 (lines 1278-1310)
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '../src/components/pd-recipe-tile';
import type { PdRecipeTile } from '../src/components/pd-recipe-tile';

describe('<pd-recipe-tile>', () => {
  it('dispatches pd-order-recipe on click when makeable', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r1', name: 'Margarita', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    setTimeout(() => button.click());
    const { detail } = await oneEvent(el, 'pd-order-recipe');
    expect(detail).to.deep.equal({ recipeId: 'r1' });
  });

  it('does not dispatch when not makeable and has aria-disabled="true"', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r2', name: 'Mojito', makeable: false }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-disabled')).to.equal('true');
    let fired = false;
    el.addEventListener('pd-order-recipe', () => { fired = true; });
    button.click();
    await new Promise(r => setTimeout(r, 0));
    expect(fired).to.be.false;
  });

  it('dispatches on Enter keydown', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r3', name: 'Old Fashioned', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    setTimeout(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })));
    const { detail } = await oneEvent(el, 'pd-order-recipe');
    expect(detail).to.deep.equal({ recipeId: 'r3' });
  });

  it('dispatches on Space keydown', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r4', name: 'Martini', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    setTimeout(() => button.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
    const { detail } = await oneEvent(el, 'pd-order-recipe');
    expect(detail).to.deep.equal({ recipeId: 'r4' });
  });

  it('aria-label includes name and makeable hint', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r5', name: 'Negroni', makeable: true }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-label')).to.contain('Negroni');
    expect(button.getAttribute('aria-label')).to.contain('tap to order');
  });

  it('aria-label indicates not-makeable hint when recipe.makeable=false', async () => {
    const el = await fixture<PdRecipeTile>(html`
      <pd-recipe-tile
        .recipe=${{ id: 'r6', name: 'Whisky Sour', makeable: false }}
      ></pd-recipe-tile>
    `);
    const button = el.shadowRoot!.querySelector('button')!;
    expect(button.getAttribute('aria-label')).to.contain('not makeable');
  });
});
