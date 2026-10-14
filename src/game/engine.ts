import { cardsByIds, isFace, newCard, RANKS, SUITS } from "./cards";
import { CONS_MAP, PLANET_FOR } from "./consumables";
import { HAND_ORDER, HANDS } from "./hands";
import { JOKER_MAP } from "./jokers";
import { anteBase, BLIND_NAMES, BOSS_MAP, BOSSES, PACK_MAP, PACKS, TAG_MAP, TAGS, VOUCHERS } from "./meta";
import * as ops from "./ops";
import { chance, hashSeed, pick, rand, shuffle, weighted } from "./rng";
import { eachJoker, isDebuffed, refreshJokerDebuffs, scorePlay } from "./scoring";
import type { Card, CashLine, Edition, Enh, HandType, Joker, PackState, Run, Seal, ShopItem, Tag, Txt } from "./types";

export const SAVE_VERSION = 1;
export const WIN_ANTE = 8;

export type Action =
  | { t: "selectBlind" }
  | { t: "skipBlind" }
  | { t: "rerollBoss" }
  | { t: "play"; ids: number[] }
  | { t: "resolve" }
  | { t: "discard"; ids: number[] }
  | { t: "useCons"; id: number; sel: number[] }
  | { t: "sellCons"; id: number }
  | { t: "sellJoker"; id: number }
  | { t: "moveJoker"; id: number; to: number }
  | { t: "sortHand"; by: "rank" | "suit" }
  | { t: "moveCard"; id: number; to: number }
  | { t: "cashOut" }
  | { t: "buy"; uid: number; use?: boolean; sel?: number[] }
  | { t: "reroll" }
  | { t: "nextRound" }
  | { t: "pickPack"; uid: number; sel: number[] }
  | { t: "skipPack" }
  | { t: "endless" };

const HAND_KEYS = Object.keys(HANDS) as HandType[];
const NO_ETERNAL = ["gros_michel", "cavendish", "ice_cream", "popcorn", "turtle_bean", "ramen", "seltzer", "invisible", "luchador", "diet_cola", "mr_bones"];

/* ======================= New run ======================= */

export interface NewRunOpts {
  seed: string;
  deck: string;
  stake: number;
  daily?: string;
  runId: string;
}

export function newRun(o: NewRunOpts): Run {
  const s: Run = {
    v: SAVE_VERSION,
    runId: o.runId,
    seed: o.seed,
    rng: hashSeed(o.seed),
    daily: o.daily,
    deck: o.deck,
    stake: o.stake,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ante: 1,
    round: 0,
    blind: 0,
    blindStatus: ["current", "upcoming", "upcoming"],
    boss: "",
    skipTags: ["", ""],
    bossRerollUsed: false,
    bossDisabled: false,
    phase: "blind",
    winAnte: WIN_ANTE,
    endless: false,
    money: 4,
    hands: 0,
    discards: 0,
    handsUsedRound: 0,
    discardsUsedRound: 0,
    roundScore: 0,
    target: 0,
    cards: [],
    draw: [],
    hand: [],
    discardPile: [],
    faceDown: [],
    antePlayed: [],
    jokers: [],
    cons: [],
    levels: Object.fromEntries(HAND_KEYS.map((h) => [h, 1])) as Record<HandType, number>,
    playCount: Object.fromEntries(HAND_KEYS.map((h) => [h, 0])) as Record<HandType, number>,
    roundHands: [],
    vouchers: [],
    tags: [],
    fx: [],
    pendingPacks: [],
    nextId: 1,
    handSizeMod: 0,
    jokerSlotMod: 0,
    consSlotMod: 0,
    handsMod: 0,
    discardsMod: 0,
    planetsUsed: [],
    stats: {
      bestHand: 0, handsPlayed: 0, cardsPlayed: 0, cardsDiscarded: 0, discardsUsed: 0, unusedDiscards: 0,
      rerolls: 0, skips: 0, purchases: 0, tarotsUsed: 0, planetsUsed: 0, moneyEarned: 0, jokersSeen: [],
    },
    flags: { firstShop: 1 },
    log: [],
  };

  // Deck
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      if (o.deck === "abandoned" && rank >= 11 && rank <= 13) continue;
      if (o.deck === "checkered") continue;
      if (o.deck === "erratic") s.cards.push(newCard(s, pick(s, RANKS), pick(s, SUITS)));
      else s.cards.push(newCard(s, rank, suit));
    }
  }
  if (o.deck === "checkered") {
    for (const suit of ["S", "H", "S", "H"] as const) for (const rank of RANKS) s.cards.push(newCard(s, rank, suit));
  }
  s.flags.startDeck = s.cards.length;

  switch (o.deck) {
    case "red": s.discardsMod += 1; break;
    case "blue": s.handsMod += 1; break;
    case "yellow": s.money += 10; break;
    case "black": s.jokerSlotMod += 1; s.handsMod -= 1; break;
    case "magic":
      applyVoucher(s, "crystal_ball");
      ops.addCons(s, "fool");
      ops.addCons(s, "fool");
      break;
    case "nebula": applyVoucher(s, "telescope"); s.consSlotMod -= 1; break;
    case "ghost": ops.addCons(s, "hex"); break;
    case "zodiac": applyVoucher(s, "tarot_merchant"); applyVoucher(s, "planet_merchant"); applyVoucher(s, "overstock"); break;
    case "painted": s.handSizeMod += 2; s.jokerSlotMod -= 1; break;
  }
  if (o.stake >= 5) s.discardsMod -= 1;

  s.boss = rollBoss(s);
  s.skipTags = [rollTag(s), rollTag(s)];
  return s;
}

/* ======================= Helpers ======================= */

function fx(s: Run, at: Run["fx"][number]["at"], text: string, tone?: Run["fx"][number]["tone"], ref?: number) {
  s.fx.push({ id: s.nextId++, at, ref, text, tone });
  if (s.fx.length > 24) s.fx.splice(0, s.fx.length - 24);
}

export function blindTarget(s: Run, blind: number): number {
  const base = anteBase(s.ante, s.stake) * (s.deck === "plasma" ? 2 : 1);
  const m = blind === 0 ? 1 : blind === 1 ? 1.5 : BOSS_MAP[s.boss]?.mult ?? 2;
  return Math.floor(base * m);
}

export function blindReward(s: Run, blind: number): number {
  if (blind === 2) return BOSS_MAP[s.boss]?.final ? 8 : 5;
  if (blind === 0 && s.stake >= 2) return 0;
  return blind === 1 ? 4 : 3;
}

function rollBoss(s: Run): string {
  const final = s.ante > 0 && s.ante % 8 === 0;
  let pool = BOSSES.filter((b) => (final ? b.final : !b.final && b.minAnte <= Math.max(1, s.ante)) && !s.flags["boss_" + b.key] && b.key !== s.boss);
  if (!pool.length) {
    for (const b of BOSSES) if (!!b.final === final) delete s.flags["boss_" + b.key];
    pool = BOSSES.filter((b) => (final ? b.final : !b.final && b.minAnte <= Math.max(1, s.ante)) && b.key !== s.boss);
  }
  const b = pick(s, pool);
  s.flags["boss_" + b.key] = 1;
  return b.key;
}

function rollTag(s: Run): string {
  return pick(s, TAGS.filter((t) => t.minAnte <= s.ante)).key;
}

export function applyVoucher(s: Run, key: string) {
  if (s.vouchers.includes(key)) return;
  s.vouchers.push(key);
  ops.seen(s, key);
  switch (key) {
    case "crystal_ball": s.consSlotMod += 1; break;
    case "antimatter": s.jokerSlotMod += 1; break;
    case "grabber": case "nacho_tong": s.handsMod += 1; break;
    case "wasteful": case "recyclomancy": s.discardsMod += 1; break;
    case "hieroglyph": s.ante = Math.max(1, s.ante - 1); s.handsMod -= 1; break;
    case "petroglyph": s.ante = Math.max(1, s.ante - 1); s.discardsMod -= 1; break;
    case "paint_brush": case "palette": s.handSizeMod += 1; break;
  }
}

function availableVouchers(s: Run, exclude: string[] = []): string[] {
  return VOUCHERS.filter((v) => !s.vouchers.includes(v.key) && !exclude.includes(v.key) && (!v.requires || s.vouchers.includes(v.requires))).map((v) => v.key);
}

/* ======================= Tags ======================= */

function gainTag(s: Run, key: string) {
  const doubles = s.tags.filter((t) => t.key === "double");
  const newTags: Tag[] = [{ id: s.nextId++, key }];
  if (key !== "double") {
    for (const d of doubles) {
      newTags.push({ id: s.nextId++, key });
      s.tags = s.tags.filter((t) => t !== d);
    }
  }
  for (const t of newTags) {
    if (t.key === "orbital") t.hand = pick(s, HAND_ORDER.filter((h) => !HANDS[h].secret || s.playCount[h] > 0));
    ops.seen(s, t.key);
    if (!applyImmediateTag(s, t)) s.tags.push(t);
  }
}

const PACK_TAGS: Record<string, string> = {
  standard: "standard_mega", charm: "arcana_mega", meteor: "celestial_mega", buffoon: "buffoon_mega", ethereal: "spectral_normal",
};

/** Returns true if the tag was consumed. */
function applyImmediateTag(s: Run, t: Tag): boolean {
  const name = TAG_MAP[t.key]?.name.en ?? t.key;
  switch (t.key) {
    case "economy": {
      const n = Math.max(0, Math.min(40, s.money));
      ops.earn(s, n);
      fx(s, "deck", `+$${n}`, "money");
      return true;
    }
    case "handy":
      ops.earn(s, s.stats.handsPlayed);
      fx(s, "deck", `+$${s.stats.handsPlayed}`, "money");
      return true;
    case "garbage":
      ops.earn(s, s.stats.unusedDiscards);
      fx(s, "deck", `+$${s.stats.unusedDiscards}`, "money");
      return true;
    case "speed":
      ops.earn(s, 5 * s.stats.skips);
      fx(s, "deck", `+$${5 * s.stats.skips}`, "money");
      return true;
    case "topup":
      for (let i = 0; i < 2; i++) if (ops.canAddJoker(s)) ops.createJoker(s, 1);
      return true;
    case "orbital":
      ops.levelUp(s, t.hand ?? "pair", 3);
      fx(s, "deck", `${HANDS[t.hand ?? "pair"].name.en} +3`, "info");
      return true;
    case "boss":
      s.boss = rollBoss(s);
      fx(s, "deck", name, "info");
      return true;
  }
  if (PACK_TAGS[t.key]) {
    s.pendingPacks.push(PACK_TAGS[t.key]);
    return true;
  }
  return false;
}

function takeTag(s: Run, key: string): boolean {
  const t = s.tags.find((x) => x.key === key);
  if (!t) return false;
  s.tags = s.tags.filter((x) => x !== t);
  return true;
}

/* ======================= Round flow ======================= */

function startRound(s: Run) {
  s.round += 1;
  s.phase = "play";
  s.blindStatus[s.blind] = "current";
  s.target = blindTarget(s, s.blind);
  s.roundScore = 0;
  s.handsUsedRound = 0;
  s.discardsUsedRound = 0;
  s.roundHands = [];
  s.mouthHand = undefined;
  s.lastPlay = undefined;
  s.cashout = undefined;
  s.hand = [];
  s.discardPile = [];
  s.faceDown = [];
  s.forced = undefined;
  if (takeTag(s, "juggle")) s.flags.juggle = (s.flags.juggle ?? 0) + 3;

  if (s.blind === 2) {
    s.bossDisabled = ops.has(s, "chicot");
    if (ops.bossActive(s, "acorn")) {
      shuffle(s, s.jokers);
      s.jokers.forEach((j) => (j.flipped = true));
    }
    if (ops.bossActive(s, "leaf")) s.flags.leaf = 1;
  }

  s.hands = ops.maxHands(s);
  s.discards = ops.maxDiscards(s);
  if (ops.bossActive(s, "water")) s.discards = 0;
  if (ops.bossActive(s, "needle")) s.hands = 1;
  if (ops.bossActive(s, "heart")) rollHeart(s);
  refreshJokerDebuffs(s);

  eachJoker(s, "blindSelect", (def, c) => {
    const e = def.blindSelect!(c);
    if (e?.text) fx(s, "joker", e.text, e.tone, c.self.id);
  }, { blind: s.blind });

  const inHand = new Set(s.hand);
  s.draw = shuffle(s, s.cards.filter((c) => !inHand.has(c.id)).map((c) => c.id));
  drawCards(s);
}

function rollHeart(s: Run) {
  const pool = s.jokers.filter((j) => j.id !== s.flags.heart);
  s.flags.heart = pool.length ? pick(s, pool).id : 0;
}

function drawCards(s: Run, count?: number) {
  const n = count ?? ops.handSize(s) - s.hand.length;
  const first = s.handsUsedRound === 0 && s.discardsUsedRound === 0;
  for (let i = 0; i < n && s.draw.length; i++) {
    const id = s.draw.pop()!;
    s.hand.push(id);
    const card = s.cards.find((c) => c.id === id)!;
    let down = false;
    if (ops.bossActive(s, "house") && first) down = true;
    if (ops.bossActive(s, "wheel") && chance(s, 1, 7)) down = true;
    if (ops.bossActive(s, "fish") && s.flags.fish) down = true;
    if (ops.bossActive(s, "mark") && isFace(s, card)) down = true;
    if (down) s.faceDown.push(id);
  }
  if (ops.bossActive(s, "bell") && (!s.forced || !s.hand.includes(s.forced)) && s.hand.length) s.forced = pick(s, s.hand);
  sortHand(s, s.flags.sortBy === 1 ? "suit" : "rank");
}

function afterHandDraw(s: Run) {
  if (ops.bossActive(s, "serpent")) drawCards(s, 3);
  else drawCards(s);
}

function play(s: Run, ids: number[]) {
  if (s.phase !== "play" || s.hands <= 0) return;
  const unique = [...new Set(ids)].filter((id) => s.hand.includes(id));
  if (unique.length < 1 || unique.length > 5) return;
  if (s.forced && s.hand.includes(s.forced) && !unique.includes(s.forced)) return;
  const order = unique.sort((a, b) => s.hand.indexOf(a) - s.hand.indexOf(b));
  const played = cardsByIds(s, order);
  s.hand = s.hand.filter((id) => !order.includes(id));
  s.faceDown = s.faceDown.filter((id) => !order.includes(id));
  s.hands -= 1;
  s.handsUsedRound += 1;
  s.stats.handsPlayed += 1;
  s.stats.cardsPlayed += played.length;
  s.phase = "scoring";

  const held = ops.handCards(s);
  const res = scorePlay(s, played, held);
  s.lastPlay = res;
  s.roundScore += res.total;
  if (res.total > s.stats.bestHand) s.stats.bestHand = res.total;
  for (const id of order) if (!s.antePlayed.includes(id)) s.antePlayed.push(id);
}

function resolve(s: Run) {
  if (s.phase !== "scoring" || !s.lastPlay) return;
  const res = s.lastPlay;
  if (res.destroyed.length) ops.destroyCards(s, res.destroyed);
  for (const id of res.played) if (s.cards.some((c) => c.id === id)) s.discardPile.push(id);

  if (s.roundScore >= s.target) {
    endRound(s, false);
    return;
  }
  if (s.hands <= 0) {
    const bones = s.jokers.find((j) => j.key === "mr_bones" && !j.debuff);
    if (bones && s.roundScore >= s.target * 0.25) {
      ops.removeJoker(s, bones.id);
      endRound(s, true);
      return;
    }
    s.phase = "over";
    return;
  }

  if (ops.bossActive(s, "hook") && s.hand.length) {
    const victims = shuffle(s, [...s.hand]).slice(0, 2);
    s.hand = s.hand.filter((id) => !victims.includes(id));
    s.faceDown = s.faceDown.filter((id) => !victims.includes(id));
    s.discardPile.push(...victims);
  }
  if (ops.bossActive(s, "fish")) s.flags.fish = 1;
  if (ops.bossActive(s, "heart")) rollHeart(s);
  refreshJokerDebuffs(s);
  s.phase = "play";
  afterHandDraw(s);
}

function discard(s: Run, ids: number[]) {
  if (s.phase !== "play" || s.discards <= 0) return;
  const unique = [...new Set(ids)].filter((id) => s.hand.includes(id));
  if (unique.length < 1 || unique.length > 5) return;
  if (s.forced && s.hand.includes(s.forced) && !unique.includes(s.forced)) return;
  const cards = cardsByIds(s, unique);
  const first = s.discardsUsedRound === 0;
  s.discards -= 1;
  s.discardsUsedRound += 1;
  s.stats.discardsUsed += 1;
  s.stats.cardsDiscarded += cards.length;

  for (const c of cards) {
    if (c.seal === "purple" && !isDebuffed(s, c) && ops.createCons(s, "tarot")) fx(s, "card", "+Tarot", "info", c.id);
  }
  eachJoker(s, "discard", (def, c) => {
    const e = def.discard!(c, cards);
    if (!e) return;
    if (e.money) ops.earn(s, e.money);
    fx(s, "joker", e.money ? `+$${e.money}` : e.text ?? "", e.money ? "money" : e.tone, c.self.id);
  }, { first });

  const remaining = unique.filter((id) => s.cards.some((c) => c.id === id));
  s.hand = s.hand.filter((id) => !unique.includes(id));
  s.faceDown = s.faceDown.filter((id) => !unique.includes(id));
  s.discardPile.push(...remaining);
  afterHandDraw(s);
}

function endRound(s: Run, saved: boolean) {
  const boss = s.blind === 2;
  const lines: CashLine[] = [];
  const reward = saved ? 0 : blindReward(s, s.blind);
  lines.push({ label: saved ? { en: "Saved by Mr. Bones", vi: "Được Mr. Bones cứu" } : BLIND_NAMES[s.blind], amount: reward });

  if (s.deck === "green") {
    if (s.hands) lines.push({ label: { en: `Remaining Hands ($2 each)`, vi: `Lượt chơi còn lại ($2 mỗi lượt)` }, amount: 2 * s.hands, tone: "hands" });
    if (s.discards) lines.push({ label: { en: `Remaining Discards ($1 each)`, vi: `Lượt bỏ còn lại ($1 mỗi lượt)` }, amount: s.discards, tone: "hands" });
  } else if (s.hands) {
    lines.push({ label: { en: `Remaining Hands ($1 each)`, vi: `Lượt chơi còn lại ($1 mỗi lượt)` }, amount: s.hands, tone: "hands" });
  }

  // Held cards: gold cards and blue seals
  const held = ops.handCards(s);
  let gold = 0;
  for (const c of held) {
    if (isDebuffed(s, c)) continue;
    let reps = 1 + (c.seal === "red" ? 1 : 0);
    eachJoker(s, "retriggerHeld", (def, ctx) => (reps += def.retriggerHeld!(ctx, c)));
    if (c.enh === "gold") gold += 3 * reps;
    if (c.seal === "blue") {
      const last = s.roundHands[s.roundHands.length - 1] ?? "high";
      if (ops.canAddCons(s)) ops.addCons(s, PLANET_FOR[last]);
    }
  }
  if (gold) {
    ops.earn(s, gold);
    fx(s, "deck", `+$${gold}`, "money");
  }

  // Interest
  if (s.deck !== "green") {
    const cap = ops.hasVoucher(s, "money_tree") ? 20 : ops.hasVoucher(s, "seed_money") ? 10 : 5;
    const per = 1 + ops.count(s, "to_the_moon");
    const interest = Math.min(Math.floor(Math.max(0, s.money) / 5), cap) * per;
    if (interest > 0) lines.push({ label: { en: `Interest ($1 per $5, max $${cap * per})`, vi: `Tiền lãi ($1 mỗi $5, tối đa $${cap * per})` }, amount: interest, tone: "interest" });
  }

  // Joker payouts and upkeep
  for (const j of [...s.jokers]) {
    if (j.debuff) continue;
    const def = JOKER_MAP[j.key];
    const n = def.payout?.({ s, j, self: j }) ?? 0;
    if (n) lines.push({ label: { en: def.name, vi: def.name }, amount: n, tone: "money" });
  }
  if (boss) {
    while (takeTag(s, "investment")) lines.push({ label: { en: "Investment Tag", vi: "Thẻ Đầu Tư" }, amount: 25, tone: "money" });
  }
  for (const j of [...s.jokers]) {
    if (j.debuff || !s.jokers.includes(j)) continue;
    const e = JOKER_MAP[j.key].roundEnd?.({ s, j, self: j }, boss);
    if (e?.text) fx(s, "joker", e.text, e.tone, j.id);
  }
  for (const j of s.jokers) {
    if (j.perish !== undefined && j.perish > 0) j.perish -= 1;
    if (j.rental) ops.earn(s, -3);
  }

  s.stats.unusedDiscards += s.discards;
  s.flags.juggle = 0;
  s.flags.fish = 0;
  s.flags.leaf = 0;
  s.flags.heart = 0;
  s.blindStatus[s.blind] = "defeated";
  s.jokers.forEach((j) => delete j.flipped);
  s.hand = [];
  s.draw = [];
  s.discardPile = [];
  s.faceDown = [];
  s.forced = undefined;
  if (boss && s.ante >= s.winAnte && !s.endless) s.flags.justWon = 1;
  s.phase = "cashout";
  refreshJokerDebuffs(s);
  s.cashout = { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}

function cashOut(s: Run) {
  if (s.phase !== "cashout" || !s.cashout) return;
  ops.earn(s, s.cashout.total);
  s.cashout = undefined;
  if (s.blind === 2) {
    if (s.deck === "anaglyph") gainTag(s, "double");
    s.ante += 1;
    s.blind = 0;
    s.blindStatus = ["current", "upcoming", "upcoming"];
    s.antePlayed = [];
    s.bossRerollUsed = false;
    s.bossDisabled = false;
    s.boss = rollBoss(s);
    s.skipTags = [rollTag(s), rollTag(s)];
    s.shopVoucher = undefined;
  } else {
    s.blind = (s.blind + 1) as 0 | 1 | 2;
    s.blindStatus[s.blind] = "current";
  }
  if (s.flags.justWon) {
    s.flags.justWon = 0;
    s.phase = "won";
    return;
  }
  enterShop(s);
}

/* ======================= Shop ======================= */

function uid(s: Run) {
  return s.nextId++;
}

function stickers(s: Run, key: string): Partial<Joker> {
  const o: Partial<Joker> = {};
  if (s.stake >= 4 && !NO_ETERNAL.includes(key) && rand(s) < 0.3) o.eternal = true;
  else if (s.stake >= 7 && rand(s) < 0.3) o.perish = 5;
  if (s.stake >= 8 && rand(s) < 0.3) o.rental = true;
  return o;
}

function shopJoker(s: Run, rarity?: number, exclude: string[] = []): ShopItem {
  const key = ops.randomJokerKey(s, rarity, exclude);
  const j = ops.makeJoker(s, key, { ed: ops.rollEdition(s), ...stickers(s, key) });
  return { uid: uid(s), kind: "joker", joker: j, cost: j.cost };
}

function randomPlayingCard(s: Run, enhanced: boolean): Card {
  const extra: Partial<Card> = {};
  if (enhanced) {
    if (rand(s) < 0.4) extra.enh = pick<Enh>(s, ["bonus", "mult", "wild", "glass", "steel", "stone", "gold", "lucky"]);
    const ed = ops.rollEdition(s, false, 2);
    if (ed) extra.ed = ed;
    if (rand(s) < 0.2) extra.seal = pick<Seal>(s, ["gold", "red", "blue", "purple"]);
  }
  return newCard(s, pick(s, RANKS), pick(s, SUITS), extra);
}

function shopItem(s: Run, exclude: string[]): ShopItem {
  const tarotW = ops.hasVoucher(s, "tarot_tycoon") ? 32 : ops.hasVoucher(s, "tarot_merchant") ? 9.6 : 4;
  const planetW = ops.hasVoucher(s, "planet_tycoon") ? 32 : ops.hasVoucher(s, "planet_merchant") ? 9.6 : 4;
  const entries: [string, number][] = [["joker", 20], ["tarot", tarotW], ["planet", planetW]];
  if (ops.hasVoucher(s, "magic_trick")) entries.push(["card", 4]);
  if (s.deck === "ghost") entries.push(["spectral", 2]);
  const kind = weighted(s, entries);
  if (kind === "joker") return shopJoker(s, undefined, exclude);
  if (kind === "card") {
    const card = randomPlayingCard(s, ops.hasVoucher(s, "illusion"));
    const base = 1 + (card.enh ? 1 : 0) + (card.seal ? 1 : 0) + ops.editionCost(card.ed);
    return { uid: uid(s), kind: "card", card, cost: ops.price(s, base) };
  }
  const ck = kind as "tarot" | "planet" | "spectral";
  const key = ops.randomConsKey(s, ck, exclude);
  const cost = ck === "planet" && ops.has(s, "astronomer") ? 0 : ops.consCost(s, key);
  return { uid: uid(s), kind: "cons", cons: ops.makeCons(s, key), cost };
}

function shopPack(s: Run, key?: string): ShopItem {
  const k = key ?? weighted(s, PACKS.map((p) => [p.key, p.weight] as [string, number]));
  const def = PACK_MAP[k];
  const cost = def.kind === "celestial" && ops.has(s, "astronomer") ? 0 : ops.price(s, def.cost);
  return { uid: uid(s), kind: "pack", pack: k, cost };
}

function itemKey(it: ShopItem): string {
  return it.kind === "joker" ? it.joker.key : it.kind === "cons" ? it.cons.key : "";
}

function fillShopItems(s: Run): ShopItem[] {
  const size = 2 + (ops.hasVoucher(s, "overstock") ? 1 : 0) + (ops.hasVoucher(s, "overstock_plus") ? 1 : 0);
  const items: ShopItem[] = [];
  for (let i = 0; i < size; i++) items.push(shopItem(s, items.map(itemKey)));
  return items;
}

function enterShop(s: Run) {
  s.phase = "shop";
  const items = fillShopItems(s);
  const packs = [shopPack(s, s.flags.firstShop ? "buffoon_normal" : undefined), shopPack(s)];
  s.flags.firstShop = 0;

  if (!s.shopVoucher) s.shopVoucher = pick(s, availableVouchers(s).length ? availableVouchers(s) : ["blank"]);
  const vouchers: ShopItem[] = [];
  if (!s.vouchers.includes(s.shopVoucher)) vouchers.push({ uid: uid(s), kind: "voucher", voucher: s.shopVoucher, cost: ops.price(s, 10) });

  // Shop tags
  while (takeTag(s, "voucher")) {
    const pool = availableVouchers(s, vouchers.map((v) => (v.kind === "voucher" ? v.voucher : "")));
    if (pool.length) vouchers.push({ uid: uid(s), kind: "voucher", voucher: pick(s, pool), cost: ops.price(s, 10) });
  }
  while (takeTag(s, "uncommon")) {
    const it = shopJoker(s, 2);
    it.cost = 0;
    items.unshift(it);
  }
  while (takeTag(s, "rare")) {
    const it = shopJoker(s, 3);
    it.cost = 0;
    items.unshift(it);
  }
  for (const ed of ["negative", "foil", "holo", "poly"] as Edition[]) {
    while (takeTag(s, ed)) {
      let target = items.find((it) => it.kind === "joker" && !it.joker.ed && it.cost > 0) as Extract<ShopItem, { kind: "joker" }> | undefined;
      if (!target) {
        target = shopJoker(s) as Extract<ShopItem, { kind: "joker" }>;
        items.unshift(target);
      }
      target.joker.ed = ed;
      target.cost = 0;
    }
  }
  if (takeTag(s, "coupon")) {
    for (const it of items) it.cost = 0;
    for (const it of packs) it.cost = 0;
  }
  let rerollBase = Math.max(0, 5 - (ops.hasVoucher(s, "reroll_surplus") ? 2 : 0) - (ops.hasVoucher(s, "reroll_glut") ? 2 : 0));
  if (takeTag(s, "d6")) rerollBase = 0;

  s.shop = {
    items,
    packs,
    vouchers,
    rerollCost: rerollBase,
    rerolls: 0,
    freeRerolls: ops.count(s, "chaos"),
  };
  s.flags.rerollBase = rerollBase;
  if (s.pendingPacks.length) openPack(s, s.pendingPacks.shift()!, "shop");
}

export function rerollCost(s: Run) {
  if (!s.shop) return 0;
  return s.shop.freeRerolls > 0 ? 0 : s.shop.rerollCost;
}

function reroll(s: Run) {
  if (s.phase !== "shop" || !s.shop) return;
  const cost = rerollCost(s);
  if (!ops.canAfford(s, cost)) return;
  if (s.shop.freeRerolls > 0) s.shop.freeRerolls -= 1;
  else {
    s.money -= cost;
    s.shop.rerollCost += 1;
  }
  s.shop.rerolls += 1;
  s.stats.rerolls += 1;
  s.shop.items = fillShopItems(s);
  ops.runPassiveHook(s, "reroll");
}

function buy(s: Run, a: { uid: number; use?: boolean; sel?: number[] }) {
  if (s.phase !== "shop" || !s.shop) return;
  const lists: ShopItem[][] = [s.shop.items, s.shop.packs, s.shop.vouchers];
  const list = lists.find((l) => l.some((x) => x.uid === a.uid));
  const it = list?.find((x) => x.uid === a.uid);
  if (!list || !it || !ops.canAfford(s, it.cost)) return;

  switch (it.kind) {
    case "joker":
      if (!ops.canAddJoker(s, it.joker)) return;
      s.money -= it.cost;
      it.joker.cost = Math.max(it.joker.cost, it.cost);
      ops.addJoker(s, it.joker);
      break;
    case "cons": {
      const def = CONS_MAP[it.cons.key];
      if (a.use) {
        if (def.select) return;
        const room = ops.consSlots(s) - s.cons.length;
        if (def.canUse && !def.canUse(s, [], room)) return;
        s.money -= it.cost;
        useConsEffect(s, it.cons.key, []);
      } else {
        if (!ops.canAddCons(s, it.cons.neg)) return;
        s.money -= it.cost;
        s.cons.push(it.cons);
        ops.seen(s, it.cons.key);
      }
      break;
    }
    case "card":
      s.money -= it.cost;
      ops.addCards(s, [it.card], "deck");
      break;
    case "voucher":
      s.money -= it.cost;
      applyVoucher(s, it.voucher);
      break;
    case "pack":
      s.money -= it.cost;
      list.splice(list.indexOf(it), 1);
      s.stats.purchases += 1;
      openPack(s, it.pack, "shop");
      return;
  }
  list.splice(list.indexOf(it), 1);
  s.stats.purchases += 1;
}

function nextRound(s: Run) {
  if (s.phase !== "shop") return;
  ops.runPassiveHook(s, "shopEnd");
  s.shop = undefined;
  s.phase = "blind";
}

/* ======================= Packs ======================= */

function packOptions(s: Run, key: string): ShopItem[] {
  const def = PACK_MAP[key];
  const out: ShopItem[] = [];
  const keys = () => out.map(itemKey);
  for (let i = 0; i < def.options; i++) {
    switch (def.kind) {
      case "arcana": {
        let k: string;
        if (ops.hasVoucher(s, "omen_globe") && rand(s) < 0.2) k = ops.randomConsKey(s, "spectral", keys());
        else k = ops.randomConsKey(s, "tarot", keys());
        if (rand(s) < 0.003 && !keys().includes("soul")) k = "soul";
        out.push({ uid: uid(s), kind: "cons", cons: ops.makeCons(s, k), cost: 0 });
        break;
      }
      case "celestial": {
        let k = i === 0 && ops.hasVoucher(s, "telescope") ? PLANET_FOR[ops.mostPlayed(s)] : ops.randomConsKey(s, "planet", keys());
        if (keys().includes(k)) k = ops.randomConsKey(s, "planet", keys());
        if (rand(s) < 0.003 && !keys().includes("black_hole")) k = "black_hole";
        out.push({ uid: uid(s), kind: "cons", cons: ops.makeCons(s, k), cost: 0 });
        break;
      }
      case "spectral": {
        let k = ops.randomConsKey(s, "spectral", keys());
        if (rand(s) < 0.003 && !keys().includes("soul")) k = "soul";
        else if (rand(s) < 0.003 && !keys().includes("black_hole")) k = "black_hole";
        out.push({ uid: uid(s), kind: "cons", cons: ops.makeCons(s, k), cost: 0 });
        break;
      }
      case "standard":
        out.push({ uid: uid(s), kind: "card", card: randomPlayingCard(s, true), cost: 0 });
        break;
      case "buffoon": {
        const it = shopJoker(s, undefined, keys());
        it.cost = 0;
        out.push(it);
        break;
      }
    }
  }
  return out;
}

function openPack(s: Run, key: string, back: PackState["back"]) {
  const def = PACK_MAP[key];
  if (!def) return;
  ops.seen(s, key);
  const pack: PackState = { key, kind: def.kind, options: packOptions(s, key), picks: def.picks, back, drew: false };
  s.pack = pack;
  s.phase = "pack";
  if (def.kind === "arcana" || def.kind === "spectral") {
    s.hand = [];
    s.faceDown = [];
    s.draw = shuffle(s, s.cards.map((c) => c.id));
    drawCards(s);
    pack.drew = true;
  }
  ops.runPassiveHook(s, "packOpened");
}

function closePack(s: Run) {
  const pack = s.pack;
  if (!pack) return;
  if (pack.drew) {
    s.hand = [];
    s.draw = [];
    s.faceDown = [];
  }
  s.pack = undefined;
  s.phase = pack.back;
  if (s.pendingPacks.length) openPack(s, s.pendingPacks.shift()!, pack.back);
}

function pickPack(s: Run, a: { uid: number; sel: number[] }) {
  const pack = s.pack;
  if (s.phase !== "pack" || !pack) return;
  const it = pack.options.find((o) => o.uid === a.uid);
  if (!it) return;
  if (it.kind === "cons") {
    const def = CONS_MAP[it.cons.key];
    const sel = cardsByIds(s, a.sel.filter((id) => s.hand.includes(id)));
    if (def.select && (sel.length < def.select[0] || sel.length > def.select[1])) return;
    const room = ops.consSlots(s) - s.cons.length;
    if (def.canUse && !def.canUse(s, sel, room)) return;
    useConsEffect(s, it.cons.key, sel);
  } else if (it.kind === "joker") {
    if (!ops.addJoker(s, it.joker)) return;
  } else if (it.kind === "card") {
    ops.addCards(s, [it.card], "deck");
  }
  pack.options = pack.options.filter((o) => o !== it);
  pack.picks -= 1;
  if (pack.picks <= 0 || !pack.options.length) closePack(s);
}

function skipPack(s: Run) {
  if (s.phase !== "pack") return;
  ops.runPassiveHook(s, "packSkipped");
  closePack(s);
}

/* ======================= Consumables ======================= */

function useConsEffect(s: Run, key: string, sel: Card[]) {
  const def = CONS_MAP[key];
  ops.seen(s, key);
  const before = s.flags.nope ?? 0;
  def.use(s, sel);
  if (def.kind === "tarot") s.stats.tarotsUsed += 1;
  if ((def.kind === "tarot" || def.kind === "planet") && key !== "fool") s.lastCons = key;
  if ((s.flags.nope ?? 0) > before) fx(s, "deck", "Nope!", "bad");
}

export function consUsable(s: Run, consId: number, selIds: number[]): boolean {
  const cons = s.cons.find((c) => c.id === consId);
  if (!cons) return false;
  const def = CONS_MAP[cons.key];
  if (!def) return false;
  if (s.phase === "scoring" || s.phase === "over" || s.phase === "won") return false;
  const handOk = s.phase === "play" || (s.phase === "pack" && !!s.pack?.drew);
  const sel = cardsByIds(s, selIds.filter((id) => s.hand.includes(id)));
  if (def.select) {
    if (!handOk) return false;
    if (sel.length < def.select[0] || sel.length > def.select[1]) return false;
  }
  if (["familiar", "grim", "incantation", "sigil", "ouija", "immolate"].includes(def.key) && !handOk) return false;
  const room = ops.consSlots(s) - (s.cons.length - 1) - (cons.neg ? 1 : 0);
  return def.canUse ? def.canUse(s, sel, room) : true;
}

function useCons(s: Run, id: number, selIds: number[]) {
  if (!consUsable(s, id, selIds)) return;
  const cons = s.cons.find((c) => c.id === id)!;
  const sel = cardsByIds(s, selIds.filter((x) => s.hand.includes(x)));
  s.cons = s.cons.filter((c) => c !== cons);
  useConsEffect(s, cons.key, sel);
}

/* ======================= Selling / ordering ======================= */

function sellJoker(s: Run, id: number) {
  const j = s.jokers.find((x) => x.id === id);
  if (!j || j.eternal || s.phase === "scoring") return;
  ops.earn(s, ops.sellValue(j));
  ops.removeJoker(s, id);
  if (!j.debuff) JOKER_MAP[j.key].sold?.({ s, j, self: j });
  ops.runPassiveHook(s, "anySold");
  if (s.flags.leaf) s.flags.leaf = 0;
  refreshJokerDebuffs(s);
}

function sellCons(s: Run, id: number) {
  const c = s.cons.find((x) => x.id === id);
  if (!c || s.phase === "scoring") return;
  const cost = CONS_MAP[c.key]?.cost ?? 3;
  ops.earn(s, Math.max(1, Math.floor(cost / 2)) + c.extraSell);
  s.cons = s.cons.filter((x) => x !== c);
  ops.runPassiveHook(s, "anySold");
}

function moveJoker(s: Run, id: number, to: number) {
  const i = s.jokers.findIndex((j) => j.id === id);
  if (i < 0 || s.phase === "scoring") return;
  const [j] = s.jokers.splice(i, 1);
  s.jokers.splice(Math.max(0, Math.min(s.jokers.length, to)), 0, j);
}

function moveCard(s: Run, id: number, to: number) {
  const i = s.hand.indexOf(id);
  if (i < 0) return;
  s.hand.splice(i, 1);
  s.hand.splice(Math.max(0, Math.min(s.hand.length, to)), 0, id);
}

const SUIT_ORDER = { S: 0, H: 1, C: 2, D: 3 };
function sortHand(s: Run, by: "rank" | "suit") {
  const map = new Map(s.cards.map((c) => [c.id, c]));
  s.hand.sort((a, b) => {
    const x = map.get(a)!;
    const y = map.get(b)!;
    const xs = x.enh === "stone" ? -1 : x.rank;
    const ys = y.enh === "stone" ? -1 : y.rank;
    if (by === "rank") return ys - xs || SUIT_ORDER[x.suit] - SUIT_ORDER[y.suit];
    return SUIT_ORDER[x.suit] - SUIT_ORDER[y.suit] || ys - xs;
  });
  s.flags.sortBy = by === "rank" ? 0 : 1;
}

/* ======================= Blind select ======================= */

function selectBlind(s: Run) {
  if (s.phase !== "blind") return;
  if (s.blind === 0) s.antePlayed = [];
  startRound(s);
}

function skipBlind(s: Run) {
  if (s.phase !== "blind" || s.blind === 2) return;
  const tag = s.skipTags[s.blind];
  s.blindStatus[s.blind] = "skipped";
  s.stats.skips += 1;
  s.blind = (s.blind + 1) as 0 | 1 | 2;
  s.blindStatus[s.blind] = "current";
  gainTag(s, tag);
  if (s.pendingPacks.length) openPack(s, s.pendingPacks.shift()!, "blind");
}

export function bossRerollAvailable(s: Run) {
  if (s.phase !== "blind") return false;
  if (ops.hasVoucher(s, "retcon")) return true;
  return ops.hasVoucher(s, "directors_cut") && !s.bossRerollUsed;
}

function rerollBoss(s: Run) {
  if (!bossRerollAvailable(s) || !ops.canAfford(s, 10)) return;
  s.money -= 10;
  s.bossRerollUsed = true;
  s.boss = rollBoss(s);
}

/* ======================= Reducer ======================= */

export function reduce(state: Run, a: Action): Run {
  const s = structuredClone(state);
  switch (a.t) {
    case "selectBlind": selectBlind(s); break;
    case "skipBlind": skipBlind(s); break;
    case "rerollBoss": rerollBoss(s); break;
    case "play": play(s, a.ids); break;
    case "resolve": resolve(s); break;
    case "discard": discard(s, a.ids); break;
    case "useCons": useCons(s, a.id, a.sel); break;
    case "sellCons": sellCons(s, a.id); break;
    case "sellJoker": sellJoker(s, a.id); break;
    case "moveJoker": moveJoker(s, a.id, a.to); break;
    case "sortHand": sortHand(s, a.by); break;
    case "moveCard": moveCard(s, a.id, a.to); break;
    case "cashOut": cashOut(s); break;
    case "buy": buy(s, a); break;
    case "reroll": reroll(s); break;
    case "nextRound": nextRound(s); break;
    case "pickPack": pickPack(s, a); break;
    case "skipPack": skipPack(s); break;
    case "endless":
      if (s.phase === "won") {
        s.endless = true;
        enterShop(s);
      }
      break;
  }
  if (s.phase === "play" || s.phase === "pack") {
    // keep the forced card valid
    if (s.forced && !s.hand.includes(s.forced)) s.forced = undefined;
  }
  s.updatedAt = Date.now();
  return s;
}

export function blindName(s: Run, i: number): Txt {
  return i === 2 ? BOSS_MAP[s.boss]?.name ?? BLIND_NAMES[2] : BLIND_NAMES[i];
}

export { isDebuffed };
