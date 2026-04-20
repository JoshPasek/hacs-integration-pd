"""WebSocket client for realtime queue updates from the Party Dispenser backend.

Runs as a per-config-entry background task via entry.async_create_background_task.
Reconnects with exponential backoff (0.5s → 30s cap, additive jitter). On each event
from the backend, requests a coordinator refresh. Connection state changes broadcast
via HA dispatcher so binary_sensor.party_dispenser_connected can reflect them.

Backend contract (see 03-CONTEXT.md / backend/app/ws/*.py):
- Endpoint: GET {ws,wss}://{host}:{port}/ws (no auth in v1 — documented gap)
- Server → client: JSON signals only. Types accepted:
  hello | queue_updated | controller_status_updated | pump_status_updated
- Client → server: ignored (aiohttp's autoping handles protocol-level PING/PONG)
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import random
from typing import TYPE_CHECKING

from aiohttp import WSMsgType
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.dispatcher import async_dispatcher_send

from .const import (
    LOGGER,
    SIGNAL_WS_CONNECTED,
    WS_BACKOFF_BASE_SECONDS,
    WS_BACKOFF_CAP_SECONDS,
    WS_BACKOFF_FACTOR,
    WS_BACKOFF_JITTER_RATIO,
    WS_HEARTBEAT_SECONDS,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

    from .coordinator import PartyDispenserConfigEntry, PartyDispenserCoordinator


class PartyDispenserWebSocketClient:
    """Long-running aiohttp WebSocket client with auto-reconnect and dispatcher push."""

    def __init__(
        self,
        hass: HomeAssistant,
        url: str,
        coordinator: PartyDispenserCoordinator,
        entry_id: str,
    ) -> None:
        """Store refs for the receive loop. `url` must be a full ws:// or wss:// URL."""
        self._hass = hass
        self._url = url
        self._coordinator = coordinator
        self._entry_id = entry_id
        self._task: asyncio.Task[None] | None = None
        self._connected: bool = False

    @property
    def connected(self) -> bool:
        """Whether the WebSocket is currently connected to the backend."""
        return self._connected

    def start(self, entry: PartyDispenserConfigEntry) -> None:
        """Spawn the receive loop as an entry-scoped background task."""
        if self._task is not None and not self._task.done():
            return  # Idempotent guard
        self._task = entry.async_create_background_task(
            self._hass,
            self._run(),
            name=f"party_dispenser_ws_{self._entry_id}",
        )

    async def stop(self) -> None:
        """Cancel the receive loop. Safe to call multiple times."""
        if self._task is None:
            return
        self._task.cancel()
        # Swallow on shutdown: task may raise CancelledError (expected) or any transport
        # error still in flight — either way, we're tearing down.
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await self._task
        self._task = None
        self._set_connected(False)

    # ---------- Internal ----------

    async def _run(self) -> None:
        """Reconnect loop. Cancelled externally via task.cancel()."""
        backoff = WS_BACKOFF_BASE_SECONDS
        while True:
            try:
                await self._run_once()
                backoff = WS_BACKOFF_BASE_SECONDS  # Reset on clean return
            except asyncio.CancelledError:
                self._set_connected(False)
                raise
            except Exception as exc:
                LOGGER.warning(
                    "Party Dispenser WS disconnected (%s: %s); reconnect in %.1fs",
                    type(exc).__name__,
                    exc,
                    backoff,
                )
                self._set_connected(False)
                jittered = backoff + random.uniform(0, WS_BACKOFF_JITTER_RATIO * backoff)  # noqa: S311
                await asyncio.sleep(jittered)
                backoff = min(backoff * WS_BACKOFF_FACTOR, WS_BACKOFF_CAP_SECONDS)

    async def _run_once(self) -> None:
        """One connect → receive-until-drop cycle."""
        session = async_get_clientsession(self._hass)
        async with session.ws_connect(
            self._url,
            autoping=True,
            heartbeat=WS_HEARTBEAT_SECONDS,
        ) as ws:
            LOGGER.debug("Party Dispenser WS connected to %s", self._url)
            self._set_connected(True)
            async for msg in ws:
                if msg.type is WSMsgType.TEXT:
                    await self._handle_text_message(msg.data)
                elif msg.type is WSMsgType.ERROR:
                    LOGGER.warning("Party Dispenser WS transport error: %s", ws.exception())
                    break
                # CLOSED / CLOSING / CLOSE terminate the async-for loop naturally

    async def _handle_text_message(self, raw: str) -> None:
        """Parse and dispatch a single TEXT frame's JSON payload."""
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            LOGGER.debug("Party Dispenser WS non-JSON message ignored: %r", raw[:200])
            return

        event_type = payload.get("type") if isinstance(payload, dict) else None
        if event_type == "queue_updated":
            LOGGER.debug("Party Dispenser WS queue_updated → refresh coordinator")
            await self._coordinator.async_request_refresh()
        elif event_type == "hello":
            LOGGER.debug("Party Dispenser WS hello received")
        else:
            LOGGER.debug("Party Dispenser WS event ignored: %r", event_type)

    def _set_connected(self, connected: bool) -> None:
        """Update connection flag + fire dispatcher signal if state changed."""
        if self._connected == connected:
            return
        self._connected = connected
        async_dispatcher_send(
            self._hass,
            SIGNAL_WS_CONNECTED.format(entry_id=self._entry_id),
            connected,
        )
