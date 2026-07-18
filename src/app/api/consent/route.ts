import { NextRequest, NextResponse } from "next/server";
import { saveSnapshot, getSnapshot, saveFingerprint, getFingerprint } from "@/lib/repo";
import { simulateLoveBudPull, buildFingerprint } from "@/lib/lovebud";
import { ConsentScope } from "@/lib/types";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const userId: string = body.userId;
  const scopes: ConsentScope[] = Array.isArray(body.scopes) ? body.scopes : [];
  if (!userId) {
    return NextResponse.json({ error: "userId가 없습니다." }, { status: 400 });
  }
  if (scopes.length === 0) {
    return NextResponse.json(
      { error: "최소 한 개 이상의 동의 범위를 선택해 주세요." },
      { status: 400 }
    );
  }
  // 1) simulate the consent-scoped LoveBud pull
  const snap = simulateLoveBudPull(userId, scopes);
  await saveSnapshot(snap);

  // 2) build the emotional fingerprint from the snapshot
  const fp = buildFingerprint(snap);
  await saveFingerprint({ userId, ...fp });

  return NextResponse.json({ snapshot: snap, fingerprint: fp });
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId 필요" }, { status: 400 });
  }
  return NextResponse.json({
    snapshot: await getSnapshot(userId),
    fingerprint: await getFingerprint(userId),
  });
}
