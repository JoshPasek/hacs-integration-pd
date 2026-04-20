"""Tests for PartyDispenserCoordinator — state machine + error mapping."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import AsyncMock

import pytest
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import UpdateFailed
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    QueueItem,
    Recipe,
)
from custom_components.party_dispenser.const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_USE_TLS,
    DOMAIN,
)
from custom_components.party_dispenser.coordinator import PartyDispenserCoordinator


def _sample_recipe() -> Recipe:
    """Return a tiny makeable Margarita for fixture injection."""
    return Recipe(
        id="11111111-1111-1111-1111-111111111111",
        name="Margarita",
        is_active=True,
        order_count=0,
        ingredients=(),
        makeable=True,
        missing_ingredients=(),
        missing_count=0,
    )


async def _build_coordinator(hass, client) -> PartyDispenserCoordinator:
    """Build a coordinator with a mocked client and a MockConfigEntry attached."""
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
    coord = PartyDispenserCoordinator(hass, client, scan_interval=30)
    coord.config_entry = entry  # normally assigned by HA during setup
    return coord


async def test_successful_update_populates_state(hass) -> None:
    """Successful /recipes + /queue fetch returns a PartyDispenserState populated correctly."""
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.return_value = [_sample_recipe()]
    client.list_queue.return_value = []

    coord = await _build_coordinator(hass, client)
    state = await coord._async_update_data()

    assert len(state.recipes) == 1
    assert state.queue == []
    assert state.current_order is None
    assert state.last_updated is not None


async def test_auth_error_raises_config_entry_auth_failed(hass) -> None:
    """Auth error from the API client maps to ConfigEntryAuthFailed (HA re-auth trigger)."""
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.side_effect = PartyDispenserAuthError("bad jwt")
    client.list_queue.return_value = []

    coord = await _build_coordinator(hass, client)
    with pytest.raises(ConfigEntryAuthFailed):
        await coord._async_update_data()


async def test_connection_error_raises_update_failed(hass) -> None:
    """Connection error from the API client maps to UpdateFailed (entity unavailable)."""
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.side_effect = PartyDispenserConnectionError("boom")
    client.list_queue.return_value = []

    coord = await _build_coordinator(hass, client)
    with pytest.raises(UpdateFailed):
        await coord._async_update_data()


async def test_queue_head_becomes_current_order(hass) -> None:
    """When queue has items, state.current_order points to queue[0]."""
    client = AsyncMock(spec=PartyDispenserApiClient)
    client.list_recipes.return_value = [_sample_recipe()]
    client.list_queue.return_value = [
        QueueItem(
            id="33333333-3333-3333-3333-333333333333",
            recipe_name="Margarita",
            state="QUEUED",
            priority=0,
            created_at=datetime.now(tz=UTC),
            updated_at=datetime.now(tz=UTC),
        ),
    ]

    coord = await _build_coordinator(hass, client)
    state = await coord._async_update_data()

    assert state.current_order is not None
    assert state.current_order.state == "QUEUED"
