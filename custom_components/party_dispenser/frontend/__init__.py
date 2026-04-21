"""Register the embedded Lovelace card as a static resource + resource entry.

Called once per HA lifetime from __init__.py::async_setup (NOT async_setup_entry,
to avoid double-registration across multiple config entries).

Sources:
- HA dev blog (2024-06-18): async_register_static_paths + StaticPathConfig
  https://developers.home-assistant.io/blog/2024/06/18/async_register_static_paths/
- KipK gist (2025+, fetched 2026-04-20): canonical embedded-card pattern
  https://gist.github.com/KipK/3cf706ac89573432803aaa2f5ca40492
- home-assistant/core#165767 (opened 2026-03-17) + PR #165773 (merged 2026-04-10):
  ResourceStorageCollection missing lazy-load guard. Defensive async_load()
  makes this safe on HA 2026.2.x (our test pin) AND on fixed 2026.4+ builds.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
from homeassistant.const import EVENT_HOMEASSISTANT_STARTED
from homeassistant.core import CoreState

from ..const import (
    FRONTEND_CARD_FILENAME,
    FRONTEND_CARD_NAME,
    FRONTEND_URL_BASE,
    LOGGER,
    VERSION,
)

if TYPE_CHECKING:
    from homeassistant.core import Event, HomeAssistant


async def async_register_frontend(hass: HomeAssistant) -> None:
    """Register the card's static path + Lovelace resource. Idempotent."""
    frontend_dir = Path(__file__).parent
    bundle_path = frontend_dir / FRONTEND_CARD_FILENAME
    if not bundle_path.is_file():
        LOGGER.warning(
            "Party Dispenser card bundle not found at %s; "
            "run `cd www/community/party-dispenser-card && npm run build` to produce it",
            bundle_path,
        )
        return

    # --- 1. Static path ----------------------------------------------------
    # cache_headers=False during 0.4.x so dev can iterate without clobbered cache;
    # Phase 6 may flip to True with a cache-busting query param.
    try:
        await hass.http.async_register_static_paths(
            [StaticPathConfig(FRONTEND_URL_BASE, str(frontend_dir), False)]
        )
    except RuntimeError:
        LOGGER.debug("Static path %s already registered", FRONTEND_URL_BASE)

    # --- 2. Lovelace resource (storage mode only) --------------------------
    lovelace_data = hass.data.get(LOVELACE_DATA)
    if lovelace_data is None:
        LOGGER.debug("Lovelace not loaded yet; resource registration skipped")
        return
    if getattr(lovelace_data, "resource_mode", "yaml") != MODE_STORAGE:
        LOGGER.info(
            "Lovelace in YAML mode; add resource manually: %s/%s (type: module)",
            FRONTEND_URL_BASE,
            FRONTEND_CARD_FILENAME,
        )
        return

    resources = lovelace_data.resources

    # DEFENSIVE: lazy-load the resource collection BEFORE mutating. Works around
    # home-assistant/core#165767 (fixed in 2026.4). No-op on fixed versions.
    if not getattr(resources, "loaded", False):
        await resources.async_load()

    url_path = f"{FRONTEND_URL_BASE}/{FRONTEND_CARD_FILENAME}"
    url_with_v = f"{url_path}?v={VERSION}"

    existing = [r for r in resources.async_items() if r["url"].startswith(FRONTEND_URL_BASE)]
    for resource in existing:
        existing_path = resource["url"].split("?")[0]
        if existing_path == url_path:
            existing_version = resource["url"].split("?v=")[-1] if "?v=" in resource["url"] else ""
            if existing_version != VERSION:
                LOGGER.info("Updating %s to v%s", FRONTEND_CARD_NAME, VERSION)
                await resources.async_update_item(
                    resource["id"],
                    {"res_type": "module", "url": url_with_v},
                )
            return  # already registered; no-op

    LOGGER.info("Registering %s v%s at %s", FRONTEND_CARD_NAME, VERSION, url_with_v)
    await resources.async_create_item({"res_type": "module", "url": url_with_v})


async def async_setup_frontend(hass: HomeAssistant) -> None:
    """Entry point called from __init__.py::async_setup.

    Defers actual registration until HA is past EVENT_HOMEASSISTANT_STARTED so the
    frontend integration has fully loaded Lovelace resources from .storage.
    """

    async def _do_register(_event: Event | None = None) -> None:
        await async_register_frontend(hass)

    if hass.state == CoreState.running:
        await _do_register()
    else:
        hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STARTED, _do_register)
