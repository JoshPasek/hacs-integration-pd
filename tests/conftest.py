"""Pytest configuration for Phase 2 tests.

Phase 1 conftest ran without HA installed and only validated static artifacts.
Phase 2 adds pytest-homeassistant-custom-component which brings the `hass` fixture,
`aioclient_mock`, and `enable_custom_integrations` — all required for testing the
config flow, coordinator, services, and sensors end-to-end.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Ensure repo root is on sys.path for `import custom_components.party_dispenser`
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))


# pytest-homeassistant-custom-component requires `enable_custom_integrations`
# to be active for every test that touches hass. Making it autouse removes the
# need to remember it in each test.
@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Autouse wrapper around pytest-HA-custom's enable_custom_integrations fixture."""
    yield
