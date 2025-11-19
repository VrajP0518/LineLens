"""Export model predictions to a JSON payload for the static web UI."""

from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

import joblib
import numpy as np
import pandas as pd

COLUMN_ALIASES: Dict[str, Tuple[str, ...]] = {
    "home_team": ("home_team_x", "home_team_y"),
    "away_team": ("away_team_x", "away_team_y"),
    "home_team_moneyline": ("home_moneyline",),
    "away_team_moneyline": ("away_moneyline",),
}

TREND_FIELDS = {
    "Win %": ("home_win_pct_l5", "away_win_pct_l5"),
    "Point diff": ("home_point_diff_l5", "away_point_diff_l5"),
    "Off EPA": ("home_off_epa_l5", "away_off_epa_l5"),
    "Def EPA": ("home_def_epa_l5", "away_def_epa_l5"),
    "Pass rate": ("home_pass_rate_l5", "away_pass_rate_l5"),
}

BASIC_EXPORT_COLS = {
    "season",
    "week",
    "game_id",
    "home_score",
    "away_score",
    "spread_line",
    "cover_margin",
    "home_cover",
    "home_team_moneyline",
    "away_team_moneyline",
}


def _harmonize_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map: Dict[str, str] = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        if canonical in df.columns:
            continue
        for alias in aliases:
            if alias in df.columns:
                rename_map[alias] = canonical
                break
    if rename_map:
        df = df.rename(columns=rename_map)
    return df


def _safe_float(value) -> float | None:
    if value is None:
        return None
    if isinstance(value, (float, int)):
        if isinstance(value, float) and np.isnan(value):
            return None
        return float(value)
    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None
    return numeric


def _format_result(row: pd.Series) -> str:
    margin = _safe_float(row.get("cover_margin"))
    if margin is None:
        return "Pending"
    if margin > 0:
        return "Home covered"
    if margin < 0:
        return "Home failed"
    return "Push"


def _build_trend(row: pd.Series) -> Dict[str, List[float | None]]:
    labels: List[str] = []
    home_vals: List[float | None] = []
    away_vals: List[float | None] = []
    for label, (home_field, away_field) in TREND_FIELDS.items():
        labels.append(label)
        home_vals.append(_safe_float(row.get(home_field)))
        away_vals.append(_safe_float(row.get(away_field)))
    return {"labels": labels, "home": home_vals, "away": away_vals}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--features-file", type=Path, required=True)
    parser.add_argument("--model-file", type=Path, required=True)
    parser.add_argument("--output-file", type=Path, required=True)
    parser.add_argument(
        "--js-out",
        type=Path,
        default=None,
        help="Optional path for writing a JS payload (window.__PREDICTIONS__). Defaults to output-file with .js.",
    )
    parser.add_argument("--season", type=int, nargs="?", help="Filter to a single season")
    parser.add_argument("--week", type=int, nargs="?", help="Filter to a single week in the selected season")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit of rows to export (applied after filtering and sorting)",
    )
    return parser.parse_args()


def ensure_columns(df: pd.DataFrame, columns: Iterable[str]) -> None:
    missing = [col for col in columns if col not in df.columns]
    if missing:
        raise ValueError(f"Feature file is missing required columns: {missing[:8]}")


def main() -> None:
    args = parse_args()
    df = pd.read_parquet(args.features_file)
    df = _harmonize_columns(df)

    artifact: Dict[str, object] = joblib.load(args.model_file)
    model = artifact["model"]
    feature_cols: Tuple[str, ...] = tuple(artifact["features"])

    ensure_columns(df, feature_cols)
    ensure_columns(df, BASIC_EXPORT_COLS | {"home_team", "away_team"})

    if args.season is not None:
        df = df[df["season"] == args.season]
    if args.week is not None:
        df = df[df["week"] == args.week]

    df = df.sort_values(["season", "week", "game_id"]).reset_index(drop=True)

    feature_frame = df[list(feature_cols)].astype(float)
    probabilities = model.predict_proba(feature_frame)[:, 1]
    df["model_home_cover"] = probabilities

    if args.limit:
        df = df.head(args.limit)

    export_rows = []
    for row in df.itertuples(index=False):
        row_dict = row._asdict()
        record = {
            "id": f"{row_dict['season']}_{row_dict['week']:02d}_{row_dict['away_team']}_{row_dict['home_team']}",
            "season": int(row_dict["season"]),
            "week": int(row_dict["week"]),
            "home": row_dict["home_team"],
            "away": row_dict["away_team"],
            "home_score": _safe_float(row_dict.get("home_score")),
            "away_score": _safe_float(row_dict.get("away_score")),
            "spread_line": _safe_float(row_dict.get("spread_line")),
            "total_line": _safe_float(row_dict.get("total_line")),
            "home_moneyline": _safe_float(row_dict.get("home_team_moneyline")),
            "away_moneyline": _safe_float(row_dict.get("away_team_moneyline")),
            "model_home_cover": _safe_float(row_dict.get("model_home_cover")),
            "home_cover": int(row_dict.get("home_cover")) if row_dict.get("home_cover") in (0, 1) else None,
            "cover_margin": _safe_float(row_dict.get("cover_margin")),
            "trend": _build_trend(pd.Series(row_dict)),
        }
        export_rows.append(record)

    out_path = args.output_file
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "meta": {
            "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "features_file": str(args.features_file),
            "model_file": str(args.model_file),
            "row_count": len(export_rows),
        },
        "games": export_rows,
    }
    out_path.write_text(json.dumps(payload, indent=2))
    js_out_path: Path | None = None
    if args.js_out is not None:
        js_out_path = args.js_out if args.js_out.is_absolute() else out_path.parent / args.js_out
    elif out_path.suffix == ".json":
        js_out_path = out_path.with_suffix(".js")

    if js_out_path is not None:
        js_out_path.parent.mkdir(parents=True, exist_ok=True)
        js_out_path.write_text(
            "window.__PREDICTIONS__ = " + json.dumps(payload, separators=(",", ":")) + ";\n"
        )
        print(f"Wrote JS payload -> {js_out_path}")

    print(f"Wrote {len(export_rows)} rows to {out_path}")


if __name__ == "__main__":
    main()
