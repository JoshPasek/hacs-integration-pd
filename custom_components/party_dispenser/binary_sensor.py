"""Binary-sensor platform — single CONNECTIVITY sensor for WS state."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.const import EntityCategory
from homeassistant.core import callback
from homeassistant.helpers.dispatcher import async_dispatcher_connect

from .const import BINARY_SENSOR_KEY_CONNECTED, SIGNAL_WS_CONNECTED
from .entity import PartyDispenserEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddEntitiesCallback

    from .coordinator import PartyDispenserConfigEntry, PartyDispenserCoordinator


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the single binary_sensor.party_dispenser_connected entity."""
    coordinator = entry.runtime_data.coordinator
    ws_client = entry.runtime_data.ws_client
    async_add_entities(
        [PartyDispenserConnectedBinarySensor(coordinator, ws_client, entry.entry_id)]
    )


class PartyDispenserConnectedBinarySensor(PartyDispenserEntity, BinarySensorEntity):
    """WebSocket connection-state sensor (DIAGNOSTIC, device_class=CONNECTIVITY)."""

    entity_description = BinarySensorEntityDescription(
        key=BINARY_SENSOR_KEY_CONNECTED,
        translation_key=BINARY_SENSOR_KEY_CONNECTED,
        device_class=BinarySensorDeviceClass.CONNECTIVITY,
        entity_category=EntityCategory.DIAGNOSTIC,
    )

    def __init__(
        self,
        coordinator: PartyDispenserCoordinator,
        ws_client,  # PartyDispenserWebSocketClient — untyped here to avoid circular import
        entry_id: str,
    ) -> None:
        """Wire CoordinatorEntity base + stash ws_client for initial-state seeding."""
        super().__init__(coordinator)
        self._entry_id = entry_id
        self._ws_client = ws_client
        self._attr_unique_id = f"{entry_id}_{BINARY_SENSOR_KEY_CONNECTED}"
        self._connected: bool = ws_client.connected  # Seed from current client state

    @property
    def is_on(self) -> bool:
        """Return True when the WebSocket is connected to the backend."""
        return self._connected

    async def async_added_to_hass(self) -> None:
        """Subscribe to the WS-connection dispatcher signal for this entry."""
        await super().async_added_to_hass()
        self.async_on_remove(
            async_dispatcher_connect(
                self.hass,
                SIGNAL_WS_CONNECTED.format(entry_id=self._entry_id),
                self._handle_ws_connection_change,
            )
        )

    @callback
    def _handle_ws_connection_change(self, connected: bool) -> None:
        """Update state and push to HA on each WS connect/disconnect transition."""
        self._connected = connected
        self.async_write_ha_state()
