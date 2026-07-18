"use client";

import { useRouter } from "next/navigation";
import { createUser } from "@/lib/api-client";
import { RELATION_PURPOSES } from "@/lib/types";
import { useState } from "react";

export default function Onboarding() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [purposes, setPurposes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggle(p: string) {
    setPurposes((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  async function submit() {
    setErr("");
    if (!nickname.trim()) return setErr("닉네임을 입력해 주세요.");
    if (purposes.length === 0) return setErr("관계 목적을 하나 이상 선택해 주세요.");
    setBusy(true);
    try {
      const user = await createUser(nickname.trim(), purposes);
      router.push(`/consent?userId=${user.id}`);
    } catch (e: any) {
      setErr(e.message || "오류가 발생했습니다.");
      setBusy(false);
    }
  }

  return (
    <div className="container stack">
      <div className="center mt">
        <h1 className="gradient-text">공명 · Resonance</h1>
        <p className="muted mt">
          같은 방식으로 느끼고 기억하는 사람을 연결합니다.
          <br />
          조건이 아니라 감정·서사·기억의 유사성으로 만납니다.
        </p>
      </div>

      <div className="card stack mt">
        <div>
          <h2>1. 닉네임</h2>
          <p className="muted">프로필에 표시될 이름입니다.</p>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="예: 고요한밤"
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--bg-soft)",
              color: "var(--text)",
              fontSize: 15,
            }}
          />
        </div>

        <div className="divider" />

        <div>
          <h2>2. 어떤 관계를 찾나요?</h2>
          <p className="muted">복수 선택 가능합니다.</p>
          <div className="row mt">
            {RELATION_PURPOSES.map((p) => (
              <button
                key={p.key}
                className={`chip clickable ${purposes.includes(p.key) ? "active" : ""}`}
                onClick={() => toggle(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="muted mt" style={{ fontSize: 13 }}>
            {purposes.length > 0
              ? RELATION_PURPOSES.filter((p) => purposes.includes(p.key))
                  .map((p) => p.desc)
                  .join(" · ")
              : ""}
          </p>
        </div>
      </div>

      {err && <p style={{ color: "var(--warn)" }}>{err}</p>}

      <button className="btn btn-primary" disabled={busy} onClick={submit}>
        {busy ? "만드는 중…" : "시작하기"}
      </button>
    </div>
  );
}
