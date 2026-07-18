"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { CONSENT_SCOPES, ConsentScope } from "@/lib/types";
import { submitConsent } from "@/lib/api-client";

export default function ConsentPage() {
  return (
    <Suspense fallback={<div className="container mt"><p className="muted">불러오는 중…</p></div>}>
      <ConsentInner />
    </Suspense>
  );
}

function ConsentInner() {
  const router = useRouter();
  const params = useSearchParams();
  const userId = params.get("userId") || "";

  const [scopes, setScopes] = useState<ConsentScope[]>(["moments", "emotions", "narratives", "memoryKeywords"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggle(s: ConsentScope) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  async function submit() {
    setErr("");
    if (scopes.length === 0) return setErr("최소 한 개 이상 선택해 주세요.");
    setBusy(true);
    try {
      const data = await submitConsent(userId, scopes);
      router.push(`/matches?userId=${userId}`);
    } catch (e: any) {
      setErr(e.message || "오류");
      setBusy(false);
    }
  }

  if (!userId) {
    return (
      <div className="container">
        <p className="muted">잘못된 접근입니다. 홈으로 돌아가 주세요.</p>
      </div>
    );
  }

  return (
    <div className="container stack">
      <h1 className="mt">LoveBud에서 가져올 정보</h1>
      <p className="muted">
        명시적으로 동의한 범위만 읽기 전용으로 가져옵니다. 원본 데이터는 침해되지 않습니다.
        (현재는 데모용 가상 연동입니다.)
      </p>

      <div className="card stack mt">
        {CONSENT_SCOPES.map((s) => (
          <label
            key={s.key}
            style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
          >
            <input
              type="checkbox"
              checked={scopes.includes(s.key)}
              onChange={() => toggle(s.key)}
              style={{ marginTop: 5, width: 18, height: 18 }}
            />
            <div>
              <div style={{ fontWeight: 600 }}>{s.label}</div>
              <div className="muted" style={{ fontSize: 13 }}>{s.desc}</div>
            </div>
          </label>
        ))}
      </div>

      {err && <p style={{ color: "var(--warn)" }}>{err}</p>}

      <button className="btn btn-primary" disabled={busy} onClick={submit}>
        {busy ? "감정 지문 생성 중…" : "동의하고 감정 지문 만들기"}
      </button>
    </div>
  );
}
