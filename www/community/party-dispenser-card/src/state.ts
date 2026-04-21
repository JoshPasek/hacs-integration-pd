// src/state.ts
// Source: UI-SPEC §7.2 + RESEARCH lines 519-556 (refined from canonical Mushroom patterns)
import type { HomeAssistant } from 'custom-card-helpers';
import type { DerivedState, CardConfig, Recipe, QueueItem } from './types';

export function deriveState(hass: HomeAssistant, _config: CardConfig): DerivedState {
  const prefix = 'sensor.party_dispenser_';
  const recipesEntity = hass.states[`${prefix}recipes`];
  const queueSizeEntity = hass.states[`${prefix}queue_size`];
  const makeableEntity = hass.states[`${prefix}makeable_count`];
  const currentEntity = hass.states[`${prefix}current_order`];
  const connectedEntity = hass.states['binary_sensor.party_dispenser_connected'];

  // Phase 2 sensor shapes (verified against custom_components/party_dispenser/sensor.py):
  //   sensor.party_dispenser_recipes.attributes.recipes = [{id, name, makeable}] (LIGHT per Decision 02-03)
  //   sensor.party_dispenser_queue_size.attributes.queue = [{id, recipe_name, state}]
  //   sensor.party_dispenser_current_order.attributes = { order_id, state, started_at } | {}
  //   binary_sensor.party_dispenser_connected.state = "on" | "off"

  const recipes: Recipe[] = (recipesEntity?.attributes?.recipes ?? []) as Recipe[];
  const queue: QueueItem[] = (queueSizeEntity?.attributes?.queue ?? []) as QueueItem[];
  const queueSize: number = queue.length;
  const makeableCount: number = Number(makeableEntity?.state ?? 0);
  const currentOrderId: string | null = (currentEntity?.attributes?.order_id as string | undefined) ?? null;
  const connected: boolean = connectedEntity?.state === 'on';

  return {
    recipes,
    queue,
    queueSize,
    makeableCount,
    currentOrderId,
    connected,
    loading: recipesEntity === undefined && queueSizeEntity === undefined,
  };
}
