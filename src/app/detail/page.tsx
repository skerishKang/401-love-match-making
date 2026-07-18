"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { runMatch } from "@/lib/api-client";

interface MatchItem {
  user: { id: string; nickname: string; purposes: string[] };
  purpose: string;
  reason: {
    similarity: number;
    sharedThemes: string[];
    emotionalPatternNote: string;
    narrativeBridge: string;
  };
}

function DetailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") || "";
  const otherId = params.get("otherId") || "";

  const [item, setItem] = useState<MatchItem | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!userId) return;
    runMatch(userId)
      .then((d) => {
        const found = (d.matches as MatchItem[]).find((m) => m.user.id === otherId);
        setItem(found || null);
      })
      .catch((e) => setErr(e.message));
  }, [userId, otherId]);

  if (err) return <p style={{ color: "var(--warn)" }}>{err}</p>;
  if (!item) return <p className="muted container mt">불러오는 중…</p>;

  return (
    <div className="container stack mt">
      <button className="btn btn-ghost" style={{ alignSelf: "flex-start" }} onClick={() => router.back()}>
        ← 돌아가기
      </button>

      <h1>{item.user.nickname} 님과의 연결</h1>
      <div className="row">
        <span className="chip active">유사도 {Math.round(item.reason.similarity * 100)}%</span>
        <span className="chip">{item.purpose}</span>
      </div>

      <div className="card stack mt">
        <h2>왜 연결되었나요?</h2>
        <p>{item.reason.emotionalPatternNote}</p>
      </div>

      <div className="card stack mt">
        <h2>공통된 결</h2>
        <div className="row">
          {item.reason.sharedThemes.map((t) => (
            <span key={t} className="chip">#{t}</span>
          ))}
        </div>
      </div>

      <div className="card stack mt">
        <h2>대화를 여는 문</h2>
        <p className="muted">{item.reason.narrativeBridge}</p>
        <button
          className="btn btn-primary"
          onClick={() =>
            router.push(`/chat?userId=${userId}&otherId=${otherId}&otherName=${encodeURIComponent(item.user.nickname)}`)
          }
        >
          이 화두로 대화 시작
        </button>
      </div>
    </div>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={<div className="container mt"><p className="muted">불러오는 중…</p></div>}>
      <DetailInner />
    </Suspense>
  );
}
