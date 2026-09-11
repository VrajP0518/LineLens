import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from tempfile import TemporaryDirectory
from pathlib import Path
from scripts.refresh_nfl_current import build_payload, publication_reason, refresh
from src.nfl.pregame_policy import is_pregame_feature


class NFLCurrentTests(unittest.TestCase):
    def setUp(self):
        self.now = datetime(2026, 9, 10, 19, tzinfo=timezone.utc)
        self.schedule = [dict(game_id='2026_01_NE_SEA', season='2026', week='1', game_type='REG', gameday='2026-09-09', gametime='20:20', home_team='SEA', away_team='NE', home_score='13', away_score='10', spread_line='3'), dict(game_id='2026_01_SF_LA', season='2026', week='1', game_type='REG', gameday='2026-09-10', gametime='20:35', home_team='LA', away_team='SF', home_score='', away_score='', spread_line='3.5', location='Neutral')]

    def test_schedule_and_toronto_dates(self):
        games = build_payload(self.schedule, [], self.now)['games']
        self.assertEqual(games[0]['status'], 'Final')
        self.assertEqual(games[0]['game_date'], '2026-09-09')
        self.assertEqual(games[1]['game_time'], '2026-09-11T00:35:00Z')
        self.assertEqual(games[1]['game_date'], '2026-09-10')
        self.assertIsNone(games[1]['home_score'])
        self.assertEqual(games[1]['reference_home_spread'], -3.5)
        self.assertIsNone(games[1]['home_cover_probability'])

    def test_legacy_predictions_cannot_publish(self):
        row = dict(id='2026_01_SF_LA', prediction_mode='historical_backtest', model_home_cover=.8)
        payload = build_payload(self.schedule, [row], self.now)
        self.assertEqual(payload['metadata']['published_predictions'], 0)

    def test_postgame_features_are_rejected(self):
        for feature in ['home_weekly_pass_yards', 'away_weekly_sacks', 'home_score', 'away_cover_probability']:
            self.assertFalse(is_pregame_feature(feature), feature)
        for feature in ['home_weekly_pass_yards_l5', 'away_off_epa_l3', 'spread_line', 'home_team_rest']:
            self.assertTrue(is_pregame_feature(feature), feature)

    def test_prediction_must_predate_kickoff(self):
        kickoff = datetime(2026, 9, 11, 0, 35, tzinfo=timezone.utc)
        row = dict(prediction_mode='current', publication_status='published', home_cover_probability=.55, spread_line=3.5, generated_at='2026-09-10T18:00:00Z', feature_cutoff_at='2026-09-10T17:00:00Z', model_trained_at='2026-08-01T12:00:00Z', model_validation=dict(feature_policy_version=2, review_status='approved', features=['spread_line','home_pf_l5']))
        self.assertIsNone(publication_reason(row, kickoff))
        row['generated_at'] = '2026-09-11T01:00:00Z'
        self.assertIsNotNone(publication_reason(row, kickoff))

    def test_failed_refresh_preserves_cache_timestamp(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / 'nfl.json'
            import json
            initial = build_payload(self.schedule, [], self.now)
            output.write_text(json.dumps(initial), encoding='utf-8')
            with patch('scripts.refresh_nfl_current.urlopen', side_effect=TimeoutError):
                cached = refresh(self.now, output)
            self.assertEqual(cached['metadata']['generated_at'], initial['metadata']['generated_at'])
            self.assertEqual(cached['metadata']['source_status'], 'cached')
            self.assertEqual(cached['games'], initial['games'])

    def test_publication_metadata_and_identity(self):
        row = dict(id='2026_01_SF_LA', home='LA', away='SF', prediction_mode='current', publication_status='published', home_cover_probability=.55, spread_line=3.5, generated_at='2026-09-10T18:00:00Z', feature_cutoff_at='2026-09-10T17:00:00Z', model_trained_at='2026-08-01T12:00:00Z', model_validation=dict(feature_policy_version=2, review_status='approved', features=['spread_line','home_pf_l5']))
        self.assertEqual(build_payload(self.schedule, [row], self.now)['metadata']['published_predictions'], 1)
        row['home'] = 'SEA'
        self.assertEqual(build_payload(self.schedule, [row], self.now)['metadata']['published_predictions'], 0)
        row['home'] = 'LA'
        row['feature_cutoff_at'] = '2026-09-10T19:00:00Z'
        self.assertEqual(build_payload(self.schedule, [row], self.now)['metadata']['published_predictions'], 0)
        row['model_validation'] = 'invalid'
        self.assertEqual(build_payload(self.schedule, [row], self.now)['metadata']['published_predictions'], 0)


if __name__ == '__main__':
    unittest.main()
