"""Serve LineLens locally and expose a small allow-listed refresh bridge.

The browser cannot execute Python commands by itself. This server keeps the
web experience usable while preserving the same named-command boundary as the
Tauri desktop shell.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
COMMANDS = {
    "startup_auto": ("scripts/startup_orchestrator.py", []),
    "bootstrap_env": ("scripts/bootstrap_env.py", []),
    "startup": ("scripts/startup_orchestrator.py", []),
    "nfl_real": ("scripts/refresh_data.py", ["--sport", "nfl", "--mode", "real"]),
    "mlb_current": ("scripts/refresh_data.py", ["--sport", "mlb", "--mode", "predict"]),
    "mlb_all": ("scripts/refresh_data.py", ["--sport", "mlb", "--mode", "all"]),
    "mlb_train": ("scripts/refresh_data.py", ["--sport", "mlb", "--mode", "train"]),
    "data_real": ("scripts/refresh_data.py", ["--sport", "all", "--mode", "real"]),
    "check_data": ("scripts/check_data_status.py", []),
    "score_models": ("scripts/score_model_predictions.py", []),
    "live_scores": ("scripts/live_scores.py", []),
    "live_scores_fast": ("scripts/live_scores.py", ["--days-back", "1", "--days-forward", "7", "--output-stem", "live_heartbeat"]),
    "odds_snapshots": ("scripts/odds_snapshots.py", []),
    "wnba_availability": ("scripts/refresh_wnba_availability.py", []),
    "mlb_player_games": ("scripts/refresh_mlb_player_games.py", []),
    "player_props_pipeline": ("scripts/refresh_player_props_pipeline.py", []),
    "score_props": ("scripts/score_prop_predictions.py", []),
}


def timestamp() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def python_candidates() -> list[tuple[str, list[str]]]:
    venv_python = ROOT / ".venv" / "Scripts" / "python.exe"
    candidates: list[tuple[str, list[str]]] = []
    if venv_python.exists():
        candidates.append((str(venv_python), []))
    candidates.extend([(sys.executable, []), ("py", ["-3.11"]), ("python", [])])
    return candidates


def run_refresh(command_name: str) -> dict[str, object]:
    started_at = timestamp()
    started = time.perf_counter()
    spec = COMMANDS.get(command_name)
    if not spec:
        return {
            "command_name": command_name,
            "command": command_name,
            "success": False,
            "exit_code": None,
            "stdout": "",
            "stderr": f"Unsupported refresh command: {command_name}",
            "started_at": started_at,
            "finished_at": timestamp(),
            "duration_ms": round((time.perf_counter() - started) * 1000),
            "repo_detected": True,
            "python_detected": False,
            "venv_detected": (ROOT / ".venv" / "Scripts" / "python.exe").exists(),
            "scripts_detected": False,
        }

    script, args = spec
    script_path = ROOT / script
    scripts_detected = script_path.exists()
    if not scripts_detected:
        stderr = f"Missing refresh script: {script_path}"
        return {
            "command_name": command_name,
            "command": f"{sys.executable} {script}",
            "success": False,
            "exit_code": None,
            "stdout": "",
            "stderr": stderr,
            "started_at": started_at,
            "finished_at": timestamp(),
            "duration_ms": round((time.perf_counter() - started) * 1000),
            "repo_detected": True,
            "python_detected": False,
            "venv_detected": False,
            "scripts_detected": False,
        }

    failures: list[str] = []
    for program, base_args in python_candidates():
        command = [program, *base_args, str(script_path), *args]
        try:
            result = subprocess.run(
                command,
                cwd=ROOT,
                capture_output=True,
                text=True,
                timeout=900,
                env={**os.environ, "PYTHONUNBUFFERED": "1"},
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            failures.append(f"{' '.join(command[:2])}: {error}")
            continue
        return {
            "command_name": command_name,
            "command": subprocess.list2cmdline(command),
            "success": result.returncode == 0,
            "exit_code": result.returncode,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "started_at": started_at,
            "finished_at": timestamp(),
            "duration_ms": round((time.perf_counter() - started) * 1000),
            "repo_detected": True,
            "python_detected": True,
            "venv_detected": (ROOT / ".venv" / "Scripts" / "python.exe").exists(),
            "scripts_detected": True,
        }

    return {
        "command_name": command_name,
        "command": command_name,
        "success": False,
        "exit_code": None,
        "stdout": "",
        "stderr": " | ".join(failures) or "No supported Python interpreter found.",
        "started_at": started_at,
        "finished_at": timestamp(),
        "duration_ms": round((time.perf_counter() - started) * 1000),
        "repo_detected": True,
        "python_detected": False,
        "venv_detected": (ROOT / ".venv" / "Scripts" / "python.exe").exists(),
        "scripts_detected": True,
    }


class LineLensHandler(SimpleHTTPRequestHandler):
    def _json(self, payload: dict[str, object], status: int = 200) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if urlparse(self.path).path == "/api/health":
            self._json({"ok": True, "service": "linelens-local-refresh", "root": str(ROOT)})
            return
        super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        if urlparse(self.path).path != "/api/refresh":
            self._json({"error": "Not found"}, 404)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            command_name = str(payload.get("command_name", "startup_auto"))
        except (ValueError, json.JSONDecodeError) as error:
            self._json({"error": f"Invalid refresh request: {error}"}, 400)
            return
        self._json(run_refresh(command_name))

    def log_message(self, format: str, *args: object) -> None:
        print(f"[LineLens] {format % args}", flush=True)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve LineLens with a local refresh bridge.")
    parser.add_argument("--port", type=int, default=4173)
    args = parser.parse_args()
    os.chdir(ROOT)
    server = ThreadingHTTPServer(("127.0.0.1", args.port), lambda *handler_args: LineLensHandler(*handler_args, directory=str(ROOT)))
    print(f"LineLens local app: http://127.0.0.1:{args.port}", flush=True)
    print(f"Refresh bridge: http://127.0.0.1:{args.port}/api/health", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
