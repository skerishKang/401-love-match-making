import { NextRequest, NextResponse } from "next/server";
import { getUser, listUsers, getFingerprint, listFingerprints, saveMatch } from "@/lib/repo";
import { rankMatches } from "@/lib/matching";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId 필요" }, { status: 400 });
  }
  const me = await getUser(userId);
  if (!me) return NextResponse.json({ error: "사용자 없음" }, { status: 404 });
  const myFp = await getFingerprint(userId);
  if (!myFp) {
    return NextResponse.json({ error: "감정 지문이 없습니다. 동의 단계를 먼저 진행하세요." }, { status: 409 });
  }

  const others = (
    await Promise.all(
      (await listUsers())
        .filter((u) => u.id !== userId)
        .map(async (u) => ({ user: u, fp: await getFingerprint(u.id) }))
    )
  ).filter((o) => o.fp) as { user: typeof me; fp: NonNullable<typeof myFp> }[];

  const ranked = await rankMatches(me, myFp, others);

  // persist top matches for the user
  for (const r of ranked) {
    await saveMatch({
      id: `m_${userId}_${r.user.id}`,
      userA: userId,
      userB: r.user.id,
      purpose: r.purpose,
      reason: r.reason,
      createdAt: Date.now(),
    });
  }

  return NextResponse.json({
    matches: ranked.map((r) => ({
      user: r.user,
      purpose: r.purpose,
      reason: r.reason,
    })),
  });
}
