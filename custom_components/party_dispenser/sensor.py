"""Sensor platform — 5 entities reading from coordinator state."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.components.sensor import SensorEntity, SensorEntityDescription

from .const import (
    SENSOR_KEY_CURRENT_ORDER,
    SENSOR_KEY_MAKEABLE_COUNT,
    SENSOR_KEY_QUEUE_SIZE,
    SENSOR_KEY_QUEUE_SUMMARY,
    SENSOR_KEY_RECIPES,
)
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
    """Set up the 5 Party Dispenser sensor entities from the coordinator."""
    coordinator = entry.runtime_data.coordinator
    async_add_entities(
        [
            QueueSizeSensor(coordinator),
            QueueSummarySensor(coordinator),
            MakeableCountSensor(coordinator),
            CurrentOrderSensor(coordinator),
            RecipesSensor(coordinator),
        ]
    )


# ---- 1 / 5: queue size ----


class QueueSizeSensor(PartyDispenserEntity, SensorEntity):
    """Current number of items in the dispenser queue."""

    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_QUEUE_SIZE,
        translation_key=SENSOR_KEY_QUEUE_SIZE,
        icon="mdi:playlist-music",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        """Initialise and set a stable unique_id scoped by entry_id."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_QUEUE_SIZE}"

    @property
    def native_value(self) -> int:
        """Return the number of queued orders."""
        return len(self.coordinator.data.queue)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """Expose the full queue as a list of {id, recipe_name, state} dicts."""
        return {
            "queue": [
                {"id": item.id, "recipe_name": item.recipe_name, "state": item.state}
                for item in self.coordinator.data.queue
            ]
        }


# ---- 2 / 5: queue summary (human-readable) ----


class QueueSummarySensor(PartyDispenserEntity, SensorEntity):
    """Human-readable one-line summary of the queue."""

    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_QUEUE_SUMMARY,
        translation_key=SENSOR_KEY_QUEUE_SUMMARY,
        icon="mdi:text-box-outline",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        """Initialise and set a stable unique_id scoped by entry_id."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_QUEUE_SUMMARY}"

    @property
    def native_value(self) -> str:
        """Return a human-readable summary of the queue."""
        queue = self.coordinator.data.queue
        if not queue:
            return "Queue empty"
        head = queue[0]
        return f"{len(queue)} queued · {head.recipe_name} {head.state}"


# ---- 3 / 5: makeable count ----


class MakeableCountSensor(PartyDispenserEntity, SensorEntity):
    """Number of recipes with all ingredients available."""

    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_MAKEABLE_COUNT,
        translation_key=SENSOR_KEY_MAKEABLE_COUNT,
        icon="mdi:glass-cocktail",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        """Initialise and set a stable unique_id scoped by entry_id."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_MAKEABLE_COUNT}"

    @property
    def native_value(self) -> int:
        """Return the count of makeable recipes."""
        return sum(1 for r in self.coordinator.data.recipes if r.makeable)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """Expose the names of every currently-makeable recipe."""
        return {"makeable": [r.name for r in self.coordinator.data.recipes if r.makeable]}


# ---- 4 / 5: current order ----


class CurrentOrderSensor(PartyDispenserEntity, SensorEntity):
    """Name of the order at the head of the queue, or 'idle' if empty."""

    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_CURRENT_ORDER,
        translation_key=SENSOR_KEY_CURRENT_ORDER,
        icon="mdi:glass-cocktail",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        """Initialise and set a stable unique_id scoped by entry_id."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_CURRENT_ORDER}"

    @property
    def native_value(self) -> str:
        """Return the recipe name of the head order, or 'idle' if queue empty."""
        current = self.coordinator.data.current_order
        return current.recipe_name if current else "idle"

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """Expose order_id, state, and started_at for the head order."""
        current = self.coordinator.data.current_order
        if not current:
            return {}
        return {
            "order_id": current.id,
            "state": current.state,
            "started_at": current.created_at.isoformat() if current.created_at else None,
        }


# ---- 5 / 5: recipes count ----


class RecipesSensor(PartyDispenserEntity, SensorEntity):
    """Total number of recipes known to the backend."""

    entity_description = SensorEntityDescription(
        key=SENSOR_KEY_RECIPES,
        translation_key=SENSOR_KEY_RECIPES,
        icon="mdi:clipboard-list-outline",
    )

    def __init__(self, coordinator: PartyDispenserCoordinator) -> None:
        """Initialise and set a stable unique_id scoped by entry_id."""
        super().__init__(coordinator)
        self._attr_unique_id = f"{coordinator.config_entry.entry_id}_{SENSOR_KEY_RECIPES}"

    @property
    def native_value(self) -> int:
        """Return the total number of recipes."""
        return len(self.coordinator.data.recipes)

    @property
    def extra_state_attributes(self) -> dict[str, object]:
        """Expose a LIGHT recipe list (id + name + makeable only).

        Deliberately omits `ingredients` to stay under HA's 16KB soft limit on
        entity state attributes; full recipe data is consumed by the Phase 4
        custom card directly from coordinator state.
        """
        return {
            "recipes": [
                {"id": r.id, "name": r.name, "makeable": r.makeable}
                for r in self.coordinator.data.recipes
            ]
        }
