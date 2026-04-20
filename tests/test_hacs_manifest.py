"""Phase 1: static check that hacs.json satisfies the HACS voluptuous schema.

Full schema at:
  https://github.com/hacs/integration/blob/main/custom_components/hacs/utils/validate.py

HACS schema has `extra=vol.PREVENT_EXTRA` — extra keys FAIL validation. This test
guards against accidentally adding an unknown key (e.g., "description", "version").
"""
from __future__ import annotations

import json
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_ALLOWED_KEYS = {
    "name",
    "homeassistant",
    "hacs",
    "content_in_root",
    "zip_release",
    "filename",
    "hide_default_branch",
    "country",
    "persistent_directory",
    "render_readme",
}


def test_hacs_json_exists_and_parses() -> None:
    """hacs.json exists at the repo root and is valid JSON."""
    path = _REPO_ROOT / "hacs.json"
    assert path.exists(), f"{path} does not exist"
    data = json.loads(path.read_text())
    assert isinstance(data, dict), "hacs.json must be a JSON object"


def test_hacs_json_name_required() -> None:
    """HACS schema requires `name`. The rest are optional."""
    data = json.loads((_REPO_ROOT / "hacs.json").read_text())
    assert "name" in data, "hacs.json missing required key 'name'"
    assert isinstance(data["name"], str), "hacs.json 'name' must be a string"
    assert data["name"] == "Party Dispenser", (
        f"hacs.json 'name' expected 'Party Dispenser', got {data['name']!r}"
    )


def test_hacs_json_no_extra_keys() -> None:
    """HACS schema has extra=PREVENT_EXTRA. Unknown keys FAIL HACS validation."""
    data = json.loads((_REPO_ROOT / "hacs.json").read_text())
    extra = set(data.keys()) - _ALLOWED_KEYS
    assert not extra, f"hacs.json has keys outside the HACS schema: {extra}"


def test_hacs_json_homeassistant_version() -> None:
    """homeassistant is optional but we lock it to 2026.1.0 per CONTEXT."""
    data = json.loads((_REPO_ROOT / "hacs.json").read_text())
    assert data.get("homeassistant") == "2026.1.0", (
        f"hacs.json 'homeassistant' expected '2026.1.0', got {data.get('homeassistant')!r}"
    )
