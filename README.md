# 공명 · Resonance (러브매칭 MVP)

같은 방식으로 느끼고 기억하는 사람을 연결하는 관계 발견 플랫폼.
조건(나이·성별·지역)이 아니라 **감정·서사·기억의 유사성** 으로 매칭하고,
**"왜 연결되었는지" 설명 카드** 를 함께 제공합니다. 연애 외에 우정·팬덤·대화·창작 등
다양한 관계를 지원합니다. LoveBud와는 분리된 독립 사이트이며, 데이터는 명시적 동의 범위 내
읽기 전용으로만 수신합니다 (현재 MVP는 가상 연동).

## 기술 스택
- Next.js 14 (App Router) + TypeScript
- node:sqlite (내장 SQLite — 네이티브 빌드 불필요)
- 가벼운 한국어 임베딩 + 키워드 추출 (외부 API 키 불필요, MVP용)
- 스타일: 전용 CSS (globals.css)

## 실행
```bash
npm install
node scripts/seed.mjs        # 데모 사용자 4명 시드 (매칭 테스트용)
npm run dev                  # http://localhost:3000
```
프로덕션 빌드:
```bash
npm run build && npm run start
```

## 주요 흐름
1. `/` 온보딩 — 닉네임 + 관계 목적 선택
2. `/consent` — LoveBud에서 가져올 범위 명시적 동의 → 감정 지문 생성
3. `/matches` — 유사도 + 연결 근거 기반 추천 목록
4. `/detail` — "왜 연결되었는지" 해석 + 대화 화두
5. `/chat` — 공통 순간 기반 대화 시작 (데모: 전송 미동작)

## 구조
- `src/lib/types.ts` — 도메인 타입
- `src/lib/db.ts` — node:sqlite 저장소
- `src/lib/repo.ts` — 데이터 접근
- `src/lib/embedding.ts` — 한국어 임베딩/키워드 추출/코사인 유사도
- `src/lib/lovebud.ts` — 가상 LoveBud 연동 + 감정 지문 생성
- `src/lib/matching.ts` — 매칭 + 연결 근거 (LLM 플러그인 자리 포함)
- `src/app/api/*` — users / consent / match API
- `src/app/{page,consent,matches,detail,chat}` — 화면

## 향후 확장 지점
- `src/lib/embedding.ts` 의 `embedTexts` 를 다국어 임베딩 모델(e5/bge-m3)로 교체
- `src/lib/matching.ts` 의 `generateReasonLLM` 에 실제 LLM 연동 (현재 null → 규칙 기반 폴백)
- `src/lib/lovebud.ts` 의 `simulateLoveBudPull` 을 실제 OAuth 연동으로 교체
- DB를 PostgreSQL + pgvector 로 전환 (schema는 동일하게 유지 가능)
