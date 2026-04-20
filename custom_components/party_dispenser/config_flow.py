"""Config flow + options flow for Party Dispenser."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import voluptuous as vol
from homeassistant.config_entries import (
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlow,
)
from homeassistant.core import callback
from homeassistant.helpers import selector
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import (
    PartyDispenserApiClient,
    PartyDispenserAuthError,
    PartyDispenserConnectionError,
    PartyDispenserError,
    PartyDispenserProtocolError,
)
from .const import (
    CONF_HOST,
    CONF_JWT,
    CONF_PORT,
    CONF_SCAN_INTERVAL,
    CONF_USE_TLS,
    DEFAULT_PORT,
    DEFAULT_SCAN_INTERVAL,
    DOMAIN,
    LOGGER,
    MAX_SCAN_INTERVAL,
    MIN_SCAN_INTERVAL,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant


# ---------- User step schema builder ----------


def _user_schema(defaults: dict[str, Any] | None = None) -> vol.Schema:
    """Build the voluptuous schema for the user step, seeded with prior input."""
    defaults = defaults or {}
    return vol.Schema(
        {
            vol.Required(
                CONF_HOST,
                default=defaults.get(CONF_HOST, vol.UNDEFINED),
            ): selector.TextSelector(
                selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT),
            ),
            vol.Required(
                CONF_PORT,
                default=defaults.get(CONF_PORT, DEFAULT_PORT),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1,
                    max=65535,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                ),
            ),
            vol.Required(
                CONF_JWT,
                default=defaults.get(CONF_JWT, vol.UNDEFINED),
            ): selector.TextSelector(
                selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD),
            ),
            vol.Optional(
                CONF_USE_TLS,
                default=defaults.get(CONF_USE_TLS, False),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_SCAN_INTERVAL,
                default=defaults.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=MIN_SCAN_INTERVAL,
                    max=MAX_SCAN_INTERVAL,
                    step=1,
                    mode=selector.NumberSelectorMode.BOX,
                    unit_of_measurement="s",
                ),
            ),
        }
    )


# ---------- Connectivity probe ----------


async def _validate_connection(
    hass: HomeAssistant,
    host: str,
    port: int,
    use_tls: bool,
    jwt: str,
) -> None:
    """Raise a specific PartyDispenser*Error subclass if validation fails."""
    scheme = "https" if use_tls else "http"
    base_url = f"{scheme}://{host}:{port}"
    client = PartyDispenserApiClient(
        base_url=base_url,
        jwt=jwt,
        session=async_get_clientsession(hass),
    )
    # list_recipes() is the cheapest happy-path probe
    await client.list_recipes()


# ---------- Config Flow ----------


class PartyDispenserConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle the user-initiated config flow for Party Dispenser."""

    VERSION = 1
    MINOR_VERSION = 1

    async def async_step_user(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Handle the initial user step collecting host/port/JWT/TLS/scan_interval."""
        errors: dict[str, str] = {}

        if user_input is not None:
            host = user_input[CONF_HOST]
            port = int(user_input[CONF_PORT])

            # Unique ID = host:port — prevents duplicate dispenser entries
            unique_id = f"{host}:{port}"
            await self.async_set_unique_id(unique_id)
            self._abort_if_unique_id_configured()

            try:
                await _validate_connection(
                    self.hass,
                    host=host,
                    port=port,
                    use_tls=bool(user_input.get(CONF_USE_TLS, False)),
                    jwt=user_input[CONF_JWT],
                )
            except PartyDispenserAuthError:
                errors["base"] = "invalid_auth"
            except PartyDispenserConnectionError:
                errors["base"] = "cannot_connect"
            except PartyDispenserProtocolError:
                errors["base"] = "invalid_response"
            except PartyDispenserError:
                LOGGER.exception("Unexpected Party Dispenser connectivity error")
                errors["base"] = "unknown"
            else:
                return self.async_create_entry(
                    title=f"Party Dispenser ({host}:{port})",
                    data={
                        CONF_HOST: host,
                        CONF_PORT: port,
                        CONF_USE_TLS: bool(user_input.get(CONF_USE_TLS, False)),
                        CONF_JWT: user_input[CONF_JWT],
                    },
                    options={
                        CONF_SCAN_INTERVAL: int(
                            user_input.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
                        ),
                    },
                )

        return self.async_show_form(
            step_id="user",
            data_schema=_user_schema(user_input),
            errors=errors,
        )

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlowHandler:
        """Return the options flow handler (2025.12+ pattern — no args)."""
        return OptionsFlowHandler()


# ---------- Options Flow (2025.12+ pattern) ----------


class OptionsFlowHandler(OptionsFlow):
    """Options flow: rotate JWT, change scan_interval, toggle TLS.

    Note: self.config_entry is provided by the parent class; do NOT set it here.
    """

    async def async_step_init(
        self,
        user_input: dict[str, Any] | None = None,
    ) -> ConfigFlowResult:
        """Handle the options step — re-validate on save and mutate entry.data."""
        errors: dict[str, str] = {}

        # Build schema seeded with current data + options
        current = {
            CONF_JWT: self.config_entry.data.get(CONF_JWT, ""),
            CONF_USE_TLS: self.config_entry.data.get(CONF_USE_TLS, False),
            CONF_SCAN_INTERVAL: self.config_entry.options.get(
                CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL
            ),
        }

        if user_input is not None:
            # Re-validate new JWT / new TLS setting
            try:
                await _validate_connection(
                    self.hass,
                    host=self.config_entry.data[CONF_HOST],
                    port=self.config_entry.data[CONF_PORT],
                    use_tls=bool(user_input.get(CONF_USE_TLS, False)),
                    jwt=user_input[CONF_JWT],
                )
            except PartyDispenserAuthError:
                errors["base"] = "invalid_auth"
            except PartyDispenserConnectionError:
                errors["base"] = "cannot_connect"
            except PartyDispenserError:
                LOGGER.exception("Unexpected Party Dispenser connectivity error")
                errors["base"] = "unknown"
            else:
                # Mutate data (jwt, use_tls) via hass.config_entries.async_update_entry
                new_data = dict(self.config_entry.data)
                new_data[CONF_JWT] = user_input[CONF_JWT]
                new_data[CONF_USE_TLS] = bool(user_input.get(CONF_USE_TLS, False))
                self.hass.config_entries.async_update_entry(self.config_entry, data=new_data)
                # Save scan_interval in options
                return self.async_create_entry(
                    title="",
                    data={
                        CONF_SCAN_INTERVAL: int(
                            user_input.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL)
                        ),
                    },
                )

        schema = vol.Schema(
            {
                vol.Required(
                    CONF_JWT,
                    default=current[CONF_JWT],
                ): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.PASSWORD),
                ),
                vol.Optional(
                    CONF_USE_TLS,
                    default=current[CONF_USE_TLS],
                ): selector.BooleanSelector(),
                vol.Optional(
                    CONF_SCAN_INTERVAL,
                    default=current[CONF_SCAN_INTERVAL],
                ): selector.NumberSelector(
                    selector.NumberSelectorConfig(
                        min=MIN_SCAN_INTERVAL,
                        max=MAX_SCAN_INTERVAL,
                        step=1,
                        mode=selector.NumberSelectorMode.BOX,
                        unit_of_measurement="s",
                    ),
                ),
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=schema,
            errors=errors,
        )
