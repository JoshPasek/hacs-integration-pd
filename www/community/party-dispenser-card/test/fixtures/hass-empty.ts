// test/fixtures/hass-empty.ts — zero recipes, zero queue; tests empty-state copy
import type { HomeAssistant } from 'custom-card-helpers';

export function buildHassEmpty(): HomeAssistant {
  return {
    callService: async () => {},
    states: {
      'sensor.party_dispenser_recipes': {
        entity_id: 'sensor.party_dispenser_recipes',
        state: '0',
        attributes: { recipes: [] },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_queue_size': {
        entity_id: 'sensor.party_dispenser_queue_size',
        state: '0',
        attributes: { queue: [] },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_makeable_count': {
        entity_id: 'sensor.party_dispenser_makeable_count',
        state: '0',
        attributes: { makeable: [] },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_current_order': {
        entity_id: 'sensor.party_dispenser_current_order',
        state: 'idle',
        attributes: {},
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'binary_sensor.party_dispenser_connected': {
        entity_id: 'binary_sensor.party_dispenser_connected',
        state: 'on',
        attributes: {},
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
    },
  } as unknown as HomeAssistant;
}
