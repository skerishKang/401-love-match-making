import { getDb } from "./db";
import {
  User,
  LoveBudSnapshot,
  EmotionalFingerprint,
  Match,
  RelationPurpose,
  ConsentScope,
} from "./types";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ---------- Users ----------
export function createUser(nickname: string, purposes: RelationPurpose[]): User {
  const db = getDb();
  const id = uid("u");
  const createdAt = Date.now();
  db.prepare(
    `INSERT INTO users (id, nickname, created_at, purposes) VALUES (?, ?, ?, ?)`
  ).run(id, nickname, createdAt, JSON.stringify(purposes));
  return { id, nickname, createdAt, purposes };
}

export function getUser(id: string): User | null {
  const row = getDb().prepare(`SELECT * FROM users WHERE id = ?`).get(id) as any;
  if (!row) return null;
  return { ...row, purposes: JSON.parse(row.purposes) };
}

export function listUsers(): User[] {
  const rows = getDb().prepare(`SELECT * FROM users ORDER BY created_at`).all() as any[];
  return rows.map((r) => ({ ...r, purposes: JSON.parse(r.purposes) }));
}

// ---------- Snapshots (LoveBud consent-scoped) ----------
export function saveSnapshot(s: LoveBudSnapshot): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO snapshots
       (user_id, consented_at, scopes, moments, narratives, memory_keywords)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      s.userId,
      s.consentedAt,
      JSON.stringify(s.scopes),
      JSON.stringify(s.moments),
      JSON.stringify(s.narratives),
      JSON.stringify(s.memoryKeywords)
    );
}

export function getSnapshot(userId: string): LoveBudSnapshot | null {
  const row = getDb().prepare(`SELECT * FROM snapshots WHERE user_id = ?`).get(userId) as any;
  if (!row) return null;
  return {
    userId: row.user_id,
    consentedAt: row.consented_at,
    scopes: JSON.parse(row.scopes),
    moments: JSON.parse(row.moments),
    narratives: JSON.parse(row.narratives),
    memoryKeywords: JSON.parse(row.memory_keywords),
  };
}

// ---------- Fingerprints ----------
export function saveFingerprint(f: EmotionalFingerprint): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO fingerprints
       (user_id, keywords, embedding, tags, generated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      f.userId,
      JSON.stringify(f.keywords),
      JSON.stringify(f.embedding),
      JSON.stringify(f.tags),
      f.generatedAt
    );
}

export function getFingerprint(userId: string): EmotionalFingerprint | null {
  const row = getDb().prepare(`SELECT * FROM fingerprints WHERE user_id = ?`).get(userId) as any;
  if (!row) return null;
  return {
    userId: row.user_id,
    keywords: JSON.parse(row.keywords),
    embedding: JSON.parse(row.embedding),
    tags: JSON.parse(row.tags),
    generatedAt: row.generated_at,
  };
}

export function listFingerprints(): EmotionalFingerprint[] {
  const rows = getDb().prepare(`SELECT * FROM fingerprints`).all() as any[];
  return rows.map((r) => ({
    userId: r.user_id,
    keywords: JSON.parse(r.keywords),
    embedding: JSON.parse(r.embedding),
    tags: JSON.parse(r.tags),
    generatedAt: r.generated_at,
  }));
}

// ---------- Matches ----------
export function saveMatch(m: Match): void {
  getDb()
    .prepare(
      `INSERT OR REPLACE INTO matches
       (id, user_a, user_b, purpose, reason, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(m.id, m.userA, m.userB, m.purpose, JSON.stringify(m.reason), m.createdAt);
}

export function listMatchesForUser(userId: string): Match[] {
  const rows = getDb()
    .prepare(`SELECT * FROM matches WHERE user_a = ? OR user_b = ? ORDER BY created_at DESC`)
    .all(userId) as any[];
  return rows.map((r) => ({ ...r, reason: JSON.parse(r.reason) }));
}
