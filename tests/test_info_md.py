"""Phase 1: info.md exists and uses only HACS-supported markdown.

HACS renders info.md as a CommonMark subset. It does NOT render:
  - GitHub <picture> elements
  - GitHub blockquote notes (> [!NOTE], > [!WARNING], etc.)

Reference: https://github.com/hacs/integration/issues/3995
"""
from __future__ import annotations

import re
from pathlib import Path

_REPO_ROOT = Path(__file__).resolve().parent.parent


def test_info_md_exists_and_non_empty() -> None:
    """info.md must exist and be non-empty for HACS to render it."""
    path = _REPO_ROOT / "info.md"
    assert path.exists(), f"{path} does not exist"
    assert path.stat().st_size > 0, "info.md is empty"


def test_info_md_no_picture_element() -> None:
    """HACS cannot render GitHub <picture> elements."""
    text = (_REPO_ROOT / "info.md").read_text()
    assert "<picture" not in text, "info.md contains <picture> which HACS cannot render"


def test_info_md_no_github_blockquote_notes() -> None:
    """HACS cannot render GitHub blockquote notes like `> [!NOTE]` or `> [!WARNING]`."""
    text = (_REPO_ROOT / "info.md").read_text()
    assert not re.search(r"^>\s*\[!", text, re.MULTILINE), (
        "info.md contains GitHub blockquote notes (> [!NOTE]/> [!WARNING]) which HACS cannot render"
    )


def test_info_md_has_heading() -> None:
    """info.md should open with a top-level heading so HACS renders a title."""
    text = (_REPO_ROOT / "info.md").read_text()
    first_line = text.splitlines()[0] if text.splitlines() else ""
    assert first_line.startswith("# "), (
        f"info.md should start with a '# ' heading; got: {first_line!r}"
    )
