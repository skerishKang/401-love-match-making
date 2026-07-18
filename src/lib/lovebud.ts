import { LoveBudSnapshot, ConsentScope } from "./types";
import { extractKeywords, embedTexts, normalize } from "./embedding";

// Simulated LoveBud source. In production this would be an authenticated
// pull from LoveBud under explicit user consent. Here we synthesize a
// consent-scoped snapshot so the MVP runs fully offline.
const SAMPLE_POOL: Record<string, {
  moments: { id: string; text: string; emotion: string }[];
  narratives: { id: string; text: string }[];
  memoryKeywords: string[];
}> = {
  default: {
    moments: [
      { id: "m1", text: "새벽에 혼자 음악 들으며 창밖을 봤을 때의 고요한 설렘", emotion: "설렘" },
      { id: "m2", text: "친구와 헤어진 뒤 남은 거리의 여운과 그리움", emotion: "그리움" },
      { id: "m3", text: "좋아하는 노래를 큰 소리로 부르며 느낀 몰입과 행복", emotion: "행복" },
    ],
    narratives: [
      { id: "n1", text: "나는 작은 순간에서 의미를 찾는 편이다. 남들이 지나치는 고요함 속에서 나만의 리듬을 발견한다." },
    ],
    memoryKeywords: ["고요", "설렘", "여운", "몰입", "혼자만의시간"],
  },
};

export function simulateLoveBudPull(
  userId: string,
  scopes: ConsentScope[]
): LoveBudSnapshot {
  const pool = SAMPLE_POOL.default;
  const consentedAt = Date.now();
  const moments = scopes.includes("moments") ? pool.moments : [];
  const narratives = scopes.includes("narratives") ? pool.narratives : [];
  const memoryKeywords =
    scopes.includes("memoryKeywords") ? pool.memoryKeywords : [];
  // emotions scope gates whether emotion tags are included in moments
  const momentsScoped = moments.map((m) => ({
    ...m,
    emotion: scopes.includes("emotions") ? m.emotion : "",
  }));
  return {
    userId,
    consentedAt,
    scopes,
    moments: momentsScoped,
    narratives,
    memoryKeywords,
  };
}

// Build an EmotionalFingerprint from a consent-scoped snapshot.
export function buildFingerprint(snap: LoveBudSnapshot) {
  const texts: string[] = [];
  for (const m of snap.moments) {
    texts.push(m.text);
    if (m.emotion) texts.push(m.emotion);
  }
  for (const n of snap.narratives) texts.push(n.text);
  for (const k of snap.memoryKeywords) texts.push(k);

  const keywords = extractKeywords(texts);
  const embedding = embedTexts(texts);

  // interpretable tags = top keywords + any emotion lexicon hits
  const tags = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k]) => k);

  return {
    keywords,
    embedding,
    tags,
    generatedAt: Date.now(),
  };
}
