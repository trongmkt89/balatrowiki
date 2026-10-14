"use client";

import Link from "next/link";
import { cardsByIds } from "@/game/cards";
import { CONS_MAP } from "@/game/consumables";
import { type Action, blindName, blindReward, blindTarget, bossRerollAvailable, rerollCost } from "@/game/engine";
import { HANDS } from "@/game/hands";
import { BOSS_MAP, PACK_MAP } from "@/game/meta";
import * as ops from "@/game/ops";
import type { Run, ShopItem } from "@/game/types";
import { fmtNum } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { sfx } from "@/lib/sound";
import {
  BlindChip,
  cardTip,
  ConsCard,
  consTip,
  JokerCard,
  jokerTip,
  PackCard,
  packTip,
  PlayingCard,
  TagBadge,
  tagTip,
  type Tip,
  VoucherCard,
  voucherTip,
} from "../cards";
import { Rich } from "../Rich";
import type { Focus } from "./Game";
import { useHoverTip, useTip } from "./ui";

type SetFocus = React.Dispatch<React.SetStateAction<Focus>>;

/* ---------------- Blind select ---------------- */

export function BlindSelect({ run, act }: { run: Run; act: (a: Action) => void }) {
  const { t, tx, lang } = useLang();
  return (
    <div className="panel blindselect">
      {[0, 1, 2].map((i) => {
        const status = run.blindStatus[i];
        const boss = BOSS_MAP[run.boss];
        const tag = i < 2 ? run.skipTags[i] : "";
        return (
          <div key={i} className={`blindcol st-${status} ${i === 2 ? "boss" : ""}`} style={{ ["--bcol" as string]: i === 2 ? boss?.color : i === 1 ? "#e9a23b" : "#3c7fd1" }}>
            <div className="bc-top">
              {status === "current" ? (
                <button className="btn btn-orange" onClick={() => { sfx.click(); act({ t: "selectBlind" }); }}>
                  {t("select")}
                </button>
              ) : (
                <div className="bc-status">{t(status === "upcoming" ? "upcoming" : status === "defeated" ? "defeated" : status === "skipped" ? "skipped" : "current")}</div>
              )}
            </div>
            <div className="bc-name">{tx(blindName(run, i))}</div>
            <BlindChip blind={i} boss={run.boss} size={84} />
            {i === 2 && boss && (
              <div className="bc-desc">
                <Rich text={boss.text[lang]} />
              </div>
            )}
            <div className="bc-score">
              <div className="lbl">{t("scoreAtLeast")}</div>
              <div className="bc-target">
                <span className="chip-ico">●</span>
                {fmtNum(blindTarget(run, i))}
              </div>
              <div className="lbl">
                {t("reward")}: <span className="money">{"$".repeat(blindReward(run, i)) || "-"}</span>
              </div>
            </div>
            {i < 2 && tag && (
              <div className="bc-skip">
                <span className="lbl">{t("or")}</span>
                <TagHover tag={tag} />
                <button className="btn btn-red small" disabled={status !== "current"} onClick={() => { sfx.click(); act({ t: "skipBlind" }); }}>
                  {t("skipBlind")}
                </button>
              </div>
            )}
            {i === 2 && bossRerollAvailable(run) && (
              <button className="btn btn-red small" disabled={!ops.canAfford(run, 10)} onClick={() => act({ t: "rerollBoss" })}>
                {t("rerollBoss")} $10
              </button>
            )}
          </div>
        );
      })}
      {run.tags.length > 0 && (
        <div className="held-tags">
          {run.tags.map((tg) => (
            <TagHover key={tg.id} tag={tg.key} />
          ))}
        </div>
      )}
    </div>
  );
}

function TagHover({ tag }: { tag: string }) {
  const { lang } = useLang();
  const { show, hide } = useTip();
  const hover = useHoverTip(() => tagTip(tag, lang));
  return (
    <span
      {...hover}
      onClick={(e) => {
        show(e.currentTarget, tagTip(tag, lang), true);
        setTimeout(() => hide(), 2500);
      }}
    >
      <TagBadge tag={tag} />
    </span>
  );
}

/* ---------------- Cashout ---------------- */

export function CashoutPanel({ run, act }: { run: Run; act: (a: Action) => void }) {
  const { t, tx } = useLang();
  const co = run.cashout;
  if (!co) return null;
  return (
    <div className="panel cashout">
      <button
        className="btn btn-orange cash-btn"
        onClick={() => {
          sfx.money();
          act({ t: "cashOut" });
        }}
      >
        {t("cashOut")}: ${co.total}
      </button>
      <div className="co-lines">
        {co.lines.map((l, i) => (
          <div key={i} className={`co-line ${l.tone ?? ""}`}>
            <span className="co-label">{tx(l.label)}</span>
            <span className="co-dots" />
            <span className="money">{l.amount > 0 ? (l.amount <= 10 ? "$".repeat(l.amount) : `$${l.amount}`) : "-"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Shop ---------------- */

function itemTip(run: Run, it: ShopItem, lang: "en" | "vi"): Tip {
  switch (it.kind) {
    case "joker":
      return jokerTip(it.joker, run, lang);
    case "cons":
      return consTip(it.cons.key, lang, run, it.cons.neg);
    case "card":
      return cardTip(it.card, lang);
    case "pack":
      return packTip(it.pack, lang);
    case "voucher":
      return voucherTip(it.voucher, lang);
  }
}

function ItemView({ it, lang }: { it: ShopItem; lang: "en" | "vi" }) {
  switch (it.kind) {
    case "joker":
      return <JokerCard joker={it.joker} />;
    case "cons":
      return <ConsCard cons={it.cons} lang={lang} />;
    case "card":
      return <PlayingCard card={it.card} />;
    case "pack":
      return <PackCard pack={it.pack} lang={lang} />;
    case "voucher":
      return <VoucherCard voucher={it.voucher} lang={lang} />;
  }
}

function ShopSlot({ run, it, focused, onTap, children, showPrice = true }: { run: Run; it: ShopItem; focused: boolean; onTap: (el: HTMLElement) => void; children?: React.ReactNode; showPrice?: boolean }) {
  const { lang } = useLang();
  const hover = useHoverTip(() => itemTip(run, it, lang));
  return (
    <div className={`shopslot k-${it.kind} ${focused ? "focused" : ""}`}>
      {showPrice && <div className={`price ${ops.canAfford(run, it.cost) ? "" : "poor"}`}>${it.cost}</div>}
      <div className="shopcard" {...hover} onClick={(e) => onTap(e.currentTarget)}>
        <ItemView it={it} lang={lang} />
      </div>
      {focused && <div className="slot-actions">{children}</div>}
    </div>
  );
}

export function ShopPanel({ run, act, focus, setFocus }: { run: Run; act: (a: Action) => void; focus: Focus; setFocus: SetFocus }) {
  const { t, lang } = useLang();
  const { show, hide } = useTip();
  const shop = run.shop;
  if (!shop) return null;
  const cost = rerollCost(run);
  const focusedUid = focus?.kind === "shop" ? focus.id : -1;

  const tap = (it: ShopItem, el: HTMLElement) => {
    sfx.click();
    if (focusedUid === it.uid) {
      setFocus(null);
      hide(el);
    } else {
      setFocus({ kind: "shop", id: it.uid });
      show(el, itemTip(run, it, lang), true);
    }
  };

  const buyButtons = (it: ShopItem) => {
    const afford = ops.canAfford(run, it.cost);
    let room = true;
    if (it.kind === "joker") room = ops.canAddJoker(run, it.joker);
    if (it.kind === "cons") room = ops.canAddCons(run, it.cons.neg);
    const def = it.kind === "cons" ? CONS_MAP[it.cons.key] : null;
    const canUseNow = def && !def.select && (!def.canUse || def.canUse(run, [], ops.consSlots(run) - run.cons.length));
    const buy = (use = false) => {
      sfx.buy();
      act({ t: "buy", uid: it.uid, use });
      setFocus(null);
      hide();
    };
    const label = it.kind === "pack" ? t("open") : it.kind === "voucher" ? t("redeem") : t("buy");
    return (
      <>
        <button className="btn btn-green" disabled={!afford || !room} onClick={() => buy(false)}>
          {!afford ? t("tooPoor") : !room ? t("noRoom") : label}
        </button>
        {canUseNow && (
          <button className="btn btn-red" disabled={!afford} onClick={() => buy(true)}>
            {t("buyUse")}
          </button>
        )}
      </>
    );
  };

  return (
    <div className="panel shop">
      <div className="shop-top">
        <div className="shop-left">
          <button
            className="btn btn-red tall"
            onClick={() => {
              sfx.click();
              act({ t: "nextRound" });
            }}
          >
            {t("nextRound")}
          </button>
          <button
            className="btn btn-green tall"
            disabled={!ops.canAfford(run, cost)}
            onClick={() => {
              sfx.click();
              act({ t: "reroll" });
            }}
          >
            {t("reroll")}
            <br />
            <span className="money-big">${cost}</span>
          </button>
        </div>
        <div className="shop-items">
          {shop.items.map((it) => (
            <ShopSlot key={it.uid} run={run} it={it} focused={focusedUid === it.uid} onTap={(el) => tap(it, el)}>
              {buyButtons(it)}
            </ShopSlot>
          ))}
        </div>
      </div>
      <div className="shop-bottom">
        <div className="shop-vouchers">
          {shop.vouchers.length ? (
            shop.vouchers.map((it) => (
              <ShopSlot key={it.uid} run={run} it={it} focused={focusedUid === it.uid} onTap={(el) => tap(it, el)}>
                {buyButtons(it)}
              </ShopSlot>
            ))
          ) : (
            <div className="empty-voucher">{t("vouchers")}</div>
          )}
        </div>
        <div className="shop-packs">
          {shop.packs.map((it) => (
            <ShopSlot key={it.uid} run={run} it={it} focused={focusedUid === it.uid} onTap={(el) => tap(it, el)}>
              {buyButtons(it)}
            </ShopSlot>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Booster packs ---------------- */

export function PackPanel({ run, act, focus, setFocus, sel, setSel }: { run: Run; act: (a: Action) => void; focus: Focus; setFocus: SetFocus; sel: number[]; setSel: React.Dispatch<React.SetStateAction<number[]>> }) {
  const { t, tx, lang } = useLang();
  const { show, hide } = useTip();
  const pack = run.pack;
  if (!pack) return null;
  const def = PACK_MAP[pack.key];
  const focusedUid = focus?.kind === "pack" ? focus.id : -1;

  const canPick = (it: ShopItem): boolean => {
    if (it.kind === "joker") return ops.canAddJoker(run, it.joker);
    if (it.kind === "cons") {
      const d = CONS_MAP[it.cons.key];
      const cards = cardsByIds(run, sel);
      if (d.select && (cards.length < d.select[0] || cards.length > d.select[1])) return false;
      return d.canUse ? d.canUse(run, cards, ops.consSlots(run) - run.cons.length) : true;
    }
    return true;
  };

  return (
    <div className={`panel pack ${pack.drew ? "with-hand" : ""}`}>
      <div className="pack-head">
        <span className="pack-title">{tx(def.name)}</span>
        <span className="pack-picks">
          {t("choose")} {pack.picks}
        </span>
      </div>
      <div className="pack-options">
        {pack.options.map((it) => (
          <ShopSlot
            key={it.uid}
            run={run}
            it={it}
            showPrice={false}
            focused={focusedUid === it.uid}
            onTap={(el) => {
              sfx.click();
              if (focusedUid === it.uid) {
                setFocus(null);
                hide(el);
              } else {
                setFocus({ kind: "pack", id: it.uid });
                show(el, itemTip(run, it, lang), true);
              }
            }}
          >
            <button
              className="btn btn-green"
              disabled={!canPick(it)}
              onClick={() => {
                sfx.buy();
                act({ t: "pickPack", uid: it.uid, sel });
                setSel([]);
                setFocus(null);
                hide();
              }}
            >
              {it.kind === "cons" ? t("use") : it.kind === "joker" && !ops.canAddJoker(run, it.joker) ? t("noRoom") : t("take")}
            </button>
          </ShopSlot>
        ))}
      </div>
      <div className="pack-foot">
        {pack.drew && focusedUid > 0 && <span className="lbl">{t("selectCards")}</span>}
        <button
          className="btn btn-grey"
          onClick={() => {
            sfx.click();
            act({ t: "skipPack" });
            hide();
          }}
        >
          {t("skip")}
        </button>
      </div>
    </div>
  );
}

/* ---------------- End screens ---------------- */

function RunStats({ run }: { run: Run }) {
  const { t, tx } = useLang();
  const fav = ops.mostPlayed(run);
  return (
    <div className="end-stats">
      <div className="es-row big">
        <span>{t("bestHand")}</span>
        <span className="es-val">{fmtNum(run.stats.bestHand)}</span>
      </div>
      <div className="es-row">
        <span>{t("mostPlayed")}</span>
        <span className="es-val">
          {tx(HANDS[fav].name)} ({run.playCount[fav]})
        </span>
      </div>
      <div className="es-row">
        <span>{t("cardsPlayed")}</span>
        <span className="es-val chips-t">{run.stats.cardsPlayed}</span>
      </div>
      <div className="es-row">
        <span>{t("cardsDiscarded")}</span>
        <span className="es-val mult-t">{run.stats.cardsDiscarded}</span>
      </div>
      <div className="es-row">
        <span>{t("purchases")}</span>
        <span className="es-val money-t">{run.stats.purchases}</span>
      </div>
      <div className="es-row">
        <span>{t("rerolls")}</span>
        <span className="es-val">{run.stats.rerolls}</span>
      </div>
      <div className="es-row">
        <span>
          {t("ante")} / {t("round")}
        </span>
        <span className="es-val">
          {run.ante} / {run.round}
        </span>
      </div>
      <div className="es-row">
        <span>{t("seed")}</span>
        <span className="es-val seed">{run.seed}</span>
      </div>
    </div>
  );
}

export function OverPanel({ run }: { run: Run }) {
  const { t, tx } = useLang();
  const killer = run.blind === 2 ? BOSS_MAP[run.boss] : null;
  return (
    <div className="panel endpanel over">
      <div className="end-title">{t("gameOver")}</div>
      {killer && (
        <div className="end-killer">
          <BlindChip blind={2} boss={run.boss} size={48} /> {tx(killer.name)}
        </div>
      )}
      <RunStats run={run} />
      <div className="end-btns">
        <Link className="btn btn-orange" href="/?new=1">
          {t("newRun")}
        </Link>
        <Link className="btn btn-blue" href="/leaderboard">
          {t("leaderboard")}
        </Link>
        <Link className="btn btn-grey" href="/">
          {t("mainMenu")}
        </Link>
      </div>
    </div>
  );
}

export function WinPanel({ run, act }: { run: Run; act: (a: Action) => void }) {
  const { t } = useLang();
  return (
    <div className="panel endpanel win">
      <div className="end-title win">{t("youWin")}</div>
      <RunStats run={run} />
      <div className="end-btns">
        <button className="btn btn-orange" onClick={() => act({ t: "endless" })}>
          {t("endless")}
        </button>
        <Link className="btn btn-blue" href="/?new=1">
          {t("newRun")}
        </Link>
        <Link className="btn btn-grey" href="/leaderboard">
          {t("leaderboard")}
        </Link>
      </div>
    </div>
  );
}

