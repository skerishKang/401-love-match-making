// Data repository.
//
// Production (Cloudflare Pages / Neon): reads process.env.DATABASE_URL and
// persists to Neon Postgres via @neondatabase/serverless (HTTP, edge-safe).
//
// Local / missing-DATABASE_URL fallback: in-memory Map store so `next dev`
// and tests run with no database. Swap is transparent — same function
// signatures, which are the stable contract used by the API routes.

import { neon } from "@neondatabase/serverless";
import {
  User,
  LoveBudSnapshot,
  EmotionalFingerprint,
  Match,
  RelationPurpose,
  ConsentScope,
} from "./types";
import { DEMO_USERS, DEMO_SNAPSHOTS, DEMO_FINGERPRINTS } from "./demo-data";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ---- Neon connection (lazy) ----
const DATABASE_URL = process.env.DATABASE_URL;
const sql = DATABASE_URL ? neon(DATABASE_URL) : null;

// ---- in-memory fallback stores ----
const memUsers = new Map<string, User>(DEMO_USERS.map((u) => [u.id, u]));
const memSnapshots = new Map<string, LoveBudSnapshot>(
  Object.entries(DEMO_SNAPSHOTS).map(([k, v]) => [k, v])
);
const memFingerprints = new Map<string, EmotionalFingerprint>(
  Object.entries(DEMO_FINGERPRINTS).map(([k, v]) => [k, v])
);
const memMatches = new Map<string, Match>();

// ---------- Users ----------
export async function createUser(
  nickname: string,
  purposes: RelationPurpose[]
): Promise<User> {
  const user: User = { id: uid("u"), nickname, createdAt: Date.now(), purposes };
  if (sql) {
    await sql(
      "INSERT INTO users (id, nickname, created_at, purposes) VALUES ($1, $2, $3, $4)",
      [user.id, user.nickname, user.createdAt, JSON.stringify(user.purposes)]
    );
  } else {
    memUsers.set(user.id, user);
  }
  return user;
}

export async function getUser(id: string): Promise<User | null> {
  if (sql) {
    const rows = (await sql(
      "SELECT id, nickname, created_at, purposes FROM users WHERE id = $1",
      [id]
    )) as any[];
    if (rows.length === 0) return null;
    const r = rows[0];
    return { id: r.id, nickname: r.nickname, createdAt: Number(r.created_at), purposes: r.purposes };
  }
  return memUsers.get(id) ?? null;
}

export async function listUsers(): Promise<User[]> {
  if (sql) {
    const rows = (await sql(
      "SELECT id, nickname, created_at, purposes FROM users ORDER BY created_at ASC"
    )) as any[];
    return rows.map((r) => ({
      id: r.id,
      nickname: r.nickname,
      createdAt: Number(r.created_at),
      purposes: r.purposes,
    }));
  }
  return Array.from(memUsers.values()).sort((a, b) => a.createdAt - b.createdAt);
}

// ---------- Snapshots (LoveBud consent-scoped) ----------
export async function saveSnapshot(s: LoveBudSnapshot): Promise<void> {
  if (sql) {
    await sql(
      `INSERT INTO snapshots (user_id, consented_at, scopes, moments, narratives, memory_keywords)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         consented_at = EXCLUDED.consented_at,
         scopes = EXCLUDED.scopes,
         moments = EXCLUDED.moments,
         narratives = EXCLUDED.narratives,
         memory_keywords = EXCLUDED.memory_keywords`,
      [
        s.userId,
        s.consentedAt,
        JSON.stringify(s.scopes),
        JSON.stringify(s.moments),
        JSON.stringify(s.narratives),
        JSON.stringify(s.memoryKeywords),
      ]
    );
  } else {
    memSnapshots.set(s.userId, s);
  }
}

export async function getSnapshot(userId: string): Promise<LoveBudSnapshot | null> {
  if (sql) {
    const rows = (await sql(
      "SELECT user_id, consented_at, scopes, moments, narratives, memory_keywords FROM snapshots WHERE user_id = $1",
      [userId]
    )) as any[];
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      userId: r.user_id,
      consentedAt: Number(r.consented_at),
      scopes: r.scopes,
      moments: r.moments,
      narratives: r.narratives,
      memoryKeywords: r.memory_keywords,
    };
  }
  return memSnapshots.get(userId) ?? null;
}

// ---------- Fingerprints ----------
export async function saveFingerprint(f: EmotionalFingerprint): Promise<void> {
  if (sql) {
    await sql(
      `INSERT INTO fingerprints (user_id, keywords, embedding, tags, generated_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id) DO UPDATE SET
         keywords = EXCLUDED.keywords,
         embedding = EXCLUDED.embedding,
         tags = EXCLUDED.tags,
         generated_at = EXCLUDED.generated_at`,
      [
        f.userId,
        JSON.stringify(f.keywords),
        JSON.stringify(f.embedding),
        JSON.stringify(f.tags),
        f.generatedAt,
      ]
    );
  } else {
    memFingerprints.set(f.userId, f);
  }
}

export async function getFingerprint(
  userId: string
): Promise<EmotionalFingerprint | null> {
  if (sql) {
    const rows = (await sql(
      "SELECT user_id, keywords, embedding, tags, generated_at FROM fingerprints WHERE user_id = $1",
      [userId]
    )) as any[];
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      userId: r.user_id,
      keywords: r.keywords,
      embedding: r.embedding,
      tags: r.tags,
      generatedAt: Number(r.generated_at),
    };
  }
  return memFingerprints.get(userId) ?? null;
}

export async function listFingerprints(): Promise<EmotionalFingerprint[]> {
  if (sql) {
    const rows = (await sql(
      "SELECT user_id, keywords, embedding, tags, generated_at FROM fingerprints"
    )) as any[];
    return rows.map((r) => ({
      userId: r.user_id,
      keywords: r.keywords,
      embedding: r.embedding,
      tags: r.tags,
      generatedAt: Number(r.generated_at),
    }));
  }
  return Array.from(memFingerprints.values());
}

// ---------- Matches ----------
export async function saveMatch(m: Match): Promise<void> {
  if (sql) {
    await sql(
      `INSERT INTO matches (id, user_a, user_b, purpose, reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         user_a = EXCLUDED.user_a,
         user_b = EXCLUDED.user_b,
         purpose = EXCLUDED.purpose,
         reason = EXCLUDED.reason,
         created_at = EXCLUDED.created_at`,
      [
        m.id,
        m.userA,
        m.userB,
        m.purpose,
        JSON.stringify(m.reason),
        m.createdAt,
      ]
    );
  } else {
    memMatches.set(m.id, m);
  }
}

export async function listMatchesForUser(userId: string): Promise<Match[]> {
  if (sql) {
    const rows = (await sql(
      "SELECT id, user_a, user_b, purpose, reason, created_at FROM matches WHERE user_a = $1 OR user_b = $1 ORDER BY created_at DESC",
      [userId]
    )) as any[];
    return rows.map((r) => ({
      id: r.id,
      userA: r.user_a,
      userB: r.user_b,
      purpose: r.purpose,
      reason: r.reason,
      createdAt: Number(r.created_at),
    }));
  }
  return Array.from(memMatches.values())
    .filter((m) => m.userA === userId || m.userB === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
