"""JSON/JS export helpers for the desktop dashboard."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any


def write_json_and_js(payload: dict[str, Any], json_path: Path, js_path: Path, variable_name: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    js_path.write_text(
        f"window.{variable_name} = " + json.dumps(payload, separators=(",", ":")) + ";\n",
        encoding="utf-8",
    )


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if numeric != numeric:
        return None
    return numeric
