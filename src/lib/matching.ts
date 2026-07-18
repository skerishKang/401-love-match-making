import { EmotionalFingerprint, MatchReason, RelationPurpose, User } from "./types";
import { cosine } from "./embedding";

// PLUGIN HOOK: real LLM reason generation.
// If an API key / provider is configured, this returns an LLM-written
// explanation. Otherwise we fall back to a deterministic rule-based bridge.
// Swap this function to integrate a multilingual embedding + LLM later.
async function generateReasonLLM(
  a: EmotionalFingerprint,
  b: EmotionalFingerprint,
  shared: string[]
): Promise<{ emotionalPatternNote: string; narrativeBridge: string } | null> {
  // Intentionally returns null in MVP (no key). Keeps the seam visible.
  return null;
}

function ruleBasedReason(
  a: EmotionalFingerprint,
  b: EmotionalFingerprint,
  shared: string[],
  sim: number
): { emotionalPatternNote: string; narrativeBridge: string } {
  const top = shared.slice(0, 3);
  const joined = top.join("·") || "조용한 감정의 결";
  const emotionalPatternNote =
    `두 분은 '${joined}'와 같은 감정의 결을 비슷하게 느끼고 기억합니다. ` +
    `전체 유사도는 ${(sim * 100).toFixed(0)}%입니다. ` +
    `표면적인 조건보다 순간을 해석하는 방식 자체가 닮아 있습니다.`;
  const narrativeBridge = top.length
    ? `'${top[0]}'에 대해 이야기를 시작해 보세요. 서로의 기억이 어떻게 닮았는지 확인할 수 있습니다.`
    : `기록해 둔 첫 순간 하나를 꺼내 보세요. 왜 닮았는지 발견하게 될 것입니다.`;
  return { emotionalPatternNote, narrativeBridge };
}

export async function computeMatchReason(
  a: EmotionalFingerprint,
  b: EmotionalFingerprint
): Promise<MatchReason> {
  const sim = cosine(a.embedding, b.embedding);

  // shared themes = keyword overlap (term-level interpretability)
  const ka = a.keywords;
  const kb = b.keywords;
  const sharedSet = new Set<string>();
  for (const k of Object.keys(ka)) if (kb[k] !== undefined) sharedSet.add(k);
  for (const k of Object.keys(kb)) if (ka[k] !== undefined) sharedSet.add(k);
  const sharedThemes = Array.from(sharedSet).slice(0, 6);

  const llm = await generateReasonLLM(a, b, sharedThemes);
  const { emotionalPatternNote, narrativeBridge } =
    llm ?? ruleBasedReason(a, b, sharedThemes, sim);

  return {
    similarity: Math.max(0, Math.min(1, sim)),
    sharedThemes,
    emotionalPatternNote,
    narrativeBridge,
  };
}

// Rank candidates for a user given a desired purpose.
export async function rankMatches(
  me: User,
  myFp: EmotionalFingerprint,
  others: { user: User; fp: EmotionalFingerprint }[]
): Promise<
  { user: User; fp: EmotionalFingerprint; reason: MatchReason; purpose: RelationPurpose }[]
> {
  const results = [];
  for (const o of others) {
    if (o.user.id === me.id) continue;
    // only match if purpose overlaps
    const purpose =
      me.purposes.find((p) => o.user.purposes.includes(p)) ?? me.purposes[0];
    if (!purpose) continue;
    const reason = await computeMatchReason(myFp, o.fp);
    results.push({ user: o.user, fp: o.fp, reason, purpose });
  }
  results.sort((x, y) => y.reason.similarity - x.reason.similarity);
  return results.slice(0, 10);
}
