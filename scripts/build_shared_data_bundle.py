"""Build the sanitized LineLens v6 shared-data channel bundle."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CHANNEL_BASE = "https://github.com/VrajP0518/LineLens/releases/download/data-channel-v6"
SHARED_FILES = [
    "data/refresh_status.json",
    "data/live/live_heartbeat.json",
    "data/live/live_scores.json",
    "data/live/live_widget.json",
    "data/odds/odds_snapshots.json",
    "data/odds/player_props.json",
    "data/odds/odds_health.json",
    "data/odds/props_matching_diagnostics.json",
    "data/odds/wnba_availability.json",
    "data/predictions/mlb_predictions.json",
    "data/predictions/wnba_predictions.json",
    "data/predictions/nfl_predictions.json",
    "data/tracking/model_predictions_log.json",
    "data/tracking/model_record.json",
    "data/tracking/prop_prediction_log.json",
    "data/tracking/prop_record.json",
]
REQUIRED_FILES = {
    "data/live/live_heartbeat.json",
    "data/odds/odds_snapshots.json",
    "data/predictions/mlb_predictions.json",
    "data/predictions/wnba_predictions.json",
}
SECRET_NAMES = ("ODDS_API_KEY", "SHARP_ODDS_API_KEY", "PROPLINE_API_KEY")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="dist-shared-data")
    parser.add_argument("--data-version", default=os.getenv("DATA_VERSION") or datetime.now(timezone.utc).strftime("v6-%Y%m%d-%H%M%S"))
    parser.add_argument("--commit-sha", default=os.getenv("GITHUB_SHA") or "local")
    args = parser.parse_args()

    paths = [ROOT / value for value in SHARED_FILES if (ROOT / value).is_file()]
    present = {path.relative_to(ROOT).as_posix() for path in paths}
    missing = sorted(REQUIRED_FILES - present)
    if missing:
        raise SystemExit(f"Required shared exports are missing: {', '.join(missing)}")

    secret_values = [os.environ[name].encode() for name in SECRET_NAMES if os.environ.get(name)]
    for path in paths:
        contents = path.read_bytes()
        if any(value and value in contents for value in secret_values):
            raise SystemExit(f"Refusing to package a secret found in {path.relative_to(ROOT)}")
        json.loads(contents.decode("utf-8"))

    output = Path(args.output_dir)
    if not output.is_absolute():
        output = ROOT / output
    output.mkdir(parents=True, exist_ok=True)
    archive = output / "linelens-shared-data-v6.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as package:
        for path in paths:
            name = path.relative_to(ROOT).as_posix()
            info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, path.read_bytes())

    files = [
        {"path": path.relative_to(ROOT).as_posix(), "sha256": sha256(path), "size": path.stat().st_size}
        for path in paths
    ]
    manifest = {
        "schema_version": 1,
        "channel": "data-v6",
        "app_major": 6,
        "data_version": args.data_version,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "commit_sha": args.commit_sha,
        "bundle": {
            "url": f"{CHANNEL_BASE}/{archive.name}",
            "sha256": sha256(archive),
            "size": archive.stat().st_size,
        },
        "files": files,
        "provenance": {
            "provider": "GitHub artifact attestation",
            "repository": "VrajP0518/LineLens",
            "workflow": "publish-shared-data.yml",
        },
        "security": {
            "contains_api_keys": False,
            "allowed_content": "sanitized JSON exports only",
        },
    }
    manifest_path = output / "shared-data-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {archive} with {len(files)} sanitized JSON exports; no provider key was packaged.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
