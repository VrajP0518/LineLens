"""Lightweight Sprint 4 contracts for cross-sport model surfaces."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load(relative: str) -> dict:
    path = ROOT / relative
    if not path.exists():
        raise AssertionError(f"missing required export: {relative}")
    return json.loads(path.read_text(encoding="utf-8"))


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)
    print(f"PASS: {message}")


def iso(value: object) -> datetime | None:
    text = str(value or "").replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(text)
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


def prediction_probability(row: dict) -> float | None:
    pick = row.get("model_pick")
    home = row.get("home")
    value = row.get("home_win_probability")
    if value is None:
        return None
    probability = float(value)
    return probability if pick == home else 1 - probability


def main() -> int:
    mlb = load("data/predictions/mlb_predictions.json")
    wnba = load("data/predictions/wnba_predictions.json")
    mlb_backtest = load("data/predictions/mlb_backtest_predictions.json")
    wnba_backtest = load("data/predictions/wnba_backtest_predictions.json")
    registry = load("data/models/model_registry.json")
    record = load("data/tracking/model_record.json")
    log = load("data/tracking/model_predictions_log.json")

    for sport, payload in (("MLB", mlb), ("WNBA", wnba)):
        games = payload.get("games") or []
        check(payload.get("metadata", {}).get("sport") == sport, f"{sport} prediction metadata sport")
        check(all(row.get("sport") == sport for row in games), f"{sport} prediction rows stay sport-scoped")
        check(all(iso(row.get("game_date")) is not None for row in games), f"{sport} prediction dates are parseable")
        check(all(row.get("model_pick") for row in games), f"{sport} model picks are declared")
        check(all(prediction_probability(row) is None or 0 <= prediction_probability(row) <= 1 for row in games), f"{sport} probabilities stay within 0..1")
        generated = iso(payload.get("metadata", {}).get("generated_at"))
        check(generated is not None, f"{sport} export timestamp is present for stale detection")

    check(mlb.get("metadata", {}).get("prediction_mode") != "historical_backtest", "MLB current export is not labeled backtest")
    check(wnba.get("metadata", {}).get("prediction_mode") != "historical_backtest", "WNBA current export is not labeled backtest")
    check(mlb_backtest.get("metadata", {}).get("prediction_mode") == "historical_backtest", "MLB backtest remains separated")
    check(wnba_backtest.get("metadata", {}).get("prediction_mode") == "historical_backtest", "WNBA backtest remains separated")

    selected = [row for row in registry.get("models", []) if row.get("selected")]
    for sport in ("MLB", "WNBA"):
        rows = [row for row in selected if row.get("sport") == sport]
        check(len(rows) == 1, f"{sport} has exactly one selected registry model")
        payload = mlb if sport == "MLB" else wnba
        check(rows[0].get("model_name") in {payload.get("metadata", {}).get("model_name"), payload.get("metadata", {}).get("model_type")}, f"{sport} registry and current export agree")

    current_keys = [(row.get("sport"), row.get("game_id"), row.get("game_date")) for row in mlb.get("games", []) + wnba.get("games", [])]
    check(len(current_keys) == len(set(current_keys)), "current MLB/WNBA exports contain no duplicate games")
    log_rows = log.get("predictions", [])
    log_keys = [(row.get("sport"), row.get("game_id"), row.get("model_id"), row.get("generated_at")) for row in log_rows]
    check(len(log_keys) == len(set(log_keys)), "prediction log contains no duplicate scoring snapshots")
    check(set((record.get("sports") or {}).keys()).issuperset({"MLB", "WNBA"}), "MLB and WNBA records remain separate")
    check("Cross-sport comparison warning" in (ROOT / "app.js").read_text(encoding="utf-8"), "cross-sport metric labeling is present in the UI")
    check("Insufficient sample" in (ROOT / "app.js").read_text(encoding="utf-8"), "model health sample-size rule is present")
    check((ROOT / "data/reports/wnba_feature_summary.json").exists(), "WNBA feature summary is bundled")
    check((ROOT / "data/reports/mlb_feature_summary.json").exists(), "MLB feature summary is bundled")
    app_source = (ROOT / "app.js").read_text(encoding="utf-8")
    index_source = (ROOT / "index.html").read_text(encoding="utf-8")
    check('id="view-about"' in index_source, "About page is a bundled top-level view")
    check("Vraj Patel" in app_source and "github.com/VrajP0518/LineLens" in app_source, "creator and project links are present")
    check("Predictions and records use real available data" in app_source, "About transparency copy is present")
    check("Pokémon names are used only as informal model codenames" in app_source, "model codename trademark clarification is present")
    print("Sprint 4 contract PASS")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (AssertionError, json.JSONDecodeError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
