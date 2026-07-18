import { RelationPurpose, ConsentScope } from "./types";

async function j(url: string, method: string, body?: any) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "요청 실패");
  return data;
}

export function createUser(nickname: string, purposes: string[]) {
  return j("/api/users", "POST", { nickname, purposes }).then((d) => d.user);
}

export function submitConsent(userId: string, scopes: ConsentScope[]) {
  return j("/api/consent", "POST", { userId, scopes });
}

export function runMatch(userId: string) {
  return j(`/api/match?userId=${encodeURIComponent(userId)}`, "GET");
}
