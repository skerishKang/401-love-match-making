"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { runMatch } from "@/lib/api-client";
import { RelationPurpose } from "@/lib/types";

interface MatchItem {
  user: { id: string; nickname: string; purposes: RelationPurpose[] };
  purpose: RelationPurpose;
  reason: {
    similarity: number;
    sharedThemes: string[];
    emotionalPatternNote: string;
    narrativeBridge: string;
  };
}

function purposeLabel(p: RelationPurpose): string {
  const map: Record<RelationPurpose, string> = {
    romance: "연애",
    friendship: "우정",
    fandom: "팬덤 교류",
    conversation: "대화 상대",
    creation: "창작 파트너",
  };
  return map[p];
}

function MatchesInner() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") || "";
  const [matches, setMatches] = useState<MatchItem[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!userId) return;
    runMatch(userId)
      .then((d) => setMatches(d.matches))
      .catch((e) => setErr(e.message));
  }, [userId]);

  if (!userId) return <p className="muted">잘못된 접근입니다.</p>;
  if (err) return <p style={{ color: "var(--warn)" }}>{err}</p>;
  if (!matches) return <p className="muted">매칭 중…</p>;

  if (matches.length === 0)
    return (
      <div className="container mt">
        <p className="muted">아직 연결할 사람이 부족합니다. 다른 사용자가 더 들어와야 합니다.</p>
      </div>
    );

  return (
    <div className="container stack mt">
      <h1>당신과 닮은 사람들</h1>
      <p className="muted">유사도와 연결 근거를 함께 보여줍니다.</p>

      {matches.map((m) => (
        <div key={m.user.id} className="card stack">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>{m.user.nickname}</h2>
              <span className="chip active">{purposeLabel(m.purpose)}</span>
            </div>
            <div
              className="similarity-ring"
              style={{ ["--val" as any]: Math.round(m.reason.similarity * 100) }}
            >
              <span>{Math.round(m.reason.similarity * 100)}%</span>
            </div>
          </div>

          <div className="row">
            {m.reason.sharedThemes.map((t) => (
              <span key={t} className="chip">#{t}</span>
            ))}
          </div>

          <p className="muted">{m.reason.emotionalPatternNote}</p>

          <button
            className="btn btn-ghost"
            onClick={() =>
              router.push(`/detail?userId=${userId}&otherId=${m.user.id}`)
            }
          >
            왜 연결되었는지 보기
          </button>
        </div>
      ))}
    </div>
  );
}

export default function MatchesPage() {
  return (
    <Suspense fallback={<div className="container mt"><p className="muted">불러오는 중…</p></div>}>
      <MatchesInner />
    </Suspense>
  );
}
