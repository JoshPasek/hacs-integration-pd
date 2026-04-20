"""Base entity for Party Dispenser sensors."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import ATTRIBUTION, DOMAIN, MANUFACTURER, MODEL
from .coordinator import PartyDispenserCoordinator


class PartyDispenserEntity(CoordinatorEntity[PartyDispenserCoordinator]):
    """Common base class: shared DeviceInfo + entity-name behaviour."""

    _attr_attribution = ATTRIBUTION
    _attr_has_entity_name = True

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        """Wire CoordinatorEntity + set shared DeviceInfo from the entry_id."""
        super().__init__(coordinator)
        entry_id = coordinator.config_entry.entry_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, entry_id)},
            name="Party Dispenser",
            manufacturer=MANUFACTURER,
            model=MODEL,
        )
