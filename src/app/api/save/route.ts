import { bad, getDB, PID_RE } from "@/lib/db";

export const dynamic = "force-dynamic";

const MAX_SAVE = 512 * 1024;

export async function GET(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!PID_RE.test(pid)) return bad("invalid pid");
  const db = await getDB();
  const row = await db.prepare("SELECT data, updated_at FROM saves WHERE player_id = ?1").bind(pid).first<{ data: string; updated_at: number }>();
  return Response.json({ data: row?.data ?? null, updatedAt: row?.updated_at ?? 0 }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: Request) {
  const text = await req.text();
  if (text.length > MAX_SAVE * 1.2) return bad("too large", 413);
  let body: { pid?: string; data?: string; updatedAt?: number };
  try {
    body = JSON.parse(text);
  } catch {
    return bad("invalid json");
  }
  const { pid = "", data = "", updatedAt } = body;
  if (!PID_RE.test(pid)) return bad("invalid pid");
  if (typeof data !== "string" || !data || data.length > MAX_SAVE) return bad("invalid data");
  try {
    const parsed = JSON.parse(data) as { v?: number; runId?: string };
    if (!parsed || typeof parsed.v !== "number" || typeof parsed.runId !== "string") return bad("invalid run");
  } catch {
    return bad("invalid run");
  }
  const now = Date.now();
  const ts = typeof updatedAt === "number" && updatedAt > 0 && updatedAt <= now + 60_000 ? updatedAt : now;
  const db = await getDB();
  await db.batch([
    db.prepare("INSERT INTO players (id, created_at, updated_at) VALUES (?1, ?2, ?2) ON CONFLICT(id) DO UPDATE SET updated_at = ?2").bind(pid, now),
    db
      .prepare(
        "INSERT INTO saves (player_id, data, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(player_id) DO UPDATE SET data = ?2, updated_at = ?3 WHERE excluded.updated_at >= saves.updated_at",
      )
      .bind(pid, data, ts),
  ]);
  return Response.json({ ok: true, updatedAt: ts });
}

export async function DELETE(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!PID_RE.test(pid)) return bad("invalid pid");
  const db = await getDB();
  await db.prepare("DELETE FROM saves WHERE player_id = ?1").bind(pid).run();
  return Response.json({ ok: true });
}
