"""Summarize LineLens local data readiness without downloading live data."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        return {"_error": f"Invalid JSON: {exc}"}


def mode_for_prediction(path: Path) -> dict[str, Any]:
    payload = load_json(path)
    meta = payload.get("metadata") or payload.get("meta") or {}
    games = payload.get("games") or []
    if payload.get("_error"):
        status = "failed"
    elif not payload:
        status = "missing"
    elif meta.get("real_data") is True and games:
        status = "real_cached"
    elif meta.get("prediction_mode") == "schedule_only":
        status = "schedule_only"
    elif meta.get("real_data") is False:
        status = "missing"
    else:
        status = "missing"
    return {
        "path": str(path.relative_to(ROOT)),
        "status": status,
        "games": len(games),
        "prediction_mode": meta.get("prediction_mode"),
        "model_type": meta.get("model_type"),
        "reason": meta.get("reason"),
        "error": payload.get("_error"),
    }


def main() -> int:
    bootstrap = load_json(DATA_DIR / "bootstrap_status.json")
    startup = load_json(DATA_DIR / "startup_status.json")
    refresh = load_json(DATA_DIR / "refresh_status.json")
    report = load_json(DATA_DIR / "reports" / "model_report.json")
    comparison = load_json(DATA_DIR / "reports" / "mlb_model_comparison.json")
    moltres_card = load_json(DATA_DIR / "reports" / "mlb_moltres_model_card.json")
    feature_summary = load_json(DATA_DIR / "reports" / "mlb_feature_summary.json")
    wnba_comparison = load_json(DATA_DIR / "reports" / "wnba_model_comparison.json")
    wnba_card = load_json(DATA_DIR / "reports" / "wnba_model_card.json")
    wnba_feature_summary = load_json(DATA_DIR / "reports" / "wnba_feature_summary.json")
    registry = load_json(DATA_DIR / "models" / "model_registry.json")
    prediction_log = load_json(DATA_DIR / "tracking" / "model_predictions_log.json")
    model_record = load_json(DATA_DIR / "tracking" / "model_record.json")
    odds = load_json(DATA_DIR / "odds" / "odds_snapshots.json")
    player_props = load_json(DATA_DIR / "odds" / "player_props.json")
    odds_health = load_json(DATA_DIR / "odds" / "odds_health.json")
    prop_predictions = load_json(DATA_DIR / "predictions" / "wnba_prop_predictions.json")
    mlb_prop_predictions = load_json(DATA_DIR / "predictions" / "mlb_prop_predictions.json")
    prop_diagnostics = load_json(DATA_DIR / "odds" / "props_matching_diagnostics.json")
    wnba_availability = load_json(DATA_DIR / "odds" / "wnba_availability.json")
    prop_record = load_json(DATA_DIR / "tracking" / "prop_record.json")
    selected_models = [row for row in registry.get("models", []) if row.get("selected")]
    selected_model_name = (comparison.get("metadata") or {}).get("selected_model")
    registry_selected_name = selected_models[0].get("model_name") if selected_models else None
    moltres_status = "missing"
    if moltres_card and not moltres_card.get("_error"):
        moltres_status = "selected" if registry_selected_name == "Moltres" else "challenger"
    log_rows = prediction_log.get("predictions", [])
    scored_rows = [
        row
        for row in log_rows
        if str(row.get("model_result", "")).lower() in {"win", "loss", "push"}
    ]
    summary = {
        "bootstrap": {
            "status": bootstrap.get("status", "missing"),
            "python_version": bootstrap.get("python_version"),
            "mlb_ready": bootstrap.get("mlb_ready"),
            "nfl_ready": bootstrap.get("nfl_ready"),
            "nfl_error": bootstrap.get("nfl_error"),
        },
        "startup": {
            "status": startup.get("status", "missing"),
            "mlb_ready": startup.get("mlb_ready"),
            "nfl_ready": startup.get("nfl_ready"),
            "error": startup.get("error"),
        },
        "refresh": refresh.get("sports", {}),
        "predictions": {
            "NFL": mode_for_prediction(DATA_DIR / "predictions" / "nfl_predictions.json"),
            "MLB": mode_for_prediction(DATA_DIR / "predictions" / "mlb_predictions.json"),
            "MLB_BACKTEST": mode_for_prediction(DATA_DIR / "predictions" / "mlb_backtest_predictions.json"),
            "WNBA": mode_for_prediction(DATA_DIR / "predictions" / "wnba_predictions.json"),
            "WNBA_BACKTEST": mode_for_prediction(DATA_DIR / "predictions" / "wnba_backtest_predictions.json"),
        },
        "reports": {
            "status": "real_cached" if report and not report.get("_error") else "missing",
            "generated_at": (report.get("metadata") or {}).get("generated_at") if report else None,
            "error": report.get("_error"),
            "mlb_model_comparison": {
                "status": "real_cached" if comparison and not comparison.get("_error") else "missing",
                "selected_model": (comparison.get("metadata") or {}).get("selected_model"),
                "model_count": len(comparison.get("models", [])),
                "error": comparison.get("_error"),
            },
            "moltres": {
                "status": moltres_status,
                "model_id": (moltres_card.get("metadata") or {}).get("model_id") if moltres_card else None,
                "registry_selected": registry_selected_name == "Moltres",
                "comparison_selected": selected_model_name == "Moltres",
                "selection_consistent": selected_model_name == registry_selected_name if selected_model_name and registry_selected_name else None,
                "error": moltres_card.get("_error") if moltres_card else None,
            },
            "mlb_feature_summary": {
                "status": "real_cached" if feature_summary and not feature_summary.get("_error") else "missing",
                "rows": feature_summary.get("rows", feature_summary.get("row_count")),
                "feature_count": feature_summary.get("feature_count"),
                "features_used": len(feature_summary.get("features_used_by_model", [])),
                "error": feature_summary.get("_error"),
            },
            "wnba_model_comparison": {
                "status": "real_cached" if wnba_comparison and not wnba_comparison.get("_error") else "missing",
                "selected_model": wnba_comparison.get("selected_model") or (wnba_comparison.get("metadata") or {}).get("selected_model"),
                "model_count": len(wnba_comparison.get("models", [])),
                "error": wnba_comparison.get("_error"),
            },
            "wnba_model_card": {
                "status": "real_cached" if wnba_card and not wnba_card.get("_error") else "missing",
                "model_name": (wnba_card.get("model") or {}).get("model_name"),
                "error": wnba_card.get("_error"),
            },
            "wnba_feature_summary": {
                "status": "real_cached" if wnba_feature_summary and not wnba_feature_summary.get("_error") else "missing",
                "rows": (wnba_feature_summary.get("metadata") or {}).get("row_count"),
                "data_quality": (wnba_feature_summary.get("metadata") or {}).get("data_quality"),
                "error": wnba_feature_summary.get("_error"),
            },
        },
        "model_registry": {
            "status": "real_cached" if registry and not registry.get("_error") else "missing",
            "model_count": len(registry.get("models", [])),
            "selected": selected_models[:1],
            "error": registry.get("_error"),
        },
        "model_tracking": {
            "prediction_log": {
                "status": "real_cached" if prediction_log and not prediction_log.get("_error") else "missing",
                "rows": len(log_rows),
                "scored": len(scored_rows),
                "pending": sum(1 for row in log_rows if str(row.get("model_result", "")).lower() == "pending"),
                "error": prediction_log.get("_error"),
            },
            "record": {
                "status": "real_cached" if model_record and not model_record.get("_error") else "missing",
                "generated_at": (model_record.get("metadata") or {}).get("generated_at"),
                "mlb_overall": ((model_record.get("sports") or {}).get("MLB") or {}).get("overall"),
                "nfl_overall": ((model_record.get("sports") or {}).get("NFL") or {}).get("overall"),
                "error": model_record.get("_error"),
            },
        },
        "odds": {
            "status": (odds.get("metadata") or {}).get("source_status", "missing") if odds else "missing",
            "provider": (odds.get("metadata") or {}).get("provider") if odds else None,
            "snapshot_count": (odds.get("metadata") or {}).get("snapshot_count", 0) if odds else 0,
            "new_snapshot_count": (odds.get("metadata") or {}).get("new_snapshot_count", 0) if odds else 0,
            "error": odds.get("_error"),
        },
        "player_props": {
            "status": (player_props.get("metadata") or {}).get("status", "missing"),
            "markets": len(player_props.get("markets", [])),
            "sports": (player_props.get("metadata") or {}).get("sports", ["WNBA"]),
            "predictions": {"WNBA": len(prop_predictions.get("predictions", [])), "MLB": len(mlb_prop_predictions.get("predictions", []))},
            "candidates": {"WNBA": len(prop_predictions.get("candidate_predictions", [])), "MLB": len(mlb_prop_predictions.get("candidate_predictions", []))},
            "diagnostics": {sport: {"events_received": value.get("events_received"), "events_matched": value.get("events_matched"), "markets_normalized": value.get("markets_normalized"), "market_rows_available": value.get("market_rows_available")} for sport, value in (prop_diagnostics.get("sports") or {}).items()},
            "record_scored": (prop_record.get("overall") or {}).get("scored", 0),
            "quota_remaining": (odds_health.get("metadata") or {}).get("quota", {}).get("x-requests-remaining"),
            "wnba_availability": {"status": (wnba_availability.get("metadata") or {}).get("status", "missing"), "rows": len(wnba_availability.get("players", [])), "report_url": (wnba_availability.get("metadata") or {}).get("report_url")},
        },
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
