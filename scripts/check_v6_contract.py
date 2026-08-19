"""Validate v6 desktop, schedule-state, color, box-score, and retraining contracts."""

from __future__ import annotations

import json
from pathlib import Path

from live_scores import espn_player_box_score, game_from_espn_event
import score_model_predictions as scoring


ROOT = Path(__file__).resolve().parents[1]


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def scheduled_espn_fixture() -> dict:
    competitor = lambda side, code, name, score: {  # noqa: E731 - compact fixture
        "homeAway": side,
        "score": score,
        "team": {"abbreviation": code, "displayName": name},
        "linescores": [{"value": 0}, {"value": 0}],
    }
    return {
        "id": "v6-scheduled-test",
        "date": "2099-08-19T23:07:00Z",
        "competitions": [
            {
                "id": "v6-scheduled-test",
                "date": "2099-08-19T23:07:00Z",
                "status": {
                    "period": 1,
                    "type": {"state": "pre", "shortDetail": "Top 1st", "completed": False},
                },
                "competitors": [
                    competitor("away", "SEA", "Seattle Mariners", 0),
                    competitor("home", "TOR", "Toronto Blue Jays", 0),
                ],
            }
        ],
    }


def main() -> int:
    config = json.loads((ROOT / "src-tauri" / "tauri.conf.json").read_text(encoding="utf-8"))
    window = config["app"]["windows"][0]
    require(config["version"] == "6.0.0", "Tauri semver must be 6.0.0")
    require(window["width"] >= 1480 and window["height"] >= 940, "default desktop window is not the larger v6 size")

    rust = (ROOT / "src-tauri" / "src" / "lib.rs").read_text(encoding="utf-8")
    require("CREATE_NO_WINDOW" in rust and "background_command" in rust, "Windows refresh process is not hidden")

    row = game_from_espn_event(scheduled_espn_fixture(), "MLB", {}, {}, {})
    require(row is not None, "scheduled ESPN fixture was not normalized")
    require(row["status"] == "Scheduled", "pregame ESPN state was promoted to live")
    require(row["status_detail"] == "Scheduled", "pregame inning-like detail was retained")
    require(row["inning"] is None, "pregame ESPN period leaked into an MLB inning")
    require(row["game_time"] == "2099-08-19T23:07:00Z", "first-pitch timestamp was not preserved")
    require(len(row["box_score"]["periods"]) == 2, "ESPN period scores were not normalized")

    player_box = espn_player_box_score({"boxscore": {"players": [{"team": {"abbreviation": "TOR"}, "statistics": [{"name": "batting", "labels": ["AB", "H"], "athletes": [{"athlete": {"id": "1", "displayName": "Test Player", "position": {"abbreviation": "CF"}}, "stats": ["4", "2"], "starter": True}]}]}]}})
    require(player_box["teams"][0]["groups"][0]["players"][0]["stats"]["H"] == "2", "ESPN player statistics were not normalized")

    logged = [{"sport": "MLB", "game_id": "stats-id", "game_date": "2099-08-19", "away": "SEA", "home": "TOR", "model_pick": "TOR"}]
    original_result_map = scoring.mlb_result_map
    scoring.mlb_result_map = lambda: {
        "fallback:2099-08-19:SEA:TOR": {"actual_winner": "TOR", "home_score": 5, "away_score": 2}
    }
    try:
        scored, pending = scoring.score_mlb_predictions(logged)
    finally:
        scoring.mlb_result_map = original_result_map
    require((scored, pending) == (1, 0) and logged[0]["model_result"] == "win", "record scorer did not use the date/team final-score fallback")

    app = (ROOT / "app.js").read_text(encoding="utf-8")
    css = (ROOT / "styles.css").read_text(encoding="utf-8")
    scorer = (ROOT / "scripts" / "score_model_predictions.py").read_text(encoding="utf-8")
    workflow = (ROOT / ".github" / "workflows" / "retrain-models.yml").read_text(encoding="utf-8")
    model_channel = (ROOT / ".github" / "workflows" / "publish-model-channel.yml").read_text(encoding="utf-8")
    shared_data_channel = (ROOT / ".github" / "workflows" / "publish-shared-data.yml").read_text(encoding="utf-8")
    shared_data_builder = (ROOT / "scripts" / "build_shared_data_bundle.py").read_text(encoding="utf-8")
    dpi_workflow = (ROOT / ".github" / "workflows" / "dpi-visual-audit.yml").read_text(encoding="utf-8")
    require('const APP_VERSION = "v6"' in app, "visible app version is not v6")
    require("renderGameCastBoxScore" in app and "gamecast-box-score" in css, "box-score UI contract is missing")
    require("renderGameCastPlayerStats" in app and "player_box_score" in (ROOT / "scripts" / "live_scores.py").read_text(encoding="utf-8"), "player box-score contract is missing")
    require("renderUnderdogs" in app and 'data-view="underdogs"' in (ROOT / "index.html").read_text(encoding="utf-8"), "underdog view contract is missing")
    require("--pick-color" in app and "var(--pick-color)" in css, "prediction team-color contract is missing")
    require("LIVE_SCORE_FILES" in scorer and "fallback:" in scorer, "record scoring does not join refreshed finals")
    require("schedule:" in workflow and "create-pull-request" in workflow, "managed retraining workflow is incomplete")
    require("actions/attest@v4" in workflow and "model_drift_alerts" in workflow, "retraining drift/provenance contract is missing")
    require("model-channel-v6" in model_channel and "actions/attest@v4" in model_channel, "approved model channel is missing")
    require("sync_shared_data" in rust and "data-channel-v6" in rust, "native shared-data updater is missing")
    require("sharedDataStatus" in app and "data-sync-shared-data" in app, "shared-data client UI is missing")
    require(
        all(name in shared_data_channel for name in ("ODDS_API_KEY", "SHARP_ODDS_API_KEY", "PROPLINE_API_KEY"))
        and "actions/attest@v4" in shared_data_channel,
        "shared-data workflow is not wired to secrets and provenance",
    )
    require("SECRET_NAMES" in shared_data_builder and "contains_api_keys" in shared_data_builder, "shared-data secret leak guard is missing")
    require("1.25" in (ROOT / "scripts" / "windows_dpi_audit.ps1").read_text(encoding="utf-8") and "windows-latest" in dpi_workflow, "Windows DPI audit contract is missing")

    print("PASS: LineLens v6 desktop, schedule, color, record, box-score, and retraining contracts")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
