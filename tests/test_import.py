"""Phase 1 smoke test: the integration module imports cleanly."""

from __future__ import annotations


def test_integration_imports() -> None:
    """The integration package can be imported without Home Assistant installed."""
    import custom_components.party_dispenser as pd

    # Verify the public surface we promised to ship
    assert hasattr(pd, "async_setup_entry")
    assert hasattr(pd, "async_unload_entry")


def test_const_exports() -> None:
    """The const module exports DOMAIN, VERSION, MANUFACTURER with locked values."""
    from custom_components.party_dispenser import const

    assert const.DOMAIN == "party_dispenser"
    assert const.VERSION == "0.1.0"
    assert const.MANUFACTURER == "PartyDispenser"
