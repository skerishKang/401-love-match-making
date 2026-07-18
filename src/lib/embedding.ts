// Lightweight Korean-aware embedding + keyword extraction.
// No external API/key required for MVP. Designed to be swapped for a real
// embedding model (e.g. multilingual-e5 / bge-m3) later via embedText().

const STOPWORDS = new Set([
  "이", "그", "저", "것", "수", "들", "는", "은", "을", "를", "에", "의", "가",
  "와", "과", "로", "으로", "도", "만", "께", "에서", "까지", "부터", "보다",
  "는", "은", "이다", "있다", "하다", "되다", "같다", "그리고", "하지만", "그래서",
  "때", "중", "후", "전", "것은", "그것", "나는", "너는", "우리", "그는", "그녀",
  "the", "a", "an", "and", "or", "but", "to", "of", "in", "on", "is", "was",
  "을", "를", "이", "가", "의", "에", "로", "와", "과", "도", "만", "께",
]);

// Emotion lexicon: term -> emotional valence dimension weight.
// Used to give the fingerprint interpretable structure beyond raw tokens.
const EMOTION_LEXICON: Record<string, Record<string, number>> = {
  설렘: { joy: 1, anticipation: 0.6 },
  기쁨: { joy: 1 },
  행복: { joy: 1, trust: 0.4 },
  위로: { trust: 0.7, sadness: -0.3 },
  외로움: { sadness: 0.8 },
  슬픔: { sadness: 1 },
  그리움: { sadness: 0.5, anticipation: 0.4 },
  연대: { trust: 0.8, anticipation: 0.3 },
  분노: { anger: 1 },
  놀람: { surprise: 0.9 },
  평온: { calm: 1 },
  고요: { calm: 0.8 },
  감동: { joy: 0.5, trust: 0.6 },
  몰입: { focus: 1 },
  여운: { calm: 0.4, sadness: 0.3 },
};

export const EMOTION_DIMS = [
  "joy", "trust", "sadness", "anger", "surprise", "anticipation", "calm", "focus",
];

function tokenize(text: string): string[] {
  // Korean + alphanumeric tokens; also capture 2-grams of hangul for context
  const cleaned = text.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter((w) => w.length > 0);
  const tokens: string[] = [];
  for (const w of words) {
    if (STOPWORDS.has(w)) continue;
    tokens.push(w);
  }
  // add hangul bigrams from longer words for sub-word signal
  for (const w of words) {
    if (/[가-힣]/.test(w) && w.length >= 3) {
      for (let i = 0; i < w.length - 1; i++) {
        const bg = w.slice(i, i + 2);
        if (!STOPWORDS.has(bg)) tokens.push(bg);
      }
    }
  }
  return tokens;
}

export function extractKeywords(texts: string[]): Record<string, number> {
  const freq: Record<string, number> = {};
  for (const t of texts) {
    for (const tok of tokenize(t)) {
      freq[tok] = (freq[tok] || 0) + 1;
    }
  }
  // normalize by max
  const max = Math.max(1, ...Object.values(freq));
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(freq)) {
    if (v >= 1) out[k] = v / max;
  }
  return out;
}

// Build an interpretable embedding: keyword vector projected into a fixed
// emotional + lexical space. Deterministic, keyless.
export function embedTexts(texts: string[]): number[] {
  const kw = extractKeywords(texts);
  // lexical dimension: pooled token weights (hashed to fixed buckets)
  const LEX_BUCKETS = 32;
  const lex = new Array(LEX_BUCKETS).fill(0);
  let lexNorm = 0;
  for (const [term, w] of Object.entries(kw)) {
    let h = 0;
    for (let i = 0; i < term.length; i++) h = (h * 31 + term.charCodeAt(i)) >>> 0;
    const idx = h % LEX_BUCKETS;
    lex[idx] += w;
    lexNorm += w;
  }
  if (lexNorm > 0) for (let i = 0; i < LEX_BUCKETS; i++) lex[i] /= lexNorm;

  // emotion dimension
  const emo = new Array(EMOTION_DIMS.length).fill(0);
  let emoNorm = 0;
  for (const [term, w] of Object.entries(kw)) {
    const e = EMOTION_LEXICON[term];
    if (e) {
      for (const [dim, val] of Object.entries(e)) {
        const di = EMOTION_DIMS.indexOf(dim);
        if (di >= 0) {
          emo[di] += val * w;
          emoNorm += val * w;
        }
      }
    }
  }
  if (emoNorm > 0) for (let i = 0; i < emo.length; i++) emo[i] /= emoNorm;

  // concat: [lex(32) | emo(8)] = 40-dim, then L2 normalize
  const vec = [...lex, ...emo];
  return normalize(vec);
}

export function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot; // both normalized already
}
