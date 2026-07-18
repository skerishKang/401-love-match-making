"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function ChatInner() {
  const params = useSearchParams();
  const userId = params.get("userId") || "";
  const otherId = params.get("otherId") || "";
  const otherName = decodeURIComponent(params.get("otherName") || "상대방");

  const [messages, setMessages] = useState<{ me: boolean; text: string }[]>([
    { me: false, text: `안녕하세요. 공명에서 당신과 연결되었다는 이야기를 듣고 왔어요.` },
  ]);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    setMessages((prev) => [...prev, { me: true, text: draft.trim() }]);
    setDraft("");
  }

  return (
    <div className="container stack mt" style={{ minHeight: "70vh" }}>
      <h1>{otherName} 님과의 대화</h1>
      <p className="muted">베타 데모: 실제 메시지는 전송되지 않습니다.</p>

      <div className="card stack mt" style={{ flex: 1 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: m.me ? "flex-end" : "flex-start",
            }}
          >
            <div
              style={{
                maxWidth: "75%",
                padding: "10px 14px",
                borderRadius: 14,
                background: m.me ? "var(--primary-soft)" : "var(--surface-2)",
                border: m.me ? "1px solid var(--primary)" : "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="row mt" style={{ alignItems: "stretch" }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="메시지를 입력하세요…"
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "var(--bg-soft)",
            color: "var(--text)",
            fontSize: 15,
          }}
        />
        <button className="btn btn-primary" onClick={send}>
          보내기
        </button>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="container mt"><p className="muted">불러오는 중…</p></div>}>
      <ChatInner />
    </Suspense>
  );
}
