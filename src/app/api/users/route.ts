import { NextRequest, NextResponse } from "next/server";
import { createUser, listUsers } from "@/lib/repo";
import { RelationPurpose } from "@/lib/types";

export const runtime = "edge";

export async function GET() {
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const nickname: string = (body.nickname || "").toString().trim();
  const purposes: RelationPurpose[] = Array.isArray(body.purposes)
    ? body.purposes
    : [];
  if (!nickname) {
    return NextResponse.json({ error: "닉네임을 입력해 주세요." }, { status: 400 });
  }
  if (purposes.length === 0) {
    return NextResponse.json({ error: "관계 목적을 하나 이상 선택해 주세요." }, { status: 400 });
  }
  const user = await createUser(nickname, purposes);
  return NextResponse.json({ user });
}
