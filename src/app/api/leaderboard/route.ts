import { getDB, globalStats, leaderboard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const mode = sp.get("mode") === "hand" ? "hand" : sp.get("mode") === "daily" ? "daily" : "ante";
  const day = sp.get("day") ?? new Date().toISOString().slice(0, 10);
  const db = await getDB();
  const [rows, stats] = await Promise.all([leaderboard(db, mode, day), globalStats(db)]);
  return Response.json({ rows, stats }, { headers: { "cache-control": "public, max-age=15" } });
}
