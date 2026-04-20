"""Tests for the 5 sensor entities — verify each reads from coordinator state correctly."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock

from custom_components.party_dispenser.api import QueueItem, Recipe
from custom_components.party_dispenser.coordinator import PartyDispenserState
from custom_components.party_dispenser.sensor import (
    CurrentOrderSensor,
    MakeableCountSensor,
    QueueSizeSensor,
    QueueSummarySensor,
    RecipesSensor,
)


def _mock_coordinator(state: PartyDispenserState) -> MagicMock:
    """Return a MagicMock standing in for a PartyDispenserCoordinator instance."""
    coord = MagicMock()
    coord.data = state
    coord.config_entry.entry_id = "entry-abc"
    return coord


def _sample_recipes() -> list[Recipe]:
    """Two recipes — Margarita (makeable) + Mojito (not makeable, missing Rum)."""
    return [
        Recipe(
            id="r1",
            name="Margarita",
            is_active=True,
            order_count=0,
            ingredients=(),
            makeable=True,
            missing_ingredients=(),
            missing_count=0,
        ),
        Recipe(
            id="r2",
            name="Mojito",
            is_active=True,
            order_count=0,
            ingredients=(),
            makeable=False,
            missing_ingredients=("Rum",),
            missing_count=1,
        ),
    ]


def test_queue_size_reads_len() -> None:
    """QueueSizeSensor.native_value == len(coordinator.data.queue)."""
    state = PartyDispenserState(
        recipes=_sample_recipes(),
        queue=[
            QueueItem(
                id="o1",
                recipe_name="Margarita",
                state="QUEUED",
                priority=0,
                created_at=datetime.now(tz=UTC),
                updated_at=datetime.now(tz=UTC),
            ),
            QueueItem(
                id="o2",
                recipe_name="Mojito",
                state="IN_PROGRESS",
                priority=0,
                created_at=datetime.now(tz=UTC),
                updated_at=datetime.now(tz=UTC),
            ),
        ],
    )
    sensor = QueueSizeSensor(_mock_coordinator(state))
    assert sensor.native_value == 2
    assert len(sensor.extra_state_attributes["queue"]) == 2


def test_queue_summary_empty() -> None:
    """QueueSummarySensor reports 'Queue empty' when queue is []."""
    state = PartyDispenserState(recipes=[], queue=[])
    assert QueueSummarySensor(_mock_coordinator(state)).native_value == "Queue empty"


def test_queue_summary_with_head() -> None:
    """QueueSummarySensor mentions the head order's recipe name + state."""
    state = PartyDispenserState(
        recipes=[],
        queue=[
            QueueItem(
                id="o1",
                recipe_name="Margarita",
                state="QUEUED",
                priority=0,
                created_at=datetime.now(tz=UTC),
                updated_at=datetime.now(tz=UTC),
            ),
        ],
    )
    value = QueueSummarySensor(_mock_coordinator(state)).native_value
    assert "Margarita" in value
    assert "QUEUED" in value


def test_makeable_count_filters() -> None:
    """MakeableCountSensor reports only recipes where makeable is True."""
    state = PartyDispenserState(recipes=_sample_recipes(), queue=[])
    sensor = MakeableCountSensor(_mock_coordinator(state))
    assert sensor.native_value == 1  # only Margarita is makeable
    assert sensor.extra_state_attributes["makeable"] == ["Margarita"]


def test_current_order_idle() -> None:
    """CurrentOrderSensor reports 'idle' when queue is []."""
    state = PartyDispenserState(recipes=[], queue=[])
    assert CurrentOrderSensor(_mock_coordinator(state)).native_value == "idle"


def test_current_order_with_head() -> None:
    """CurrentOrderSensor reports queue head's recipe name + exposes order_id/state attrs."""
    state = PartyDispenserState(
        recipes=[],
        queue=[
            QueueItem(
                id="o1",
                recipe_name="Margarita",
                state="IN_PROGRESS",
                priority=0,
                created_at=datetime.now(tz=UTC),
                updated_at=datetime.now(tz=UTC),
            ),
        ],
    )
    sensor = CurrentOrderSensor(_mock_coordinator(state))
    assert sensor.native_value == "Margarita"
    attrs = sensor.extra_state_attributes
    assert attrs["order_id"] == "o1"
    assert attrs["state"] == "IN_PROGRESS"


def test_recipes_count() -> None:
    """RecipesSensor.native_value == len(coordinator.data.recipes); attrs expose all recipes."""
    state = PartyDispenserState(recipes=_sample_recipes(), queue=[])
    sensor = RecipesSensor(_mock_coordinator(state))
    assert sensor.native_value == 2
    assert len(sensor.extra_state_attributes["recipes"]) == 2


def test_device_info_stable_across_sensors() -> None:
    """All 5 sensors share a single DeviceInfo identity (INT-01 invariant)."""
    state = PartyDispenserState(recipes=[], queue=[])
    coord = _mock_coordinator(state)
    sensors = [
        QueueSizeSensor(coord),
        QueueSummarySensor(coord),
        MakeableCountSensor(coord),
        CurrentOrderSensor(coord),
        RecipesSensor(coord),
    ]
    # Every sensor's device_info uses the same (DOMAIN, entry_id) identifier tuple.
    device_ids = {tuple(s._attr_device_info["identifiers"]) for s in sensors}
    assert len(device_ids) == 1
