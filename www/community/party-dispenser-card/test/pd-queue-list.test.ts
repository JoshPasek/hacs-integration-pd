// test/pd-queue-list.test.ts
import { expect, fixture, html } from '@open-wc/testing';
import '../src/components/pd-queue-list';
import type { PdQueueList } from '../src/components/pd-queue-list';

const QUEUE = [
  { id: 'o1', recipe_name: 'Margarita', state: 'QUEUED' as const },
  { id: 'o2', recipe_name: 'Negroni', state: 'PREPARING' as const },
];

describe('<pd-queue-list>', () => {
  it('renders N items for N queue entries', async () => {
    const el = await fixture<PdQueueList>(html`
      <pd-queue-list .queue=${QUEUE}></pd-queue-list>
    `);
    const items = el.shadowRoot!.querySelectorAll('pd-queue-item');
    expect(items).to.have.lengthOf(2);
  });

  it('highlights the current order via .isCurrent prop', async () => {
    const el = await fixture<PdQueueList>(html`
      <pd-queue-list .queue=${QUEUE} .currentOrderId=${'o1'}></pd-queue-list>
    `);
    const items = el.shadowRoot!.querySelectorAll('pd-queue-item');
    // The first item (id=o1) should have isCurrent=true; second should be false
    expect((items[0] as unknown as { isCurrent: boolean }).isCurrent).to.be.true;
    expect((items[1] as unknown as { isCurrent: boolean }).isCurrent).to.be.false;
  });

  it('renders empty state when queue is []', async () => {
    const el = await fixture<PdQueueList>(html`
      <pd-queue-list .queue=${[]}></pd-queue-list>
    `);
    const empty = el.shadowRoot!.querySelector('.empty')!;
    expect(empty).to.exist;
    expect(empty.querySelector('.empty-heading')!.textContent).to.equal('Queue empty');
  });
});
