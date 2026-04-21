// test/fixtures/hass-loading.ts — every entity undefined; DerivedState.loading must be true
import type { HomeAssistant } from 'custom-card-helpers';

export function buildHassLoading(): HomeAssistant {
  return {
    callService: async () => {},
    states: {},
  } as unknown as HomeAssistant;
}
