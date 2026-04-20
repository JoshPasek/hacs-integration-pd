"""Tests for party_dispenser.order_recipe / cancel_order / refresh domain-level services."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from homeassistant.exceptions import HomeAssistantError
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.const import (
    ATTR_ORDER_ID,
    ATTR_RECIPE_ID,
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_USE_TLS,
    DOMAIN,
    SERVICE_CANCEL_ORDER,
    SERVICE_ORDER_RECIPE,
    SERVICE_REFRESH,
)
from custom_components.party_dispenser.coordinator import PartyDispenserData
from custom_components.party_dispenser.services import async_setup_services


async def _install_fake_entry(hass):
    """Install a MockConfigEntry with a fake client + fake coordinator on runtime_data."""
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local",
            CONF_PORT: 8000,
            CONF_JWT: "jwt",
            CONF_USE_TLS: False,
        },
    )
    entry.add_to_hass(hass)

    # Patch async_setup_entry so HA doesn't try to run the real coordinator wiring.
    with patch(
        "custom_components.party_dispenser.async_setup_entry",
        return_value=True,
    ):
        await hass.config_entries.async_setup(entry.entry_id)

    # Inject fake runtime_data (since we patched setup).
    fake_client = AsyncMock()
    fake_coordinator = MagicMock()
    fake_coordinator.async_request_refresh = AsyncMock()
    fake_ws_client = MagicMock()  # Phase 3: services never touch ws_client, MagicMock suffices
    entry.runtime_data = PartyDispenserData(
        client=fake_client,
        coordinator=fake_coordinator,
        ws_client=fake_ws_client,
    )
    return entry, fake_client, fake_coordinator


async def test_order_recipe_calls_api_then_refresh(hass) -> None:
    """order_recipe service calls api.order_from_recipe then coordinator.async_request_refresh."""
    async_setup_services(hass)
    _entry, fake_client, fake_coord = await _install_fake_entry(hass)

    await hass.services.async_call(
        DOMAIN,
        SERVICE_ORDER_RECIPE,
        {ATTR_RECIPE_ID: "11111111-1111-1111-1111-111111111111"},
        blocking=True,
    )

    fake_client.order_from_recipe.assert_called_once_with(
        recipe_id="11111111-1111-1111-1111-111111111111",
        session_uid="home-assistant",
    )
    fake_coord.async_request_refresh.assert_called_once()


async def test_cancel_order_calls_api_then_refresh(hass) -> None:
    """cancel_order service calls api.cancel_order then coordinator.async_request_refresh."""
    async_setup_services(hass)
    _entry, fake_client, fake_coord = await _install_fake_entry(hass)

    await hass.services.async_call(
        DOMAIN,
        SERVICE_CANCEL_ORDER,
        {ATTR_ORDER_ID: "22222222-2222-2222-2222-222222222222"},
        blocking=True,
    )

    fake_client.cancel_order.assert_called_once_with(
        order_id="22222222-2222-2222-2222-222222222222",
        session_uid="home-assistant",
    )
    fake_coord.async_request_refresh.assert_called_once()


async def test_refresh_triggers_coordinator(hass) -> None:
    """party_dispenser.refresh calls coordinator.async_request_refresh for every entry."""
    async_setup_services(hass)
    _entry, _fake_client, fake_coord = await _install_fake_entry(hass)

    await hass.services.async_call(DOMAIN, SERVICE_REFRESH, {}, blocking=True)

    fake_coord.async_request_refresh.assert_called_once()


async def test_service_raises_when_no_entries(hass) -> None:
    """Calling refresh with no config entries raises HomeAssistantError('not configured')."""
    async_setup_services(hass)

    with pytest.raises(HomeAssistantError, match="not configured"):
        await hass.services.async_call(DOMAIN, SERVICE_REFRESH, {}, blocking=True)
