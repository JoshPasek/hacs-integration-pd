"""Domain-level services for Party Dispenser (register once at HA startup)."""

from __future__ import annotations

from typing import TYPE_CHECKING

import voluptuous as vol
from homeassistant.core import HomeAssistant, ServiceCall, callback
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv

from .api import (
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    PartyDispenserError,
)
from .const import (
    ATTR_ORDER_ID,
    ATTR_RECIPE_ID,
    ATTR_SESSION_UID,
    DEFAULT_SESSION_UID,
    DOMAIN,
    LOGGER,
    SERVICE_CANCEL_ORDER,
    SERVICE_ORDER_RECIPE,
    SERVICE_REFRESH,
)

if TYPE_CHECKING:
    from .coordinator import PartyDispenserData


# ---------- Schemas ----------


ORDER_RECIPE_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_RECIPE_ID): cv.string,
        vol.Optional(ATTR_SESSION_UID, default=DEFAULT_SESSION_UID): cv.string,
    }
)

CANCEL_ORDER_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_ORDER_ID): cv.string,
        vol.Optional(ATTR_SESSION_UID, default=DEFAULT_SESSION_UID): cv.string,
    }
)

REFRESH_SCHEMA = vol.Schema({})


# ---------- Helpers ----------


def _all_runtime_data(hass: HomeAssistant) -> list[PartyDispenserData]:
    """Return runtime_data for every loaded config entry of this domain."""
    return [
        entry.runtime_data
        for entry in hass.config_entries.async_entries(DOMAIN)
        if hasattr(entry, "runtime_data") and entry.runtime_data is not None
    ]


def _first_runtime_data_or_raise(hass: HomeAssistant) -> PartyDispenserData:
    """Return the first runtime_data or raise if the integration is not configured.

    v1 ships single-dispenser; multi-dispenser is tracked under v2 (MULTI-01).
    """
    runtimes = _all_runtime_data(hass)
    if not runtimes:
        raise HomeAssistantError("Party Dispenser is not configured")
    return runtimes[0]


# ---------- Handlers ----------


async def _async_handle_order_recipe(call: ServiceCall) -> None:
    """Handle party_dispenser.order_recipe — POST then coordinator refresh."""
    runtime = _first_runtime_data_or_raise(call.hass)
    try:
        await runtime.client.order_from_recipe(
            recipe_id=call.data[ATTR_RECIPE_ID],
            session_uid=call.data.get(ATTR_SESSION_UID, DEFAULT_SESSION_UID),
        )
    except PartyDispenserAuthError as err:
        raise HomeAssistantError(f"Party Dispenser rejected JWT: {err}") from err
    except PartyDispenserConnectionError as err:
        raise HomeAssistantError(f"Cannot reach Party Dispenser backend: {err}") from err
    except PartyDispenserError as err:
        raise HomeAssistantError(f"Party Dispenser error: {err}") from err

    # Pitfall 7: refresh AFTER the API call so new state is reflected without waiting
    # a full poll interval.
    await runtime.coordinator.async_request_refresh()


async def _async_handle_cancel_order(call: ServiceCall) -> None:
    """Handle party_dispenser.cancel_order — POST /orders/{id}/cancel then refresh."""
    runtime = _first_runtime_data_or_raise(call.hass)
    try:
        await runtime.client.cancel_order(
            order_id=call.data[ATTR_ORDER_ID],
            session_uid=call.data.get(ATTR_SESSION_UID, DEFAULT_SESSION_UID),
        )
    except PartyDispenserError as err:
        raise HomeAssistantError(f"Party Dispenser error: {err}") from err

    await runtime.coordinator.async_request_refresh()


async def _async_handle_refresh(call: ServiceCall) -> None:
    """Force a refresh of every loaded config entry's coordinator."""
    runtimes = _all_runtime_data(call.hass)
    if not runtimes:
        raise HomeAssistantError("Party Dispenser is not configured")
    for runtime in runtimes:
        await runtime.coordinator.async_request_refresh()


# ---------- Public entry point called from __init__.async_setup ----------


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the 3 domain-level services exactly once per HA lifetime."""
    # Pitfall 3: guard in case async_setup somehow runs twice (second config entry etc.)
    if hass.services.has_service(DOMAIN, SERVICE_ORDER_RECIPE):
        return

    hass.services.async_register(
        DOMAIN,
        SERVICE_ORDER_RECIPE,
        _async_handle_order_recipe,
        schema=ORDER_RECIPE_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_CANCEL_ORDER,
        _async_handle_cancel_order,
        schema=CANCEL_ORDER_SCHEMA,
    )
    hass.services.async_register(
        DOMAIN,
        SERVICE_REFRESH,
        _async_handle_refresh,
        schema=REFRESH_SCHEMA,
    )
    LOGGER.debug("Registered %s services", DOMAIN)
