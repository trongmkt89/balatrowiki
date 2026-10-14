import type { Metadata } from "next";
import LeaderboardView from "@/components/LeaderboardView";
import { getDB, globalStats, leaderboard, type LeaderRow } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Bảng xếp hạng — Balatro Wiki",
  description: "Những ván poker roguelike xa nhất và tay bài điểm cao nhất của người chơi Balatro Wiki.",
};

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ mode?: string; day?: string }> }) {
  const sp = await searchParams;
  const mode = sp.mode === "hand" ? "hand" : sp.mode === "daily" ? "daily" : "ante";
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : new Date().toISOString().slice(0, 10);
  let rows: LeaderRow[] = [];
  let stats = { runs: 0, wins: 0, players: 0, best: 0 };
  let error = false;
  try {
    const db = await getDB();
    [rows, stats] = await Promise.all([leaderboard(db, mode, day), globalStats(db)]);
  } catch {
    error = true;
  }
  return <LeaderboardView rows={rows} stats={stats} mode={mode} day={day} error={error} />;
}
