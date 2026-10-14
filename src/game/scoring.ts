import { chipValue, isFace, isStone, isSuit } from "./cards";
import { evaluate, handValue } from "./hands";
import { JOKER_MAP } from "./jokers";
import * as ops from "./ops";
import { chance } from "./rng";
import type { Card, Ctx, Effect, HandType, Joker, JokerDef, PlayCtx, PlayResult, Run, ScoreEvent } from "./types";

/* ---------------- Debuffs ---------------- */

export function isDebuffed(s: Run, c: Card): boolean {
  if (!ops.bossActive(s)) return false;
  switch (s.boss) {
    case "club":
      return isSuit(s, c, "C");
    case "goad":
      return isSuit(s, c, "S");
    case "window":
      return isSuit(s, c, "D");
    case "head":
      return isSuit(s, c, "H");
    case "plant":
      return isFace(s, c);
    case "pillar":
      return s.antePlayed.includes(c.id);
    case "leaf":
      return !!s.flags.leaf;
  }
  return false;
}

export function refreshJokerDebuffs(s: Run) {
  for (const j of s.jokers) {
    j.debuff = (j.perish !== undefined && j.perish <= 0) || (ops.bossActive(s, "heart") && s.flags.heart === j.id) || undefined;
  }
}

/* ---------------- Blueprint resolution ---------------- */

export function resolveCopy(s: Run, j: Joker, depth = 0): { def: JokerDef; target: Joker } | null {
  const def = JOKER_MAP[j.key];
  if (!def) return null;
  if (j.key === "blueprint" || j.key === "brainstorm") {
    if (depth > s.jokers.length) return null;
    const idx = s.jokers.indexOf(j);
    const t = j.key === "blueprint" ? s.jokers[idx + 1] : s.jokers[0];
    if (!t || t === j || t.debuff) return null;
    return resolveCopy(s, t, depth + 1);
  }
  if (depth > 0 && def.bp === false) return null;
  return { def, target: j };
}

export function copyCompatible(s: Run, j: Joker): boolean {
  return !!resolveCopy(s, j);
}

type CopyHook = "before" | "scored" | "held" | "main" | "retrigger" | "retriggerHeld" | "after" | "discard" | "blindSelect";

/** Run a copyable hook across all jokers (Blueprint/Brainstorm aware). */
export function eachJoker(s: Run, hook: CopyHook, fn: (def: JokerDef, c: Ctx) => void, base: Partial<Ctx> = {}) {
  for (const self of [...s.jokers]) {
    if (self.debuff || !s.jokers.includes(self)) continue;
    const r = resolveCopy(s, self);
    if (!r || !r.def[hook]) continue;
    fn(r.def, { ...base, s, j: r.target, self } as Ctx);
  }
}

/* ---------------- Scoring ---------------- */

export interface PreScore {
  type: HandType;
  level: number;
  chips: number;
  mult: number;
}

export function previewHand(s: Run, cards: Card[]): PreScore | null {
  if (!cards.length) return null;
  const ev = evaluate(s, cards);
  const level = s.levels[ev.type];
  let { chips, mult } = handValue(ev.type, level);
  if (ops.bossActive(s, "flint")) {
    chips = Math.max(Math.floor(chips * 0.5 + 0.5), 0);
    mult = Math.max(Math.floor(mult * 0.5 + 0.5), 1);
  }
  return { type: ev.type, level, chips, mult };
}

export function scorePlay(s: Run, played: Card[], held: Card[]): PlayResult {
  const ev = evaluate(s, played);
  const debuffed = new Set([...played, ...held].filter((c) => isDebuffed(s, c)).map((c) => c.id));
  const countBefore = { ...s.playCount };
  const roundBefore = [...s.roundHands];
  const most = ops.mostPlayed(s);
  const boss = ops.bossActive(s) ? s.boss : "";

  let notAllowed = false;
  if (boss === "psychic" && played.length < 5) notAllowed = true;
  if (boss === "eye" && roundBefore.includes(ev.type)) notAllowed = true;
  if (boss === "mouth" && s.mouthHand && s.mouthHand !== ev.type) notAllowed = true;

  const oxHit = boss === "ox" && ev.type === most && countBefore[most] > 0;
  const armHit = boss === "arm" && s.levels[ev.type] > 1;
  const bossTriggered =
    notAllowed || played.some((c) => debuffed.has(c.id)) || oxHit || armHit || boss === "tooth" || boss === "flint" || boss === "hook";

  s.playCount[ev.type] += 1;
  s.roundHands.push(ev.type);
  if (boss === "mouth" && !s.mouthHand) s.mouthHand = ev.type;

  const events: ScoreEvent[] = [];
  let chips = 0;
  let mult = 0;
  const push = (e: Omit<ScoreEvent, "c" | "m">) => events.push({ ...e, c: chips, m: mult });

  const p: PlayCtx = {
    played,
    scoring: ev.scoring,
    held,
    hand: ev.type,
    contains: ev.contains,
    final: s.hands === 0,
    firstHand: s.handsUsedRound === 1,
    roundBefore,
    countBefore,
    bossTriggered,
    destroy: new Set(),
    debuffed,
  };

  if (oxHit) {
    s.money = 0;
    push({ at: "hand", text: "$0", tone: "bad" });
  }
  if (boss === "tooth") {
    s.money -= played.length;
    push({ at: "hand", money: -played.length, tone: "bad", text: `-$${played.length}` });
  }
  if (armHit) {
    s.levels[ev.type] -= 1;
    push({ at: "hand", text: "Level down", tone: "bad" });
  }

  const result = (total: number): PlayResult => ({
    played: played.map((c) => c.id),
    scoring: ev.scoring.map((c) => c.id),
    hand: ev.type,
    level: s.levels[ev.type],
    baseChips: base.chips,
    baseMult: base.mult,
    events,
    chips,
    mult,
    total,
    notAllowed,
    destroyed: [...p.destroy],
  });

  let base = handValue(ev.type, s.levels[ev.type]);
  if (notAllowed) {
    push({ at: "hand", text: "Not allowed!", tone: "bad" });
    return result(0);
  }

  const apply = (e: Effect | Effect[] | void, at: ScoreEvent["at"], id?: number) => {
    if (!e) return;
    for (const x of Array.isArray(e) ? e : [e]) {
      if (x.chips) {
        chips += x.chips;
        push({ at, id, chips: x.chips, tone: "chips" });
      }
      if (x.mult) {
        mult += x.mult;
        push({ at, id, mult: x.mult, tone: "mult" });
      }
      if (x.xmult && x.xmult !== 1) {
        mult *= x.xmult;
        push({ at, id, xmult: x.xmult, tone: "xmult" });
      }
      if (x.money) {
        ops.earn(s, x.money);
        push({ at, id, money: x.money, tone: "money" });
      }
      if (x.text && !x.chips && !x.mult && !x.xmult && !x.money) push({ at, id, text: x.text, tone: x.tone ?? "info" });
    }
  };

  // 1. Before-scoring joker effects (scaling, level ups, creations)
  eachJoker(s, "before", (def, c) => apply(def.before!(c), "joker", c.self.id), { p });

  // 2. Base hand value (level may have changed)
  base = handValue(ev.type, s.levels[ev.type]);
  if (boss === "flint") {
    base = { chips: Math.max(Math.floor(base.chips * 0.5 + 0.5), 0), mult: Math.max(Math.floor(base.mult * 0.5 + 0.5), 1) };
  }
  chips = base.chips;
  mult = base.mult;
  push({ at: "hand" });

  // 3. Scoring cards
  const glassHit = new Set<number>();
  ev.scoring.forEach((card, i) => {
    if (debuffed.has(card.id)) {
      push({ at: "card", id: card.id, text: "Debuffed", tone: "bad" });
      return;
    }
    let reps = 1 + (card.seal === "red" ? 1 : 0);
    eachJoker(s, "retrigger", (def, c) => (reps += def.retrigger!(c, card, i)), { p });
    for (let r = 0; r < reps; r++) {
      if (r > 0) push({ at: "card", id: card.id, text: "Again!", tone: "info" });
      const base = isStone(card) ? 50 : chipValue(card.rank) + (card.enh === "bonus" ? 30 : 0);
      apply({ chips: base + card.extra }, "card", card.id);
      if (card.enh === "mult") apply({ mult: 4 }, "card", card.id);
      if (card.enh === "lucky") {
        let hit = false;
        if (chance(s, 1, 5)) {
          apply({ mult: 20 }, "card", card.id);
          hit = true;
        }
        if (chance(s, 1, 15)) {
          apply({ money: 20 }, "card", card.id);
          hit = true;
        }
        if (hit) ops.runPassiveHook(s, "luckyTriggered");
      }
      if (card.enh === "glass") {
        apply({ xmult: 2 }, "card", card.id);
        glassHit.add(card.id);
      }
      if (card.ed === "foil") apply({ chips: 50 }, "card", card.id);
      if (card.ed === "holo") apply({ mult: 10 }, "card", card.id);
      if (card.ed === "poly") apply({ xmult: 1.5 }, "card", card.id);
      if (card.seal === "gold") apply({ money: 3 }, "card", card.id);
      eachJoker(s, "scored", (def, c) => apply(def.scored!(c, card), "joker", c.self.id), { p });
    }
  });

  // 4. Held-in-hand effects
  for (const card of held) {
    if (debuffed.has(card.id)) continue;
    let reps = 1 + (card.seal === "red" ? 1 : 0);
    eachJoker(s, "retriggerHeld", (def, c) => (reps += def.retriggerHeld!(c, card)), { p });
    for (let r = 0; r < reps; r++) {
      if (card.enh === "steel") apply({ xmult: 1.5 }, "held", card.id);
      eachJoker(s, "held", (def, c) => apply(def.held!(c, card), "held", card.id), { p });
    }
  }

  // 5. Jokers
  const baseball = ops.count(s, "baseball");
  for (const self of [...s.jokers]) {
    if (self.debuff || !s.jokers.includes(self)) continue;
    if (self.ed === "foil") apply({ chips: 50 }, "joker", self.id);
    if (self.ed === "holo") apply({ mult: 10 }, "joker", self.id);
    const r = resolveCopy(s, self);
    if (r?.def.main) apply(r.def.main({ s, j: r.target, self, p }), "joker", self.id);
    if (self.ed === "poly") apply({ xmult: 1.5 }, "joker", self.id);
    if (baseball && JOKER_MAP[self.key]?.rarity === 2) {
      for (let b = 0; b < baseball; b++) apply({ xmult: 1.5 }, "joker", self.id);
    }
  }

  // 6. Observatory: Planet cards held for this hand
  if (ops.hasVoucher(s, "observatory")) {
    for (const cons of s.cons) {
      const def = cons.key && cons.key in PLANET_HAND ? PLANET_HAND[cons.key] : undefined;
      if (def === ev.type) apply({ xmult: 1.5 }, "cons", cons.id);
    }
  }

  // 7. Plasma deck balance
  if (s.deck === "plasma") {
    const avg = Math.floor((chips + mult) / 2);
    chips = avg;
    mult = avg;
    push({ at: "deck", text: "Balanced", tone: "info" });
  }

  const total = Math.floor(chips * mult);

  // 8. After-hand effects
  eachJoker(s, "after", (def, c) => apply(def.after!(c), "joker", c.self.id), { p });

  // Glass breaks
  for (const id of glassHit) if (chance(s, 1, 4)) p.destroy.add(id);

  return result(Number.isFinite(total) ? total : Number.MAX_VALUE);
}

const PLANET_HAND: Record<string, HandType> = {
  pluto: "high",
  mercury: "pair",
  uranus: "twopair",
  venus: "three",
  saturn: "straight",
  jupiter: "flush",
  earth: "full",
  mars: "four",
  neptune: "sflush",
  planet_x: "five",
  ceres: "fhouse",
  eris: "ffive",
};
