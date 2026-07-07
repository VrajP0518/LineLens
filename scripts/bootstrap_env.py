"""Bootstrap the LineLens Python environment.

The desktop shell can call this script before refresh commands so the app uses
the supported Python/numpy/pandas stack instead of accidentally falling onto a
too-new system Python.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
STATUS_JSON = DATA_DIR / "bootstrap_status.json"
STATUS_JS = DATA_DIR / "bootstrap_status.js"
ENV_STATE_JSON = DATA_DIR / "env_state.json"
REQUIREMENTS = ROOT / "requirements.txt"
VENV_DIR = ROOT / ".venv"
VENV_PYTHON = VENV_DIR / "Scripts" / "python.exe"
APP_VERSION = "v0.7.0"

CORE_IMPORTS = ["pandas", "numpy", "sklearn", "joblib", "typer", "requests"]
NFL_IMPORT = "nfl_data_py"
PYTHON_TOO_NEW_MESSAGE = (
    "Python 3.14 is too new for nfl-data-py/numpy<2.0. "
    "Install Python 3.11 or use py -3.11."
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def requirements_hash() -> str:
    if not REQUIREMENTS.exists():
        return ""
    return hashlib.sha256(REQUIREMENTS.read_bytes()).hexdigest()


def write_json_and_js(payload: dict[str, Any], json_path: Path, js_path: Path, variable: str) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    js_path.write_text(f"window.{variable} = {json.dumps(payload, separators=(',', ':'))};\n", encoding="utf-8")


def load_env_state() -> dict[str, Any]:
    if not ENV_STATE_JSON.exists():
        return {}
    try:
        return json.loads(ENV_STATE_JSON.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}


def write_env_state(payload: dict[str, Any]) -> None:
    ENV_STATE_JSON.parent.mkdir(parents=True, exist_ok=True)
    ENV_STATE_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def run(command: list[str], timeout: int = 300) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=ROOT, text=True, capture_output=True, timeout=timeout, check=False)


def probe_python(command: list[str]) -> dict[str, Any] | None:
    probe = "import json,sys; print(json.dumps({'path': sys.executable, 'version': sys.version.split()[0], 'major': sys.version_info[0], 'minor': sys.version_info[1], 'micro': sys.version_info[2]}))"
    try:
        result = run([*command, "-c", probe], timeout=30)
    except (FileNotFoundError, subprocess.SubprocessError, OSError):
        return None
    if result.returncode != 0:
        return None
    try:
        payload = json.loads(result.stdout.strip())
    except json.JSONDecodeError:
        return None
    payload["command"] = command
    return payload


def is_supported_python(probe: dict[str, Any]) -> bool:
    version = (int(probe["major"]), int(probe["minor"]))
    return (3, 10) <= version <= (3, 12)


def is_python_too_new(probe: dict[str, Any]) -> bool:
    return (int(probe["major"]), int(probe["minor"])) >= (3, 14)


def select_python() -> tuple[dict[str, Any] | None, list[dict[str, Any]]]:
    candidates: list[list[str]] = []
    if VENV_PYTHON.exists():
        candidates.append([str(VENV_PYTHON)])
    candidates.extend([["py", "-3.11"], ["python"]])

    seen: set[tuple[str, ...]] = set()
    probes: list[dict[str, Any]] = []
    for command in candidates:
        key = tuple(command)
        if key in seen:
            continue
        seen.add(key)
        probe = probe_python(command)
        if not probe:
            probes.append({"command": command, "available": False})
            continue
        probe["available"] = True
        probe["supported"] = is_supported_python(probe)
        probe["too_new"] = is_python_too_new(probe)
        probes.append(probe)

        if command == [str(VENV_PYTHON)] and probe["supported"]:
            return probe, probes
        if command == ["py", "-3.11"] and probe["major"] == 3 and probe["minor"] == 11:
            return probe, probes
        if command == ["python"] and probe["supported"] and not probe["too_new"]:
            return probe, probes
    return None, probes


def create_venv(selected: dict[str, Any]) -> tuple[bool, str | None]:
    if VENV_PYTHON.exists():
        return False, None
    command = [*selected["command"], "-m", "venv", str(VENV_DIR)]
    result = run(command, timeout=180)
    if result.returncode != 0:
        return False, (result.stderr or result.stdout or "venv creation failed").strip()
    return True, None


def verify_imports(python_path: Path) -> dict[str, Any]:
    modules = [*CORE_IMPORTS, NFL_IMPORT]
    script = (
        "import importlib,json;"
        f"mods={modules!r};"
        "out={};"
        "\nfor m in mods:\n"
        "    try:\n"
        "        importlib.import_module(m); out[m]={'ok': True, 'error': None}\n"
        "    except Exception as exc:\n"
        "        out[m]={'ok': False, 'error': f'{type(exc).__name__}: {exc}'}\n"
        "print(json.dumps(out))"
    )
    result = run([str(python_path), "-c", script], timeout=60)
    if result.returncode != 0:
        error = (result.stderr or result.stdout or "import verification failed").strip()
        return {
            "imports": {module: {"ok": False, "error": error} for module in modules},
            "core_ready": False,
            "nfl_ready": False,
            "nfl_error": error,
        }
    imports = json.loads(result.stdout.strip())
    core_ready = all(imports[module]["ok"] for module in CORE_IMPORTS)
    nfl_ready = bool(imports[NFL_IMPORT]["ok"])
    return {
        "imports": imports,
        "core_ready": core_ready,
        "nfl_ready": nfl_ready,
        "nfl_error": None if nfl_ready else imports[NFL_IMPORT]["error"],
    }


def install_requirements(python_path: Path) -> tuple[bool, str | None, list[str]]:
    logs: list[str] = []
    upgrade = run([str(python_path), "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"], timeout=420)
    logs.append(upgrade.stdout.strip())
    if upgrade.returncode != 0:
        return False, (upgrade.stderr or upgrade.stdout or "pip bootstrap failed").strip(), logs

    install = run([str(python_path), "-m", "pip", "install", "-r", str(REQUIREMENTS)], timeout=900)
    logs.append(install.stdout.strip())
    if install.returncode == 0:
        return True, None, logs

    # If nfl-data-py is the brittle piece, still try to keep MLB/core imports alive.
    fallback_packages = [
        line.strip()
        for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines()
        if line.strip() and not line.strip().startswith("#") and not line.lower().startswith("nfl-data-py")
    ]
    fallback = run([str(python_path), "-m", "pip", "install", *fallback_packages], timeout=900)
    logs.append(fallback.stdout.strip())
    if fallback.returncode == 0:
        return False, (install.stderr or install.stdout or "nfl-data-py install failed").strip(), logs
    return False, (fallback.stderr or install.stderr or fallback.stdout or install.stdout or "requirements install failed").strip(), logs


def bootstrap(force: bool = False) -> dict[str, Any]:
    req_hash = requirements_hash()
    selected, probes = select_python()
    payload: dict[str, Any] = {
        "metadata": {"app": "LineLens Sports", "version": APP_VERSION, "generated_at": utc_now()},
        "status": "env_missing",
        "python_found": False,
        "python_path": None,
        "python_version": None,
        "venv_detected": VENV_PYTHON.exists(),
        "venv_created": False,
        "requirements_hash": req_hash,
        "requirements_installed": False,
        "requirements_skipped": False,
        "imports_verified": False,
        "mlb_ready": False,
        "nfl_ready": False,
        "nfl_error": None,
        "error": None,
        "candidates": probes,
    }

    if not selected:
        rejected = next((probe for probe in probes if probe.get("too_new")), None)
        payload["error"] = PYTHON_TOO_NEW_MESSAGE if rejected else "Python 3.11 was not found. Install Python 3.11 or use py -3.11."
        write_json_and_js(payload, STATUS_JSON, STATUS_JS, "__BOOTSTRAP_STATUS__")
        return payload

    if selected.get("too_new"):
        payload["error"] = PYTHON_TOO_NEW_MESSAGE
        write_json_and_js(payload, STATUS_JSON, STATUS_JS, "__BOOTSTRAP_STATUS__")
        return payload

    payload.update(
        {
            "python_found": True,
            "python_path": selected["path"],
            "python_version": selected["version"],
        }
    )

    created, venv_error = create_venv(selected)
    payload["venv_created"] = created
    if venv_error:
        payload["status"] = "install_failed"
        payload["error"] = venv_error
        write_json_and_js(payload, STATUS_JSON, STATUS_JS, "__BOOTSTRAP_STATUS__")
        return payload

    venv_probe = probe_python([str(VENV_PYTHON)])
    if not venv_probe or not is_supported_python(venv_probe):
        payload["status"] = "env_missing"
        payload["error"] = PYTHON_TOO_NEW_MESSAGE if venv_probe and is_python_too_new(venv_probe) else "The .venv Python is missing or unsupported."
        write_json_and_js(payload, STATUS_JSON, STATUS_JS, "__BOOTSTRAP_STATUS__")
        return payload

    payload.update(
        {
            "python_path": venv_probe["path"],
            "python_version": venv_probe["version"],
            "venv_detected": True,
        }
    )

    before_imports = verify_imports(VENV_PYTHON)
    env_state = load_env_state()
    can_skip_install = (
        not force
        and not created
        and before_imports["core_ready"]
        and env_state.get("requirements_hash") == req_hash
        and env_state.get("imports_verified") is True
    )
    can_initialize_state = not force and not created and before_imports["core_ready"] and not env_state

    install_error = None
    if can_skip_install or can_initialize_state:
        payload["requirements_skipped"] = True
    else:
        installed, install_error, _logs = install_requirements(VENV_PYTHON)
        payload["requirements_installed"] = installed

    after_imports = verify_imports(VENV_PYTHON)
    payload["imports"] = after_imports["imports"]
    payload["imports_verified"] = after_imports["core_ready"]
    payload["mlb_ready"] = after_imports["core_ready"]
    payload["nfl_ready"] = after_imports["nfl_ready"]
    payload["nfl_error"] = after_imports["nfl_error"]
    if install_error and not after_imports["nfl_ready"]:
        payload["nfl_error"] = install_error
    if install_error and not after_imports["core_ready"]:
        payload["error"] = install_error

    if after_imports["core_ready"]:
        payload["status"] = "env_ready" if after_imports["nfl_ready"] else "dependency_missing"
        write_env_state(
            {
                "requirements_hash": req_hash,
                "python_path": payload["python_path"],
                "python_version": payload["python_version"],
                "last_bootstrap_success": utc_now(),
                "imports_verified": True,
                "nfl_ready": after_imports["nfl_ready"],
            }
        )
    else:
        payload["status"] = "install_failed"

    write_json_and_js(payload, STATUS_JSON, STATUS_JS, "__BOOTSTRAP_STATUS__")
    return payload


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Force reinstall even when env_state is current.")
    args = parser.parse_args()
    payload = bootstrap(force=args.force)
    print(json.dumps(payload, indent=2))
    return 0 if payload.get("mlb_ready") else 1


if __name__ == "__main__":
    raise SystemExit(main())
