"""Tests for custom_components/party_dispenser/frontend/__init__.py.

Asserts the embedded Lovelace card registration flow:
1. Static path registered via hass.http.async_register_static_paths
2. Defensive resources.async_load() called BEFORE async_create_item (HA core #165767 override)
3. Lovelace resource create/update idempotency
4. YAML-mode short-circuit with INFO log
5. Bundle-missing short-circuit with WARNING log
"""

from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock, MagicMock

import pytest

from custom_components.party_dispenser.const import (
    FRONTEND_CARD_FILENAME,
    FRONTEND_URL_BASE,
    VERSION,
)


def _make_hass_with_lovelace(
    *,
    resource_mode: str = "storage",
    loaded: bool = False,
    existing_resources: list[dict] | None = None,
) -> MagicMock:
    """Build a hass mock with a lovelace data collection that behaves per test case."""
    resources = MagicMock()
    resources.loaded = loaded
    resources.async_load = AsyncMock()
    resources.async_create_item = AsyncMock()
    resources.async_update_item = AsyncMock()
    resources.async_items = MagicMock(return_value=list(existing_resources or []))

    lovelace_data = MagicMock()
    lovelace_data.resources = resources
    lovelace_data.resource_mode = resource_mode

    hass = MagicMock()
    hass.http.async_register_static_paths = AsyncMock()
    hass.data.get = MagicMock(return_value=lovelace_data)
    return hass


@pytest.fixture
def bundle_present_fs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Create a dummy bundle file; monkeypatch __file__ so Path(__file__).parent resolves to tmp."""
    fake_dir = tmp_path / "frontend_fake"
    fake_dir.mkdir()
    bundle = fake_dir / FRONTEND_CARD_FILENAME
    bundle.write_text("// fake bundle")

    import custom_components.party_dispenser.frontend as frontend_mod

    monkeypatch.setattr(frontend_mod, "__file__", str(fake_dir / "__init__.py"))
    return fake_dir


@pytest.fixture
def bundle_missing_fs(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Create frontend_dir WITHOUT the bundle — tests the early-return warning path."""
    fake_dir = tmp_path / "frontend_fake"
    fake_dir.mkdir()

    import custom_components.party_dispenser.frontend as frontend_mod

    monkeypatch.setattr(frontend_mod, "__file__", str(fake_dir / "__init__.py"))
    return fake_dir


async def test_bundle_missing_skips_registration(bundle_missing_fs: Path) -> None:
    """When dist bundle is absent, function warns and returns without side effects."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    hass = _make_hass_with_lovelace()
    await async_register_frontend(hass)

    hass.http.async_register_static_paths.assert_not_called()
    hass.data.get.return_value.resources.async_create_item.assert_not_called()
    hass.data.get.return_value.resources.async_update_item.assert_not_called()


async def test_static_path_registered(bundle_present_fs: Path) -> None:
    """Happy path: bundle exists -> static path + resource creation both fire."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    hass = _make_hass_with_lovelace(loaded=False, existing_resources=[])
    await async_register_frontend(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    call_args = hass.http.async_register_static_paths.call_args.args[0]
    assert len(call_args) == 1
    cfg = call_args[0]
    # StaticPathConfig has url_path/path/cache_headers attrs (HA 2024.7+)
    assert cfg.url_path == FRONTEND_URL_BASE
    assert cfg.path == str(bundle_present_fs)
    assert cfg.cache_headers is False


async def test_defensive_async_load_called_before_create(bundle_present_fs: Path) -> None:
    """HA core #165767 override: async_load() must run before async_create_item when not loaded."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    hass = _make_hass_with_lovelace(loaded=False, existing_resources=[])
    await async_register_frontend(hass)

    resources = hass.data.get.return_value.resources
    resources.async_load.assert_awaited_once()
    call_order = [c[0] for c in resources.mock_calls if c[0] in ("async_load", "async_create_item")]
    assert call_order == ["async_load", "async_create_item"], (
        f"async_load() must precede async_create_item(); got {call_order}"
    )


async def test_async_load_skipped_when_already_loaded(bundle_present_fs: Path) -> None:
    """If resources.loaded is already True, async_load() is a no-op we skip."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    hass = _make_hass_with_lovelace(loaded=True, existing_resources=[])
    await async_register_frontend(hass)

    resources = hass.data.get.return_value.resources
    resources.async_load.assert_not_awaited()
    resources.async_create_item.assert_awaited_once()


async def test_resource_created_with_version_query(bundle_present_fs: Path) -> None:
    """Fresh install: async_create_item called with /party_dispenser_frontend/...?v={VERSION}."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    hass = _make_hass_with_lovelace(loaded=True, existing_resources=[])
    await async_register_frontend(hass)

    resources = hass.data.get.return_value.resources
    call = resources.async_create_item.call_args.args[0]
    assert call["res_type"] == "module"
    expected_url = f"{FRONTEND_URL_BASE}/{FRONTEND_CARD_FILENAME}?v={VERSION}"
    assert call["url"] == expected_url, f"expected {expected_url}, got {call['url']}"


async def test_resource_updated_on_version_bump(bundle_present_fs: Path) -> None:
    """Existing resource at same path but older version -> async_update_item, NOT create_item."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    existing = [
        {
            "id": "res-abc",
            "url": f"{FRONTEND_URL_BASE}/{FRONTEND_CARD_FILENAME}?v=0.3.0",
            "res_type": "module",
        }
    ]
    hass = _make_hass_with_lovelace(loaded=True, existing_resources=existing)
    await async_register_frontend(hass)

    resources = hass.data.get.return_value.resources
    resources.async_update_item.assert_awaited_once()
    resources.async_create_item.assert_not_awaited()
    update_args = resources.async_update_item.call_args.args
    assert update_args[0] == "res-abc"
    assert update_args[1]["url"] == f"{FRONTEND_URL_BASE}/{FRONTEND_CARD_FILENAME}?v={VERSION}"


async def test_resource_idempotent_on_same_version(bundle_present_fs: Path) -> None:
    """Existing resource at same path + same version -> no-op (no create, no update)."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    existing = [
        {
            "id": "res-abc",
            "url": f"{FRONTEND_URL_BASE}/{FRONTEND_CARD_FILENAME}?v={VERSION}",
            "res_type": "module",
        }
    ]
    hass = _make_hass_with_lovelace(loaded=True, existing_resources=existing)
    await async_register_frontend(hass)

    resources = hass.data.get.return_value.resources
    resources.async_create_item.assert_not_awaited()
    resources.async_update_item.assert_not_awaited()


async def test_yaml_mode_short_circuits_without_mutation(bundle_present_fs: Path) -> None:
    """YAML-mode users get a LOGGER.info hint; no resource mutation happens."""
    from custom_components.party_dispenser.frontend import async_register_frontend

    hass = _make_hass_with_lovelace(resource_mode="yaml")
    await async_register_frontend(hass)

    hass.http.async_register_static_paths.assert_awaited_once()
    resources = hass.data.get.return_value.resources
    resources.async_load.assert_not_awaited()
    resources.async_create_item.assert_not_awaited()
    resources.async_update_item.assert_not_awaited()
