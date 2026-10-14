"use client";

import { blindName, blindReward } from "@/game/engine";
import { HANDS } from "@/game/hands";
import { BOSS_MAP } from "@/game/meta";
import type { PreScore } from "@/game/scoring";
import type { Run } from "@/game/types";
import { fmtMoney, fmtNum } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { BlindChip, bossTip } from "../cards";
import { Rich } from "../Rich";
import type { AnimState } from "./Game";
import { PopLabel, usePop, useHoverTip } from "./ui";

interface Props {
  run: Run;
  preview: PreScore | null;
  hiddenPreview: boolean;
  anim: AnimState | null;
  openModal: (m: "info" | "deck" | "options") => void;
  saveState: "saved" | "saving" | "offline";
}

export function Sidebar({ run, preview, hiddenPreview, anim, openModal, saveState }: Props) {
  const { t, tx, lang } = useLang();
  const inRound = run.phase === "play" || run.phase === "scoring" || (run.phase === "over" && run.target > 0);
  const boss = BOSS_MAP[run.boss];
  const handPop = usePop("hand:");
  const deckPop = usePop("deck:");
  const bossHover = useHoverTip(() => (run.blind === 2 ? bossTip(run.boss, lang) : null));

  // Hand display
  let handName = "";
  let level = 0;
  let chips: number | string = 0;
  let mult: number | string = 0;
  if (run.phase === "scoring" && run.lastPlay) {
    handName = tx(HANDS[run.lastPlay.hand].name);
    level = run.lastPlay.level;
    chips = anim?.started ? anim.c : run.lastPlay.baseChips;
    mult = anim?.started ? anim.m : run.lastPlay.baseMult;
  } else if (preview) {
    handName = tx(HANDS[preview.type].name);
    level = preview.level;
    chips = preview.chips;
    mult = preview.mult;
  } else if (hiddenPreview) {
    handName = "???";
    chips = "?";
    mult = "?";
  }
  const showTotal = run.phase === "scoring" && anim?.done;
  const shownRound = run.phase === "scoring" && run.lastPlay && !anim?.done ? run.roundScore - run.lastPlay.total : run.roundScore;
  const shownMoney = run.phase === "scoring" && anim ? run.money - anim.money : run.money;
  const blindColor = run.blind === 2 ? boss?.color ?? "#a33" : run.blind === 1 ? "#e9a23b" : "#3c7fd1";

  return (
    <aside className="sidebar">
      <div className="sb-blind" style={{ ["--bcol" as string]: inRound ? blindColor : "#3d5a63" }}>
        {inRound ? (
          <>
            <div className="sb-blind-name">{tx(blindName(run, run.blind))}</div>
            <div className="sb-blind-body">
              <span {...bossHover}>
                <BlindChip blind={run.blind} boss={run.boss} size={70} />
              </span>
              <div className="sb-target">
                <div className="lbl">{t("scoreAtLeast")}</div>
                <div className="sb-target-num">
                  <span className="chip-ico">●</span>
                  {fmtNum(run.target)}
                </div>
                <div className="lbl">
                  {t("reward")}: <span className="money">{"$".repeat(Math.min(8, blindReward(run, run.blind))) || "-"}</span>
                </div>
              </div>
            </div>
            {run.blind === 2 && boss && !run.bossDisabled && (
              <div className="sb-boss-text">
                <Rich text={boss.text[lang]} />
              </div>
            )}
          </>
        ) : (
          <div className="sb-phase-title">
            {run.phase === "shop" || run.phase === "pack" ? (
              <>
                <div className="sb-shop-logo">{t("shop").toUpperCase()}</div>
                <div className="lbl">{t("improveRun")}</div>
              </>
            ) : run.phase === "cashout" ? (
              <div className="sb-shop-logo">{t("cashOut")}</div>
            ) : (
              <div className="sb-choose">{t("chooseBlind")}</div>
            )}
          </div>
        )}
      </div>

      <div className="sb-round">
        <div className="lbl">{t("roundScore")}</div>
        <div className="sb-round-num">
          <span className="chip-ico">●</span>
          {fmtNum(Math.max(0, shownRound))}
        </div>
      </div>

      <div className={`sb-hand ${showTotal ? "total" : ""}`}>
        <div className="sb-hand-name">
          {handName ? (
            <>
              <span>{handName}</span>
              {level > 0 && <span className="lvl"> {t("lvl")}{level}</span>}
            </>
          ) : (
            <span>&nbsp;</span>
          )}
          <PopLabel pop={handPop} />
        </div>
        {showTotal ? (
          <div className="sb-total">{fmtNum(run.lastPlay?.total ?? 0)}</div>
        ) : (
          <div className="sb-cm">
            <div className={`box chips ${anim?.started ? "pulse" : ""}`} key={`c${chips}`}>
              {typeof chips === "number" ? fmtNum(chips) : chips}
            </div>
            <span className="x">X</span>
            <div className={`box mult ${anim?.started ? "pulse" : ""}`} key={`m${mult}`}>
              {typeof mult === "number" ? fmtNum(mult) : mult}
            </div>
          </div>
        )}
      </div>

      <div className="sb-bottom">
        <div className="sb-btns">
          <button className="btn btn-red tall" onClick={() => openModal("info")}>
            {t("runInfo")}
          </button>
          <button className="btn btn-orange tall" onClick={() => openModal("options")}>
            {t("options")}
          </button>
        </div>
        <div className="sb-stats">
          <div className="stat">
            <div className="lbl">{t("hands")}</div>
            <div className="val chips-t">{run.hands}</div>
          </div>
          <div className="stat">
            <div className="lbl">{t("discards")}</div>
            <div className="val mult-t">{run.discards}</div>
          </div>
          <div className="stat wide">
            <div className="val money-t">{fmtMoney(shownMoney)}</div>
            <PopLabel pop={deckPop} />
          </div>
          <div className="stat">
            <div className="lbl">{t("ante")}</div>
            <div className="val ante-t">
              {run.ante}
              <small>/{run.winAnte}</small>
            </div>
          </div>
          <div className="stat">
            <div className="lbl">{t("round")}</div>
            <div className="val ante-t">{run.round}</div>
          </div>
        </div>
      </div>
      <div className={`save-state ${saveState}`}>{saveState === "saved" ? `☁ ${t("saved")}` : saveState === "saving" ? t("saving") : t("offline")}</div>
    </aside>
  );
}
