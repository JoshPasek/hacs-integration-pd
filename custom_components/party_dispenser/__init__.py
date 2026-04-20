"""The Party Dispenser integration (Phase 1 scaffold — no-op).

This is the Phase 1 skeleton. It does not create any entities, services, or
platforms. Phase 2 adds config flow, coordinator, and entity platforms.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import HomeAssistant


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Party Dispenser from a config entry (Phase 1: no-op)."""
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry (Phase 1: no-op)."""
    return True
