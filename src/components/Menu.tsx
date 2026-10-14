"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { newRun } from "@/game/engine";
import { DECKS, STAKES } from "@/game/meta";
import { hashSeed, randomSeed } from "@/game/rng";
import type { Run } from "@/game/types";
import { cloudLoadProfile, cloudLoadSave, cloudSave, cloudSaveProfile } from "@/lib/api";
import { fmtNum, todayKey } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { sfx } from "@/lib/sound";
import {
  getName,
  getPid,
  loadProfile,
  loadRun,
  loadSettings,
  mergeProfiles,
  PID_RE,
  type Profile,
  saveProfile,
  saveRunLocal,
  saveSettings,
  setName as storeName,
  setPid,
} from "@/lib/storage";
import { Background, MENU_COLORS } from "./Background";
import { Rich } from "./Rich";

export function dailyConfig(day = todayKey()) {
  const h = hashSeed("daily-" + day);
  return { seed: "D" + day.replace(/-/g, "").slice(2), deck: DECKS[h % DECKS.length].key, stake: 1 + ((h >>> 8) % 3), day };
}

export default function Menu() {
  const router = useRouter();
  const params = useSearchParams();
  const { t, tx, lang, setLang } = useLang();
  const [saved, setSaved] = useState<Run | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [pid, setPidState] = useState("");
  const [screen, setScreen] = useState<"main" | "new" | "how" | "profile">("main");
  const [deckIdx, setDeckIdx] = useState(0);
  const [stake, setStake] = useState(1);
  const [seed, setSeed] = useState("");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [codeMsg, setCodeMsg] = useState("");

  useEffect(() => {
    const id = getPid();
    setPidState(id);
    setName(getName());
    setSaved(loadRun());
    const p = loadProfile();
    setProfile(p);
    const st = loadSettings();
    if (st.deck) setDeckIdx(Math.max(0, DECKS.findIndex((d) => d.key === st.deck)));
    if (st.stake) setStake(st.stake);
    if (params.get("new")) setScreen("new");
    void cloudLoadProfile(id).then((r) => {
      if (!r) return;
      const merged = mergeProfiles(p, r.profile);
      saveProfile(merged);
      setProfile(merged);
      if (r.name) {
        setName(r.name);
        storeName(r.name);
      }
    });
    void cloudLoadSave(id).then((c) => {
      const local = loadRun();
      if (c?.data && c.data.phase !== "over" && (!local || c.data.updatedAt > local.updatedAt)) {
        saveRunLocal(c.data);
        setSaved(c.data);
      }
    });
  }, [params]);

  const maxStake = Math.min(8, 1 + Math.max(0, ...Object.values(profile?.maxStake ?? {})));

  const start = (opts: { seed: string; deck: string; stake: number; daily?: string }) => {
    sfx.win();
    const run = newRun({ ...opts, runId: crypto.randomUUID() });
    saveRunLocal(run);
    void cloudSave(getPid(), run);
    saveSettings({ ...loadSettings(), deck: opts.deck, stake: opts.stake });
    router.push("/play");
  };

  const deck = DECKS[deckIdx];

  const commitName = (n: string) => {
    const clean = n.replace(/[<>]/g, "").slice(0, 20) || getName();
    setName(clean);
    storeName(clean);
    if (profile) void cloudSaveProfile(pid, clean, profile);
  };

  const useCode = async () => {
    const c = code.trim().toLowerCase();
    if (!PID_RE.test(c)) {
      setCodeMsg(lang === "vi" ? "Mã không hợp lệ" : "Invalid code");
      return;
    }
    const prof = await cloudLoadProfile(c);
    const save = await cloudLoadSave(c);
    if (!prof && !save?.data) {
      setCodeMsg(lang === "vi" ? "Không tìm thấy dữ liệu cho mã này" : "No data found for this code");
      return;
    }
    setPid(c);
    setPidState(c);
    if (prof?.name) {
      storeName(prof.name);
      setName(prof.name);
    }
    const merged = mergeProfiles(loadProfile(), prof?.profile ?? {});
    saveProfile(merged);
    setProfile(merged);
    saveRunLocal(save?.data ?? null);
    setSaved(save?.data ?? null);
    setCodeMsg(lang === "vi" ? "Đã đồng bộ!" : "Synced!");
  };

  const daily = dailyConfig();

  return (
    <div className="menu-root">
      <Background colors={MENU_COLORS} />
      <div className="menu">
        <div className="logo">
          <div className="logo-main">
            {"BALATRO".split("").map((ch, i) => (
              <span key={i} style={{ animationDelay: `${i * 0.12}s` }}>
                {ch}
              </span>
            ))}
          </div>
          <div className="logo-sub">wiki · web edition</div>
        </div>

        {screen === "main" && (
          <div className="menu-panel">
            <div className="menu-btns">
              {saved && saved.phase !== "over" && (
                <button className="btn btn-blue mbtn" onClick={() => router.push("/play")}>
                  ▶ {t("continue")}
                  <small>
                    {t("ante")} {saved.ante} · {t("round")} {saved.round} · ${saved.money}
                  </small>
                </button>
              )}
              <button className="btn btn-orange mbtn" onClick={() => { sfx.click(); setScreen("new"); }}>
                {t("newRun")}
              </button>
              <button className="btn btn-red mbtn" onClick={() => start({ seed: daily.seed, deck: daily.deck, stake: daily.stake, daily: daily.day })}>
                ⭐ {t("daily")}
                <small>
                  {tx(DECKS.find((d) => d.key === daily.deck)!.name)} · {tx(STAKES[daily.stake - 1].name)}
                </small>
              </button>
              <div className="menu-row">
                <Link className="btn btn-green mbtn" href="/collection">
                  {t("collection")}
                </Link>
                <Link className="btn btn-purple mbtn" href="/leaderboard">
                  {t("leaderboard")}
                </Link>
              </div>
              <div className="menu-row">
                <button className="btn btn-grey mbtn" onClick={() => setScreen("how")}>
                  {t("howToPlay")}
                </button>
                <button className="btn btn-grey mbtn" onClick={() => setScreen("profile")}>
                  👤 {name}
                </button>
              </div>
            </div>
            {profile && (
              <div className="menu-stats">
                <span>
                  {t("runs")}: <b>{profile.runs}</b>
                </span>
                <span>
                  {t("wins")}: <b>{profile.wins}</b>
                </span>
                <span>
                  {t("bestAnte")}: <b>{profile.bestAnte}</b>
                </span>
                <span>
                  {t("bestHand")}: <b>{fmtNum(profile.bestHand)}</b>
                </span>
              </div>
            )}
            <div className="lang-switch">
              <button className={lang === "vi" ? "on" : ""} onClick={() => setLang("vi")}>
                VI
              </button>
              <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>
                EN
              </button>
            </div>
          </div>
        )}

        {screen === "new" && (
          <div className="menu-panel newrun">
            <div className="deck-pick">
              <button className="arrow" onClick={() => setDeckIdx((deckIdx + DECKS.length - 1) % DECKS.length)}>
                ◀
              </button>
              <div className="deck-show">
                <div className="deck-card" style={{ ["--deck" as string]: deck.color }}>
                  <span className="back-pattern" />
                </div>
                <div className="deck-info">
                  <div className="deck-name">{tx(deck.name)}</div>
                  <div className="deck-text">
                    <Rich text={deck.text[lang]} />
                  </div>
                  <div className="deck-dots">
                    {DECKS.map((d, i) => (
                      <span key={d.key} className={i === deckIdx ? "on" : ""} style={{ background: d.color }} onClick={() => setDeckIdx(i)} />
                    ))}
                  </div>
                </div>
              </div>
              <button className="arrow" onClick={() => setDeckIdx((deckIdx + 1) % DECKS.length)}>
                ▶
              </button>
            </div>
            <div className="stake-pick">
              <div className="lbl">{t("stake")}</div>
              <div className="stakes">
                {STAKES.map((s) => (
                  <button
                    key={s.n}
                    className={`stake-chip ${stake === s.n ? "on" : ""}`}
                    style={{ ["--sc" as string]: s.color }}
                    disabled={s.n > maxStake}
                    title={tx(s.name)}
                    onClick={() => setStake(s.n)}
                  >
                    {s.n > maxStake ? "🔒" : s.n}
                  </button>
                ))}
              </div>
              <div className="stake-desc">
                <b>{tx(STAKES[stake - 1].name)}</b>
                {STAKES.slice(1, stake).map((s) => (
                  <div key={s.n}>
                    • <Rich text={s.text[lang]} />
                  </div>
                ))}
                {stake === 1 && <div>{tx(STAKES[0].text)}</div>}
              </div>
            </div>
            <div className="seed-row">
              <input
                className="input"
                placeholder={t("customSeed")}
                value={seed}
                maxLength={8}
                onChange={(e) => setSeed(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              />
            </div>
            <div className="menu-row">
              <button className="btn btn-grey mbtn" onClick={() => setScreen("main")}>
                {t("back")}
              </button>
              <button className="btn btn-blue mbtn" onClick={() => start({ seed: seed || randomSeed(), deck: deck.key, stake: Math.min(stake, maxStake) })}>
                {t("play_")}
              </button>
            </div>
          </div>
        )}

        {screen === "how" && (
          <div className="menu-panel how">
            <HowToPlay />
            <button className="btn btn-orange mbtn" onClick={() => setScreen("main")}>
              {t("back")}
            </button>
          </div>
        )}

        {screen === "profile" && (
          <div className="menu-panel profile">
            <label className="lbl">{t("nickname")}</label>
            <input className="input" value={name} maxLength={20} onChange={(e) => setName(e.target.value)} onBlur={(e) => commitName(e.target.value)} />
            <label className="lbl">{t("syncCode")}</label>
            <div className="code-row">
              <code className="code">{pid}</code>
              <button
                className="btn btn-blue small"
                onClick={() => {
                  void navigator.clipboard?.writeText(pid).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
            <p className="hint">{t("syncHint")}</p>
            <div className="code-row">
              <input className="input" placeholder="xxxxxxxx-xxxx-…" value={code} onChange={(e) => setCode(e.target.value)} />
              <button className="btn btn-green small" onClick={() => void useCode()}>
                {t("useCode")}
              </button>
            </div>
            {codeMsg && <p className="hint">{codeMsg}</p>}
            <button className="btn btn-orange mbtn" onClick={() => { commitName(name); setScreen("main"); }}>
              {t("back")}
            </button>
          </div>
        )}
        <p className="disclaimer">{t("disclaimer")}</p>
      </div>
    </div>
  );
}

function HowToPlay() {
  const { lang } = useLang();
  if (lang === "en") {
    return (
      <div className="how-text">
        <h3>Goal</h3>
        <p>Beat 8 Antes. Each Ante has a Small Blind, a Big Blind and a Boss Blind. Score at least the required chips using your Hands.</p>
        <h3>Scoring</h3>
        <p>
          Select up to 5 cards and <b>Play</b> a poker hand. Score = <span className="rt rt-c">Chips</span> × <span className="rt rt-m">Mult</span>. Each hand type has base Chips and Mult; every scoring card adds its rank to Chips.
        </p>
        <p><b>Discard</b> up to 5 cards to draw new ones. Hands and discards are limited each round.</p>
        <h3>Jokers & Shop</h3>
        <p>After each Blind, cash out and visit the Shop. Buy Jokers (they trigger left to right — drag to reorder), Tarot cards to modify your deck, Planet cards to level up hands, and Vouchers for permanent upgrades.</p>
        <p>Skip a Blind to earn a Tag instead of money. Interest: $1 for every $5 you hold (max $5).</p>
        <h3>Controls</h3>
        <p>Tap/click cards to select. Drag cards or Jokers to reorder. Tap a Joker or consumable to see Sell/Use buttons.</p>
      </div>
    );
  }
  return (
    <div className="how-text">
      <h3>Mục tiêu</h3>
      <p>Vượt qua 8 Ante. Mỗi Ante có Mù Nhỏ, Mù Lớn và một Trùm. Dùng các lượt đánh để đạt đủ số điểm yêu cầu.</p>
      <h3>Cách tính điểm</h3>
      <p>
        Chọn tối đa 5 lá rồi bấm <b>Đánh bài</b>. Điểm = <span className="rt rt-c">Chip</span> × <span className="rt rt-m">Mult</span>. Mỗi loại tay bài (Đôi, Thùng, Sảnh…) có Chip và Mult gốc; mỗi lá tính điểm cộng thêm giá trị của nó vào Chip.
      </p>
      <p><b>Bỏ bài</b> tối đa 5 lá để rút lá mới. Số lượt đánh và lượt bỏ mỗi vòng có giới hạn.</p>
      <h3>Joker & Cửa hàng</h3>
      <p>Sau mỗi Blind, nhận tiền rồi vào Cửa hàng. Mua Joker (kích hoạt từ trái sang phải — kéo để đổi thứ tự), lá Tarot để biến đổi bộ bài, lá Hành Tinh để tăng cấp tay bài, và Phiếu để nâng cấp vĩnh viễn.</p>
      <p>Bỏ qua Blind để nhận Thẻ thưởng thay vì tiền. Tiền lãi: $1 cho mỗi $5 đang có (tối đa $5).</p>
      <h3>Điều khiển</h3>
      <p>Chạm/bấm vào lá để chọn. Kéo lá bài hoặc Joker để đổi chỗ. Chạm vào Joker hoặc lá tiêu hao để hiện nút Bán/Dùng.</p>
    </div>
  );
}
