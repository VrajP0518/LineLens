"""Restore the last verified shared-data release before a stateless Actions refresh."""

from __future__ import annotations

import argparse
import hashlib
import json
import zipfile
from pathlib import Path

from build_shared_data_bundle import ROOT, SHARED_FILES


def digest_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--bundle", required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest)
    bundle_path = Path(args.bundle)
    if not manifest_path.is_file() or not bundle_path.is_file():
        print("No previous shared-data channel exists; starting from bundled repository exports.")
        return 0

    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("schema_version") != 1 or manifest.get("channel") != "data-v6" or manifest.get("app_major") != 6:
        raise SystemExit("Previous shared-data manifest is not an approved v6 channel.")
    bundle_bytes = bundle_path.read_bytes()
    expected_bundle = manifest.get("bundle") or {}
    if len(bundle_bytes) != expected_bundle.get("size") or digest_bytes(bundle_bytes) != expected_bundle.get("sha256"):
        raise SystemExit("Previous shared-data bundle failed its manifest hash or size check.")

    allowed = set(SHARED_FILES)
    expected = {entry["path"]: entry for entry in manifest.get("files", [])}
    if not expected or not set(expected).issubset(allowed):
        raise SystemExit("Previous shared-data manifest contains an unexpected path.")
    with zipfile.ZipFile(bundle_path) as package:
        names = [name.replace("\\", "/") for name in package.namelist() if not name.endswith("/")]
        if len(names) != len(set(names)) or set(names) != set(expected):
            raise SystemExit("Previous shared-data archive does not exactly match its manifest.")
        for name in names:
            value = package.read(name)
            entry = expected[name]
            if len(value) != entry.get("size") or digest_bytes(value) != entry.get("sha256"):
                raise SystemExit(f"Previous shared-data artifact failed verification: {name}")
            destination = ROOT / name
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(value)
    print(f"Restored {len(expected)} verified exports from data version {manifest.get('data_version')}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
