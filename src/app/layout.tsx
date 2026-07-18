import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "공명 · Resonance",
  description:
    "같은 방식으로 느끼고 기억하는 사람을 연결하는 관계 발견 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <header className="container" style={{ paddingBottom: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 0",
            }}
          >
            <a href="/" className="gradient-text" style={{ fontWeight: 800, fontSize: 20 }}>
              공명 · Resonance
            </a>
            <span className="muted" style={{ fontSize: 12 }}>
              베타 · 무료
            </span>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
