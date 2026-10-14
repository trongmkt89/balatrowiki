"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HANDS } from "@/game/hands";
import { JOKER_MAP } from "@/game/jokers";
import { DECK_MAP, STAKES } from "@/game/meta";
import type { HandType } from "@/game/types";
import type { LeaderRow } from "@/lib/db";
import { fmtNum } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { getPid } from "@/lib/storage";
import { Background, MENU_COLORS } from "./Background";

interface MyRun {
  deck: string;
  stake: number;
  ante: number;
  round: number;
  best_hand: number;
  won: number;
  jokers: string;
  created_at: number;
  daily: string | null;
}

export default function LeaderboardView({ rows, stats, mode, day, error }: { rows: LeaderRow[]; stats: { runs: number; wins: number; players: number; best: number }; mode: string; day: string; error: boolean }) {
  const { t, tx, lang } = useLang();
  const [mine, setMine] = useState<MyRun[]>([]);
  useEffect(() => {
    fetch(`/api/runs?pid=${getPid()}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<{ runs: MyRun[] }>) : { runs: [] as MyRun[] }))
      .then((d) => setMine(d.runs ?? []))
      .catch(() => {});
  }, []);

  const tabs = [
    { k: "ante", label: lang === "vi" ? "Ante xa nhất" : "Furthest Ante" },
    { k: "hand", label: t("bestHand") },
    { k: "daily", label: t("daily") },
  ];

  return (
    <div className="page-root">
      <Background colors={MENU_COLORS} />
      <div className="page">
        <header className="page-head">
          <Link href="/" className="btn btn-orange small">
            ← {t("mainMenu")}
          </Link>
          <h1>{t("leaderboard")}</h1>
        </header>
        <div className="gstats">
          <div>
            <b>{fmtNum(stats.players)}</b>
            <span>{lang === "vi" ? "người chơi" : "players"}</span>
          </div>
          <div>
            <b>{fmtNum(stats.runs)}</b>
            <span>{lang === "vi" ? "ván đã chơi" : "runs played"}</span>
          </div>
          <div>
            <b>{fmtNum(stats.wins)}</b>
            <span>{lang === "vi" ? "ván thắng" : "wins"}</span>
          </div>
          <div>
            <b>{fmtNum(stats.best)}</b>
            <span>{lang === "vi" ? "tay bài kỷ lục" : "record hand"}</span>
          </div>
        </div>
        <nav className="tabs page-tabs">
          {tabs.map((x) => (
            <Link key={x.k} href={`/leaderboard?mode=${x.k}`} className={`tab ${mode === x.k ? "on" : ""}`}>
              {x.label}
            </Link>
          ))}
        </nav>
        {mode === "daily" && <p className="hint center">{day} — {t("dailyDone")}</p>}
        {error && <p className="hint center">Database unavailable</p>}
        <div className="lb-table">
          {rows.length === 0 && <div className="lb-empty">{t("noRuns")}</div>}
          {rows.map((r, i) => {
            const jokers: string[] = (() => {
              try {
                return JSON.parse(r.jokers);
              } catch {
                return [];
              }
            })();
            return (
              <div key={i} className={`lb-row ${i < 3 ? `top${i + 1}` : ""}`}>
                <span className="lb-rank">{i + 1}</span>
                <span className="lb-name">
                  {r.name}
                  {r.won ? <span className="won-badge">★</span> : null}
                </span>
                <span className="lb-deck" style={{ ["--deck" as string]: DECK_MAP[r.deck]?.color }}>
                  {tx(DECK_MAP[r.deck]?.name)}
                  <small className="stake-dot" style={{ background: STAKES[r.stake - 1]?.color }} title={tx(STAKES[r.stake - 1]?.name)} />
                </span>
                <span className="lb-ante">
                  {t("ante")} <b>{r.ante}</b>
                </span>
                <span className="lb-hand">
                  <span className="chip-ico">●</span>
                  {fmtNum(r.best_hand)}
                </span>
                <span className="lb-jokers" title={jokers.map((k) => JOKER_MAP[k]?.name).join(", ")}>
                  {jokers.slice(0, 6).map((k, j) => (
                    <span key={j}>{JOKER_MAP[k]?.icon ?? "🃏"}</span>
                  ))}
                </span>
                <span className="lb-fav">{r.fav_hand && HANDS[r.fav_hand as HandType] ? tx(HANDS[r.fav_hand as HandType].name) : ""}</span>
              </div>
            );
          })}
        </div>
        {mine.length > 0 && (
          <>
            <h2 className="sub">{t("yourRuns")}</h2>
            <div className="lb-table mine">
              {mine.map((r, i) => (
                <div key={i} className="lb-row">
                  <span className={`lb-result ${r.won ? "won" : "lost"}`}>{r.won ? t("won") : t("lost")}</span>
                  <span className="lb-deck">{tx(DECK_MAP[r.deck]?.name)}</span>
                  <span className="lb-ante">
                    {t("ante")} <b>{r.ante}</b>
                  </span>
                  <span className="lb-hand">
                    <span className="chip-ico">●</span>
                    {fmtNum(r.best_hand)}
                  </span>
                  <span className="lb-fav">{new Date(r.created_at).toLocaleDateString(lang === "vi" ? "vi-VN" : "en-US")}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
