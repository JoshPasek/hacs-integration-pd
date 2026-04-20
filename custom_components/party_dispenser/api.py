"""REST client for the Party Dispenser backend."""

from __future__ import annotations

import socket
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import aiohttp
import async_timeout

from .const import DEFAULT_SESSION_UID, DEFAULT_TIMEOUT_SECONDS

# ----- Exception hierarchy -----


class PartyDispenserError(Exception):
    """Base exception for all Party Dispenser API errors."""


class PartyDispenserAuthError(PartyDispenserError):
    """401/403 from the backend — JWT is invalid or expired."""


class PartyDispenserConnectionError(PartyDispenserError):
    """Network-level failure (DNS, timeout, connection refused, TLS)."""


class PartyDispenserProtocolError(PartyDispenserError):
    """Backend returned unexpected status (5xx) or malformed JSON."""


# ----- Typed response shapes -----


@dataclass(frozen=True, slots=True)
class RecipeIngredient:
    """One ingredient on a recipe."""

    position: int
    ingredient_id: str
    ingredient_name: str
    amount_ml: float
    requires_dispense: bool
    unit: str | None = None


@dataclass(frozen=True, slots=True)
class Recipe:
    """A recipe known to the backend."""

    id: str
    name: str
    is_active: bool
    order_count: int
    ingredients: tuple[RecipeIngredient, ...]
    makeable: bool
    missing_ingredients: tuple[str, ...]
    missing_count: int
    description: str | None = None
    created_at: datetime | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> Recipe:
        """Build a Recipe from the backend's JSON representation."""
        ingredients = tuple(
            RecipeIngredient(
                position=item["position"],
                ingredient_id=item["ingredient_id"],
                ingredient_name=item["ingredient_name"],
                amount_ml=item["amount_ml"],
                requires_dispense=item["requires_dispense"],
                unit=item.get("unit"),
            )
            for item in raw.get("ingredients", [])
        )
        created_at: datetime | None = None
        if raw.get("created_at"):
            try:
                created_at = datetime.fromisoformat(raw["created_at"])
            except ValueError:
                created_at = None
        return cls(
            id=raw["id"],
            name=raw["name"],
            is_active=raw["is_active"],
            order_count=raw.get("order_count", 0),
            ingredients=ingredients,
            makeable=raw["makeable"],
            missing_ingredients=tuple(raw.get("missing_ingredients", [])),
            missing_count=raw.get("missing_count", 0),
            description=raw.get("description"),
            created_at=created_at,
        )


@dataclass(frozen=True, slots=True)
class QueueItem:
    """A queued or in-progress order on the dispenser."""

    id: str
    recipe_name: str
    state: str
    priority: int
    created_at: datetime
    updated_at: datetime
    recipe_id: str | None = None
    requested_by_session_uid: str | None = None
    items_json: str | None = None

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> QueueItem:
        """Build a QueueItem from the backend's JSON representation."""
        return cls(
            id=raw["id"],
            recipe_name=raw["recipe_name"],
            state=raw["state"],
            priority=raw.get("priority", 0),
            created_at=datetime.fromisoformat(raw["created_at"]),
            updated_at=datetime.fromisoformat(raw["updated_at"]),
            recipe_id=raw.get("recipe_id"),
            requested_by_session_uid=raw.get("requested_by_session_uid"),
            items_json=raw.get("items_json"),
        )


@dataclass(frozen=True, slots=True)
class OrderResult:
    """Return payload from POST /orders/from-recipe."""

    order_id: str
    session_uid: str


# ----- API client -----


class PartyDispenserApiClient:
    """Async client wrapping the 4 Party Dispenser backend endpoints."""

    def __init__(
        self,
        base_url: str,
        jwt: str,
        session: aiohttp.ClientSession,
        timeout: int = DEFAULT_TIMEOUT_SECONDS,
    ) -> None:
        """Build the client. `session` MUST be supplied by the caller.

        HA's helpers.aiohttp_client.async_get_clientsession(hass) is the canonical
        source — aioclient_mock only intercepts that session, so creating our own
        would break tests and leak connections on reload.
        """
        self._base_url = base_url.rstrip("/")
        self._jwt = jwt
        self._session = session
        self._timeout = timeout

    @property
    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._jwt}",
            "Content-Type": "application/json",
        }

    async def list_recipes(self) -> list[Recipe]:
        """GET /recipes — return parsed Recipe list."""
        data = await self._request("GET", "/recipes")
        if not isinstance(data, list):
            raise PartyDispenserProtocolError(
                f"Expected list from /recipes, got {type(data).__name__}"
            )
        return [Recipe.from_dict(item) for item in data]

    async def list_queue(self) -> list[QueueItem]:
        """GET /queue — return parsed QueueItem list."""
        data = await self._request("GET", "/queue")
        if not isinstance(data, list):
            raise PartyDispenserProtocolError(
                f"Expected list from /queue, got {type(data).__name__}"
            )
        return [QueueItem.from_dict(item) for item in data]

    async def order_from_recipe(
        self,
        recipe_id: str,
        session_uid: str = DEFAULT_SESSION_UID,
    ) -> OrderResult:
        """POST /orders/from-recipe — place an order on the dispenser."""
        data = await self._request(
            "POST",
            "/orders/from-recipe",
            json={"recipe_id": recipe_id, "session_uid": session_uid},
        )
        if not isinstance(data, dict) or "order_id" not in data:
            raise PartyDispenserProtocolError(
                f"Unexpected response shape from /orders/from-recipe: {data!r}"
            )
        return OrderResult(
            order_id=data["order_id"],
            session_uid=data.get("session_uid", session_uid),
        )

    async def cancel_order(
        self,
        order_id: str,
        session_uid: str = DEFAULT_SESSION_UID,
    ) -> None:
        """POST /orders/{order_id}/cancel — cancel a queued/in-progress order."""
        await self._request(
            "POST",
            f"/orders/{order_id}/cancel",
            json={"session_uid": session_uid},
        )

    async def _request(
        self,
        method: str,
        path: str,
        json: dict[str, Any] | None = None,
    ) -> Any:
        """Dispatch an HTTP request and map status → typed exceptions."""
        url = f"{self._base_url}{path}"
        try:
            async with async_timeout.timeout(self._timeout):
                response = await self._session.request(
                    method=method,
                    url=url,
                    headers=self._headers,
                    json=json,
                )
        except TimeoutError as err:
            raise PartyDispenserConnectionError(
                f"Timeout after {self._timeout}s requesting {method} {url}"
            ) from err
        except (aiohttp.ClientError, socket.gaierror) as err:
            raise PartyDispenserConnectionError(
                f"Connection error requesting {method} {url}: {err}"
            ) from err

        if response.status in (401, 403):
            raise PartyDispenserAuthError(
                f"Backend rejected JWT ({response.status}) on {method} {url}"
            )
        if response.status >= 500:
            raise PartyDispenserProtocolError(
                f"Backend server error {response.status} on {method} {url}"
            )
        if response.status >= 400:
            raise PartyDispenserProtocolError(
                f"Backend client error {response.status} on {method} {url}"
            )

        try:
            return await response.json()
        except (aiohttp.ContentTypeError, ValueError) as err:
            raise PartyDispenserProtocolError(
                f"Malformed JSON response from {method} {url}: {err}"
            ) from err
