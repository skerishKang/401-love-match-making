// Setup Neon: create schema + seed demo data via Neon SQL-over-HTTP endpoint.
// Mirrors the neonFetch logic in src/lib/repo.ts so we reuse the same protocol.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const u = new URL(DATABASE_URL);
const user = decodeURIComponent(u.username);
const password = decodeURIComponent(u.password);
const host = u.host;
const auth = Buffer.from(`${user}:${password}`).toString("base64");
const endpoint = `https://${host}/sql`;

async function neonFetch(query, params = []) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "neon-connection-string": DATABASE_URL,
    },
    body: JSON.stringify({ query, params }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Neon fetch failed (${response.status}): ${text}`);
  }
  return response.json();
}

// ---- schema ----
const schema = fs.readFileSync(path.join(root, "db/schema.sql"), "utf8");
// Neon SQL-over-HTTP accepts multiple statements? It does for a single query.
// Split by ; and run each (skip empty).
const statements = schema
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

console.log(`Running ${statements.length} schema statements...`);
for (const stmt of statements) {
  await neonFetch(stmt);
  console.log("  OK:", stmt.slice(0, 50).replace(/\s+/g, " "));
}

console.log("Schema created.");
process.exit(0);
