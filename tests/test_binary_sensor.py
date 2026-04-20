"""Tests for binary_sensor.party_dispenser_connected."""

from __future__ import annotations

from unittest.mock import MagicMock

from homeassistant.components.binary_sensor import BinarySensorDeviceClass
from homeassistant.const import EntityCategory
from homeassistant.helpers.dispatcher import async_dispatcher_send

from custom_components.party_dispenser.binary_sensor import (
    PartyDispenserConnectedBinarySensor,
)
from custom_components.party_dispenser.const import SIGNAL_WS_CONNECTED


def _mock_coordinator() -> MagicMock:
    """Return a coordinator MagicMock with the shape PartyDispenserEntity expects."""
    coord = MagicMock()
    coord.config_entry.entry_id = "entry-abc"
    # CoordinatorEntity reads coord.data during setup; our sensor doesn't, but HA does.
    coord.data = MagicMock()
    return coord


def test_binary_sensor_attributes() -> None:
    """BinarySensorEntityDescription exposes device_class=CONNECTIVITY + diagnostic category."""
    coord = _mock_coordinator()
    ws_client = MagicMock()
    ws_client.connected = False
    sensor = PartyDispenserConnectedBinarySensor(coord, ws_client, entry_id="entry-abc")

    assert sensor.device_class is BinarySensorDeviceClass.CONNECTIVITY
    assert sensor.entity_category is EntityCategory.DIAGNOSTIC
    assert sensor.unique_id == "entry-abc_connected"
    assert sensor.is_on is False


async def test_binary_sensor_responds_to_dispatcher_signal(hass) -> None:
    """Dispatcher signal flips is_on and calls async_write_ha_state."""
    coord = _mock_coordinator()
    ws_client = MagicMock()
    ws_client.connected = False
    sensor = PartyDispenserConnectedBinarySensor(coord, ws_client, entry_id="entry-abc")
    sensor.hass = hass
    sensor.platform = MagicMock()  # Required by async_write_ha_state path.
    sensor.async_write_ha_state = MagicMock()  # Stub out the HA-side push.

    # Simulate HA calling async_added_to_hass (would register the dispatcher listener).
    await sensor.async_added_to_hass()

    # Fire dispatcher signal — sensor should receive it.
    async_dispatcher_send(
        hass,
        SIGNAL_WS_CONNECTED.format(entry_id="entry-abc"),
        True,
    )
    await hass.async_block_till_done()

    assert sensor.is_on is True
    sensor.async_write_ha_state.assert_called()
