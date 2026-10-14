import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getDB(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export const PID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function bad(msg: string, status = 400) {
  return Response.json({ error: msg }, { status });
}

export function cleanName(n: unknown): string {
  const s = typeof n === "string" ? n : "";
  const cleaned = s.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, 20);
  return cleaned || "Player";
}

export interface LeaderRow {
  name: string;
  deck: string;
  stake: number;
  ante: number;
  round: number;
  best_hand: number;
  won: number;
  jokers: string;
  fav_hand: string | null;
  seed: string;
  daily: string | null;
  created_at: number;
}

export async function leaderboard(db: D1Database, mode: "ante" | "hand" | "daily", day?: string, limit = 50): Promise<LeaderRow[]> {
  const cols = "name, deck, stake, ante, round, best_hand, won, jokers, fav_hand, seed, daily, created_at";
  // Best run per player only, so one person can't fill the board.
  const order = mode === "hand" ? "best_hand DESC" : "ante DESC, stake DESC, best_hand DESC";
  const where = mode === "daily" ? "WHERE daily = ?2" : "";
  const sql = `SELECT ${cols} FROM (
      SELECT ${cols}, ROW_NUMBER() OVER (PARTITION BY player_id ORDER BY ${order}) AS rn FROM runs ${where}
    ) WHERE rn = 1 ORDER BY ${order} LIMIT ?1`;
  const stmt = mode === "daily" ? db.prepare(sql).bind(limit, day ?? "") : db.prepare(sql).bind(limit);
  const { results } = await stmt.all<LeaderRow>();
  return results;
}

export async function globalStats(db: D1Database) {
  const row = await db
    .prepare(`SELECT COUNT(*) AS runs, COALESCE(SUM(won), 0) AS wins, COUNT(DISTINCT player_id) AS players, COALESCE(MAX(best_hand), 0) AS best FROM runs`)
    .first<{ runs: number; wins: number; players: number; best: number }>();
  return row ?? { runs: 0, wins: 0, players: 0, best: 0 };
}
