"""Offline regression coverage for the shared-data publication path.

Run with: python -m unittest discover -s tests/mlb -p 'test_*.py'
Requires pandas, numpy, joblib, typer, and rich (also in requirements.txt).
"""

import copy
import io
import json
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import joblib
import numpy as np
import pandas as pd
from typer.testing import CliRunner

from scripts import check_data_integrity as integrity
from src.mlb import export_predictions_mlb as exporter


class FixtureModel:
    def predict_proba(self, frame):
        if frame.empty:
            raise AssertionError("An empty slate must not invoke inference")
        return np.tile([0.4, 0.6], (len(frame), 1))


class MLBExportTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.features = self.root / "features.csv"
        self.model = self.root / "model.joblib"
        self.output = self.root / "mlb_predictions.json"
        self.js = self.root / "mlb_predictions.js"
        self.artifact = {
            "model": FixtureModel(),
            "features": ["elo_home_win_probability"],
            "metadata": {
                "model_name": "EloBlend",
                "model_id": "mlb-fixture-production",
                "version": "model-v5",
            },
        }
        self.row = {
            "game_id": "123", "game_date": "2026-10-29", "season": 2026,
            "home_team": "TOR", "away_team": "SEA", "status": "Scheduled",
            "home_score": None, "away_score": None, "home_win": None,
            "elo_home_win_probability": 0.6,
        }

    def export_rows(self, rows, season=2026):
        pd.DataFrame(rows, columns=list(self.row)).to_csv(self.features, index=False)
        joblib.dump(self.artifact, self.model)
        with patch.object(exporter, "ensure_project_dirs"), patch.object(
            exporter, "_append_prediction_log"
        ) as append_log:
            exporter.export(
                features_file=self.features, model_file=self.model,
                output_file=self.output, js_out=self.js, season=season,
                limit=None, write_empty_if_missing=False,
            )
        payload = json.loads(self.output.read_text(encoding="utf-8"))
        js_payload = self.js.read_text(encoding="utf-8").removeprefix(
            "window.__MLB_PREDICTIONS__ = "
        ).strip().removesuffix(";")
        self.assertEqual(json.loads(js_payload), payload)
        return payload, append_log

    def assert_model_identity(self, payload):
        meta = payload["metadata"]
        for key in ("model_name", "model_id", "version"):
            self.assertEqual(meta[key], self.artifact["metadata"][key])
        self.assertEqual(meta["model_type"], self.artifact["metadata"]["model_name"])
        self.assertTrue(meta["real_data"])
        self.assertEqual(meta["mode"], "real")
        self.assertEqual(meta["prediction_mode"], "model")
        self.assertEqual(meta["row_count"], len(payload["games"]))

    def test_empty_offseason_slate_preserves_identity_without_inference_or_log_writes(self):
        payload, append_log = self.export_rows([])
        self.assert_model_identity(payload)
        self.assertEqual(payload["games"], [])
        self.assertEqual(payload["metadata"]["export_status"], "no_matching_games")
        append_log.assert_not_called()

    def test_season_filter_to_empty_uses_the_same_metadata_as_populated_export(self):
        populated, append_log = self.export_rows([self.row])
        self.assert_model_identity(populated)
        self.assertEqual(populated["games"][0]["home_win_probability"], 0.6)
        self.assertEqual(populated["metadata"]["export_status"], "ready")
        append_log.assert_called_once()
        empty, append_log = self.export_rows([self.row], season=2027)
        self.assert_model_identity(empty)
        self.assertEqual(empty["games"], [])
        append_log.assert_not_called()

    def test_empty_export_uses_artifact_name_fallback_not_hardcoded_registry_name(self):
        self.artifact["model_name"] = "GradientBoostingClassifier"
        del self.artifact["metadata"]["model_name"]
        payload, _ = self.export_rows([])
        self.assertEqual(payload["metadata"]["model_type"], "GradientBoostingClassifier")
        self.assertEqual(payload["metadata"]["model_name"], "GradientBoostingClassifier")

    def test_workflow_cli_accepts_header_only_features(self):
        pd.DataFrame(columns=list(self.row)).to_csv(self.features, index=False)
        joblib.dump(self.artifact, self.model)
        with patch.object(exporter, "ensure_project_dirs"):
            result = CliRunner().invoke(exporter.app, [
                "export", "--features-file", str(self.features),
                "--model-file", str(self.model), "--output-file", str(self.output),
                "--js-out", str(self.js), "--season", "2026", "--no-write-empty-if-missing",
            ])
        self.assertEqual(result.exit_code, 0, result.output)
        self.assert_model_identity(json.loads(self.output.read_text(encoding="utf-8")))

    def test_missing_inputs_remain_errors_for_the_publication_command(self):
        with patch.object(exporter, "ensure_project_dirs"):
            result = CliRunner().invoke(exporter.app, [
                "export", "--features-file", str(self.features),
                "--model-file", str(self.model), "--output-file", str(self.output),
                "--js-out", str(self.js), "--no-write-empty-if-missing",
            ])
        self.assertNotEqual(result.exit_code, 0)
        self.assertFalse(self.output.exists())
        self.assertFalse(self.js.exists())

    def test_corrupt_artifact_cannot_be_disguised_by_empty_slate(self):
        pd.DataFrame(columns=list(self.row)).to_csv(self.features, index=False)
        self.model.write_bytes(b"not a model")
        self.output.write_text("previous export", encoding="utf-8")
        with patch.object(exporter, "ensure_project_dirs"), self.assertRaises(Exception):
            exporter.export(
                features_file=self.features, model_file=self.model,
                output_file=self.output, js_out=self.js, season=2026,
                limit=None, write_empty_if_missing=False,
            )
        self.assertEqual(self.output.read_text(encoding="utf-8"), "previous export")

    def test_full_integrity_check_accepts_empty_export_but_still_rejects_mismatches(self):
        # Exercise every publication invariant against the bundled fixtures,
        # replacing only the predictions produced by the real export command.
        registry = integrity.load("data/models/model_registry.json")
        selected = next(row for row in registry["models"] if row.get("sport") == "MLB" and row.get("selected"))
        self.artifact["metadata"] = {key: selected[key] for key in ("model_name", "model_id", "version")}
        payload, _ = self.export_rows([])
        original_load = integrity.load

        def load_fixture(relative):
            return payload if relative == "data/predictions/mlb_predictions.json" else original_load(relative)

        with patch.object(integrity, "load", side_effect=load_fixture), redirect_stdout(io.StringIO()):
            integrity.check_exports()
            for key, label in (("model_type", "registry/prediction agreement"),
                               ("model_id", "production model identity"),
                               ("version", "production model version")):
                original = payload["metadata"][key]
                payload["metadata"][key] = "wrong-model"
                with self.subTest(key=key), self.assertRaisesRegex(integrity.IntegrityError, label):
                    integrity.check_exports()
                payload["metadata"][key] = original

    def test_calendar_guard_rejects_unmarked_missing_and_malformed_empty_exports(self):
        payload, _ = self.export_rows([])
        with redirect_stdout(io.StringIO()):
            integrity.check_prediction_calendar(payload)
            for key, value in (("export_status", None), ("real_data", False),
                               ("row_count", 1), ("mode", "missing"),
                               ("prediction_mode", "schedule_only"), ("model_id", None)):
                broken = copy.deepcopy(payload)
                broken["metadata"][key] = value
                with self.subTest(key=key), self.assertRaises(integrity.IntegrityError):
                    integrity.check_prediction_calendar(broken)
            for games in (None, {}, [{"game_id": "missing-date"}]):
                broken = {**payload, "games": games}
                with self.subTest(games=games), self.assertRaises(integrity.IntegrityError):
                    integrity.check_prediction_calendar(broken)


if __name__ == "__main__":
    unittest.main()
