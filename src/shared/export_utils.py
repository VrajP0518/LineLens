"""JSON/JS export helpers for the desktop dashboard."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any


def clean_json(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else value
    if isinstance(value, dict):
        return {str(key): clean_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [clean_json(item) for item in value]
    if hasattr(value, "item"):
        try:
            return clean_json(value.item())
        except (TypeError, ValueError):
            return None
    return value


def write_json_and_js(payload: dict[str, Any], json_path: Path, js_path: Path, variable_name: str) -> None:
    cleaned = clean_json(payload)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    js_path.parent.mkdir(parents=True, exist_ok=True)
    json_text = json.dumps(cleaned, separators=(",", ":"), allow_nan=False)
    js_text = f"window.{variable_name} = {json_text};\n"
    for path, text in ((json_path, json_text), (js_path, js_text)):
        temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
        try:
            temporary.write_text(text, encoding="utf-8")
            os.replace(temporary, path)
        finally:
            if temporary.exists():
                temporary.unlink(missing_ok=True)


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    if numeric != numeric:
        return None
    if math.isinf(numeric):
        return None
    return numeric
