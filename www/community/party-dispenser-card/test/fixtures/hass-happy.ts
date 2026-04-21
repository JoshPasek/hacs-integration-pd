// test/fixtures/hass-happy.ts — 3 recipes (2 makeable), 1 queued order, WS connected
// Matches sensor.py extra_state_attributes shapes verified 2026-04-20
import type { HomeAssistant } from 'custom-card-helpers';

export function buildHassHappy(): HomeAssistant {
  return {
    callService: async (_domain: string, _service: string, _data?: Record<string, unknown>) => {
      /* replaced by sinon.spy in tests */
    },
    states: {
      'sensor.party_dispenser_recipes': {
        entity_id: 'sensor.party_dispenser_recipes',
        state: '3',
        attributes: {
          recipes: [
            { id: 'recipe-margarita', name: 'Margarita', makeable: true },
            { id: 'recipe-mojito', name: 'Mojito', makeable: false },
            { id: 'recipe-oldfashioned', name: 'Old Fashioned', makeable: true },
          ],
        },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_queue_size': {
        entity_id: 'sensor.party_dispenser_queue_size',
        state: '1',
        attributes: {
          queue: [
            { id: 'order-abc', recipe_name: 'Margarita', state: 'QUEUED' },
          ],
        },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_makeable_count': {
        entity_id: 'sensor.party_dispenser_makeable_count',
        state: '2',
        attributes: { makeable: ['Margarita', 'Old Fashioned'] },
        last_changed: '',
        last_updated: '',
        context: { id: 'ctx', parent_id: null, user_id: null },
      },
      'sensor.party_dispenser_current_order': {
        entity_id: 'sensor.party_dispenser_current_order',
        state: 'Margarita',
        attributes: { order_id: 'order-abc', state: 'QUEUED', started_at: null },
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
