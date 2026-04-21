// test/pd-summary-chip.test.ts
import { expect, fixture, html } from '@open-wc/testing';
import '../src/components/pd-summary-chip';
import type { PdSummaryChip } from '../src/components/pd-summary-chip';

describe('<pd-summary-chip>', () => {
  it('renders icon, label, and value', async () => {
    const el = await fixture<PdSummaryChip>(html`
      <pd-summary-chip icon="mdi:playlist-music" label="Queue" value="3"></pd-summary-chip>
    `);
    const chip = el.shadowRoot!.querySelector('.chip')!;
    expect(chip).to.exist;
    const icon = chip.querySelector('ha-icon');
    expect(icon).to.exist;
    expect(icon!.getAttribute('icon')).to.equal('mdi:playlist-music');
    expect(chip.querySelector('.label')!.textContent).to.equal('Queue');
    expect(chip.querySelector('.value')!.textContent).to.equal('3');
  });

  it('forms aria-label as "label: value"', async () => {
    const el = await fixture<PdSummaryChip>(html`
      <pd-summary-chip label="Ready" value="5"></pd-summary-chip>
    `);
    const chip = el.shadowRoot!.querySelector('.chip')!;
    expect(chip.getAttribute('aria-label')).to.equal('Ready: 5');
  });

  it('applies tone-success class when tone="success"', async () => {
    const el = await fixture<PdSummaryChip>(html`
      <pd-summary-chip label="Live" value="" tone="success"></pd-summary-chip>
    `);
    const chip = el.shadowRoot!.querySelector('.chip')!;
    expect(chip.classList.contains('tone-success')).to.be.true;
  });
});
