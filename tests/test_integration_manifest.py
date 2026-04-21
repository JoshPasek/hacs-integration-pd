"""Bespoke validator for custom_components/party_dispenser/manifest.json.

Replaces the Docker-based hassfest CI job when DinD is unavailable (e.g., Kubernetes
runners without privileged mode). Asserts the same structural invariants hassfest
checks for: required fields, enum values, value shapes.

This is narrower than hassfest (hassfest also validates against the live HA schema
which evolves per release), but sufficient for Phase 1's goal of "structurally valid
HACS custom repository". Phase 5 brings the real hassfest + HACS action in via the
GitHub mirror's CI where DinD is available.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent
_MANIFEST = _REPO_ROOT / "custom_components" / "party_dispenser" / "manifest.json"

# Source: https://developers.home-assistant.io/docs/creating_integration_manifest
_REQUIRED_FIELDS = frozenset(
    {"domain", "name", "codeowners", "documentation", "issue_tracker", "version"}
)

# Extra fields that may appear in a HACS-distributed integration. Hassfest allows
# additional core-managed keys (e.g. bluetooth, ssdp, zeroconf); we whitelist only
# what's relevant for this integration's Phase 1 manifest. Phase 2 may add more.
_ALLOWED_FIELDS = _REQUIRED_FIELDS | frozenset(
    {
        "requirements",
        "dependencies",
        "iot_class",
        "integration_type",
        "config_flow",
        "after_dependencies",
        "homeassistant",
        "quality_scale",
        "loggers",
    }
)

_VALID_IOT_CLASSES = frozenset(
    {
        "assumed_state",
        "calculated",
        "cloud_polling",
        "cloud_push",
        "local_polling",
        "local_push",
    }
)

_VALID_INTEGRATION_TYPES = frozenset(
    {"device", "entity", "helper", "hub", "service", "system", "virtual"}
)

_DOMAIN_RE = re.compile(r"^[a-z][a-z0-9_]*$")
_SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+(?:[-+].*)?$")
_URL_RE = re.compile(r"^https?://")


def _load() -> dict:
    assert _MANIFEST.exists(), f"manifest.json missing at {_MANIFEST}"
    return json.loads(_MANIFEST.read_text(encoding="utf-8"))


def test_manifest_exists_and_parses() -> None:
    manifest = _load()
    assert isinstance(manifest, dict), "manifest.json must be a JSON object"


def test_manifest_required_fields_present() -> None:
    manifest = _load()
    missing = _REQUIRED_FIELDS - set(manifest.keys())
    assert not missing, f"manifest.json missing required fields: {sorted(missing)}"


def test_manifest_no_unknown_fields() -> None:
    manifest = _load()
    unknown = set(manifest.keys()) - _ALLOWED_FIELDS
    assert not unknown, (
        f"manifest.json contains unknown fields: {sorted(unknown)} "
        f"(expand _ALLOWED_FIELDS in tests/test_integration_manifest.py if intentional)"
    )


def test_manifest_domain_pattern() -> None:
    domain = _load()["domain"]
    assert isinstance(domain, str) and _DOMAIN_RE.match(domain), (
        f"domain must match {_DOMAIN_RE.pattern!r}, got {domain!r}"
    )


def test_manifest_domain_matches_directory() -> None:
    domain = _load()["domain"]
    assert domain == "party_dispenser", (
        f"domain must match custom_components/party_dispenser/, got {domain!r}"
    )


def test_manifest_name_non_empty() -> None:
    name = _load()["name"]
    assert isinstance(name, str) and name.strip(), "name must be a non-empty string"


def test_manifest_version_is_semver() -> None:
    version = _load()["version"]
    assert isinstance(version, str) and _SEMVER_RE.match(version), (
        f"version must be semver (e.g. '0.1.0'), got {version!r}"
    )


def test_manifest_codeowners_is_list() -> None:
    codeowners = _load()["codeowners"]
    assert isinstance(codeowners, list), "codeowners must be a list"
    for co in codeowners:
        assert isinstance(co, str), f"codeowner entries must be strings, got {co!r}"


def test_manifest_documentation_url() -> None:
    url = _load()["documentation"]
    assert isinstance(url, str) and _URL_RE.match(url), (
        f"documentation must be an http(s) URL, got {url!r}"
    )


def test_manifest_issue_tracker_url() -> None:
    url = _load()["issue_tracker"]
    assert isinstance(url, str) and _URL_RE.match(url), (
        f"issue_tracker must be an http(s) URL, got {url!r}"
    )


def test_manifest_iot_class_valid() -> None:
    manifest = _load()
    if "iot_class" in manifest:
        assert manifest["iot_class"] in _VALID_IOT_CLASSES, (
            f"iot_class must be one of {sorted(_VALID_IOT_CLASSES)}, got {manifest['iot_class']!r}"
        )


def test_manifest_integration_type_valid() -> None:
    manifest = _load()
    if "integration_type" in manifest:
        assert manifest["integration_type"] in _VALID_INTEGRATION_TYPES, (
            f"integration_type must be one of {sorted(_VALID_INTEGRATION_TYPES)}, "
            f"got {manifest['integration_type']!r}"
        )


def test_manifest_config_flow_boolean() -> None:
    manifest = _load()
    if "config_flow" in manifest:
        assert isinstance(manifest["config_flow"], bool), (
            f"config_flow must be bool, got {type(manifest['config_flow']).__name__}"
        )


def test_manifest_requirements_is_list_of_strings() -> None:
    manifest = _load()
    if "requirements" in manifest:
        assert isinstance(manifest["requirements"], list), "requirements must be a list"
        for req in manifest["requirements"]:
            assert isinstance(req, str), f"requirements entries must be strings, got {req!r}"


def test_manifest_dependencies_is_list_of_strings() -> None:
    manifest = _load()
    if "dependencies" in manifest:
        assert isinstance(manifest["dependencies"], list), "dependencies must be a list"
        for dep in manifest["dependencies"]:
            assert isinstance(dep, str), f"dependencies entries must be strings, got {dep!r}"


def test_manifest_phase4_overrides() -> None:
    """Phase 4 locked decisions per 04-CONTEXT.md (card shipped, deps flipped, version bumped)."""
    manifest = _load()
    assert manifest.get("iot_class") == "local_push", (
        "Phase 4: iot_class stays 'local_push' (Phase 3 flipped it; WebSocket still active)"
    )
    assert manifest.get("integration_type") == "hub", (
        "Phase 4: integration_type stays 'hub' (forward-compat for multi-dispenser v2)"
    )
    assert manifest.get("config_flow") is True, (
        "Phase 4: config_flow stays true (Phase 2 flipped it; we don't touch it)"
    )
    assert manifest.get("version") == "0.4.0", (
        "Phase 4: version bumped to 0.4.0 per CONTEXT.md locked decision"
    )
    assert manifest.get("dependencies") == ["http"], (
        "Phase 4: dependencies flipped from [] to ['http'] — http required for "
        "async_register_static_paths; 'frontend' omitted (hass_frontend not in test venv, "
        "async_setup_frontend defers until EVENT_HOMEASSISTANT_STARTED so Lovelace loads first)"
    )
