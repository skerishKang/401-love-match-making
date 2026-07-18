// Local-only verification + seeding script for the Neon-backed repo.
// Usage: DATABASE_URL=... node scripts/seed-db.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set. Aborting.');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

// neon() executes exactly one statement per call. Send each CREATE as its own call.
const ddl = [
  `CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    nickname    TEXT NOT NULL,
    created_at  BIGINT NOT NULL,
    purposes    JSONB NOT NULL DEFAULT '[]'::jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS snapshots (
    user_id         TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    consented_at    BIGINT NOT NULL,
    scopes          JSONB NOT NULL DEFAULT '[]'::jsonb,
    moments         JSONB NOT NULL DEFAULT '[]'::jsonb,
    narratives      JSONB NOT NULL DEFAULT '[]'::jsonb,
    memory_keywords JSONB NOT NULL DEFAULT '[]'::jsonb
  )`,
  `CREATE TABLE IF NOT EXISTS fingerprints (
    user_id       TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    keywords      JSONB NOT NULL DEFAULT '[]'::jsonb,
    embedding     JSONB,
    tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
    generated_at  BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS matches (
    id          TEXT PRIMARY KEY,
    user_a      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     TEXT,
    reason      JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at  BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a)`,
  `CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b)`,
];

async function main() {
  for (const stmt of ddl) {
    await sql(stmt);
  }
  console.log(`✅ schema applied (${ddl.length} statements)`);

  const now = Date.now();
  await sql(
    `INSERT INTO users (id, nickname, created_at, purposes)
     VALUES ('demo-seed-1', '시드A', ${now}, '["연인"]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, purposes = EXCLUDED.purposes`,
  );
  await sql(
    `INSERT INTO users (id, nickname, created_at, purposes)
     VALUES ('demo-seed-2', '시드B', ${now}, '["연인"]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET nickname = EXCLUDED.nickname, purposes = EXCLUDED.purposes`,
  );
  console.log('✅ seeded 2 demo users');

  const rows = await sql`SELECT id, nickname, purposes FROM users ORDER BY created_at DESC LIMIT 5`;
  console.log('✅ read-back users:', JSON.stringify(rows));

  const count = await sql`SELECT count(*)::int AS c FROM users`;
  console.log(`✅ total users in DB: ${count[0].c}`);
  console.log('ALL OK');
}

main().catch((e) => {
  console.error('SEED FAILED:', e);
  process.exit(1);
});
