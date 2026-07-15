window.__MLB_PLAYER_GAMES_REFRESH__ = {
  "metadata": {
    "sport": "MLB",
    "generated_at": "2026-07-15T16:23:41Z",
    "status": "success",
    "real_data": true,
    "source": "pybaseball Statcast",
    "source_url": "https://pypi.org/project/pybaseball/2.0.0/",
    "storage": "local parquet chunks and normalized player-game parquet",
    "targets": [
      "pitcher_strikeouts",
      "batter_hits",
      "batter_total_bases"
    ],
    "note": "Pitch-level Statcast rows are aggregated only after real terminal events. Unresolved player IDs are excluded rather than named by inference."
  },
  "row_count": 4640,
  "source_chunks": [
    {
      "path": "data\\raw\\mlb\\statcast_chunks\\statcast_20260701_20260707.parquet",
      "start_date": "2026-07-01",
      "end_date": "2026-07-07",
      "status": "cached",
      "rows": 25000
    },
    {
      "path": "data\\raw\\mlb\\statcast_chunks\\statcast_20260708_20260714.parquet",
      "start_date": "2026-07-08",
      "end_date": "2026-07-14",
      "status": "cached",
      "rows": 21151
    },
    {
      "path": "data\\raw\\mlb\\statcast_chunks\\statcast_20260715_20260715.parquet",
      "start_date": "2026-07-15",
      "end_date": "2026-07-15",
      "status": "cached",
      "rows": 0
    }
  ],
  "output": "data\\raw\\mlb\\player_game_pybaseball.parquet"
};
