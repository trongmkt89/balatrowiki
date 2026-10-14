import { isStone } from "./cards";
import { CONS, CONS_MAP } from "./consumables";
import { HAND_ORDER } from "./hands";
import { JOKERS, JOKER_MAP } from "./jokers";
import { pick, rand } from "./rng";
import type { Card, ConsKind, Consumable, Edition, HandType, Joker, Run } from "./types";

export const has = (s: Run, key: string) => s.jokers.some((j) => j.key === key && !j.debuff);
export const count = (s: Run, key: string) => s.jokers.filter((j) => j.key === key && !j.debuff).length;
export const hasVoucher = (s: Run, key: string) => s.vouchers.includes(key);

export function log(s: Run, msg: string) {
  s.log.push(msg);
  if (s.log.length > 30) s.log.shift();
}

export function seen(s: Run, key: string) {
  if (!s.stats.jokersSeen.includes(key)) s.stats.jokersSeen.push(key);
}

/* ---------------- Boss helpers ---------------- */

export function inRound(s: Run) {
  return s.phase === "play" || s.phase === "scoring";
}

export function bossActive(s: Run, key?: string): boolean {
  if (s.blind !== 2 || s.bossDisabled || !inRound(s)) return false;
  return key ? s.boss === key : true;
}

/* ---------------- Derived stats ---------------- */

export function jokerSlots(s: Run) {
  return 5 + s.jokerSlotMod + s.jokers.filter((j) => j.ed === "negative").length;
}

export function consSlots(s: Run) {
  return 2 + s.consSlotMod + s.cons.filter((c) => c.neg).length;
}

export function handSize(s: Run) {
  let n = 8 + s.handSizeMod;
  for (const j of s.jokers) {
    if (j.debuff) continue;
    n += JOKER_MAP[j.key]?.handSize ?? 0;
    if (j.key === "turtle_bean") n += j.v.n ?? 0;
  }
  n += s.flags.juggle ?? 0;
  if (bossActive(s, "manacle")) n -= 1;
  return Math.max(1, n);
}

export function maxHands(s: Run) {
  let n = 4 + s.handsMod;
  for (const j of s.jokers) if (!j.debuff) n += JOKER_MAP[j.key]?.handsMod ?? 0;
  return Math.max(1, n);
}

export function maxDiscards(s: Run) {
  let n = 3 + s.discardsMod;
  for (const j of s.jokers) if (!j.debuff) n += JOKER_MAP[j.key]?.discardsMod ?? 0;
  return Math.max(0, n);
}

export function debtLimit(s: Run) {
  return has(s, "credit_card") ? -20 : 0;
}

export function canAfford(s: Run, cost: number) {
  return s.money - cost >= debtLimit(s);
}

/* ---------------- Money / levels ---------------- */

export function earn(s: Run, n: number) {
  s.money += n;
  if (n > 0) s.stats.moneyEarned += n;
}

export function levelUp(s: Run, hand: HandType, n = 1) {
  s.levels[hand] = Math.max(1, (s.levels[hand] ?? 1) + n);
}

export function mostPlayed(s: Run, counts: Record<HandType, number> = s.playCount): HandType {
  let best: HandType = "high";
  let bestN = -1;
  for (const h of [...HAND_ORDER].reverse()) {
    if (counts[h] > bestN) {
      best = h;
      bestN = counts[h];
    }
  }
  return best;
}

/* ---------------- Prices ---------------- */

export function discount(s: Run) {
  if (hasVoucher(s, "liquidation")) return 0.5;
  if (hasVoucher(s, "clearance")) return 0.25;
  return 0;
}

export function editionCost(ed?: Edition) {
  return ed === "foil" ? 2 : ed === "holo" ? 3 : ed === "poly" ? 5 : ed === "negative" ? 5 : 0;
}

export function price(s: Run, base: number) {
  return Math.max(1, Math.floor(base * (1 - discount(s)) + 0.5));
}

export function sellValue(x: { cost: number; extraSell: number; rental?: boolean }) {
  return Math.max(1, Math.floor(x.cost / 2)) + x.extraSell;
}

/* ---------------- Editions ---------------- */

export function rollEdition(s: Run, allowNeg = true, mod = 1): Edition | undefined {
  const rate = mod * (hasVoucher(s, "glow_up") ? 4 : hasVoucher(s, "hone") ? 2 : 1);
  const r = rand(s);
  if (allowNeg && r > 1 - 0.003) return "negative";
  if (r > 1 - 0.006 * rate) return "poly";
  if (r > 1 - 0.02 * rate) return "holo";
  if (r > 1 - 0.04 * rate) return "foil";
  return undefined;
}

/* ---------------- Jokers ---------------- */

export function makeJoker(s: Run, key: string, opts: Partial<Joker> = {}): Joker {
  const def = JOKER_MAP[key];
  const j: Joker = { id: s.nextId++, key, v: { ...(def.v0 ?? {}) }, cost: 0, extraSell: 0, ...opts };
  def.init?.(j, s);
  j.cost = j.rental ? 1 : price(s, def.cost + editionCost(j.ed));
  return j;
}

export function canAddJoker(s: Run, j?: Joker) {
  return j?.ed === "negative" || s.jokers.length < jokerSlots(s);
}

export function addJoker(s: Run, j: Joker): boolean {
  if (!canAddJoker(s, j)) return false;
  s.jokers.push(j);
  seen(s, j.key);
  if (j.key === "chicot" && bossActive(s)) s.bossDisabled = true;
  return true;
}

export function removeJoker(s: Run, id: number) {
  s.jokers = s.jokers.filter((j) => j.id !== id);
}

export function rollRarity(s: Run): 1 | 2 | 3 {
  const r = rand(s);
  return r < 0.7 ? 1 : r < 0.95 ? 2 : 3;
}

export function jokerPool(s: Run, rarity: number, exclude: string[] = []): string[] {
  const showman = has(s, "showman");
  const owned = new Set([...s.jokers.map((j) => j.key), ...exclude]);
  return JOKERS.filter((d) => d.rarity === rarity && (showman || !owned.has(d.key)) && (!d.gate || d.gate(s))).map((d) => d.key);
}

export function randomJokerKey(s: Run, rarity?: number, exclude: string[] = []): string {
  const r = rarity ?? rollRarity(s);
  let pool = jokerPool(s, r, exclude);
  if (!pool.length) pool = jokerPool(s, 1, exclude);
  if (!pool.length) pool = ["joker"];
  return pick(s, pool);
}

export function createJoker(s: Run, rarity?: number, opts: Partial<Joker> = {}): Joker | null {
  const j = makeJoker(s, randomJokerKey(s, rarity), opts);
  return addJoker(s, j) ? j : null;
}

/* ---------------- Consumables ---------------- */

export function canAddCons(s: Run, neg = false) {
  return neg || s.cons.length < consSlots(s);
}

export function consPool(s: Run, kind: ConsKind, exclude: string[] = []): string[] {
  const showman = has(s, "showman");
  const held = new Set([...s.cons.map((c) => c.key), ...exclude]);
  return CONS.filter((d) => {
    if (d.kind !== kind) return false;
    if (!showman && held.has(d.key)) return false;
    if (d.key === "soul" || d.key === "black_hole") return false;
    if (d.kind === "planet" && d.hand && ["five", "fhouse", "ffive"].includes(d.hand) && !s.playCount[d.hand]) return false;
    return true;
  }).map((d) => d.key);
}

export function randomConsKey(s: Run, kind: ConsKind, exclude: string[] = []): string {
  const pool = consPool(s, kind, exclude);
  if (!pool.length) return kind === "planet" ? "pluto" : kind === "tarot" ? "fool" : "incantation";
  return pick(s, pool);
}

export function makeCons(s: Run, key: string, neg = false): Consumable {
  return { id: s.nextId++, key, neg: neg || undefined, extraSell: 0 };
}

export function addCons(s: Run, key: string, neg = false): boolean {
  if (!canAddCons(s, neg)) return false;
  s.cons.push(makeCons(s, key, neg));
  seen(s, key);
  return true;
}

export function createCons(s: Run, kind: ConsKind): boolean {
  if (!canAddCons(s)) return false;
  return addCons(s, randomConsKey(s, kind));
}

export function consCost(s: Run, key: string) {
  return price(s, CONS_MAP[key]?.cost ?? 3);
}

/* ---------------- Playing cards ---------------- */

export function addCards(s: Run, cards: Card[], where: "deck" | "hand") {
  for (const c of cards) {
    s.cards.push(c);
    if (where === "hand") s.hand.push(c.id);
    else if (inRound(s)) {
      const pos = Math.floor(rand(s) * (s.draw.length + 1));
      s.draw.splice(pos, 0, c.id);
    }
  }
  if (cards.length) runPassiveHook(s, "cardsAdded", cards.length);
}

export function destroyCards(s: Run, ids: number[]): Card[] {
  const set = new Set(ids);
  const gone = s.cards.filter((c) => set.has(c.id));
  if (!gone.length) return gone;
  s.cards = s.cards.filter((c) => !set.has(c.id));
  s.hand = s.hand.filter((id) => !set.has(id));
  s.draw = s.draw.filter((id) => !set.has(id));
  s.discardPile = s.discardPile.filter((id) => !set.has(id));
  s.faceDown = s.faceDown.filter((id) => !set.has(id));
  runPassiveHook(s, "cardsDestroyed", gone);
  return gone;
}

export function deckCount(s: Run, pred: (c: Card) => boolean) {
  return s.cards.filter(pred).length;
}

export function enhancedCount(s: Run) {
  return s.cards.filter((c) => !!c.enh).length;
}

export function nonStone(c: Card) {
  return !isStone(c);
}

/* ---------------- Passive joker hooks ---------------- */

type PassiveHook = "cardsAdded" | "cardsDestroyed" | "planetUsed" | "reroll" | "packSkipped" | "packOpened" | "anySold" | "luckyTriggered" | "shopEnd";

export function runPassiveHook(s: Run, hook: PassiveHook, arg?: unknown) {
  for (const j of [...s.jokers]) {
    if (j.debuff || !s.jokers.includes(j)) continue;
    const def = JOKER_MAP[j.key];
    const fn = def?.[hook] as ((c: { s: Run; j: Joker; self: Joker }, a?: unknown) => void) | undefined;
    if (fn) fn({ s, j, self: j }, arg);
  }
}

export function handCards(s: Run): Card[] {
  const map = new Map(s.cards.map((c) => [c.id, c]));
  return s.hand.map((id) => map.get(id)).filter((c): c is Card => !!c);
}
