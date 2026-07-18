// In-memory repository. Intentionally DB-free so the app builds and runs on
// static/edge platforms (Cloudflare Pages) with no filesystem or database.
//
// Demo users/snapshots/fingerprints are seeded from ./demo-data (precomputed
// from scripts/seed.mjs + embedding.ts). New records created at runtime live
// only in process memory (reset on redeploy) — fine for the demo.
//
// To move to a real database later (e.g. Neon Postgres), replace the bodies
// of these functions with DB calls; the signatures are the stable contract.

import {
  User,
  LoveBudSnapshot,
  EmotionalFingerprint,
  Match,
  RelationPurpose,
  ConsentScope,
} from "./types";
import {
  DEMO_USERS,
  DEMO_SNAPSHOTS,
  DEMO_FINGERPRINTS,
} from "./demo-data";

function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// ---- runtime (in-memory) stores ----
const users = new Map<string, User>(DEMO_USERS.map((u) => [u.id, u]));
const snapshots = new Map<string, LoveBudSnapshot>(
  Object.entries(DEMO_SNAPSHOTS).map(([k, v]) => [k, v])
);
const fingerprints = new Map<string, EmotionalFingerprint>(
  Object.entries(DEMO_FINGERPRINTS).map(([k, v]) => [k, v])
);
const matches = new Map<string, Match>();

// ---------- Users ----------
export function createUser(nickname: string, purposes: RelationPurpose[]): User {
  const id = uid("u");
  const user: User = { id, nickname, createdAt: Date.now(), purposes };
  users.set(id, user);
  return user;
}

export function getUser(id: string): User | null {
  return users.get(id) ?? null;
}

export function listUsers(): User[] {
  return Array.from(users.values()).sort((a, b) => a.createdAt - b.createdAt);
}

// ---------- Snapshots (LoveBud consent-scoped) ----------
export function saveSnapshot(s: LoveBudSnapshot): void {
  snapshots.set(s.userId, s);
}

export function getSnapshot(userId: string): LoveBudSnapshot | null {
  return snapshots.get(userId) ?? null;
}

// ---------- Fingerprints ----------
export function saveFingerprint(f: EmotionalFingerprint): void {
  fingerprints.set(f.userId, f);
}

export function getFingerprint(userId: string): EmotionalFingerprint | null {
  return fingerprints.get(userId) ?? null;
}

export function listFingerprints(): EmotionalFingerprint[] {
  return Array.from(fingerprints.values());
}

// ---------- Matches ----------
export function saveMatch(m: Match): void {
  matches.set(m.id, m);
}

export function listMatchesForUser(userId: string): Match[] {
  return Array.from(matches.values())
    .filter((m) => m.userA === userId || m.userB === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}
