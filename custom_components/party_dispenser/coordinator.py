"""DataUpdateCoordinator + runtime-data types for Party Dispenser."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import TYPE_CHECKING

from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserError,
    QueueItem,
    Recipe,
)
from .const import DOMAIN, LOGGER

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant


@dataclass
class PartyDispenserState:
    """The coordinator's payload, passed to every entity on every tick."""

    recipes: list[Recipe] = field(default_factory=list)
    queue: list[QueueItem] = field(default_factory=list)
    last_updated: datetime | None = None

    @property
    def current_order(self) -> QueueItem | None:
        """Return the head of the queue (the dispenser's active order)."""
        return self.queue[0] if self.queue else None


@dataclass
class PartyDispenserData:
    """Runtime data stored on the ConfigEntry."""

    client: PartyDispenserApiClient
    coordinator: PartyDispenserCoordinator


type PartyDispenserConfigEntry = ConfigEntry[PartyDispenserData]


class PartyDispenserCoordinator(DataUpdateCoordinator[PartyDispenserState]):
    """Polls /recipes and /queue concurrently."""

    config_entry: PartyDispenserConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        client: PartyDispenserApiClient,
        scan_interval: int,
    ) -> None:
        """Build the coordinator with a timedelta derived from scan_interval (seconds)."""
        super().__init__(
            hass,
            LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=scan_interval),
        )
        self._client = client

    async def _async_update_data(self) -> PartyDispenserState:
        """Fetch /recipes and /queue concurrently; map auth/transient errors to HA exceptions."""
        try:
            recipes, queue = await asyncio.gather(
                self._client.list_recipes(),
                self._client.list_queue(),
            )
        except PartyDispenserAuthError as err:
            raise ConfigEntryAuthFailed(str(err)) from err
        except PartyDispenserError as err:
            raise UpdateFailed(str(err)) from err

        return PartyDispenserState(
            recipes=recipes,
            queue=queue,
            last_updated=datetime.now(tz=UTC),
        )
