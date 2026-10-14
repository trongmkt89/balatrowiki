"use client";

import { useState } from "react";
import { isStone, SUIT_SYM, SUITS } from "@/game/cards";
import { blindName, blindReward, blindTarget } from "@/game/engine";
import { HAND_ORDER, HANDS, handValue } from "@/game/hands";
import { BOSS_MAP, DECK_MAP, STAKES, TAG_MAP, VOUCHER_MAP } from "@/game/meta";
import type { Card, Run } from "@/game/types";
import { fmtNum } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import type { Settings } from "@/lib/storage";
import { BlindChip, PlayingCard, TagBadge, VoucherCard } from "../cards";
import { Rich } from "../Rich";

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const { t } = useLang();
  return (
    <div className="modal-back" onClick={onClose}>
      <div className={`modal ${wide ? "wide" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        <div className="modal-body">{children}</div>
        <button className="btn btn-orange modal-close" onClick={onClose}>
          {t("back")}
        </button>
      </div>
    </div>
  );
}

export function RunInfoModal({ run, onClose }: { run: Run; onClose: () => void }) {
  const { t, tx, lang } = useLang();
  const [tab, setTab] = useState<"hands" | "blinds" | "vouchers">("hands");
  const hands = HAND_ORDER.filter((h) => !HANDS[h].secret || run.playCount[h] > 0 || run.levels[h] > 1);
  return (
    <Modal title={t("runInfo")} onClose={onClose} wide>
      <div className="tabs">
        {(["hands", "blinds", "vouchers"] as const).map((k) => (
          <button key={k} className={`tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>
            {t(k === "hands" ? "pokerHands" : k)}
          </button>
        ))}
      </div>
      {tab === "hands" && (
        <div className="hand-table">
          {hands.map((h) => {
            const v = handValue(h, run.levels[h]);
            return (
              <div key={h} className="ht-row">
                <span className="ht-lvl">
                  {t("lvl")}
                  {run.levels[h]}
                </span>
                <span className="ht-name">{tx(HANDS[h].name)}</span>
                <span className="box chips sm">{fmtNum(v.chips)}</span>
                <span className="x">X</span>
                <span className="box mult sm">{fmtNum(v.mult)}</span>
                <span className="ht-played">#{run.playCount[h]}</span>
              </div>
            );
          })}
        </div>
      )}
      {tab === "blinds" && (
        <div className="info-blinds">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ib-row">
              <BlindChip blind={i} boss={run.boss} size={52} />
              <div className="ib-text">
                <div className="ib-name">{tx(blindName(run, i))}</div>
                {i === 2 && <Rich text={BOSS_MAP[run.boss]?.text[lang] ?? ""} />}
              </div>
              <div className="ib-score">
                <span className="chip-ico">●</span>
                {fmtNum(blindTarget(run, i))}
              </div>
              <div className="money">{"$".repeat(blindReward(run, i)) || "-"}</div>
            </div>
          ))}
          <div className="ib-meta">
            <span>
              {tx(DECK_MAP[run.deck]?.name)} · {tx(STAKES[run.stake - 1]?.name)} · {t("seed")}: <b>{run.seed}</b>
            </span>
          </div>
          {run.tags.length > 0 && (
            <div className="ib-tags">
              {run.tags.map((tg) => (
                <span key={tg.id} className="ib-tag">
                  <TagBadge tag={tg.key} /> <Rich text={TAG_MAP[tg.key]?.text[lang] ?? ""} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      {tab === "vouchers" && (
        <div className="info-vouchers">
          {run.vouchers.length === 0 && <div className="lbl">—</div>}
          {run.vouchers.map((v) => (
            <div key={v} className="iv-row">
              <VoucherCard voucher={v} lang={lang} />
              <Rich text={VOUCHER_MAP[v].text[lang]} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function DeckModal({ run, onClose }: { run: Run; onClose: () => void }) {
  const { t } = useLang();
  const inRound = run.phase === "play" || run.phase === "scoring" || !!run.pack?.drew;
  const drawSet = new Set(run.draw);
  const [onlyRemaining, setOnly] = useState(false);
  const show = (c: Card) => !onlyRemaining || !inRound || drawSet.has(c.id);
  const bySuit = SUITS.map((s) => run.cards.filter((c) => c.suit === s && !isStone(c)).sort((a, b) => b.rank - a.rank));
  const stones = run.cards.filter(isStone);
  return (
    <Modal title={`${t("fullDeck")} (${run.cards.length})`} onClose={onClose} wide>
      {inRound && (
        <div className="tabs">
          <button className={`tab ${!onlyRemaining ? "on" : ""}`} onClick={() => setOnly(false)}>
            {t("fullDeck")}
          </button>
          <button className={`tab ${onlyRemaining ? "on" : ""}`} onClick={() => setOnly(true)}>
            {t("remaining")} ({run.draw.length})
          </button>
        </div>
      )}
      <div className="deck-grid">
        {bySuit.map((cards, i) => (
          <div key={SUITS[i]} className="dg-row">
            <span className={`dg-suit suit-${SUITS[i]}`}>
              {SUIT_SYM[SUITS[i]]} {cards.filter((c) => !inRound || drawSet.has(c.id)).length}
            </span>
            <div className="dg-cards">
              {cards.filter(show).map((c) => (
                <div key={c.id} className={`mini ${inRound && !drawSet.has(c.id) ? "used" : ""}`}>
                  <PlayingCard card={c} />
                </div>
              ))}
            </div>
          </div>
        ))}
        {stones.length > 0 && (
          <div className="dg-row">
            <span className="dg-suit">🥌 {stones.length}</span>
            <div className="dg-cards">
              {stones.filter(show).map((c) => (
                <div key={c.id} className={`mini ${inRound && !drawSet.has(c.id) ? "used" : ""}`}>
                  <PlayingCard card={c} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function OptionsModal({ settings, update, onClose, onMenu, onAbandon }: { settings: Settings; update: (p: Settings) => void; onClose: () => void; onMenu: () => void; onAbandon: () => void }) {
  const { t, lang, setLang } = useLang();
  const [confirm, setConfirm] = useState(false);
  return (
    <Modal title={t("options")} onClose={onClose}>
      <div className="opt-row">
        <span>{t("speed")}</span>
        <div className="seg">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} className={`seg-b ${settings.speed === n ? "on" : ""}`} onClick={() => update({ speed: n })}>
              {n}x
            </button>
          ))}
        </div>
      </div>
      <div className="opt-row">
        <span>{t("sound")}</span>
        <div className="seg">
          <button className={`seg-b ${settings.sound !== false ? "on" : ""}`} onClick={() => update({ sound: true })}>
            {t("on")}
          </button>
          <button className={`seg-b ${settings.sound === false ? "on" : ""}`} onClick={() => update({ sound: false })}>
            {t("off")}
          </button>
        </div>
      </div>
      <div className="opt-row">
        <span>{t("language")}</span>
        <div className="seg">
          <button className={`seg-b ${lang === "vi" ? "on" : ""}`} onClick={() => setLang("vi")}>
            Tiếng Việt
          </button>
          <button className={`seg-b ${lang === "en" ? "on" : ""}`} onClick={() => setLang("en")}>
            English
          </button>
        </div>
      </div>
      <div className="opt-row">
        <span>{t("contrast")}</span>
        <div className="seg">
          <button
            className={`seg-b ${settings.contrast ? "on" : ""}`}
            onClick={() => {
              update({ contrast: true });
              document.documentElement.dataset.contrast = "1";
            }}
          >
            {t("on")}
          </button>
          <button
            className={`seg-b ${!settings.contrast ? "on" : ""}`}
            onClick={() => {
              update({ contrast: false });
              delete document.documentElement.dataset.contrast;
            }}
          >
            {t("off")}
          </button>
        </div>
      </div>
      <div className="opt-btns">
        <button className="btn btn-blue" onClick={onMenu}>
          {t("mainMenu")}
        </button>
        {!confirm ? (
          <button className="btn btn-red" onClick={() => setConfirm(true)}>
            {t("abandon")}
          </button>
        ) : (
          <button className="btn btn-red" onClick={onAbandon}>
            {t("abandonConfirm")}
          </button>
        )}
      </div>
    </Modal>
  );
}
