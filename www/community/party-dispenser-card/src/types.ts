// src/types.ts
// UI-SPEC §7.4 lines 452-491 (created_at?: string — optional to match sensor.py line 70)
import type { HomeAssistant } from 'custom-card-helpers';

export interface Recipe {
  id: string;
  name: string;
  makeable: boolean;
  // NOTE: ingredients/description intentionally NOT available at card level in v1
  // (sensor ships light attrs only — Phase 2 Decision 02-03).
  // v2 may add a websocket subscription to fetch full detail on-demand.
}

export interface QueueItem {
  id: string;
  recipe_name: string;
  state: 'QUEUED' | 'PREPARING' | 'POURING' | 'READY' | 'QUEUED_OPTIMISTIC';
  created_at?: string;   // ISO 8601 — optional; sensor.queue attribute doesn't ship created_at (sensor.py line 70)
}

export interface CardConfig {
  type: 'custom:party-dispenser-card';
  entity?: string;
  title?: string;
  show_connection_status?: boolean;
  max_recipes_visible?: number;
  show_not_makeable?: boolean;
}

export interface DerivedState {
  recipes: Recipe[];
  queue: QueueItem[];
  queueSize: number;
  makeableCount: number;
  currentOrderId: string | null;
  connected: boolean;
  loading: boolean;
}

export type { HomeAssistant };
