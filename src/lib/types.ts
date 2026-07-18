// Core domain types for Resonance (러브매칭 MVP)
// Relationship purposes the product supports (not limited to romance)
export type RelationPurpose =
  | "romance" // 연애
  | "friendship" // 우정
  | "fandom" // 팬덤 교류
  | "conversation" // 대화 상대
  | "creation"; // 창작 파트너

export const RELATION_PURPOSES: { key: RelationPurpose; label: string; desc: string }[] = [
  { key: "romance", label: "연애", desc: "설렘과 친밀함을 나눌 사람" },
  { key: "friendship", label: "우정", desc: "마음이 닿는 친구" },
  { key: "fandom", label: "팬덤 교류", desc: "같은 것을 사랑하는 사람" },
  { key: "conversation", label: "대화 상대", desc: "깊이 대화하고 싶은 사람" },
  { key: "creation", label: "창작 파트너", desc: "함께 만들어갈 사람" },
];

// Scopes a user can explicitly consent to share from LoveBud
export type ConsentScope =
  | "moments" // 순간(Moment) 기록
  | "emotions" // 감정 태그
  | "narratives" // 서사 흐름
  | "memoryKeywords"; // 기억 키워드

export const CONSENT_SCOPES: { key: ConsentScope; label: string; desc: string }[] = [
  { key: "moments", label: "순간 기록", desc: "기록해 둔 순간(Moment) 요약" },
  { key: "emotions", label: "감정 태그", desc: "순간에 담긴 감정" },
  { key: "narratives", label: "서사 흐름", desc: "사건을 어떻게 의미화했는지" },
  { key: "memoryKeywords", label: "기억 키워드", desc: "오래 간직한 키워드" },
];

export interface User {
  id: string;
  nickname: string;
  createdAt: number;
  purposes: RelationPurpose[];
}

// Snapshot received from LoveBud (read-only, consent-scoped)
export interface LoveBudSnapshot {
  userId: string;
  consentedAt: number;
  scopes: ConsentScope[];
  // Raw-ish records as if pulled from LoveBud
  moments: { id: string; text: string; emotion: string }[];
  narratives: { id: string; text: string }[];
  memoryKeywords: string[];
}

// Emotional fingerprint: the matching substrate (not demographics)
export interface EmotionalFingerprint {
  userId: string;
  // weighted keyword vector (term -> weight)
  keywords: Record<string, number>;
  // lightweight embedding vector (normalized)
  embedding: number[];
  // human-readable interpretable tags
  tags: string[];
  generatedAt: number;
}

export interface MatchReason {
  // why these two connected
  similarity: number; // 0..1 overall
  sharedThemes: string[];
  emotionalPatternNote: string; // LLM/rule-generated explanation
  narrativeBridge: string; // starting point for conversation
}

export interface Match {
  id: string;
  userA: string;
  userB: string;
  purpose: RelationPurpose;
  reason: MatchReason;
  createdAt: number;
}
