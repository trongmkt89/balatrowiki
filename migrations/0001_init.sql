-- Anonymous players: identified by a random id kept in the browser. No accounts.
CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'Player',
  profile TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- One in-progress run per player (cloud save).
CREATE TABLE IF NOT EXISTS saves (
  player_id TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL
);

-- Finished runs, used for the leaderboard and global stats.
CREATE TABLE IF NOT EXISTS runs (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  name TEXT NOT NULL,
  seed TEXT NOT NULL,
  deck TEXT NOT NULL,
  stake INTEGER NOT NULL,
  ante INTEGER NOT NULL,
  round INTEGER NOT NULL,
  best_hand INTEGER NOT NULL,
  won INTEGER NOT NULL,
  jokers TEXT NOT NULL,
  fav_hand TEXT,
  daily TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS runs_rank ON runs (ante DESC, best_hand DESC);
CREATE INDEX IF NOT EXISTS runs_best ON runs (best_hand DESC);
CREATE INDEX IF NOT EXISTS runs_daily ON runs (daily, ante DESC, best_hand DESC);
CREATE INDEX IF NOT EXISTS runs_player ON runs (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS runs_created ON runs (created_at DESC);
