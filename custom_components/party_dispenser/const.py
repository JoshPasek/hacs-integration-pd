"""Constants for the Party Dispenser integration."""

from __future__ import annotations

from logging import Logger, getLogger

DOMAIN = "party_dispenser"
VERSION = "0.2.0"
MANUFACTURER = "PartyDispenser"
MODEL = "Dispenser"
ATTRIBUTION = "Data provided by Party Dispenser backend"

LOGGER: Logger = getLogger(__package__)

# --- Config flow / options keys ---
CONF_HOST = "host"
CONF_PORT = "port"
CONF_JWT = "jwt"
CONF_USE_TLS = "use_tls"
CONF_SCAN_INTERVAL = "scan_interval"

# --- Defaults ---
DEFAULT_PORT = 8000
DEFAULT_SCAN_INTERVAL = 30
DEFAULT_SESSION_UID = "home-assistant"
DEFAULT_TIMEOUT_SECONDS = 10
MIN_SCAN_INTERVAL = 5
MAX_SCAN_INTERVAL = 600

# --- Service names ---
SERVICE_ORDER_RECIPE = "order_recipe"
SERVICE_CANCEL_ORDER = "cancel_order"
SERVICE_REFRESH = "refresh"

# --- Service data keys ---
ATTR_RECIPE_ID = "recipe_id"
ATTR_ORDER_ID = "order_id"
ATTR_SESSION_UID = "session_uid"

# --- Sensor translation keys (used in translations/en.json) ---
SENSOR_KEY_QUEUE_SIZE = "queue_size"
SENSOR_KEY_QUEUE_SUMMARY = "queue_summary"
SENSOR_KEY_MAKEABLE_COUNT = "makeable_count"
SENSOR_KEY_CURRENT_ORDER = "current_order"
SENSOR_KEY_RECIPES = "recipes"
