// test/pd-summary-header.test.ts
import { expect, fixture, html } from '@open-wc/testing';
import '../src/components/pd-summary-header';
import type { PdSummaryHeader } from '../src/components/pd-summary-header';

describe('<pd-summary-header>', () => {
  it('renders 3 chips when showConnection=true', async () => {
    const el = await fixture<PdSummaryHeader>(html`
      <pd-summary-header
        .queueSize=${2}
        .makeableCount=${5}
        .connected=${true}
        .showConnection=${true}
      ></pd-summary-header>
    `);
    const chips = el.shadowRoot!.querySelectorAll('pd-summary-chip');
    expect(chips).to.have.lengthOf(3);
  });

  it('renders 2 chips when showConnection=false', async () => {
    const el = await fixture<PdSummaryHeader>(html`
      <pd-summary-header
        .queueSize=${0}
        .makeableCount=${0}
        .connected=${false}
        .showConnection=${false}
      ></pd-summary-header>
    `);
    const chips = el.shadowRoot!.querySelectorAll('pd-summary-chip');
    expect(chips).to.have.lengthOf(2);
  });

  it('renders custom title in h3', async () => {
    const el = await fixture<PdSummaryHeader>(html`
      <pd-summary-header title="Bar Station A"></pd-summary-header>
    `);
    expect(el.shadowRoot!.querySelector('h3')!.textContent).to.equal('Bar Station A');
  });
});
