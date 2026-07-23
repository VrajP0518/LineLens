"""Check the source-level contract for non-blocking desktop refreshes."""

from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    app = (ROOT / "app.js").read_text(encoding="utf-8")
    rust = (ROOT / "src-tauri" / "src" / "lib.rs").read_text(encoding="utf-8")
    bridge = (ROOT / "scripts" / "local_server.py").read_text(encoding="utf-8")
    index = (ROOT / "index.html").read_text(encoding="utf-8")
    failures: list[str] = []

    required_app = {
        "refresh single-flight guard": "function runRefreshTask(task)",
        "in-place refresh export application": "async function loadAllAfterRefresh()",
        "refresh result propagation": "return result;",
        "background runtime state": 'phase: "idle"',
        "background live reload": "if (result?.success) await loadAllAfterRefresh();",
    }
    for label, needle in required_app.items():
        if needle not in app:
            failures.append(f"app.js missing {label}")

    forbidden_app = {
        "forced webview reload": "window.location.reload",
        "refresh overlay": 'startAppLoading(`Refreshing',
        "refresh export overlay": 'setAppLoading("Loading refreshed exports',
    }
    for label, needle in forbidden_app.items():
        if needle in app:
            failures.append(f"app.js still contains {label}")

    required_backend = {
        "Tauri background command": "spawn_blocking",
        "Tauri refresh lock": "REFRESH_PROCESS_LOCK",
        "browser refresh lock": "REFRESH_LOCK",
        "sanitized diagnostics": "get_runtime_diagnostics",
    }
    for label, needle in required_backend.items():
        if needle not in (rust + bridge):
            failures.append(f"refresh backend missing {label}")

    if "https://cdn.jsdelivr.net/npm/chart.js" in index:
        failures.append("index.html still loads Chart.js from a CDN")
    if "assets/vendor/chart.umd.min.js" not in index:
        failures.append("index.html does not load the bundled Chart.js asset")

    if failures:
        print("FAIL: refresh contract")
        for failure in failures:
            print(f" - {failure}")
        return 1

    print("PASS: non-blocking refresh contract")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
