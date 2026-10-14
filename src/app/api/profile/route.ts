import { bad, cleanName, getDB, PID_RE } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!PID_RE.test(pid)) return bad("invalid pid");
  const db = await getDB();
  const row = await db.prepare("SELECT name, profile FROM players WHERE id = ?1").bind(pid).first<{ name: string; profile: string }>();
  if (!row) return Response.json({ name: "", profile: {} }, { headers: { "cache-control": "no-store" } });
  let profile = {};
  try {
    profile = JSON.parse(row.profile);
  } catch {
    /* keep empty */
  }
  return Response.json({ name: row.name, profile }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  const text = await req.text();
  if (text.length > 64 * 1024) return bad("too large", 413);
  let body: { pid?: string; name?: string; profile?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return bad("invalid json");
  }
  const pid = body.pid ?? "";
  if (!PID_RE.test(pid)) return bad("invalid pid");
  const p = (body.profile ?? {}) as Record<string, unknown>;
  const profile = {
    discovered: Array.isArray(p.discovered) ? p.discovered.filter((x) => typeof x === "string" && x.length < 40).slice(0, 600) : [],
    runs: Number(p.runs) || 0,
    wins: Number(p.wins) || 0,
    bestAnte: Number(p.bestAnte) || 0,
    bestHand: Number(p.bestHand) || 0,
    maxStake: typeof p.maxStake === "object" && p.maxStake ? p.maxStake : {},
  };
  const now = Date.now();
  const db = await getDB();
  await db
    .prepare(
      "INSERT INTO players (id, name, profile, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4) ON CONFLICT(id) DO UPDATE SET name = ?2, profile = ?3, updated_at = ?4",
    )
    .bind(pid, cleanName(body.name), JSON.stringify(profile), now)
    .run();
  return Response.json({ ok: true });
}
