// Seed script: creates demo users with consent-scoped LoveBud snapshots
// and builds their emotional fingerprints, so the matching flow has data.
// Run: node scripts/seed.mjs
import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const DATA_DIR = path.join(root, "data");
const DB_PATH = path.join(DATA_DIR, "resonance.db");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, nickname TEXT NOT NULL, created_at INTEGER NOT NULL, purposes TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS snapshots (
    user_id TEXT PRIMARY KEY, consented_at INTEGER NOT NULL, scopes TEXT NOT NULL,
    moments TEXT NOT NULL, narratives TEXT NOT NULL, memory_keywords TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS fingerprints (
    user_id TEXT PRIMARY KEY, keywords TEXT NOT NULL, embedding TEXT NOT NULL, tags TEXT NOT NULL, generated_at INTEGER NOT NULL
  );
`);

// ---------- embedding logic (mirrors src/lib/embedding.ts) ----------
const STOPWORDS = new Set(["이","그","저","것","수","들","는","은","을","를","에","의","가","와","과","로","으로","도","만","께","에서","까지","부터","보다","이다","있다","하다","되다","같다","그리고","하지만","그래서","때","중","후","전","것은","그것","나는","너는","우리","그는","그녀","the","a","an","and","or","but","to","of","in","on","is","was"]);
const EMOTION_LEXICON = {
  설렘:{joy:1,anticipation:0.6}, 기쁨:{joy:1}, 행복:{joy:1,trust:0.4}, 위로:{trust:0.7,sadness:-0.3},
  외로움:{sadness:0.8}, 슬픔:{sadness:1}, 그리움:{sadness:0.5,anticipation:0.4}, 연대:{trust:0.8,anticipation:0.3},
  분노:{anger:1}, 놀람:{surprise:0.9}, 평온:{calm:1}, 고요:{calm:0.8}, 감동:{joy:0.5,trust:0.6}, 몰입:{focus:1}, 여운:{calm:0.4,sadness:0.3}
};
const EMOTION_DIMS = ["joy","trust","sadness","anger","surprise","anticipation","calm","focus"];

function tokenize(text){
  const cleaned = text.toLowerCase().replace(/[^가-힣a-z0-9\s]/g," ");
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
const DEMO = [
  {
    nickname: "고요한밤", purposes: ["romance","conversation"],
    moments:[
      {id:"m1",text:"새벽에 혼자 음악 들으며 창밖을 봤을 때의 고요한 설렘",emotion:"설렘"},
      {id:"m2",text:"친구와 헤어진 뒤 남은 거리의 여운과 그리움",emotion:"그리움"},
      {id:"m3",text:"좋아하는 노래를 큰 소리로 부르며 느낀 몰입과 행복",emotion:"행복"}
    ],
    narratives:[{id:"n1",text:"나는 작은 순간에서 의미를 찾는 편이다. 남들이 지나치는 고요함 속에서 나만의 리듬을 발견한다."}],
    memoryKeywords:["고요","설렘","여운","몰입","혼자만의시간"]
  },
  {
    nickname: "도시의고양이", purposes: ["friendship","conversation"],
    moments:[
      {id:"m1",text:"늦은 밤 편의점 앞에서 본 낯선 사람의 고요한 미소",emotion:"평온"},
      {id:"m2",text:"혼자 영화를 보고 나서 느낀 긴 여운과 그리움",emotion:"그리움"},
      {id:"m3",text:"좋아하는 곡을 귀에 꽂고 걷는 몰입의 시간",emotion:"몰입"}
    ],
    narratives:[{id:"n1",text:"나는 혼자 있는 시간을 가장 소중히 여긴다. 고요한 순간들이 나를 되찾아준다."}],
    memoryKeywords:["고요","여운","몰입","혼자만의시간","평온"]
  },
  {
    nickname: "빛나는팬덤", purposes: ["fandom","creation"],
    moments:[
      {id:"m1",text:"콘서트에서 함께 부르는 순간의 감동과 연대",emotion:"감동"},
      {id:"m2",text:"동료 팬과 나눈 설렘 가득한 이론 토론",emotion:"설렘"},
      {id:"m3",text:"좋아하는 작품을 분석하며 느낀 몰입",emotion:"몰입"}
    ],
    narratives:[{id:"n1",text:"나는 같은 것을 사랑하는 사람들과 의미를 나눌 때 가장 살아있다고 느낀다."}],
    memoryKeywords:["감동","연대","설렘","몰입","팬심"]
  },
  {
    nickname: "글쓰는새벽", purposes: ["creation","conversation"],
    moments:[
      {id:"m1",text:"새벽에 혼자 문장을 다듬으며 느낀 고요한 몰입",emotion:"몰입"},
      {id:"m2",text:"마감을 앞두고 느낀 외로움과 그리움",emotion:"외로움"},
      {id:"m3",text:"좋은 표현을 찾았을 때의 작은 감동",emotion:"감동"}
    ],
    narratives:[{id:"n1",text:"나는 혼자만의 시간에 가장 깊이 닿는다. 고요함이 나의 재료다."}],
    memoryKeywords:["고요","몰입","외로움","감동","혼자만의시간"]
  }
];

function uid(p){ return `${p}_${Math.random().toString(36).slice(2,8)}`; }

const now = Date.now();
for(const d of DEMO){
  const id = uid("u");
  db.prepare(`INSERT INTO users (id,nickname,created_at,purposes) VALUES (?,?,?,?)`)
    .run(id, d.nickname, now, JSON.stringify(d.purposes));
  db.prepare(`INSERT OR REPLACE INTO snapshots (user_id,consented_at,scopes,moments,narratives,memory_keywords) VALUES (?,?,?,?,?,?)`)
    .run(id, now, JSON.stringify(["moments","emotions","narratives","memoryKeywords"]),
      JSON.stringify(d.moments), JSON.stringify(d.narratives), JSON.stringify(d.memoryKeywords));

  const texts=[];
  for(const m of d.moments){ texts.push(m.text); if(m.emotion) texts.push(m.emotion); }
  for(const n of d.narratives) texts.push(n.text);
  for(const k of d.memoryKeywords) texts.push(k);
  const keywords=extractKeywords(texts);
  const embedding=embedTexts(texts);
  const tags=Object.entries(keywords).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k])=>k);
  db.prepare(`INSERT OR REPLACE INTO fingerprints (user_id,keywords,embedding,tags,generated_at) VALUES (?,?,?,?,?)`)
    .run(id, JSON.stringify(keywords), JSON.stringify(embedding), JSON.stringify(tags), now);
  console.log(`seeded: ${d.nickname} (${id})`);
}

console.log("seed complete.");
