// test/fixtures/hass-disconnected.ts — connected = off; polling fallback still delivers data
import type { HomeAssistant } from 'custom-card-helpers';
import { buildHassHappy } from './hass-happy';

export function buildHassDisconnected(): HomeAssistant {
  const hass = buildHassHappy();
  (hass.states as Record<string, { state: string }>)
    ['binary_sensor.party_dispenser_connected'].state = 'off';
  return hass;
}
