"""Integration import smoke tests.

Phase 2 extends __init__.py to import homeassistant.* at runtime (required for the
real config-flow + coordinator wiring). Without `homeassistant` installed in the
test environment (CI stage 1 is still lint+pytest without HA), we cannot `import`
the top-level package. We fall back to AST parsing + inspecting the package surface
textually, which still catches syntax errors and missing/renamed exports.

When 02-04 lands and installs pytest-homeassistant-custom-component, a full-import
suite will live in tests/test_config_flow.py, tests/test_coordinator.py, etc.
"""

from __future__ import annotations

import ast
import importlib.util
from pathlib import Path
from types import ModuleType

_REPO_ROOT = Path(__file__).resolve().parent.parent
_PKG = _REPO_ROOT / "custom_components" / "party_dispenser"


def _parse(path: Path) -> ast.Module:
    return ast.parse(path.read_text(encoding="utf-8"))


def _async_func_names(tree: ast.Module) -> set[str]:
    return {node.name for node in tree.body if isinstance(node, ast.AsyncFunctionDef)}


def test_integration_package_parses() -> None:
    """__init__.py is syntactically valid Python (ast-level check)."""
    _parse(_PKG / "__init__.py")


def test_integration_public_surface() -> None:
    """__init__.py declares the HA integration lifecycle hooks Phase 2 needs."""
    tree = _parse(_PKG / "__init__.py")
    names = _async_func_names(tree)
    # Phase 2 surface: domain-level async_setup (services hook), per-entry setup/unload,
    # plus a private reload listener wired via entry.add_update_listener.
    assert "async_setup" in names, (
        "__init__.py must declare async_setup (Phase 2 registers services there)"
    )
    assert "async_setup_entry" in names, (
        "__init__.py must declare async_setup_entry (per-entry setup)"
    )
    assert "async_unload_entry" in names, (
        "__init__.py must declare async_unload_entry (per-entry teardown)"
    )


def _load_const_directly() -> ModuleType:
    """Load const.py as a standalone module, bypassing the package __init__.py.

    Importing `from custom_components.party_dispenser import const` triggers the
    package's __init__.py first, which imports homeassistant at runtime and fails
    when HA isn't installed (current CI stage). We want to check const.py's surface
    without paying that cost — importlib.util.spec_from_file_location is the
    standard way to bypass package machinery.
    """
    const_path = _PKG / "const.py"
    spec = importlib.util.spec_from_file_location("party_dispenser_const", const_path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_const_exports() -> None:
    """The const module exports DOMAIN, VERSION, MANUFACTURER with locked values.

    const.py deliberately has NO homeassistant runtime dependency, so this check
    works without HA installed.
    """
    const = _load_const_directly()

    assert const.DOMAIN == "party_dispenser"
    assert const.VERSION == "0.3.0"
    assert const.MANUFACTURER == "PartyDispenser"
