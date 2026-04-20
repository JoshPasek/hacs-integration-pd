"""Pytest configuration for Phase 1 scaffold tests.

These tests do NOT depend on Home Assistant. They only validate the Phase 1
static artifacts (package imports, hacs.json schema, info.md markdown subset).
"""
from __future__ import annotations

import sys
from pathlib import Path

# Ensure the repo root is on sys.path so `import custom_components.party_dispenser` works.
_REPO_ROOT = Path(__file__).resolve().parent.parent
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))
