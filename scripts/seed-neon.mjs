// Seed Neon DB with demo users + fingerprints via Neon SQL-over-HTTP.
// Mirrors scripts/seed.mjs embedding logic but writes to Neon.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const u = new URL(DATABASE_URL);
const endpoint = `https://${u.host}/sql`;

async function neonFetch(query, params = []) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "neon-connection-string": DATABASE_URL,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Neon fetch failed (${response.status}): ${text}`);
  }
  return response.json();
}

// ---------- embedding logic (mirrors src/lib/embedding.ts) ----------
const STOPWORDS = new Set(["이","그","저","것","수","들","는","은","을","를","에","의","가","와","과","로","으로","도","만","께","에서","까지","부터","보다","이다","있다","하다","되다","같다","그리고","하지만","그래서","때","중","후","전","것은","그것","나는","너는","우리","그는","그녀","the","a","an","and","or","but","to","of","in","on","is","was"]);
const EMOTION_LEXICON = {
  설렘:{joy:1,anticipation:0.6}, 기쁨:{joy:1}, 행복:{joy:1,trust:0.4}, 위로:{trust:0.7,sadness:-0.3},
  외로움:{sadness:0.8}, 슬픔:{sadness:1}, 그리움:{sadness:0.5,anticipation:0.4}, 연대:{trust:0.8,anticipation:0.3},
  분노:{anger:1}, 놀람:{surprise:0.9}, 평온:{calm:1}, 고요:{calm:0.8}, 감동:{joy:0.5,trust:0.6}, 몰입:{focus:1}, 여운:{calm:0.4,sadness:0.3}
};
const EMOTION_DIMS = ["joy","trust","sadness","anger","surprise","anticipation","calm","focus"];

function tokenize(text){
  const cleaned = text.toLowerCase().replace(/[^가-힣a-z0-9\s]/g, " ");
  const words = cleaned.split(/\s+/).filter(w=>w.length>0);
  const tokens=[];
  for(const w of words){ if(STOPWORDS.has(w)) continue; tokens.push(w); }
  for(const w of words){
    if(/[가-힣]/.test(w) && w.length>=3){
      for(let i=0;i<w.length-1;i++){ const bg=w.slice(i,i+2); if(!STOPWORDS.has(bg)) tokens.push(bg); }
    }
  }
  return tokens;
}
function extractKeywords(texts){
  const freq={};
  for(const t of texts) for(const tok of tokenize(t)) freq[tok]=(freq[tok]||0)+1;
  const max=Math.max(1,...Object.values(freq));
  const out={};
  for(const [k,v] of Object.entries(freq)) if(v>=1) out[k]=v/max;
  return out;
}
function normalize(v){ const n=Math.sqrt(v.reduce((s,x)=>s+x*x,0))||1; return v.map(x=>x/n); }
function embedTexts(texts){
  const kw=extractKeywords(texts);
  const LEX=32; const lex=new Array(LEX).fill(0); let lexNorm=0;
  for(const [term,w] of Object.entries(kw)){
    let h=0; for(let i=0;i<term.length;i++) h=(h*31+term.charCodeAt(i))>>>0;
    const idx=h%LEX; lex[idx]+=w; lexNorm+=w;
  }
  if(lexNorm>0) for(let i=0;i<LEX;i++) lex[i]/=lexNorm;
  const emo=new Array(EMOTION_DIMS.length).fill(0); let emoNorm=0;
  for(const [term,w] of Object.entries(kw)){
    const e=EMOTION_LEXICON[term];
    if(e){ for(const [dim,val] of Object.entries(e)){ const di=EMOTION_DIMS.indexOf(dim); if(di>=0){ emo[di]+=val*w; emoNorm+=val*w; } } }
  }
  if(emoNorm>0) for(let i=0;i<emo.length;i++) emo[i]/=emoNorm;
  return normalize([...lex,...emo]);
}

// ---------- demo users ----------
const DEMO = JSON.parse(fs.readFileSync(path.join(root, "scripts/demo-users.json"), "utf8"));

for (const d of DEMO) {
  const purposes = d.purposes ?? ["companionship"];
  const texts = [
    d.nickname,
    ...(d.moments ?? []).map((m) => m.text),
    ...(d.narratives ?? []).map((n) => n.text),
    ...(d.memoryKeywords ?? []),
  ];
  const embedding = embedTexts(texts);
  const keywords = extractKeywords(texts);

  // upsert user
  await neonFetch(
    "INSERT INTO users (id, nickname, created_at, purposes) VALUES ($1,$2,$3,$4::jsonb) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, purposes=EXCLUDED.purposes",
    [d.id, d.nickname, d.createdAt ?? Date.now(), JSON.stringify(purposes)]
  );
  // upsert fingerprint
  await neonFetch(
    "INSERT INTO fingerprints (user_id, keywords, embedding, tags, generated_at) VALUES ($1,$2::jsonb,$3::jsonb,$4::jsonb,$5) ON CONFLICT (user_id) DO UPDATE SET keywords=EXCLUDED.keywords, embedding=EXCLUDED.embedding, tags=EXCLUDED.tags, generated_at=EXCLUDED.generated_at",
    [d.id, JSON.stringify(keywords), JSON.stringify(embedding), JSON.stringify(d.tags ?? []), d.createdAt ?? Date.now()]
  );
  // upsert snapshot
  await neonFetch(
    "INSERT INTO snapshots (user_id, consented_at, scopes, moments, narratives, memory_keywords) VALUES ($1,$2,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb) ON CONFLICT (user_id) DO UPDATE SET consented_at=EXCLUDED.consented_at, scopes=EXCLUDED.scopes, moments=EXCLUDED.moments, narratives=EXCLUDED.narratives, memory_keywords=EXCLUDED.memory_keywords",
    [d.id, d.createdAt ?? Date.now(), JSON.stringify(d.scopes ?? []), JSON.stringify(d.moments ?? []), JSON.stringify(d.narratives ?? []), JSON.stringify(Object.keys(keywords))]
  );
  console.log(`Seeded: ${d.nickname} (${d.id})`);
}

console.log("Seed complete.");
process.exit(0);
