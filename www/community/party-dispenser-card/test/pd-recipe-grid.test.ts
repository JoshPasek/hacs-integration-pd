// test/pd-recipe-grid.test.ts
import { expect, fixture, html } from '@open-wc/testing';
import '../src/components/pd-recipe-grid';
import type { PdRecipeGrid } from '../src/components/pd-recipe-grid';

const RECIPES = [
  { id: 'r1', name: 'Margarita', makeable: true },
  { id: 'r2', name: 'Mojito', makeable: false },
  { id: 'r3', name: 'Old Fashioned', makeable: true },
  { id: 'r4', name: 'Negroni', makeable: true },
];

describe('<pd-recipe-grid>', () => {
  it('renders N tiles for N recipes', async () => {
    const el = await fixture<PdRecipeGrid>(html`
      <pd-recipe-grid .recipes=${RECIPES}></pd-recipe-grid>
    `);
    const tiles = el.shadowRoot!.querySelectorAll('pd-recipe-tile');
    expect(tiles).to.have.lengthOf(4);
  });

  it('respects maxVisible truncation', async () => {
    const el = await fixture<PdRecipeGrid>(html`
      <pd-recipe-grid .recipes=${RECIPES} .maxVisible=${2}></pd-recipe-grid>
    `);
    const tiles = el.shadowRoot!.querySelectorAll('pd-recipe-tile');
    expect(tiles).to.have.lengthOf(2);
  });

  it('filters non-makeable when showNotMakeable=false', async () => {
    const el = await fixture<PdRecipeGrid>(html`
      <pd-recipe-grid .recipes=${RECIPES} .showNotMakeable=${false}></pd-recipe-grid>
    `);
    const tiles = el.shadowRoot!.querySelectorAll('pd-recipe-tile');
    expect(tiles).to.have.lengthOf(3);  // only makeable ones
  });

  it('renders empty state when recipes is empty', async () => {
    const el = await fixture<PdRecipeGrid>(html`
      <pd-recipe-grid .recipes=${[]}></pd-recipe-grid>
    `);
    const empty = el.shadowRoot!.querySelector('.empty')!;
    expect(empty).to.exist;
    expect(empty.querySelector('.empty-heading')!.textContent).to.equal('No recipes yet');
  });
});
