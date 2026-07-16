"""Build the static frontend bundle for Tauri.

The Tauri bundle must not point at the repo root because that includes
node_modules, src-tauri, and build outputs. This script creates a clean
dist-web folder containing only browser assets.
"""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist-web"

REQUIRED_ROOT_FILES = ["index.html", "app.js", "sprint5.js", "styles.css", "widget.html", "widget.js", "widget.css"]
ASSET_DIRS = ["assets", "images"]
DATA_FILES = [
    "app_metadata.json",
    "app_metadata.js",
    "team_metadata.json",
    "team_metadata.js",
    "bootstrap_status.json",
    "bootstrap_status.js",
    "startup_status.json",
    "startup_status.js",
    "refresh_status.json",
    "refresh_status.js",
    "predictions.js",
]
DATA_DIRS = ["predictions", "reports", "tracking", "models", "live", "odds", "sprint5"]


def copy_file(src: Path, dest: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(f"Required web asset is missing: {src.relative_to(ROOT)}")
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)


def copy_tree(src: Path, dest: Path) -> None:
    if not src.exists():
        raise FileNotFoundError(f"Required data folder is missing: {src.relative_to(ROOT)}")
    shutil.copytree(
        src,
        dest,
        ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.log", "data"),
    )


def main() -> None:
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir(parents=True)

    copied: list[str] = []
    for filename in REQUIRED_ROOT_FILES:
        copy_file(ROOT / filename, DIST / filename)
        copied.append(filename)

    for dirname in ASSET_DIRS:
        copy_tree(ROOT / dirname, DIST / dirname)
        copied.append(f"{dirname}/")

    for filename in DATA_FILES:
        copy_file(ROOT / "data" / filename, DIST / "data" / filename)
        copied.append(f"data/{filename}")

    for dirname in DATA_DIRS:
        copy_tree(ROOT / "data" / dirname, DIST / "data" / dirname)
        copied.append(f"data/{dirname}/")

    print(f"Built {DIST.relative_to(ROOT)} with {len(copied)} asset groups:")
    for item in copied:
        print(f" - {item}")


if __name__ == "__main__":
    main()
