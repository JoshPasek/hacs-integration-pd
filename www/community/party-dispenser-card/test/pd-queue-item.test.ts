// test/pd-queue-item.test.ts
import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '../src/components/pd-queue-item';
import type { PdQueueItem } from '../src/components/pd-queue-item';

describe('<pd-queue-item>', () => {
  it('dispatches pd-cancel-order on cancel button click', async () => {
    const el = await fixture<PdQueueItem>(html`
      <pd-queue-item
        .item=${{ id: 'order-123', recipe_name: 'Margarita', state: 'QUEUED' }}
      ></pd-queue-item>
    `);
    const cancelBtn = el.shadowRoot!.querySelector('.cancel')! as HTMLButtonElement;
    setTimeout(() => cancelBtn.click());
    const { detail } = await oneEvent(el, 'pd-cancel-order');
    expect(detail).to.deep.equal({ orderId: 'order-123' });
  });

  it('cancel button aria-label includes recipe name', async () => {
    const el = await fixture<PdQueueItem>(html`
      <pd-queue-item
        .item=${{ id: 'order-abc', recipe_name: 'Negroni', state: 'PREPARING' }}
      ></pd-queue-item>
    `);
    const cancelBtn = el.shadowRoot!.querySelector('.cancel')!;
    expect(cancelBtn.getAttribute('aria-label')).to.equal('Cancel Negroni order');
  });

  it('state chip copy matches state enum value', async () => {
    const el = await fixture<PdQueueItem>(html`
      <pd-queue-item
        .item=${{ id: 'order-xyz', recipe_name: 'Martini', state: 'POURING' }}
      ></pd-queue-item>
    `);
    const stateChip = el.shadowRoot!.querySelector('.state')!;
    expect(stateChip.textContent).to.equal('Pouring');
  });
});
