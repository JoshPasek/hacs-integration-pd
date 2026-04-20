"""Unit tests for PartyDispenserApiClient (use aioclient_mock for HTTP layer)."""

from __future__ import annotations

import pytest
from aiohttp import ClientError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from custom_components.party_dispenser.api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    PartyDispenserProtocolError,
    Recipe,
)

BASE = "http://dispenser.local:8000"
JWT = "fake-jwt-token"


async def test_list_recipes_happy_path(hass, aioclient_mock) -> None:
    """GET /recipes returns a single valid recipe; client parses + sends Authorization header."""
    aioclient_mock.get(
        f"{BASE}/recipes",
        json=[
            {
                "id": "11111111-1111-1111-1111-111111111111",
                "name": "Margarita",
                "is_active": True,
                "order_count": 3,
                "ingredients": [],
                "makeable": True,
                "missing_ingredients": [],
                "missing_count": 0,
            }
        ],
    )
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    recipes = await client.list_recipes()
    assert len(recipes) == 1
    assert isinstance(recipes[0], Recipe)
    assert recipes[0].name == "Margarita"
    assert recipes[0].makeable is True
    # Confirm we sent Authorization: Bearer <jwt> — aioclient_mock tuple is
    # (method, url, data, headers) per pytest-homeassistant-custom-component.
    call = aioclient_mock.mock_calls[0]
    assert call[3]["Authorization"] == f"Bearer {JWT}"


async def test_list_recipes_401_raises_auth_error(hass, aioclient_mock) -> None:
    """401 status maps to PartyDispenserAuthError."""
    aioclient_mock.get(f"{BASE}/recipes", status=401)
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    with pytest.raises(PartyDispenserAuthError):
        await client.list_recipes()


async def test_list_recipes_connection_error_raises(hass, aioclient_mock) -> None:
    """Network-level ClientError maps to PartyDispenserConnectionError."""
    aioclient_mock.get(f"{BASE}/recipes", exc=ClientError("boom"))
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    with pytest.raises(PartyDispenserConnectionError):
        await client.list_recipes()


async def test_list_recipes_500_raises_protocol_error(hass, aioclient_mock) -> None:
    """5xx status maps to PartyDispenserProtocolError."""
    aioclient_mock.get(f"{BASE}/recipes", status=500)
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    with pytest.raises(PartyDispenserProtocolError):
        await client.list_recipes()


async def test_order_from_recipe_sends_session_uid(hass, aioclient_mock) -> None:
    """POST /orders/from-recipe serialises recipe_id + default session_uid='home-assistant'."""
    aioclient_mock.post(
        f"{BASE}/orders/from-recipe",
        json={
            "order_id": "22222222-2222-2222-2222-222222222222",
            "session_uid": "home-assistant",
        },
    )
    client = PartyDispenserApiClient(BASE, JWT, async_get_clientsession(hass))
    result = await client.order_from_recipe("11111111-1111-1111-1111-111111111111")
    assert result.order_id == "22222222-2222-2222-2222-222222222222"
    # aioclient_mock.mock_calls tuple: (method, url, data, headers)
    call = aioclient_mock.mock_calls[0]
    assert call[2]["recipe_id"] == "11111111-1111-1111-1111-111111111111"
    assert call[2]["session_uid"] == "home-assistant"
