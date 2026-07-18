-- 401 Love Match Making — Neon Postgres schema
-- Run with: psql "$DATABASE_URL" -f db/schema.sql
-- or via the seed script scripts/seed-db.mjs (which runs this in-memory).

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  nickname    TEXT NOT NULL,
  created_at  BIGINT NOT NULL,
  purposes    JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS snapshots (
  user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  consented_at    BIGINT NOT NULL,
  scopes          JSONB NOT NULL DEFAULT '[]'::jsonb,
  moments         JSONB NOT NULL DEFAULT '[]'::jsonb,
  narratives      JSONB NOT NULL DEFAULT '[]'::jsonb,
  memory_keywords JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS fingerprints (
  user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  keywords      JSONB NOT NULL DEFAULT '[]'::jsonb,
  embedding     JSONB,
  tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at  BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id          TEXT PRIMARY KEY,
  user_a      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose     TEXT,
  reason      JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b);
