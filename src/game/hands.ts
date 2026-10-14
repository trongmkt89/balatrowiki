import { isStone, isSuit, SUITS } from "./cards";
import type { Card, HandType, Run, Txt } from "./types";

export const HAND_ORDER: HandType[] = [
  "ffive", "fhouse", "five", "sflush", "four", "full", "flush", "straight", "three", "twopair", "pair", "high",
];

export const HANDS: Record<HandType, { chips: number; mult: number; lc: number; lm: number; name: Txt; planet: string; secret?: boolean; example: string }> = {
  high: { chips: 5, mult: 1, lc: 10, lm: 1, planet: "pluto", name: { en: "High Card", vi: "Mậu Thầu" }, example: "AS KD 9C 6H 2S" },
  pair: { chips: 10, mult: 2, lc: 15, lm: 1, planet: "mercury", name: { en: "Pair", vi: "Đôi" }, example: "KS KH" },
  twopair: { chips: 20, mult: 2, lc: 20, lm: 1, planet: "uranus", name: { en: "Two Pair", vi: "Thú" }, example: "KS KH 7C 7D" },
  three: { chips: 30, mult: 3, lc: 20, lm: 2, planet: "venus", name: { en: "Three of a Kind", vi: "Sám Cô" }, example: "9S 9H 9D" },
  straight: { chips: 30, mult: 4, lc: 30, lm: 3, planet: "saturn", name: { en: "Straight", vi: "Sảnh" }, example: "9S 8H 7C 6D 5S" },
  flush: { chips: 35, mult: 4, lc: 15, lm: 2, planet: "jupiter", name: { en: "Flush", vi: "Thùng" }, example: "KH 9H 7H 4H 2H" },
  full: { chips: 40, mult: 4, lc: 25, lm: 2, planet: "earth", name: { en: "Full House", vi: "Cù Lũ" }, example: "QS QH QD 4C 4S" },
  four: { chips: 60, mult: 7, lc: 30, lm: 3, planet: "mars", name: { en: "Four of a Kind", vi: "Tứ Quý" }, example: "8S 8H 8C 8D" },
  sflush: { chips: 100, mult: 8, lc: 40, lm: 4, planet: "neptune", name: { en: "Straight Flush", vi: "Thùng Phá Sảnh" }, example: "QS JS 10S 9S 8S" },
  five: { chips: 120, mult: 12, lc: 35, lm: 3, planet: "planet_x", secret: true, name: { en: "Five of a Kind", vi: "Ngũ Quý" }, example: "AS AH AC AD AS" },
  fhouse: { chips: 140, mult: 14, lc: 40, lm: 4, planet: "ceres", secret: true, name: { en: "Flush House", vi: "Cù Lũ Đồng Chất" }, example: "7D 7D 7D 4D 4D" },
  ffive: { chips: 160, mult: 16, lc: 50, lm: 3, planet: "eris", secret: true, name: { en: "Flush Five", vi: "Ngũ Quý Đồng Chất" }, example: "AS AS AS AS AS" },
};

export function handValue(type: HandType, level: number) {
  const h = HANDS[type];
  const l = Math.max(1, level);
  return { chips: h.chips + h.lc * (l - 1), mult: h.mult + h.lm * (l - 1) };
}

export interface EvalOpts {
  fourFingers: boolean;
  shortcut: boolean;
  splash: boolean;
}

export interface EvalResult {
  type: HandType;
  scoring: Card[];
  contains: Set<HandType>;
}

export function evalOpts(s: Run | null): EvalOpts {
  const has = (k: string) => !!s && s.jokers.some((j) => j.key === k && !j.debuff);
  return { fourFingers: has("four_fingers"), shortcut: has("shortcut"), splash: has("splash") };
}

function findFlush(s: Run | null, cards: Card[], need: number): Card[] | null {
  let best: Card[] | null = null;
  for (const suit of SUITS) {
    const members = cards.filter((c) => isSuit(s, c, suit));
    if (members.length >= need && (!best || members.length > best.length)) best = members;
  }
  return best;
}

function findStraight(cards: Card[], need: number, shortcut: boolean): Card[] | null {
  if (cards.length < need) return null;
  const ranks = new Set<number>(cards.map((c) => c.rank));
  if (ranks.has(14)) ranks.add(1);
  const sorted = [...ranks].sort((a, b) => a - b);
  const maxGap = shortcut ? 2 : 1;
  let bestChain: number[] = [];
  let chain: number[] = [];
  for (const r of sorted) {
    if (chain.length && r - chain[chain.length - 1] <= maxGap) chain.push(r);
    else chain = [r];
    if (chain.length > bestChain.length) bestChain = [...chain];
  }
  if (bestChain.length < need) return null;
  const inChain = new Set(bestChain.map((r) => (r === 1 ? 14 : r)));
  return cards.filter((c) => inChain.has(c.rank));
}

/** Evaluate played cards into the best poker hand. */
export function evaluate(s: Run | null, played: Card[], opts: EvalOpts = evalOpts(s)): EvalResult {
  const normal = played.filter((c) => !isStone(c));
  const need = opts.fourFingers ? 4 : 5;

  const groups = new Map<number, Card[]>();
  for (const c of normal) {
    const g = groups.get(c.rank) ?? [];
    g.push(c);
    groups.set(c.rank, g);
  }
  const sortedGroups = [...groups.values()].sort((a, b) => b.length - a.length || b[0].rank - a[0].rank);
  const c0 = sortedGroups[0]?.length ?? 0;
  const c1 = sortedGroups[1]?.length ?? 0;

  const flush = findFlush(s, normal, need);
  const straight = findStraight(normal, need, opts.shortcut);

  const contains = new Set<HandType>(["high"]);
  if (c0 >= 2) contains.add("pair");
  if (c0 >= 2 && c1 >= 2) contains.add("twopair");
  if (c0 >= 3) contains.add("three");
  if (straight) contains.add("straight");
  if (flush) contains.add("flush");
  if (c0 >= 3 && c1 >= 2) contains.add("full");
  if (c0 >= 4) contains.add("four");
  if (straight && flush) contains.add("sflush");
  if (c0 >= 5) contains.add("five");
  if (c0 >= 3 && c1 >= 2 && flush) contains.add("fhouse");
  if (c0 >= 5 && flush) contains.add("ffive");

  let type: HandType = "high";
  let core: Card[] = [];
  const groupCards = (n: number) => sortedGroups.slice(0, n).flat();

  if (contains.has("ffive")) {
    type = "ffive";
    core = [...sortedGroups[0], ...flush!];
  } else if (contains.has("fhouse")) {
    type = "fhouse";
    core = [...groupCards(2), ...flush!];
  } else if (contains.has("five")) {
    type = "five";
    core = sortedGroups[0];
  } else if (contains.has("sflush")) {
    type = "sflush";
    core = [...straight!, ...flush!];
  } else if (contains.has("four")) {
    type = "four";
    core = sortedGroups[0];
  } else if (contains.has("full")) {
    type = "full";
    core = groupCards(2);
  } else if (contains.has("flush")) {
    type = "flush";
    core = flush!;
  } else if (contains.has("straight")) {
    type = "straight";
    core = straight!;
  } else if (contains.has("three")) {
    type = "three";
    core = sortedGroups[0];
  } else if (contains.has("twopair")) {
    type = "twopair";
    core = groupCards(2);
  } else if (contains.has("pair")) {
    type = "pair";
    core = sortedGroups[0];
  } else if (normal.length) {
    const top = normal.reduce((a, b) => (b.rank > a.rank ? b : a));
    core = [top];
  }

  const coreIds = new Set(core.map((c) => c.id));
  const scoring = opts.splash ? [...played] : played.filter((c) => coreIds.has(c.id) || isStone(c));
  return { type, scoring, contains };
}
