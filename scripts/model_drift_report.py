"""Compare selected model metrics with the pre-retraining registry."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "data" / "models" / "model_registry.json"
OUTPUT_JSON = ROOT / "data" / "reports" / "model_drift_alerts.json"
OUTPUT_JS = ROOT / "data" / "reports" / "model_drift_alerts.js"
OUTPUT_MD = ROOT / "data" / "reports" / "model_drift_alerts.md"
THRESHOLDS = {"log_loss": 0.03, "brier_score": 0.02, "accuracy": -0.05, "roc_auc": -0.05}


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def selected(payload: dict[str, Any]) -> dict[str, dict[str, Any]]:
    rows = [row for row in payload.get("models") or [] if row.get("selected")]
    return {str(row.get("sport") or "UNKNOWN").upper(): row for row in rows}


def metric_delta(name: str, before: dict[str, Any], after: dict[str, Any]) -> float | None:
    try:
        return float((after.get("metrics") or {})[name]) - float((before.get("metrics") or {})[name])
    except (KeyError, TypeError, ValueError):
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", required=True)
    args = parser.parse_args()
    baseline = selected(load(Path(args.baseline)))
    current = selected(load(CURRENT))
    sports = sorted(set(baseline) | set(current))
    rows = []
    overall = "clear"
    for sport in sports:
        before = baseline.get(sport)
        after = current.get(sport)
        if not before or not after:
            rows.append({"sport": sport, "status": "warning", "message": "Selected model missing from one registry snapshot."})
            if overall == "clear":
                overall = "warning"
            continue
        deltas = {name: metric_delta(name, before, after) for name in THRESHOLDS}
        alerts = []
        warnings = []
        for name, threshold in THRESHOLDS.items():
            delta = deltas[name]
            if delta is None:
                continue
            regressed = delta >= threshold if threshold > 0 else delta <= threshold
            warning = delta >= threshold / 2 if threshold > 0 else delta <= threshold / 2
            if regressed:
                alerts.append(name)
            elif warning:
                warnings.append(name)
        status = "alert" if alerts else "warning" if warnings else "clear"
        if status == "alert":
            overall = "alert"
        elif status == "warning" and overall == "clear":
            overall = "warning"
        rows.append(
            {
                "sport": sport,
                "status": status,
                "before_model": before.get("model_name"),
                "after_model": after.get("model_name"),
                "before_id": before.get("model_id"),
                "after_id": after.get("model_id"),
                "metric_deltas": deltas,
                "alerts": alerts,
                "warnings": warnings,
            }
        )
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
            "status": overall,
            "policy": "alert at +0.03 log loss, +0.02 Brier, or -0.05 accuracy/ROC AUC",
        },
        "sports": rows,
    }
    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    OUTPUT_JS.write_text(f"window.__MODEL_DRIFT_ALERTS__ = {json.dumps(payload, separators=(',', ':'))};\n", encoding="utf-8")
    markdown = ["## Model drift review", "", f"Overall: **{overall.upper()}**", "", "| Sport | Status | Log loss delta | Brier delta | Accuracy delta | ROC AUC delta |", "|---|---:|---:|---:|---:|---:|"]
    for row in rows:
        deltas = row.get("metric_deltas") or {}
        display = lambda key: "n/a" if deltas.get(key) is None else f"{deltas[key]:+.4f}"  # noqa: E731
        markdown.append(f"| {row['sport']} | {row['status']} | {display('log_loss')} | {display('brier_score')} | {display('accuracy')} | {display('roc_auc')} |")
    markdown.extend(["", "Alerts require human review; this report does not publish a model."])
    OUTPUT_MD.write_text("\n".join(markdown) + "\n", encoding="utf-8")
    print("\n".join(markdown))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
