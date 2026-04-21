"""The Party Dispenser integration (Phase 2 — full setup)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from homeassistant.const import Platform
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import PartyDispenserApiClient
from .const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_SCAN_INTERVAL,
    CONF_USE_TLS,
    DEFAULT_SCAN_INTERVAL,
    WS_PATH,
)
from .coordinator import PartyDispenserCoordinator, PartyDispenserData
from .frontend import async_setup_frontend
from .services import async_setup_services
from .websocket import PartyDispenserWebSocketClient

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import PartyDispenserConfigEntry

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.BINARY_SENSOR]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the Party Dispenser component (domain-level, once)."""
    async_setup_services(hass)
    await async_setup_frontend(hass)  # NEW Phase 4 — registers card static path + Lovelace resource
    return True


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
) -> bool:
    """Set up a single Party Dispenser config entry."""
    scheme = "https" if entry.data.get(CONF_USE_TLS, False) else "http"
    host = entry.data[CONF_HOST]
    port = entry.data[CONF_PORT]
    jwt = entry.data[CONF_JWT]
    base_url = f"{scheme}://{host}:{port}"

    client = PartyDispenserApiClient(
        base_url=base_url,
        jwt=jwt,
        session=async_get_clientsession(hass),
    )

    scan_interval = entry.options.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
    coordinator = PartyDispenserCoordinator(hass, client, scan_interval=scan_interval)

    await coordinator.async_config_entry_first_refresh()

    # --- Phase 3: WebSocket client (RT-01, RT-02, RT-03, RT-04) ---
    # Build WS URL (scheme ws/wss depends on use_tls; independent from http base_url above)
    ws_scheme = "wss" if entry.data.get(CONF_USE_TLS, False) else "ws"
    ws_url = f"{ws_scheme}://{host}:{port}{WS_PATH}"
    ws_client = PartyDispenserWebSocketClient(
        hass=hass,
        url=ws_url,
        coordinator=coordinator,
        entry_id=entry.entry_id,
    )

    entry.runtime_data = PartyDispenserData(
        client=client,
        coordinator=coordinator,
        ws_client=ws_client,
    )

    # Spawn WS background task BEFORE async_forward_entry_setups so the binary_sensor
    # platform sees a valid ws_client on its runtime_data read. start() only registers
    # the task; actual connect happens on the event loop thereafter.
    ws_client.start(entry)
    entry.async_on_unload(ws_client.stop)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_reload_entry))
    return True


async def async_unload_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def _async_reload_entry(
    hass: HomeAssistant,
    entry: PartyDispenserConfigEntry,
) -> None:
    """Reload after options-flow edit (jwt rotation, scan_interval change)."""
    await hass.config_entries.async_reload(entry.entry_id)
