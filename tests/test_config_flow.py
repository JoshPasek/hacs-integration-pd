"""Tests for the config flow (happy path + sad paths + unique_id dedupe + options flow)."""

from __future__ import annotations

from unittest.mock import patch

from aiohttp import ClientError
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.party_dispenser.const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_SCAN_INTERVAL,
    CONF_USE_TLS,
    DOMAIN,
)

VALID_INPUT = {
    CONF_HOST: "dispenser.local",
    CONF_PORT: 8000,
    CONF_JWT: "real-jwt",
    CONF_USE_TLS: False,
    CONF_SCAN_INTERVAL: 30,
}


async def test_show_user_form(hass) -> None:
    """Initial flow invocation shows the user form with no errors."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    # Pitfall 5: use `is` for FlowResultType comparisons, not `==`.
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    assert result["errors"] == {}


async def test_happy_path_creates_entry(hass, aioclient_mock) -> None:
    """Valid input + backend-probe success creates the config entry."""
    aioclient_mock.get("http://dispenser.local:8000/recipes", json=[])

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(result["flow_id"], VALID_INPUT)

    assert result2["type"] is FlowResultType.CREATE_ENTRY
    assert result2["title"] == "Party Dispenser (dispenser.local:8000)"
    assert result2["data"][CONF_HOST] == "dispenser.local"
    assert result2["data"][CONF_PORT] == 8000
    assert result2["data"][CONF_JWT] == "real-jwt"
    assert result2["options"][CONF_SCAN_INTERVAL] == 30


async def test_invalid_auth_shows_error(hass, aioclient_mock) -> None:
    """401 from backend on probe shows invalid_auth error on form re-render."""
    aioclient_mock.get("http://dispenser.local:8000/recipes", status=401)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(result["flow_id"], VALID_INPUT)

    assert result2["type"] is FlowResultType.FORM
    assert result2["errors"] == {"base": "invalid_auth"}


async def test_cannot_connect_shows_error(hass, aioclient_mock) -> None:
    """Network error on probe shows cannot_connect error on form re-render."""
    aioclient_mock.get("http://dispenser.local:8000/recipes", exc=ClientError("boom"))

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(result["flow_id"], VALID_INPUT)

    assert result2["type"] is FlowResultType.FORM
    assert result2["errors"] == {"base": "cannot_connect"}


async def test_duplicate_aborts(hass, aioclient_mock) -> None:
    """Existing entry with unique_id host:port forces new flow to ABORT on duplicate."""
    aioclient_mock.get("http://dispenser.local:8000/recipes", json=[])

    existing = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={**VALID_INPUT},
    )
    existing.add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    result2 = await hass.config_entries.flow.async_configure(result["flow_id"], VALID_INPUT)

    assert result2["type"] is FlowResultType.ABORT
    assert result2["reason"] == "already_configured"


async def test_options_flow_jwt_rotation(hass, aioclient_mock) -> None:
    """Options flow updates entry.data[jwt] + entry.options[scan_interval]."""
    aioclient_mock.get("http://dispenser.local:8000/recipes", json=[])

    entry = MockConfigEntry(
        domain=DOMAIN,
        unique_id="dispenser.local:8000",
        data={
            CONF_HOST: "dispenser.local",
            CONF_PORT: 8000,
            CONF_JWT: "old-jwt",
            CONF_USE_TLS: False,
        },
        options={CONF_SCAN_INTERVAL: 30},
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.party_dispenser.async_setup_entry",
        return_value=True,
    ):
        result = await hass.config_entries.options.async_init(entry.entry_id)
        assert result["type"] is FlowResultType.FORM

        result2 = await hass.config_entries.options.async_configure(
            result["flow_id"],
            {
                CONF_JWT: "new-jwt",
                CONF_USE_TLS: False,
                CONF_SCAN_INTERVAL: 60,
            },
        )
        assert result2["type"] is FlowResultType.CREATE_ENTRY
        # JWT rotated into entry.data via async_update_entry
        assert entry.data[CONF_JWT] == "new-jwt"
        # scan_interval stored in options (the options-flow result "data" IS entry.options)
        assert result2["data"][CONF_SCAN_INTERVAL] == 60
