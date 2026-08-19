"""Install a verified LineLens v6 model bundle from the approved release channel."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import tempfile
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MANIFEST_URL = "https://github.com/VrajP0518/LineLens/releases/download/model-channel-v6/model-manifest.json"
STATUS_JSON = ROOT / "data" / "models" / "model_update_status.json"
STATUS_JS = ROOT / "data" / "models" / "model_update_status.js"
MAX_DOWNLOAD_BYTES = 250 * 1024 * 1024


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def allowed_path(value: str) -> bool:
    path = PurePosixPath(value)
    if path.is_absolute() or ".." in path.parts or "\\" in value:
        return False
    return (
        len(path.parts) == 2
        and path.parts[0] == "models"
        and path.suffix == ".joblib"
    ) or (
        len(path.parts) >= 3
        and path.parts[:2] in (("data", "models"), ("data", "reports"))
        and path.suffix in {".json", ".js"}
        and "backups" not in path.parts
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, destination: Path, limit: int = MAX_DOWNLOAD_BYTES) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "LineLens-v6-model-updater"})
    with urllib.request.urlopen(request, timeout=60) as response, destination.open("wb") as output:  # noqa: S310 - HTTPS URL is allowlisted by the manifest channel.
        declared = int(response.headers.get("Content-Length") or 0)
        if declared > limit:
            raise ValueError("Approved model bundle exceeds the download limit.")
        total = 0
        while chunk := response.read(1024 * 1024):
            total += len(chunk)
            if total > limit:
                raise ValueError("Approved model bundle exceeds the download limit.")
            output.write(chunk)


def write_status(status: str, message: str, manifest: dict[str, Any] | None = None) -> None:
    payload = {
        "status": status,
        "message": message,
        "checked_at": utc_now(),
        "model_version": (manifest or {}).get("model_version"),
        "commit_sha": (manifest or {}).get("commit_sha"),
        "channel": (manifest or {}).get("channel", "v6"),
        "provenance": (manifest or {}).get("provenance"),
    }
    STATUS_JSON.parent.mkdir(parents=True, exist_ok=True)
    STATUS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    STATUS_JS.write_text(f"window.__MODEL_UPDATE_STATUS__ = {json.dumps(payload, separators=(',', ':'))};\n", encoding="utf-8")


def validate_manifest(manifest: dict[str, Any]) -> list[dict[str, Any]]:
    if manifest.get("schema_version") != 1 or manifest.get("channel") != "v6" or manifest.get("app_major") != 6:
        raise ValueError("Manifest is not an approved LineLens v6 model channel manifest.")
    bundle = manifest.get("bundle") or {}
    if not str(bundle.get("url") or "").startswith("https://github.com/VrajP0518/LineLens/releases/download/model-channel-v6/"):
        raise ValueError("Bundle URL is outside the approved LineLens release channel.")
    if len(str(bundle.get("sha256") or "")) != 64:
        raise ValueError("Bundle hash is missing or invalid.")
    files = manifest.get("files") or []
    if not files:
        raise ValueError("Manifest contains no model artifacts.")
    for entry in files:
        if not allowed_path(str(entry.get("path") or "")) or len(str(entry.get("sha256") or "")) != 64:
            raise ValueError(f"Manifest contains a disallowed artifact: {entry.get('path')}")
    return files


def install(manifest_url: str) -> dict[str, Any]:
    with tempfile.TemporaryDirectory(prefix="linelens-model-update-") as temp_value:
        temp = Path(temp_value)
        manifest_path = temp / "model-manifest.json"
        download(manifest_url, manifest_path, 2 * 1024 * 1024)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        files = validate_manifest(manifest)
        bundle = manifest["bundle"]
        archive = temp / "model-bundle.zip"
        download(bundle["url"], archive)
        if sha256(archive) != bundle["sha256"]:
            raise ValueError("Model bundle hash does not match the approved manifest.")

        staging = temp / "staging"
        staging.mkdir()
        expected = {entry["path"]: entry for entry in files}
        with zipfile.ZipFile(archive) as package:
            names = {name for name in package.namelist() if not name.endswith("/")}
            if names != set(expected):
                raise ValueError("Bundle contents do not exactly match the approved manifest.")
            for name in names:
                target = staging / Path(*PurePosixPath(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                with package.open(name) as source, target.open("wb") as output:
                    shutil.copyfileobj(source, output)
                entry = expected[name]
                if target.stat().st_size != int(entry["size"]) or sha256(target) != entry["sha256"]:
                    raise ValueError(f"Artifact verification failed: {name}")

        backup_root = ROOT / "data" / "model_backups" / datetime.now().strftime("%Y%m%d-%H%M%S")
        for name in sorted(expected):
            destination = ROOT / Path(*PurePosixPath(name).parts)
            if destination.exists():
                backup = backup_root / Path(*PurePosixPath(name).parts)
                backup.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(destination, backup)
        for name in sorted(expected):
            destination = ROOT / Path(*PurePosixPath(name).parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            os.replace(staging / Path(*PurePosixPath(name).parts), destination)

        write_status("installed", "Approved model artifacts were verified and installed.", manifest)
        return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest-url", default=os.getenv("LINELENS_MODEL_MANIFEST_URL", DEFAULT_MANIFEST_URL))
    args = parser.parse_args()
    manifest: dict[str, Any] | None = None
    try:
        manifest = install(args.manifest_url)
    except Exception as error:  # noqa: BLE001 - status must remain visible to the installed client.
        write_status("failed", str(error), manifest)
        print(f"Model update failed: {error}")
        return 1
    print(f"Installed approved model version {manifest.get('model_version')} from commit {manifest.get('commit_sha')}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
