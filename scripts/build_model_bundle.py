"""Build a deterministic LineLens model bundle and hash manifest."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHANNEL_BASE = "https://github.com/VrajP0518/LineLens/releases/download/model-channel-v6"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    digest.update(path.read_bytes())
    return digest.hexdigest()


def artifact_paths() -> list[Path]:
    paths = list((ROOT / "models").glob("*.joblib"))
    for folder in (ROOT / "data" / "models", ROOT / "data" / "reports"):
        paths.extend(path for path in folder.glob("*.*") if path.suffix in {".json", ".js"} and "model_update_status" not in path.name)
    return sorted(path for path in paths if path.is_file())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="dist-models")
    parser.add_argument("--model-version", default=os.getenv("MODEL_VERSION") or datetime.now(timezone.utc).strftime("v6-%Y%m%d-%H%M%S"))
    parser.add_argument("--commit-sha", default=os.getenv("GITHUB_SHA") or "local")
    args = parser.parse_args()
    output = ROOT / args.output_dir
    output.mkdir(parents=True, exist_ok=True)
    archive = output / "linelens-models-v6.zip"
    paths = artifact_paths()
    if not paths:
        raise SystemExit("No model artifacts were found.")
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for path in paths:
            info = zipfile.ZipInfo(path.relative_to(ROOT).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, path.read_bytes())
    files = [
        {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path), "size": path.stat().st_size}
        for path in paths
    ]
    manifest = {
        "schema_version": 1,
        "channel": "v6",
        "app_major": 6,
        "model_version": args.model_version,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "commit_sha": args.commit_sha,
        "bundle": {"url": f"{CHANNEL_BASE}/{archive.name}", "sha256": sha256(archive), "size": archive.stat().st_size},
        "files": files,
        "provenance": {"provider": "GitHub artifact attestation", "repository": "VrajP0518/LineLens", "workflow": "publish-model-channel.yml"},
    }
    (output / "model-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    try:
        display_path = archive.relative_to(ROOT)
    except ValueError:
        display_path = archive
    print(f"Built {display_path} with {len(files)} verified artifacts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
