"""Tests for PartyDispenserWebSocketClient — lifecycle + reconnect + dispatcher."""

from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, patch

from aiohttp import WSMsgType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_USE_TLS,
    DOMAIN,
    SIGNAL_WS_CONNECTED,
)
from custom_components.party_dispenser.websocket import PartyDispenserWebSocketClient

# Save a reference to the real asyncio.sleep BEFORE any test patches it.
# Rationale: `patch("custom_components.party_dispenser.websocket.asyncio.sleep", ...)`
# mutates the attribute on the `asyncio` module itself (there's only one `asyncio`
# module in memory), so it also catches the test's own `asyncio.sleep(...)` pumps.
# We use `_real_sleep` in the outer test code to yield to the event loop without
# being intercepted by the patch.
_real_sleep = asyncio.sleep

# ---------- Helpers ----------


class _FakeWSMessage:
    """Mimics aiohttp.WSMessage: just .type and .data attributes."""

    def __init__(self, type_, data):
        self.type = type_
        self.data = data


class FakeWebSocket:
    """Drop-in replacement for aiohttp.ClientWebSocketResponse for tests.

    Messages are pre-queued in __init__; __aiter__ yields them in order, then
    the iterator ends (simulating a CLOSED server).
    """

    def __init__(self, messages: list[_FakeWSMessage] | None = None) -> None:
        self._messages = list(messages) if messages else []
        self._closed = False
        self.exception = MagicMock(return_value=None)

    def __aiter__(self):
        return self

    async def __anext__(self):
        if not self._messages:
            raise StopAsyncIteration
        return self._messages.pop(0)

    async def close(self) -> None:
        self._closed = True


@asynccontextmanager
async def _fake_ws_context(ws: FakeWebSocket):
    """Async context manager yielding the FakeWebSocket (mimics ws_connect)."""
    try:
        yield ws
    finally:
        await ws.close()


def _patch_ws_connect(fake_ws):
    """Patch async_get_clientsession in websocket.py to yield a session whose
    ws_connect returns an async context manager wrapping the given fake WS
    (or raises the given Exception)."""
    session = MagicMock()
    if isinstance(fake_ws, Exception):
        session.ws_connect = MagicMock(side_effect=fake_ws)
    else:
        session.ws_connect = MagicMock(return_value=_fake_ws_context(fake_ws))
    return patch(
        "custom_components.party_dispenser.websocket.async_get_clientsession",
        return_value=session,
    )


def _mock_config_entry(hass):
    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local",
            CONF_PORT: 8000,
            CONF_JWT: "jwt",
            CONF_USE_TLS: False,
        },
    )
    entry.add_to_hass(hass)
    return entry


# ---------- Tests ----------


async def test_connect_receives_hello_and_queue_updated_triggers_refresh(hass) -> None:
    """Happy path: connect → hello → queue_updated → coordinator.async_request_refresh called."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    fake_ws = FakeWebSocket(
        messages=[
            _FakeWSMessage(WSMsgType.TEXT, json.dumps({"type": "hello"})),
            _FakeWSMessage(WSMsgType.TEXT, json.dumps({"type": "queue_updated"})),
        ]
    )

    with _patch_ws_connect(fake_ws):
        client = PartyDispenserWebSocketClient(
            hass=hass,
            url="ws://dispenser.local:8000/ws",
            coordinator=coordinator,
            entry_id=entry.entry_id,
        )
        client.start(entry)
        # Give the event loop a few ticks to drain the 2 pre-queued messages.
        await asyncio.sleep(0.05)
        await client.stop()

    coordinator.async_request_refresh.assert_awaited()


async def test_disconnect_triggers_reconnect_with_backoff(hass) -> None:
    """ws_connect raising ConnectionError should trigger sleep(backoff) before retry."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    sleep_calls: list[float] = []

    async def _record_sleep(delay: float):
        sleep_calls.append(delay)
        # After 3 recorded sleeps, raise CancelledError to stop the loop.
        if len(sleep_calls) >= 3:
            raise asyncio.CancelledError

    with (
        _patch_ws_connect(ConnectionError("refused")),
        patch(
            "custom_components.party_dispenser.websocket.asyncio.sleep",
            side_effect=_record_sleep,
        ),
    ):
        client = PartyDispenserWebSocketClient(
            hass=hass,
            url="ws://dispenser.local:8000/ws",
            coordinator=coordinator,
            entry_id=entry.entry_id,
        )
        client.start(entry)
        # Let the loop run through 3 failed connects; the 3rd sleep raises CancelledError.
        # Use `_real_sleep` here — the patched `asyncio.sleep` would otherwise route this
        # test-level pump through `_record_sleep` and contaminate sleep_calls.
        await _real_sleep(0.05)
        await client.stop()

    # Backoff sequence: 0.5 (base), 1.0, 2.0 — each with ≤ 25% additive jitter.
    assert len(sleep_calls) >= 3, f"Expected ≥3 sleeps, got {sleep_calls}"
    assert 0.5 <= sleep_calls[0] <= 0.625, (
        f"First backoff should be ~0.5s (+≤25% jitter), got {sleep_calls[0]}"
    )
    assert 1.0 <= sleep_calls[1] <= 1.25, (
        f"Second backoff should be ~1.0s (+≤25% jitter), got {sleep_calls[1]}"
    )
    assert 2.0 <= sleep_calls[2] <= 2.5, (
        f"Third backoff should be ~2.0s (+≤25% jitter), got {sleep_calls[2]}"
    )


async def test_dispatcher_fires_on_connect_and_disconnect(hass) -> None:
    """async_dispatcher_send called with True on hello, False on drop/stop."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    fake_ws = FakeWebSocket(
        messages=[_FakeWSMessage(WSMsgType.TEXT, json.dumps({"type": "hello"}))]
    )

    dispatched: list[bool] = []
    signal_name = SIGNAL_WS_CONNECTED.format(entry_id=entry.entry_id)

    from homeassistant.helpers.dispatcher import async_dispatcher_connect

    unsub = async_dispatcher_connect(
        hass, signal_name, lambda connected: dispatched.append(connected)
    )

    with _patch_ws_connect(fake_ws):
        client = PartyDispenserWebSocketClient(
            hass=hass,
            url="ws://dispenser.local:8000/ws",
            coordinator=coordinator,
            entry_id=entry.entry_id,
        )
        client.start(entry)
        # Let hello deliver; then iterator ends → reconnect loop catches exception → dispatch False.
        await asyncio.sleep(0.05)
        await client.stop()

    unsub()
    assert True in dispatched, f"Should have dispatched connected=True; got {dispatched}"
    assert False in dispatched, f"Should have dispatched connected=False; got {dispatched}"


async def test_stop_cancels_task_cleanly(hass) -> None:
    """stop() cancels the background task without raising and resets connected to False."""
    coordinator = MagicMock()
    coordinator.async_request_refresh = AsyncMock()
    entry = _mock_config_entry(hass)

    # Use a WS that never yields any messages; the client will sit in ws.__aiter__
    # forever until we cancel it.
    class _NeverYield(FakeWebSocket):
        async def __anext__(self):
            await asyncio.sleep(3600)  # Block "forever".
            raise StopAsyncIteration

    fake_ws = _NeverYield()

    with _patch_ws_connect(fake_ws):
        client = PartyDispenserWebSocketClient(
            hass=hass,
            url="ws://dispenser.local:8000/ws",
            coordinator=coordinator,
            entry_id=entry.entry_id,
        )
        client.start(entry)
        # Let ws_connect succeed and dispatch True.
        await asyncio.sleep(0.05)
        assert client.connected is True
        await client.stop()  # Should not raise.

    assert client.connected is False
