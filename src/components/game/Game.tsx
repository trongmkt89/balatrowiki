"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cardsByIds } from "@/game/cards";
import { CONS_MAP } from "@/game/consumables";
import { type Action, consUsable, reduce } from "@/game/engine";
import * as ops from "@/game/ops";
import { isDebuffed, previewHand } from "@/game/scoring";
import type { Run, ScoreEvent } from "@/game/types";
import { cloudLoadSave, cloudSave, cloudSaveProfile, submitRun } from "@/lib/api";
import { fmtNum } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { setSoundEnabled, sfx } from "@/lib/sound";
import { getName, getPid, loadProfile, loadRun, loadSettings, mergeProfiles, saveProfile, saveRunLocal, saveSettings, type Settings } from "@/lib/storage";
import { Background, bgColorsFor } from "../Background";
import { cardTip, consTip, ConsCard, jokerTip, JokerCard, PlayingCard, sellText } from "../cards";
import { DragRow } from "./DragRow";
import { DeckModal, OptionsModal, RunInfoModal } from "./Modals";
import { BlindSelect, CashoutPanel, OverPanel, PackPanel, ShopPanel, WinPanel } from "./Panels";
import { Sidebar } from "./Sidebar";
import { type Pop, PopLabel, PopProvider, Stage, usePop, useStage, useTip } from "./ui";

export type Focus = { kind: "joker" | "cons" | "shop" | "pack"; id: number } | null;

export const LAYOUT = {
  landscape: { cw: 96, ch: 134, jokersW: 620, consW: 250, handW: 820, handH: 200, playW: 820 },
  portrait: { cw: 84, ch: 118, jokersW: 452, consW: 220, handW: 690, handH: 190, playW: 690 },
};

export interface AnimState {
  c: number;
  m: number;
  done: boolean;
  total: number;
  money: number;
  started: boolean;
}

export default function Game() {
  const router = useRouter();
  const [run, setRun] = useState<Run | null>(null);
  const [settings, setSettingsState] = useState<Settings>({ speed: 2, sound: true });
  const [sel, setSel] = useState<number[]>([]);
  const [focus, setFocus] = useState<Focus>(null);
  const [modal, setModal] = useState<"info" | "deck" | "options" | null>(null);
  const [anim, setAnim] = useState<AnimState | null>(null);
  const [pops, setPops] = useState<Record<string, Pop>>({});
  const [saveState, setSaveState] = useState<"saved" | "saving" | "offline">("saved");
  const runRef = useRef<Run | null>(null);
  runRef.current = run;
  const popN = useRef(1);
  const lastFx = useRef(0);

  /* ---------- Load ---------- */
  useEffect(() => {
    const st = { speed: 2, sound: true, ...loadSettings() };
    setSettingsState(st);
    setSoundEnabled(st.sound !== false);
    const local = loadRun();
    if (local) {
      setRun(local);
      lastFx.current = Math.max(0, ...local.fx.map((f) => f.id));
    }
    const pid = getPid();
    void cloudLoadSave(pid).then((cloud) => {
      if (cloud?.data && cloud.data.phase !== "over" && (!local || cloud.data.updatedAt > local.updatedAt + 1000)) {
        lastFx.current = Math.max(0, ...cloud.data.fx.map((f) => f.id));
        setRun(cloud.data);
        saveRunLocal(cloud.data);
      } else if (!local) router.replace("/");
    });
  }, [router]);

  const updateSettings = useCallback((patch: Settings) => {
    setSettingsState((s) => {
      const next = { ...s, ...patch };
      saveSettings({ ...loadSettings(), ...next });
      setSoundEnabled(next.sound !== false);
      return next;
    });
  }, []);

  const act = useCallback((a: Action) => {
    setRun((r) => (r ? reduce(r, a) : r));
  }, []);

  /* ---------- Persist ---------- */
  const cloudTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!run || run.phase === "scoring") return;
    if (run.phase === "over") {
      saveRunLocal(null);
      void cloudSave(getPid(), null);
      return;
    }
    saveRunLocal(run);
    setSaveState("saving");
    if (cloudTimer.current) clearTimeout(cloudTimer.current);
    cloudTimer.current = setTimeout(() => {
      void cloudSave(getPid(), run).then((ok) => setSaveState(ok ? "saved" : "offline"));
    }, 1200);
  }, [run]);

  /* ---------- Run end bookkeeping ---------- */
  const prevPhase = useRef<string>("");
  useEffect(() => {
    if (!run) return;
    const prev = prevPhase.current;
    prevPhase.current = run.phase;
    if (!prev || prev === run.phase) return;
    const ended = run.phase === "over" && prev !== "over";
    const won = run.phase === "won" && prev !== "won";
    if (!ended && !won) return;
    if (ended) sfx.lose();
    else sfx.win();
    const pid = getPid();
    const name = getName();
    const p = mergeProfiles(loadProfile(), {});
    p.discovered = [...new Set([...p.discovered, ...run.stats.jokersSeen])];
    if (won || !run.endless) p.runs += 1;
    if (won) p.wins += 1;
    p.bestAnte = Math.max(p.bestAnte, run.ante);
    p.bestHand = Math.max(p.bestHand, run.stats.bestHand);
    if (won) p.maxStake[run.deck] = Math.max(p.maxStake[run.deck] ?? 0, run.stake);
    saveProfile(p);
    void cloudSaveProfile(pid, name, p);
    const fav = ops.mostPlayed(run);
    void submitRun({
      runId: run.runId,
      pid,
      name,
      seed: run.seed,
      deck: run.deck,
      stake: run.stake,
      ante: run.ante,
      round: run.round,
      bestHand: run.stats.bestHand,
      won: won || run.endless,
      jokers: run.jokers.map((j) => j.key),
      favHand: fav,
      daily: run.daily,
    });
  }, [run]);

  /* ---------- Phase changes reset UI selection ---------- */
  const phaseKey = run ? `${run.phase}:${run.round}:${run.pack?.key ?? ""}` : "";
  useEffect(() => {
    setSel([]);
    setFocus(null);
  }, [phaseKey]);

  // Keep forced (Cerulean Bell) card selected, drop ids no longer in hand.
  useEffect(() => {
    if (!run) return;
    setSel((cur) => {
      let next = cur.filter((id) => run.hand.includes(id));
      if (run.forced && run.hand.includes(run.forced) && !next.includes(run.forced) && run.phase === "play") next = [run.forced, ...next].slice(0, 5);
      return next.length === cur.length && next.every((x, i) => x === cur[i]) ? cur : next;
    });
    setFocus((f) => {
      if (!f) return f;
      if (f.kind === "joker" && !run.jokers.some((j) => j.id === f.id)) return null;
      if (f.kind === "cons" && !run.cons.some((c) => c.id === f.id)) return null;
      if (f.kind === "shop" && !(run.shop && [...run.shop.items, ...run.shop.packs, ...run.shop.vouchers].some((x) => x.uid === f.id))) return null;
      if (f.kind === "pack" && !run.pack?.options.some((x) => x.uid === f.id)) return null;
      return f;
    });
  }, [run]);

  /* ---------- Transient fx popups ---------- */
  useEffect(() => {
    if (!run) return;
    const fresh = run.fx.filter((f) => f.id > lastFx.current);
    if (!fresh.length) return;
    lastFx.current = Math.max(...fresh.map((f) => f.id));
    setPops((p) => {
      const next = { ...p };
      for (const f of fresh) next[`${f.at}:${f.ref ?? ""}`] = { text: f.text, tone: f.tone ?? "info", n: popN.current++ };
      return next;
    });
    if (fresh.some((f) => f.tone === "money")) sfx.money();
  }, [run]);

  /* ---------- Scoring animation ---------- */
  const scoringKey = run?.phase === "scoring" ? `${run.stats.handsPlayed}:${run.round}` : "";
  useEffect(() => {
    const r = runRef.current;
    if (!scoringKey || !r?.lastPlay) {
      setAnim(null);
      return;
    }
    const lp = r.lastPlay;
    const speed = settings.speed ?? 2;
    let i = 0;
    let money = lp.events.reduce((a, e) => a + (e.money ?? 0), 0);
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    let chipStep = 0;
    setAnim({ c: 0, m: 0, done: false, total: lp.total, money, started: false });
    const dur = (e: ScoreEvent) => (e.xmult ? 520 : e.at === "hand" && !e.text ? 520 : e.text && !e.money ? 480 : 360);
    const tick = () => {
      if (cancelled) return;
      if (i >= lp.events.length) {
        setAnim((a) => (a ? { ...a, done: true } : a));
        if (!lp.notAllowed) sfx.total();
        timer = setTimeout(() => act({ t: "resolve" }), Math.max(450, 1100 / speed));
        return;
      }
      const e = lp.events[i++];
      money -= e.money ?? 0;
      setAnim({ c: e.c, m: e.m, done: false, total: lp.total, money, started: true });
      let text = e.text ?? "";
      let tone = e.tone ?? "info";
      if (e.chips) text = `+${fmtNum(e.chips)}`;
      if (e.mult) text = `+${fmtNum(e.mult)} Mult`;
      if (e.xmult) text = `X${fmtNum(e.xmult)} Mult`;
      if (e.money) text = e.money > 0 ? `+$${e.money}` : `-$${-e.money}`;
      if (text) {
        setPops((p) => ({ ...p, [`${e.at}:${e.id ?? ""}`]: { text, tone, n: popN.current++ } }));
        if (tone === "chips") sfx.chips(chipStep++);
        else if (tone === "mult") sfx.mult(chipStep++);
        else if (tone === "xmult") sfx.xmult();
        else if (tone === "money") sfx.money();
        else if (tone === "bad") sfx.bad();
        else sfx.info();
      } else sfx.card();
      timer = setTimeout(tick, dur(e) / speed);
    };
    timer = setTimeout(tick, 380 / speed);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scoringKey, settings.speed, act]);

  if (!run) {
    return (
      <div className="loading-screen">
        <div className="spinner">🃏</div>
      </div>
    );
  }

  return (
    <>
      <Background colors={bgColorsFor(run)} />
      <Stage>
        <PopProvider value={pops}>
          <Table
            run={run}
            act={act}
            sel={sel}
            setSel={setSel}
            focus={focus}
            setFocus={setFocus}
            anim={anim}
            openModal={setModal}
            saveState={saveState}
          />
          {modal === "info" && <RunInfoModal run={run} onClose={() => setModal(null)} />}
          {modal === "deck" && <DeckModal run={run} onClose={() => setModal(null)} />}
          {modal === "options" && (
            <OptionsModal
              settings={settings}
              update={updateSettings}
              onClose={() => setModal(null)}
              onMenu={() => router.push("/")}
              onAbandon={() => {
                saveRunLocal(null);
                void cloudSave(getPid(), null);
                router.push("/?new=1");
              }}
            />
          )}
        </PopProvider>
      </Stage>
    </>
  );
}

/* ======================= Table layout ======================= */

interface TableProps {
  run: Run;
  act: (a: Action) => void;
  sel: number[];
  setSel: React.Dispatch<React.SetStateAction<number[]>>;
  focus: Focus;
  setFocus: React.Dispatch<React.SetStateAction<Focus>>;
  anim: AnimState | null;
  openModal: (m: "info" | "deck" | "options") => void;
  saveState: "saved" | "saving" | "offline";
}

function Table(props: TableProps) {
  const { run, act, sel, setSel, focus, setFocus, anim, openModal } = props;
  const { orient } = useStage();
  const { lang, t } = useLang();
  const L = LAYOUT[orient];
  const selSet = useMemo(() => new Set(sel), [sel]);
  const handVisible = run.phase === "play" || run.phase === "scoring" || (run.phase === "pack" && !!run.pack?.drew);

  const maxSel = useMemo(() => {
    if (run.phase === "pack" && focus?.kind === "pack") {
      const opt = run.pack?.options.find((o) => o.uid === focus.id);
      if (opt?.kind === "cons") return CONS_MAP[opt.cons.key].select?.[1] ?? 0;
    }
    if (focus?.kind === "cons") {
      const c = run.cons.find((x) => x.id === focus.id);
      if (c && CONS_MAP[c.key].select && run.phase !== "play") return CONS_MAP[c.key].select![1];
    }
    return 5;
  }, [run, focus]);

  const toggleCard = (id: number) => {
    if (run.phase !== "play" && !(run.phase === "pack" && run.pack?.drew)) return;
    if (id === run.forced) return;
    setSel((cur) => {
      if (cur.includes(id)) {
        sfx.deselect();
        return cur.filter((x) => x !== id);
      }
      const limit = run.phase === "pack" ? Math.max(1, maxSel) : 5;
      if (cur.length >= limit) return cur;
      sfx.select();
      return [...cur, id];
    });
  };

  const selCards = cardsByIds(run, sel);
  const preview = run.phase === "play" && selCards.length && !sel.some((id) => run.faceDown.includes(id)) ? previewHand(run, selCards) : null;
  const hiddenPreview = run.phase === "play" && sel.some((id) => run.faceDown.includes(id));

  const play = () => {
    if (!sel.length || run.phase !== "play") return;
    sfx.card();
    act({ t: "play", ids: sel });
    setSel([]);
    setFocus(null);
  };
  const discard = () => {
    if (!sel.length || run.phase !== "play" || run.discards <= 0) return;
    sfx.card();
    act({ t: "discard", ids: sel });
    setSel([]);
  };

  const played = run.phase === "scoring" && run.lastPlay ? run.lastPlay.played : [];
  const scoringSet = new Set(run.lastPlay?.scoring ?? []);
  const deckPos = orient === "landscape" ? { x: L.handW + 60, y: 60 } : { x: L.handW - 40, y: 120 };

  return (
    <div className={`table phase-${run.phase}`}>
      <Sidebar run={run} preview={preview} hiddenPreview={hiddenPreview} anim={anim} openModal={openModal} saveState={props.saveState} />

      <div className="toprow">
        <JokerArea run={run} act={act} focus={focus} setFocus={setFocus} width={L.jokersW} itemW={L.cw} />
        <ConsArea run={run} act={act} focus={focus} setFocus={setFocus} sel={sel} setSel={setSel} width={L.consW} itemW={L.cw} />
      </div>

      <div className="middle">
        {run.phase === "scoring" && (
          <div className="playarea">
            <DragRow
              ids={played}
              width={L.playW}
              height={L.ch + 40}
              itemW={L.cw}
              gap={14}
              raised={scoringSet}
              render={(id) => <CardSlot run={run} id={id} at="card" />}
            />
            {run.lastPlay?.notAllowed && <div className="not-allowed">{t("notAllowed")}</div>}
          </div>
        )}
        {run.phase === "blind" && <BlindSelect run={run} act={act} />}
        {run.phase === "cashout" && <CashoutPanel run={run} act={act} />}
        {run.phase === "shop" && <ShopPanel run={run} act={act} focus={focus} setFocus={setFocus} />}
        {run.phase === "pack" && <PackPanel run={run} act={act} focus={focus} setFocus={setFocus} sel={sel} setSel={setSel} />}
        {run.phase === "over" && <OverPanel run={run} />}
        {run.phase === "won" && <WinPanel run={run} act={act} />}
      </div>

      {handVisible && (
        <div className="handzone">
          <DragRow
            ids={run.hand}
            width={L.handW}
            height={L.handH}
            itemW={L.cw}
            gap={8}
            fan
            raised={selSet}
            dealFrom={deckPos}
            onTap={(id) => toggleCard(id)}
            onMove={(id, to) => act({ t: "moveCard", id, to })}
            hoverTip={(id) => {
              if (run.faceDown.includes(id)) return null;
              const c = run.cards.find((x) => x.id === id);
              return c ? cardTip(c, lang, isDebuffed(run, c)) : null;
            }}
            render={(id) => <CardSlot run={run} id={id} at="held" selected={selSet.has(id)} />}
          />
          <div className="hand-count">
            {run.hand.length}/{ops.handSize(run)}
          </div>
        </div>
      )}

      {run.phase === "play" && (
        <div className="actions">
          <button className="btn btn-blue big" disabled={!sel.length} onClick={play}>
            {t("play")}
          </button>
          <div className="sortbox">
            <span className="sort-label">{t("sortHand")}</span>
            <div className="sort-btns">
              <button className="btn btn-orange" onClick={() => act({ t: "sortHand", by: "rank" })}>
                {t("rank")}
              </button>
              <button className="btn btn-orange" onClick={() => act({ t: "sortHand", by: "suit" })}>
                {t("suit")}
              </button>
            </div>
          </div>
          <button className="btn btn-red big" disabled={!sel.length || run.discards <= 0} onClick={discard}>
            {t("discard")}
          </button>
        </div>
      )}

      <button className="deckpile" onClick={() => openModal("deck")} style={{ ["--deck" as string]: deckColor(run.deck) }}>
        <span className="pile p3" />
        <span className="pile p2" />
        <span className="pile p1">
          <span className="back-pattern" />
        </span>
        <span className="pile-count">
          {handVisible ? run.draw.length : run.cards.length}/{run.cards.length}
        </span>
      </button>
    </div>
  );
}

function deckColor(deck: string) {
  return (
    { red: "#e5483f", blue: "#3c8be0", yellow: "#f4b22e", green: "#3fb26b", black: "#3a3a4a", magic: "#8a5bd6", nebula: "#4a5fc1", ghost: "#9fb4c7", abandoned: "#7d8a7b", checkered: "#c94a6a", zodiac: "#2f7f8f", painted: "#d77a2e", anaglyph: "#5f3fb0", plasma: "#b04ad6", erratic: "#4b9f9a" } as Record<string, string>
  )[deck] ?? "#e5483f";
}

/* ---------- Card slot with popups ---------- */

function CardSlot({ run, id, at, selected }: { run: Run; id: number; at: "card" | "held"; selected?: boolean }) {
  const card = run.cards.find((c) => c.id === id);
  const pop = usePop(`${at}:${id}`);
  const popPlayed = usePop(`card:${id}`);
  if (!card) return null;
  const p = at === "held" ? pop ?? popPlayed : pop;
  return (
    <div className={`slot ${p ? "jiggle" : ""}`} key={p?.n}>
      <PlayingCard card={card} faceDown={run.faceDown.includes(id) && run.phase !== "scoring"} debuffed={isDebuffed(run, card)} selected={selected} forced={run.forced === id} deck={run.deck} />
      <PopLabel pop={p} />
    </div>
  );
}

/* ---------- Jokers ---------- */

function JokerArea({ run, act, focus, setFocus, width, itemW }: { run: Run; act: (a: Action) => void; focus: Focus; setFocus: React.Dispatch<React.SetStateAction<Focus>>; width: number; itemW: number }) {
  const { lang, t } = useLang();
  const { show, hide } = useTip();
  const focusedId = focus?.kind === "joker" ? focus.id : -1;
  return (
    <div className="area jokers-area">
      <DragRow
        ids={run.jokers.map((j) => j.id)}
        width={width}
        height={itemW * 1.4 + 6}
        itemW={itemW}
        gap={8}
        raised={new Set([focusedId])}
        lift={8}
        onTap={(id, el) => {
          sfx.click();
          const j = run.jokers.find((x) => x.id === id);
          if (focusedId === id || !j) {
            setFocus(null);
            hide(el);
          } else {
            setFocus({ kind: "joker", id });
            if (!j.flipped) show(el, jokerTip(j, run, lang), true);
          }
        }}
        onMove={(id, to) => act({ t: "moveJoker", id, to })}
        hoverTip={(id) => {
          const j = run.jokers.find((x) => x.id === id);
          return j && !j.flipped ? jokerTip(j, run, lang) : null;
        }}
        render={(id) => <JokerSlot run={run} id={id} />}
        attach={(id) => {
          if (id !== focusedId) return null;
          const j = run.jokers.find((x) => x.id === id)!;
          if (j.eternal || run.phase === "scoring") return null;
          return (
            <button
              className="btn btn-green attach-btn sell"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                sfx.money();
                act({ t: "sellJoker", id });
                setFocus(null);
              }}
            >
              {t("sell")}
              <br />
              {sellText(j)}
            </button>
          );
        }}
      />
      <div className="area-count">
        {run.jokers.length}/{ops.jokerSlots(run)}
      </div>
    </div>
  );
}

function JokerSlot({ run, id }: { run: Run; id: number }) {
  const j = run.jokers.find((x) => x.id === id);
  const pop = usePop(`joker:${id}`);
  if (!j) return null;
  return (
    <div className={`slot ${pop ? "jiggle" : ""}`} key={pop?.n}>
      <JokerCard joker={j} />
      <PopLabel pop={pop} />
    </div>
  );
}

/* ---------- Consumables ---------- */

function ConsArea({ run, act, focus, setFocus, sel, setSel, width, itemW }: { run: Run; act: (a: Action) => void; focus: Focus; setFocus: React.Dispatch<React.SetStateAction<Focus>>; sel: number[]; setSel: React.Dispatch<React.SetStateAction<number[]>>; width: number; itemW: number }) {
  const { lang, t } = useLang();
  const { show, hide } = useTip();
  const focusedId = focus?.kind === "cons" ? focus.id : -1;
  return (
    <div className="area cons-area">
      <DragRow
        ids={run.cons.map((c) => c.id)}
        width={width}
        height={itemW * 1.4 + 6}
        itemW={itemW}
        gap={8}
        raised={new Set([focusedId])}
        lift={8}
        onTap={(id, el) => {
          sfx.click();
          const c = run.cons.find((x) => x.id === id);
          if (focusedId === id || !c) {
            setFocus(null);
            hide(el);
          } else {
            setFocus({ kind: "cons", id });
            show(el, consTip(c.key, lang, run, c.neg), true);
          }
        }}
        hoverTip={(id) => {
          const c = run.cons.find((x) => x.id === id);
          return c ? consTip(c.key, lang, run, c.neg) : null;
        }}
        render={(id) => {
          const c = run.cons.find((x) => x.id === id);
          return c ? <ConsSlot run={run} id={id} lang={lang} /> : null;
        }}
        attach={(id) => {
          if (id !== focusedId || run.phase === "scoring") return null;
          const c = run.cons.find((x) => x.id === id)!;
          const usable = consUsable(run, id, sel);
          return (
            <div className="attach-col" onPointerDown={(e) => e.stopPropagation()}>
              <button
                className="btn btn-red attach-btn"
                disabled={!usable}
                onClick={(e) => {
                  e.stopPropagation();
                  sfx.buy();
                  act({ t: "useCons", id, sel });
                  setSel([]);
                  setFocus(null);
                }}
              >
                {t("use")}
              </button>
              <button
                className="btn btn-green attach-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  sfx.money();
                  act({ t: "sellCons", id });
                  setFocus(null);
                }}
              >
                {t("sell")}
                <br />${Math.max(1, Math.floor((CONS_MAP[c.key]?.cost ?? 3) / 2)) + c.extraSell}
              </button>
            </div>
          );
        }}
      />
      <div className="area-count">
        {run.cons.length}/{ops.consSlots(run)}
      </div>
    </div>
  );
}

function ConsSlot({ run, id, lang }: { run: Run; id: number; lang: "en" | "vi" }) {
  const c = run.cons.find((x) => x.id === id);
  const pop = usePop(`cons:${id}`);
  if (!c) return null;
  return (
    <div className={`slot ${pop ? "jiggle" : ""}`} key={pop?.n}>
      <ConsCard cons={c} lang={lang} />
      <PopLabel pop={pop} />
    </div>
  );
}
