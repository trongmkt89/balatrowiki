import { bad, cleanName, getDB, PID_RE } from "@/lib/db";

export const dynamic = "force-dynamic";

const DECKS = new Set(["red", "blue", "yellow", "green", "black", "magic", "nebula", "ghost", "abandoned", "checkered", "zodiac", "painted", "anaglyph", "plasma", "erratic"]);

export async function POST(req: Request) {
  const text = await req.text();
  if (text.length > 16 * 1024) return bad("too large", 413);
  let b: Record<string, unknown>;
  try {
    b = JSON.parse(text);
  } catch {
    return bad("invalid json");
  }
  const pid = String(b.pid ?? "");
  const runId = String(b.runId ?? "");
  if (!PID_RE.test(pid) || !/^[\w-]{6,64}$/.test(runId)) return bad("invalid ids");
  const deck = String(b.deck ?? "");
  const stake = Math.floor(Number(b.stake));
  const ante = Math.floor(Number(b.ante));
  const round = Math.floor(Number(b.round));
  const bestHand = Number(b.bestHand);
  if (!DECKS.has(deck) || !(stake >= 1 && stake <= 8) || !(ante >= 0 && ante <= 100) || !(round >= 0 && round <= 400)) return bad("invalid run");
  if (!(bestHand >= 0) || !Number.isFinite(bestHand)) return bad("invalid score");
  const seed = String(b.seed ?? "").slice(0, 16);
  const jokers = Array.isArray(b.jokers) ? b.jokers.filter((x) => typeof x === "string").slice(0, 20) : [];
  const daily = typeof b.daily === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b.daily) ? b.daily : null;
  const fav = typeof b.favHand === "string" ? b.favHand.slice(0, 12) : null;
  const now = Date.now();
  const db = await getDB();
  // A run can be updated (e.g. endless continuation) but never moved to another player.
  await db
    .prepare(
      `INSERT INTO runs (id, player_id, name, seed, deck, stake, ante, round, best_hand, won, jokers, fav_hand, daily, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)
       ON CONFLICT(id) DO UPDATE SET name = ?3, ante = MAX(runs.ante, ?7), round = MAX(runs.round, ?8),
         best_hand = MAX(runs.best_hand, ?9), won = MAX(runs.won, ?10), jokers = ?11, fav_hand = ?12
       WHERE runs.player_id = ?2`,
    )
    .bind(runId, pid, cleanName(b.name), seed, deck, stake, ante, round, bestHand, b.won ? 1 : 0, JSON.stringify(jokers), fav, daily, now)
    .run();
  return Response.json({ ok: true });
}

export async function GET(req: Request) {
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  if (!PID_RE.test(pid)) return bad("invalid pid");
  const db = await getDB();
  const { results } = await db
    .prepare("SELECT deck, stake, ante, round, best_hand, won, jokers, fav_hand, seed, daily, created_at FROM runs WHERE player_id = ?1 ORDER BY created_at DESC LIMIT 20")
    .bind(pid)
    .all();
  return Response.json({ runs: results }, { headers: { "cache-control": "no-store" } });
}
