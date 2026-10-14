import { chipValue, isFace, isStone, isSuit, newCard, RANK_NAME, RANKS, SUIT_NAME, SUITS } from "./cards";
import { evaluate, HAND_ORDER, HANDS } from "./hands";
import * as ops from "./ops";
import { chance, oddsText, pick, randInt } from "./rng";
import type { Card, Ctx, Effect, HandType, JokerDef, Lang, Rank, Seal, Suit } from "./types";

const own = (c: Ctx) => c.self === c.j;
const M = (mult: number): Effect => ({ mult });
const C = (chips: number): Effect => ({ chips });
const X = (xmult: number): Effect => ({ xmult });
const $ = (money: number): Effect => ({ money });
const up = (text = "Upgrade!"): Effect => ({ text, tone: "info" });

const suitTxt = (i: number, lang: Lang) => {
  const s = SUITS[((i % 4) + 4) % 4];
  return `{${s}|${SUIT_NAME[s][lang]}}`;
};
const handTxt = (i: number, lang: Lang) => `{a|${HANDS[HAND_ORDER[i] ?? "pair"].name[lang]}}`;
const rankTxt = (r: number, lang: Lang) => `{a|${RANK_NAME[r]?.[lang] ?? "Ace"}}`;
const fmt = (n: number) => String(Math.round(n * 100) / 100);
const odds = (s: Parameters<typeof oddsText>[0], n: number, d: number, lang: Lang) => {
  const t = oddsText(s, n, d);
  return lang === "vi" ? t.replace(" in ", "/") : t;
};

const COMMON_HANDS = HAND_ORDER.filter((h) => !HANDS[h].secret);
const destroySelf = (c: Ctx, text: string): Effect => {
  ops.removeJoker(c.s, c.self.id);
  return { text, tone: "bad" };
};

function J(
  key: string,
  name: string,
  rarity: 1 | 2 | 3 | 4,
  cost: number,
  icon: string,
  en: string,
  vi: string,
  rest: Partial<JokerDef> = {},
): JokerDef {
  return { key, name, rarity, cost, icon, text: { en, vi }, bp: true, ...rest };
}

function suitJoker(key: string, name: string, icon: string, suit: Suit): JokerDef {
  return J(
    key, name, 1, 5, icon,
    `Played cards with {${suit}|${SUIT_NAME[suit].en}} suit give {m|+3} Mult when scored`,
    `Lá chất {${suit}|${SUIT_NAME[suit].vi}} được chơi cho {m|+3} Mult khi tính điểm`,
    { scored: (c, card) => (isSuit(c.s, card, suit) ? M(3) : undefined) },
  );
}

function typeMult(key: string, name: string, icon: string, hand: HandType, n: number, cost: number): JokerDef {
  return J(
    key, name, 1, cost, icon,
    `{m|+${n}} Mult if played hand contains a {a|${HANDS[hand].name.en}}`,
    `{m|+${n}} Mult nếu tay bài có {a|${HANDS[hand].name.vi}}`,
    { main: (c) => (c.p!.contains.has(hand) ? M(n) : undefined) },
  );
}

function typeChips(key: string, name: string, icon: string, hand: HandType, n: number, cost: number): JokerDef {
  return J(
    key, name, 1, cost, icon,
    `{c|+${n}} Chips if played hand contains a {a|${HANDS[hand].name.en}}`,
    `{c|+${n}} Chip nếu tay bài có {a|${HANDS[hand].name.vi}}`,
    { main: (c) => (c.p!.contains.has(hand) ? C(n) : undefined) },
  );
}

function typeX(key: string, name: string, icon: string, hand: HandType, x: number): JokerDef {
  return J(
    key, name, 3, 8, icon,
    `{x|X${x}} Mult if played hand contains a {a|${HANDS[hand].name.en}}`,
    `{x|X${x}} Mult nếu tay bài có {a|${HANDS[hand].name.vi}}`,
    { main: (c) => (c.p!.contains.has(hand) ? X(x) : undefined) },
  );
}

const nowM = (en: string, vi: string) => ({ en: ` (Currently ${en})`, vi: ` (Hiện tại ${vi})` });
const cur = (kind: "m" | "c" | "x" | "$") =>
  kind === "m" ? nowM("{m|+%0} Mult", "{m|+%0} Mult") : kind === "c" ? nowM("{c|+%0} Chips", "{c|+%0} Chip") : kind === "x" ? nowM("{x|X%0} Mult", "{x|X%0} Mult") : nowM("{$|$%0}", "{$|$%0}");

function withCur(en: string, vi: string, kind: "m" | "c" | "x" | "$"): [string, string] {
  const k = cur(kind);
  return [en + k.en, vi + k.vi];
}

function randomDeckCard(c: Ctx): Card | undefined {
  const pool = c.s.cards.filter((x) => !isStone(x));
  return pool.length ? pick(c.s, pool) : undefined;
}

export const JOKERS: JokerDef[] = [
  J("joker", "Joker", 1, 2, "🃏", "{m|+4} Mult", "{m|+4} Mult", { main: () => M(4) }),
  suitJoker("greedy", "Greedy Joker", "💎", "D"),
  suitJoker("lusty", "Lusty Joker", "💘", "H"),
  suitJoker("wrathful", "Wrathful Joker", "⚔️", "S"),
  suitJoker("gluttonous", "Gluttonous Joker", "🍀", "C"),
  typeMult("jolly", "Jolly Joker", "😄", "pair", 8, 3),
  typeMult("zany", "Zany Joker", "🤪", "three", 12, 4),
  typeMult("mad", "Mad Joker", "😠", "twopair", 10, 4),
  typeMult("crazy", "Crazy Joker", "🌀", "straight", 12, 4),
  typeMult("droll", "Droll Joker", "😏", "flush", 10, 4),
  typeChips("sly", "Sly Joker", "🦊", "pair", 50, 3),
  typeChips("wily", "Wily Joker", "🐺", "three", 100, 4),
  typeChips("clever", "Clever Joker", "🦉", "twopair", 80, 4),
  typeChips("devious", "Devious Joker", "😈", "straight", 100, 4),
  typeChips("crafty", "Crafty Joker", "🎨", "flush", 80, 4),
  J("half", "Half Joker", 1, 5, "🌗",
    "{m|+20} Mult if played hand contains {a|3} or fewer cards",
    "{m|+20} Mult nếu chơi từ {a|3} lá trở xuống",
    { main: (c) => (c.p!.played.length <= 3 ? M(20) : undefined) }),
  J("stencil", "Joker Stencil", 2, 8, "🖼️",
    "{x|X1} Mult for each empty {a|Joker} slot. Joker Stencil included (Currently {x|X%0})",
    "{x|X1} Mult cho mỗi ô {a|Joker} trống, tính cả chính lá này (Hiện tại {x|X%0})",
    {
      vars: (j, s) => [s ? Math.max(1, ops.jokerSlots(s) - s.jokers.length + ops.count(s, "stencil")) : 1],
      main: (c) => {
        const x = ops.jokerSlots(c.s) - c.s.jokers.length + ops.count(c.s, "stencil");
        return x > 1 ? X(x) : undefined;
      },
    }),
  J("four_fingers", "Four Fingers", 2, 7, "🖐️",
    "All {a|Flushes} and {a|Straights} can be made with {a|4} cards",
    "Mọi {a|Thùng} và {a|Sảnh} chỉ cần {a|4} lá", { bp: false }),
  J("mime", "Mime", 2, 5, "🤐",
    "Retrigger all card {a|held in hand} abilities",
    "Kích hoạt lại hiệu ứng của mọi lá {a|giữ trên tay}",
    { retriggerHeld: () => 1 }),
  J("credit_card", "Credit Card", 1, 1, "💳",
    "Go up to {m|-$20} in debt", "Có thể nợ tới {m|-$20}", { bp: false }),
  J("ceremonial", "Ceremonial Dagger", 2, 6, "🗡️",
    ...withCur("When {a|Blind} is selected, destroy Joker to the right and permanently add {a|double} its sell value to this {m|Mult}",
      "Khi chọn {a|Blind}, phá Joker bên phải và cộng vĩnh viễn {a|gấp đôi} giá bán của nó vào {m|Mult}", "m"),
    {
      bp: false,
      v0: { mult: 0 },
      vars: (j) => [j.v.mult ?? 0],
      blindSelect: (c) => {
        const i = c.s.jokers.indexOf(c.self);
        const right = c.s.jokers[i + 1];
        if (!right || right.eternal) return;
        c.j.v.mult += 2 * ops.sellValue(right);
        ops.removeJoker(c.s, right.id);
        return { text: `+${c.j.v.mult} Mult`, tone: "mult" };
      },
      main: (c) => (c.j.v.mult ? M(c.j.v.mult) : undefined),
    }),
  J("banner", "Banner", 1, 5, "🚩",
    "{c|+30} Chips for each remaining {a|discard}", "{c|+30} Chip cho mỗi lượt {a|bỏ bài} còn lại",
    { main: (c) => (c.s.discards > 0 ? C(30 * c.s.discards) : undefined) }),
  J("mystic_summit", "Mystic Summit", 1, 5, "🏔️",
    "{m|+15} Mult when {a|0} discards remaining", "{m|+15} Mult khi còn {a|0} lượt bỏ bài",
    { main: (c) => (c.s.discards === 0 ? M(15) : undefined) }),
  J("marble", "Marble Joker", 2, 6, "🧱",
    "Adds one {a|Stone} card to deck when {a|Blind} is selected",
    "Thêm một lá {a|Đá} vào bộ bài khi chọn {a|Blind}",
    {
      blindSelect: (c) => {
        ops.addCards(c.s, [newCard(c.s, pick(c.s, RANKS), pick(c.s, SUITS), { enh: "stone" })], "deck");
        return { text: "+Stone", tone: "info" };
      },
    }),
  J("loyalty", "Loyalty Card", 2, 5, "🎟️",
    "{x|X4} Mult every {a|6} hands played ({a|%0} remaining)",
    "{x|X4} Mult mỗi {a|6} tay bài (còn {a|%0})",
    {
      v0: { played: 0 },
      vars: (j) => [5 - ((j.v.played ?? 0) % 6)],
      before: (c) => {
        if (own(c)) c.j.v.played = (c.j.v.played ?? 0) + 1;
      },
      main: (c) => (c.j.v.played > 0 && c.j.v.played % 6 === 0 ? X(4) : undefined),
    }),
  J("eight_ball", "8 Ball", 1, 5, "🎱",
    "{g|%0} chance for each played {a|8} to create a {t|Tarot} card when scored (Must have room)",
    "Mỗi lá {a|8} tính điểm có {g|%0} khả năng tạo một lá {t|Tarot} (cần còn chỗ)",
    {
      vars: (_j, s, l) => [odds(s, 1, 4, l)],
      scored: (c, card) => {
        if (card.rank === 8 && !isStone(card) && chance(c.s, 1, 4) && ops.createCons(c.s, "tarot")) return { text: "+Tarot", tone: "info" };
      },
    }),
  J("misprint", "Misprint", 1, 4, "🖨️", "{m|+0-23} Mult", "{m|+0-23} Mult", { main: (c) => M(randInt(c.s, 0, 23)) }),
  J("dusk", "Dusk", 2, 5, "🌆",
    "Retrigger all played cards in {a|final hand} of the round",
    "Kích hoạt lại mọi lá được chơi ở {a|tay bài cuối cùng} của vòng",
    { retrigger: (c) => (c.p!.final ? 1 : 0) }),
  J("raised_fist", "Raised Fist", 1, 5, "✊",
    "Adds {a|double} the rank of {a|lowest} ranked card held in hand to Mult",
    "Cộng {a|gấp đôi} giá trị lá {a|nhỏ nhất} đang giữ trên tay vào Mult",
    {
      held: (c, card) => {
        const held = c.p!.held.filter((x) => !isStone(x));
        if (!held.length) return;
        let low = held[0];
        for (const x of held) if (x.rank <= low.rank) low = x;
        if (low.id === card.id) return M(2 * chipValue(card.rank));
      },
    }),
  J("chaos", "Chaos the Clown", 1, 4, "🤡",
    "{a|1} free {g|Reroll} per shop", "{a|1} lượt {g|Đổi mới} miễn phí mỗi cửa hàng", { bp: false }),
  J("fibonacci", "Fibonacci", 2, 8, "🐚",
    "Each played {a|Ace}, {a|2}, {a|3}, {a|5} or {a|8} gives {m|+8} Mult when scored",
    "Mỗi lá {a|Át}, {a|2}, {a|3}, {a|5}, {a|8} tính điểm cho {m|+8} Mult",
    { scored: (c, card) => (!isStone(card) && [14, 2, 3, 5, 8].includes(card.rank) ? M(8) : undefined) }),
  J("steel_joker", "Steel Joker", 2, 7, "🔩",
    "Gives {x|X0.2} Mult for each {a|Steel Card} in your full deck (Currently {x|X%0})",
    "{x|X0.2} Mult cho mỗi {a|Lá Thép} trong bộ bài (Hiện tại {x|X%0})",
    {
      vars: (_j, s) => [fmt(1 + 0.2 * (s ? ops.deckCount(s, (x) => x.enh === "steel") : 0))],
      main: (c) => {
        const n = ops.deckCount(c.s, (x) => x.enh === "steel");
        return n ? X(1 + 0.2 * n) : undefined;
      },
    }),
  J("scary_face", "Scary Face", 1, 4, "👻",
    "Played {a|face} cards give {c|+30} Chips when scored",
    "Lá {a|mặt người} tính điểm cho {c|+30} Chip",
    { scored: (c, card) => (isFace(c.s, card) ? C(30) : undefined) }),
  J("abstract", "Abstract Joker", 1, 4, "🔷",
    "{m|+3} Mult for each {a|Joker} card (Currently {m|+%0} Mult)",
    "{m|+3} Mult cho mỗi lá {a|Joker} (Hiện tại {m|+%0} Mult)",
    { vars: (_j, s) => [3 * (s?.jokers.length ?? 1)], main: (c) => M(3 * c.s.jokers.length) }),
  J("delayed", "Delayed Gratification", 1, 4, "⏳",
    "Earn {$|$2} per {a|discard} if no discards are used by end of the round",
    "Nhận {$|$2} mỗi lượt {a|bỏ bài} còn lại nếu không bỏ bài lần nào trong vòng",
    { bp: false, payout: (c) => (c.s.discardsUsedRound === 0 ? 2 * c.s.discards : 0) }),
  J("hack", "Hack", 2, 6, "💻",
    "Retrigger each played {a|2}, {a|3}, {a|4}, or {a|5}",
    "Kích hoạt lại mỗi lá {a|2}, {a|3}, {a|4}, {a|5} được chơi",
    { retrigger: (_c, card) => (!isStone(card) && card.rank >= 2 && card.rank <= 5 ? 1 : 0) }),
  J("pareidolia", "Pareidolia", 2, 5, "👀",
    "All cards are considered {a|face} cards", "Mọi lá đều được tính là lá {a|mặt người}", { bp: false }),
  J("gros_michel", "Gros Michel", 1, 5, "🍌",
    "{m|+15} Mult. {g|%0} chance this card is destroyed at end of round",
    "{m|+15} Mult. {g|%0} khả năng lá này bị hủy cuối vòng",
    {
      vars: (_j, s, l) => [odds(s, 1, 6, l)],
      gate: (s) => !s.flags.grosGone,
      main: () => M(15),
      roundEnd: (c) => {
        if (chance(c.s, 1, 6)) {
          c.s.flags.grosGone = 1;
          return destroySelf(c, "Extinct!");
        }
        return { text: "Safe!", tone: "good" };
      },
    }),
  J("even_steven", "Even Steven", 1, 4, "⚖️",
    "Played cards with {a|even} rank give {m|+4} Mult when scored (10, 8, 6, 4, 2)",
    "Lá số {a|chẵn} tính điểm cho {m|+4} Mult (10, 8, 6, 4, 2)",
    { scored: (_c, card) => (!isStone(card) && card.rank <= 10 && card.rank % 2 === 0 ? M(4) : undefined) }),
  J("odd_todd", "Odd Todd", 1, 4, "🦄",
    "Played cards with {a|odd} rank give {c|+31} Chips when scored (A, 9, 7, 5, 3)",
    "Lá số {a|lẻ} tính điểm cho {c|+31} Chip (A, 9, 7, 5, 3)",
    { scored: (_c, card) => (!isStone(card) && [14, 9, 7, 5, 3].includes(card.rank) ? C(31) : undefined) }),
  J("scholar", "Scholar", 1, 4, "🎓",
    "Played {a|Aces} give {c|+20} Chips and {m|+4} Mult when scored",
    "Lá {a|Át} tính điểm cho {c|+20} Chip và {m|+4} Mult",
    { scored: (_c, card) => (!isStone(card) && card.rank === 14 ? { chips: 20, mult: 4 } : undefined) }),
  J("business", "Business Card", 1, 4, "💼",
    "Played {a|face} cards have a {g|%0} chance to give {$|$2} when scored",
    "Lá {a|mặt người} tính điểm có {g|%0} khả năng cho {$|$2}",
    {
      vars: (_j, s, l) => [odds(s, 1, 2, l)],
      scored: (c, card) => (isFace(c.s, card) && chance(c.s, 1, 2) ? $(2) : undefined),
    }),
  J("supernova", "Supernova", 1, 5, "💥",
    "Adds the number of times {a|poker hand} has been played this run to Mult",
    "Cộng số lần {a|tay bài} này đã được chơi trong ván vào Mult",
    { main: (c) => M(c.s.playCount[c.p!.hand]) }),
  J("ride_bus", "Ride the Bus", 1, 6, "🚌",
    ...withCur("This Joker gains {m|+1} Mult per {a|consecutive} hand played without a scoring {a|face} card",
      "Nhận {m|+1} Mult cho mỗi tay bài {a|liên tiếp} không có lá {a|mặt người} tính điểm", "m"),
    {
      v0: { mult: 0 },
      vars: (j) => [j.v.mult ?? 0],
      before: (c) => {
        if (!own(c)) return;
        if (c.p!.scoring.some((x) => isFace(c.s, x))) {
          const had = c.j.v.mult > 0;
          c.j.v.mult = 0;
          return had ? { text: "Reset", tone: "bad" } : undefined;
        }
        c.j.v.mult += 1;
      },
      main: (c) => (c.j.v.mult ? M(c.j.v.mult) : undefined),
    }),
  J("space", "Space Joker", 2, 5, "🚀",
    "{g|%0} chance to upgrade level of played {a|poker hand}",
    "{g|%0} khả năng tăng cấp {a|tay bài} được chơi",
    {
      vars: (_j, s, l) => [odds(s, 1, 4, l)],
      before: (c) => {
        if (chance(c.s, 1, 4)) {
          ops.levelUp(c.s, c.p!.hand);
          return { text: "Level up!", tone: "info" };
        }
      },
    }),
  J("egg", "Egg", 1, 4, "🥚",
    "Gains {$|$3} of {a|sell value} at end of round",
    "Tăng {$|$3} {a|giá bán} vào cuối mỗi vòng",
    { bp: false, roundEnd: (c) => { c.j.extraSell += 3; return { text: "Value up!", tone: "money" }; } }),
  J("burglar", "Burglar", 2, 6, "🦹",
    "When {a|Blind} is selected, gain {c|+3} Hands and {m|lose all discards}",
    "Khi chọn {a|Blind}, nhận {c|+3} lượt chơi và {m|mất hết lượt bỏ bài}",
    { blindSelect: (c) => { c.s.hands += 3; c.s.discards = 0; return { text: "+3 Hands", tone: "chips" }; } }),
  J("blackboard", "Blackboard", 2, 6, "🖍️",
    "{x|X3} Mult if all cards held in hand are {S|Spades} or {C|Clubs}",
    "{x|X3} Mult nếu mọi lá trên tay đều là {S|Bích} hoặc {C|Chuồn}",
    { main: (c) => (c.p!.held.every((x) => isSuit(c.s, x, "S") || isSuit(c.s, x, "C")) ? X(3) : undefined) }),
  J("runner", "Runner", 1, 5, "🏃",
    ...withCur("Gains {c|+15} Chips if played hand contains a {a|Straight}", "Nhận {c|+15} Chip nếu tay bài có {a|Sảnh}", "c"),
    {
      v0: { chips: 0 },
      vars: (j) => [j.v.chips ?? 0],
      before: (c) => {
        if (own(c) && c.p!.contains.has("straight")) {
          c.j.v.chips += 15;
          return up();
        }
      },
      main: (c) => (c.j.v.chips ? C(c.j.v.chips) : undefined),
    }),
  J("ice_cream", "Ice Cream", 1, 5, "🍦",
    "{c|+%0} Chips. {c|-5} Chips for every hand played", "{c|+%0} Chip. Giảm {c|5} Chip sau mỗi tay bài",
    {
      v0: { chips: 100 },
      vars: (j) => [j.v.chips ?? 100],
      main: (c) => C(c.j.v.chips),
      after: (c) => {
        if (!own(c)) return;
        c.j.v.chips -= 5;
        if (c.j.v.chips <= 0) return destroySelf(c, "Melted!");
        return { text: "-5", tone: "chips" };
      },
    }),
  J("dna", "DNA", 3, 8, "🧬",
    "If {a|first hand} of round has only {a|1} card, add a permanent copy to deck and draw it to {a|hand}",
    "Nếu {a|tay bài đầu tiên} của vòng chỉ có {a|1} lá, thêm một bản sao vĩnh viễn vào bộ bài và rút lên {a|tay}",
    {
      before: (c) => {
        const p = c.p!;
        if (!p.firstHand || p.played.length !== 1) return;
        const src = p.played[0];
        ops.addCards(c.s, [{ ...src, id: c.s.nextId++ }], "hand");
        return { text: "Copied!", tone: "info" };
      },
    }),
  J("splash", "Splash", 1, 3, "💦",
    "Every {a|played card} counts in scoring", "Mọi {a|lá được chơi} đều tính điểm", { bp: false }),
  J("blue_joker", "Blue Joker", 1, 5, "💙",
    "{c|+2} Chips for each remaining card in {a|deck} (Currently {c|+%0} Chips)",
    "{c|+2} Chip cho mỗi lá còn trong {a|chồng bài} (Hiện tại {c|+%0} Chip)",
    { vars: (_j, s) => [2 * (s?.draw.length ?? 52)], main: (c) => (c.s.draw.length ? C(2 * c.s.draw.length) : undefined) }),
  J("sixth_sense", "Sixth Sense", 2, 6, "👁️",
    "If {a|first hand} of round is a single {a|6}, destroy it and create a {s|Spectral} card (Must have room)",
    "Nếu {a|tay đầu tiên} của vòng là một lá {a|6} duy nhất, phá nó và tạo một lá {s|Spectral} (cần còn chỗ)",
    {
      before: (c) => {
        const p = c.p!;
        if (!p.firstHand || p.played.length !== 1 || p.played[0].rank !== 6 || isStone(p.played[0])) return;
        p.destroy.add(p.played[0].id);
        if (ops.createCons(c.s, "spectral")) return { text: "+Spectral", tone: "info" };
      },
    }),
  J("constellation", "Constellation", 2, 6, "✨",
    ...withCur("This Joker gains {x|X0.1} Mult every time a {p|Planet} card is used", "Nhận {x|X0.1} Mult mỗi khi dùng một lá {p|Hành Tinh}", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      planetUsed: (c) => { c.j.v.x += 0.1; },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("hiker", "Hiker", 2, 5, "🥾",
    "Every played {a|card} permanently gains {c|+5} Chips when scored",
    "Mỗi lá được chơi và tính điểm nhận vĩnh viễn {c|+5} Chip",
    { scored: (_c, card) => { card.extra += 5; return up(); } }),
  J("faceless", "Faceless Joker", 1, 4, "😶",
    "Earn {$|$5} if {a|3} or more {a|face cards} are discarded at the same time",
    "Nhận {$|$5} nếu bỏ cùng lúc từ {a|3} lá {a|mặt người} trở lên",
    { discard: (c, cards) => (cards.filter((x) => isFace(c.s, x)).length >= 3 ? $(5) : undefined) }),
  J("green_joker", "Green Joker", 1, 4, "🦎",
    ...withCur("{m|+1} Mult per hand played, {m|-1} Mult per discard", "{m|+1} Mult mỗi tay bài, {m|-1} Mult mỗi lượt bỏ bài", "m"),
    {
      v0: { mult: 0 },
      vars: (j) => [j.v.mult ?? 0],
      before: (c) => { if (own(c)) c.j.v.mult += 1; },
      discard: (c) => {
        if (own(c) && c.j.v.mult > 0) {
          c.j.v.mult -= 1;
          return { text: "-1 Mult", tone: "mult" };
        }
      },
      main: (c) => (c.j.v.mult ? M(c.j.v.mult) : undefined),
    }),
  J("superposition", "Superposition", 1, 4, "⚛️",
    "Create a {t|Tarot} card if poker hand contains an {a|Ace} and a {a|Straight} (Must have room)",
    "Tạo một lá {t|Tarot} nếu tay bài có lá {a|Át} và {a|Sảnh} (cần còn chỗ)",
    {
      before: (c) => {
        const p = c.p!;
        if (p.contains.has("straight") && p.scoring.some((x) => x.rank === 14 && !isStone(x)) && ops.createCons(c.s, "tarot"))
          return { text: "+Tarot", tone: "info" };
      },
    }),
  J("todo", "To Do List", 1, 4, "📝",
    "Earn {$|$4} if {a|poker hand} is a %0, poker hand changes at end of round",
    "Nhận {$|$4} nếu tay bài là %0, thay đổi vào cuối mỗi vòng",
    {
      vars: (j, _s, l) => [handTxt(j.v.hand ?? HAND_ORDER.indexOf("pair"), l)],
      init: (j, s) => { j.v.hand = HAND_ORDER.indexOf(pick(s, COMMON_HANDS)); },
      before: (c) => (HAND_ORDER[c.j.v.hand] === c.p!.hand ? $(4) : undefined),
      roundEnd: (c) => {
        const opts = COMMON_HANDS.filter((h) => HAND_ORDER.indexOf(h) !== c.j.v.hand);
        c.j.v.hand = HAND_ORDER.indexOf(pick(c.s, opts));
      },
    }),
  J("cavendish", "Cavendish", 1, 4, "🍌",
    "{x|X3} Mult. {g|%0} chance this card is destroyed at end of round",
    "{x|X3} Mult. {g|%0} khả năng lá này bị hủy cuối vòng",
    {
      vars: (_j, s, l) => [odds(s, 1, 1000, l)],
      gate: (s) => !!s.flags.grosGone,
      main: () => X(3),
      roundEnd: (c) => (chance(c.s, 1, 1000) ? destroySelf(c, "Extinct!") : undefined),
    }),
  J("card_sharp", "Card Sharp", 2, 6, "🎴",
    "{x|X3} Mult if played {a|poker hand} has already been played this round",
    "{x|X3} Mult nếu {a|tay bài} này đã được chơi trong vòng",
    { main: (c) => (c.p!.roundBefore.includes(c.p!.hand) ? X(3) : undefined) }),
  J("red_card", "Red Card", 1, 5, "📕",
    ...withCur("This Joker gains {m|+3} Mult when any {a|Booster Pack} is skipped", "Nhận {m|+3} Mult mỗi khi bỏ qua một {a|Gói bài}", "m"),
    {
      v0: { mult: 0 },
      vars: (j) => [j.v.mult ?? 0],
      packSkipped: (c) => { c.j.v.mult += 3; },
      main: (c) => (c.j.v.mult ? M(c.j.v.mult) : undefined),
    }),
  J("madness", "Madness", 2, 7, "🤯",
    ...withCur("When {a|Small Blind} or {a|Big Blind} is selected, gain {x|X0.5} Mult and {m|destroy} a random Joker",
      "Khi chọn {a|Mù Nhỏ} hoặc {a|Mù Lớn}, nhận {x|X0.5} Mult và {m|phá} một Joker ngẫu nhiên", "x"),
    {
      bp: false,
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      blindSelect: (c) => {
        if ((c.blind ?? 0) >= 2) return;
        c.j.v.x += 0.5;
        const victims = c.s.jokers.filter((x) => x !== c.self && !x.eternal);
        if (victims.length) ops.removeJoker(c.s, pick(c.s, victims).id);
        return { text: "X" + fmt(1 + c.j.v.x), tone: "xmult" };
      },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("square", "Square Joker", 1, 4, "🔲",
    ...withCur("This Joker gains {c|+4} Chips if played hand has exactly {a|4} cards", "Nhận {c|+4} Chip nếu chơi đúng {a|4} lá", "c"),
    {
      v0: { chips: 0 },
      vars: (j) => [j.v.chips ?? 0],
      before: (c) => {
        if (own(c) && c.p!.played.length === 4) {
          c.j.v.chips += 4;
          return up();
        }
      },
      main: (c) => (c.j.v.chips ? C(c.j.v.chips) : undefined),
    }),
  J("seance", "Séance", 2, 6, "🕯️",
    "If {a|poker hand} is a {a|Straight Flush}, create a random {s|Spectral} card (Must have room)",
    "Nếu tay bài là {a|Thùng Phá Sảnh}, tạo một lá {s|Spectral} ngẫu nhiên (cần còn chỗ)",
    { before: (c) => (c.p!.hand === "sflush" && ops.createCons(c.s, "spectral") ? { text: "+Spectral", tone: "info" } : undefined) }),
  J("riff_raff", "Riff-Raff", 1, 6, "🎭",
    "When {a|Blind} is selected, create {a|2} {c|Common} Jokers (Must have room)",
    "Khi chọn {a|Blind}, tạo {a|2} Joker {c|Thường} (cần còn chỗ)",
    {
      blindSelect: (c) => {
        let n = 0;
        for (let i = 0; i < 2; i++) if (ops.canAddJoker(c.s) && ops.createJoker(c.s, 1)) n++;
        return n ? { text: `+${n} Joker`, tone: "info" } : undefined;
      },
    }),
  J("vampire", "Vampire", 2, 7, "🧛",
    ...withCur("This Joker gains {x|X0.1} Mult per scoring {a|Enhanced card} played, removes card {a|Enhancement}",
      "Nhận {x|X0.1} Mult cho mỗi lá {a|có cường hóa} tính điểm, xóa {a|cường hóa} của lá đó", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      before: (c) => {
        if (!own(c)) return;
        let n = 0;
        for (const card of c.p!.scoring) {
          if (card.enh && !c.p!.debuffed.has(card.id)) {
            delete card.enh;
            n++;
          }
        }
        if (n) {
          c.j.v.x += 0.1 * n;
          return { text: "X" + fmt(1 + c.j.v.x), tone: "xmult" };
        }
      },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("shortcut", "Shortcut", 2, 7, "🔀",
    "Allows {a|Straights} to be made with gaps of {a|1 rank} (ex: 10 8 6 5 3)",
    "Cho phép {a|Sảnh} cách quãng {a|1 bậc} (vd: 10 8 6 5 3)", { bp: false }),
  J("hologram", "Hologram", 2, 7, "🌈",
    ...withCur("This Joker gains {x|X0.25} Mult every time a {a|playing card} is added to your deck",
      "Nhận {x|X0.25} Mult mỗi khi một {a|lá bài} được thêm vào bộ bài", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      cardsAdded: (c, n) => { c.j.v.x += 0.25 * n; },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("vagabond", "Vagabond", 3, 8, "🎒",
    "Create a {t|Tarot} card if hand is played with {$|$4} or less",
    "Tạo một lá {t|Tarot} nếu chơi bài khi có từ {$|$4} trở xuống",
    { before: (c) => (c.s.money <= 4 && ops.createCons(c.s, "tarot") ? { text: "+Tarot", tone: "info" } : undefined) }),
  J("baron", "Baron", 3, 8, "👑",
    "Each {a|King} held in hand gives {x|X1.5} Mult", "Mỗi lá {a|K} giữ trên tay cho {x|X1.5} Mult",
    { held: (_c, card) => (!isStone(card) && card.rank === 13 ? X(1.5) : undefined) }),
  J("cloud9", "Cloud 9", 2, 7, "☁️",
    "Earn {$|$1} for each {a|9} in your full deck at end of round (Currently {$|$%0})",
    "Nhận {$|$1} cho mỗi lá {a|9} trong bộ bài vào cuối vòng (Hiện tại {$|$%0})",
    {
      bp: false,
      vars: (_j, s) => [s ? ops.deckCount(s, (x) => x.rank === 9 && !isStone(x)) : 4],
      payout: (c) => ops.deckCount(c.s, (x) => x.rank === 9 && !isStone(x)),
    }),
  J("rocket", "Rocket", 2, 6, "🚀",
    "Earn {$|$%0} at end of round. Payout increases by {$|$2} when {a|Boss Blind} is defeated",
    "Nhận {$|$%0} cuối vòng. Tăng thêm {$|$2} mỗi khi hạ {a|Trùm}",
    {
      bp: false,
      v0: { n: 1 },
      vars: (j) => [j.v.n ?? 1],
      payout: (c) => c.j.v.n,
      roundEnd: (c, boss) => {
        if (boss) {
          c.j.v.n += 2;
          return up();
        }
      },
    }),
  J("obelisk", "Obelisk", 3, 8, "🗿",
    ...withCur("This Joker gains {x|X0.2} Mult per {a|consecutive} hand played without playing your most played {a|poker hand}",
      "Nhận {x|X0.2} Mult mỗi tay bài {a|liên tiếp} không chơi {a|tay bài} bạn chơi nhiều nhất", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      before: (c) => {
        if (!own(c)) return;
        const counts = c.p!.countBefore;
        const max = Math.max(...Object.values(counts));
        if (max > 0 && counts[c.p!.hand] === max) {
          const had = c.j.v.x > 0;
          c.j.v.x = 0;
          return had ? { text: "Reset", tone: "bad" } : undefined;
        }
        c.j.v.x += 0.2;
      },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("midas", "Midas Mask", 2, 7, "😷",
    "All played {a|face} cards become {a|Gold} cards when scored",
    "Mọi lá {a|mặt người} được chơi trở thành lá {a|Vàng} khi tính điểm",
    {
      before: (c) => {
        let n = 0;
        for (const card of c.p!.scoring) if (isFace(c.s, card) && !c.p!.debuffed.has(card.id)) { card.enh = "gold"; n++; }
        return n ? { text: "Gold", tone: "money" } : undefined;
      },
    }),
  J("luchador", "Luchador", 2, 5, "🤼",
    "Sell this card to disable the current {a|Boss Blind}",
    "Bán lá này để vô hiệu hóa {a|Trùm} hiện tại",
    { bp: false, sold: (c) => { if (ops.bossActive(c.s)) c.s.bossDisabled = true; } }),
  J("photograph", "Photograph", 1, 5, "📷",
    "First played {a|face} card gives {x|X2} Mult when scored",
    "Lá {a|mặt người} đầu tiên tính điểm cho {x|X2} Mult",
    {
      scored: (c, card) => {
        const first = c.p!.scoring.find((x) => isFace(c.s, x));
        return first && first.id === card.id ? X(2) : undefined;
      },
    }),
  J("gift_card", "Gift Card", 2, 6, "🎁",
    "Add {$|$1} of {a|sell value} to every {a|Joker} and {a|Consumable} card at end of round",
    "Cộng {$|$1} {a|giá bán} cho mọi lá {a|Joker} và lá {a|tiêu hao} vào cuối vòng",
    {
      bp: false,
      roundEnd: (c) => {
        for (const j of c.s.jokers) j.extraSell += 1;
        for (const x of c.s.cons) x.extraSell += 1;
        return { text: "+$1", tone: "money" };
      },
    }),
  J("turtle_bean", "Turtle Bean", 2, 6, "🐢",
    "{a|+%0} hand size, reduces by {m|1} every round", "{a|+%0} kích thước tay, giảm {m|1} mỗi vòng",
    {
      bp: false,
      v0: { n: 5 },
      vars: (j) => [j.v.n ?? 5],
      roundEnd: (c) => {
        c.j.v.n -= 1;
        if (c.j.v.n <= 0) return destroySelf(c, "Eaten!");
        return { text: "-1", tone: "bad" };
      },
    }),
  J("erosion", "Erosion", 2, 6, "🏜️",
    "{m|+4} Mult for each card below {a|%1} in your full deck (Currently {m|+%0} Mult)",
    "{m|+4} Mult cho mỗi lá thiếu so với {a|%1} lá trong bộ bài (Hiện tại {m|+%0} Mult)",
    {
      vars: (_j, s) => [s ? 4 * Math.max(0, (s.flags.startDeck ?? 52) - s.cards.length) : 0, s?.flags.startDeck ?? 52],
      main: (c) => {
        const n = Math.max(0, (c.s.flags.startDeck ?? 52) - c.s.cards.length);
        return n ? M(4 * n) : undefined;
      },
    }),
  J("reserved_parking", "Reserved Parking", 1, 6, "🅿️",
    "Each {a|face} card held in hand has a {g|%0} chance to give {$|$1}",
    "Mỗi lá {a|mặt người} giữ trên tay có {g|%0} khả năng cho {$|$1}",
    {
      vars: (_j, s, l) => [odds(s, 1, 2, l)],
      held: (c, card) => (isFace(c.s, card) && chance(c.s, 1, 2) ? $(1) : undefined),
    }),
  J("mail_in", "Mail-In Rebate", 1, 4, "📮",
    "Earn {$|$5} for each discarded %0, rank changes every round",
    "Nhận {$|$5} cho mỗi lá %0 bị bỏ, số thay đổi mỗi vòng",
    {
      vars: (j, _s, l) => [rankTxt(j.v.rank ?? 14, l)],
      init: (j, s) => { j.v.rank = pick(s, RANKS); },
      discard: (c, cards) => {
        const n = cards.filter((x) => !isStone(x) && x.rank === c.j.v.rank).length;
        return n ? $(5 * n) : undefined;
      },
      roundEnd: (c) => { c.j.v.rank = pick(c.s, RANKS.filter((r) => r !== c.j.v.rank)); },
    }),
  J("to_the_moon", "To the Moon", 2, 5, "🌕",
    "Earn an extra {$|$1} of {a|interest} for every {$|$5} you have at end of round",
    "Nhận thêm {$|$1} {a|tiền lãi} cho mỗi {$|$5} bạn có vào cuối vòng", { bp: false }),
  J("hallucination", "Hallucination", 1, 4, "😵",
    "{g|%0} chance to create a {t|Tarot} card when any {a|Booster Pack} is opened (Must have room)",
    "{g|%0} khả năng tạo một lá {t|Tarot} khi mở bất kỳ {a|Gói bài} nào (cần còn chỗ)",
    {
      bp: false,
      vars: (_j, s, l) => [odds(s, 1, 2, l)],
      packOpened: (c) => { if (chance(c.s, 1, 2)) ops.createCons(c.s, "tarot"); },
    }),
  J("fortune_teller", "Fortune Teller", 1, 6, "🔮",
    "{m|+1} Mult per {t|Tarot} card used this run (Currently {m|+%0} Mult)",
    "{m|+1} Mult cho mỗi lá {t|Tarot} đã dùng trong ván (Hiện tại {m|+%0} Mult)",
    { vars: (_j, s) => [s?.stats.tarotsUsed ?? 0], main: (c) => (c.s.stats.tarotsUsed ? M(c.s.stats.tarotsUsed) : undefined) }),
  J("juggler", "Juggler", 1, 4, "🤹", "{a|+1} hand size", "{a|+1} kích thước tay", { bp: false, handSize: 1 }),
  J("drunkard", "Drunkard", 1, 4, "🍺", "{m|+1} discard each round", "{m|+1} lượt bỏ bài mỗi vòng", { bp: false, discardsMod: 1 }),
  J("stone_joker", "Stone Joker", 2, 6, "🥌",
    "Gives {c|+25} Chips for each {a|Stone Card} in your full deck (Currently {c|+%0} Chips)",
    "{c|+25} Chip cho mỗi {a|Lá Đá} trong bộ bài (Hiện tại {c|+%0} Chip)",
    {
      vars: (_j, s) => [25 * (s ? ops.deckCount(s, isStone) : 0)],
      main: (c) => {
        const n = ops.deckCount(c.s, isStone);
        return n ? C(25 * n) : undefined;
      },
    }),
  J("golden", "Golden Joker", 1, 6, "🌟", "Earn {$|$4} at end of round", "Nhận {$|$4} vào cuối vòng", { bp: false, payout: () => 4 }),
  J("lucky_cat", "Lucky Cat", 2, 6, "🐱",
    ...withCur("This Joker gains {x|X0.25} Mult every time a {a|Lucky} card {g|successfully} triggers",
      "Nhận {x|X0.25} Mult mỗi khi một lá {a|May Mắn} kích hoạt {g|thành công}", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      luckyTriggered: (c) => { c.j.v.x += 0.25; },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("baseball", "Baseball Card", 3, 8, "⚾",
    "{g|Uncommon} Jokers each give {x|X1.5} Mult", "Mỗi Joker {g|Không Phổ Biến} cho {x|X1.5} Mult", { bp: false }),
  J("bull", "Bull", 2, 6, "🐂",
    "{c|+2} Chips for each {$|$1} you have (Currently {c|+%0} Chips)",
    "{c|+2} Chip cho mỗi {$|$1} bạn có (Hiện tại {c|+%0} Chip)",
    { vars: (_j, s) => [2 * Math.max(0, s?.money ?? 0)], main: (c) => (c.s.money > 0 ? C(2 * c.s.money) : undefined) }),
  J("diet_cola", "Diet Cola", 2, 6, "🥤",
    "Sell this card to create a free {a|Double Tag}", "Bán lá này để nhận miễn phí một {a|Thẻ Nhân Đôi}",
    { bp: false, sold: (c) => { c.s.tags.push({ id: c.s.nextId++, key: "double" }); } }),
  J("trading", "Trading Card", 2, 6, "💱",
    "If {a|first discard} of round has only {a|1} card, destroy it and earn {$|$3}",
    "Nếu {a|lượt bỏ đầu tiên} của vòng chỉ có {a|1} lá, phá lá đó và nhận {$|$3}",
    {
      discard: (c, cards) => {
        if (!c.first || cards.length !== 1 || !c.s.cards.some((x) => x.id === cards[0].id)) return;
        ops.destroyCards(c.s, [cards[0].id]);
        return { money: 3, text: "Destroyed", tone: "money" };
      },
    }),
  J("flash", "Flash Card", 2, 5, "⚡",
    ...withCur("This Joker gains {m|+2} Mult per {a|reroll} in the shop", "Nhận {m|+2} Mult mỗi lần {a|đổi mới} cửa hàng", "m"),
    {
      v0: { mult: 0 },
      vars: (j) => [j.v.mult ?? 0],
      reroll: (c) => { c.j.v.mult += 2; },
      main: (c) => (c.j.v.mult ? M(c.j.v.mult) : undefined),
    }),
  J("popcorn", "Popcorn", 1, 5, "🍿",
    "{m|+%0} Mult. {m|-4} Mult per round played", "{m|+%0} Mult. Giảm {m|4} Mult mỗi vòng",
    {
      v0: { mult: 20 },
      vars: (j) => [j.v.mult ?? 20],
      main: (c) => M(c.j.v.mult),
      roundEnd: (c) => {
        c.j.v.mult -= 4;
        if (c.j.v.mult <= 0) return destroySelf(c, "Eaten!");
        return { text: "-4", tone: "mult" };
      },
    }),
  J("trousers", "Spare Trousers", 2, 6, "👖",
    ...withCur("This Joker gains {m|+2} Mult if played hand contains a {a|Two Pair}", "Nhận {m|+2} Mult nếu tay bài có {a|Thú}", "m"),
    {
      v0: { mult: 0 },
      vars: (j) => [j.v.mult ?? 0],
      before: (c) => {
        if (own(c) && c.p!.contains.has("twopair")) {
          c.j.v.mult += 2;
          return up();
        }
      },
      main: (c) => (c.j.v.mult ? M(c.j.v.mult) : undefined),
    }),
  J("ancient", "Ancient Joker", 3, 8, "🏺",
    "Each played card with %0 suit gives {x|X1.5} Mult when scored, suit changes at end of round",
    "Mỗi lá chất %0 tính điểm cho {x|X1.5} Mult, chất thay đổi cuối mỗi vòng",
    {
      vars: (j, _s, l) => [suitTxt(j.v.suit ?? 0, l)],
      init: (j, s) => { j.v.suit = randInt(s, 0, 3); },
      scored: (c, card) => (isSuit(c.s, card, SUITS[c.j.v.suit]) ? X(1.5) : undefined),
      roundEnd: (c) => { c.j.v.suit = pick(c.s, [0, 1, 2, 3].filter((x) => x !== c.j.v.suit)); },
    }),
  J("ramen", "Ramen", 2, 6, "🍜",
    "{x|X%0} Mult, loses {x|X0.01} Mult per {a|card} discarded", "{x|X%0} Mult, giảm {x|X0.01} cho mỗi {a|lá} bị bỏ",
    {
      v0: { x: 2 },
      vars: (j) => [fmt(j.v.x ?? 2)],
      discard: (c, cards) => {
        if (!own(c)) return;
        c.j.v.x = Math.round((c.j.v.x - 0.01 * cards.length) * 100) / 100;
        if (c.j.v.x <= 1) return destroySelf(c, "Eaten!");
      },
      main: (c) => X(c.j.v.x),
    }),
  J("walkie", "Walkie Talkie", 1, 4, "📻",
    "Each played {a|10} or {a|4} gives {c|+10} Chips and {m|+4} Mult when scored",
    "Mỗi lá {a|10} hoặc {a|4} tính điểm cho {c|+10} Chip và {m|+4} Mult",
    { scored: (_c, card) => (!isStone(card) && (card.rank === 10 || card.rank === 4) ? { chips: 10, mult: 4 } : undefined) }),
  J("seltzer", "Seltzer", 2, 6, "🍾",
    "Retrigger all cards played for the next {a|%0} hands", "Kích hoạt lại mọi lá được chơi trong {a|%0} tay bài tới",
    {
      v0: { n: 10 },
      vars: (j) => [j.v.n ?? 10],
      retrigger: () => 1,
      after: (c) => {
        if (!own(c)) return;
        c.j.v.n -= 1;
        if (c.j.v.n <= 0) return destroySelf(c, "Drank!");
      },
    }),
  J("castle", "Castle", 2, 6, "🏰",
    ...withCur("This Joker gains {c|+3} Chips per discarded %1 card, suit changes every round",
      "Nhận {c|+3} Chip cho mỗi lá %1 bị bỏ, chất thay đổi mỗi vòng", "c"),
    {
      v0: { chips: 0 },
      vars: (j, _s, l) => [j.v.chips ?? 0, suitTxt(j.v.suit ?? 0, l)],
      init: (j, s) => { j.v.suit = randInt(s, 0, 3); },
      discard: (c, cards) => {
        if (!own(c)) return;
        const n = cards.filter((x) => isSuit(c.s, x, SUITS[c.j.v.suit])).length;
        if (n) {
          c.j.v.chips += 3 * n;
          return up();
        }
      },
      roundEnd: (c) => { c.j.v.suit = pick(c.s, [0, 1, 2, 3].filter((x) => x !== c.j.v.suit)); },
      main: (c) => (c.j.v.chips ? C(c.j.v.chips) : undefined),
    }),
  J("smiley", "Smiley Face", 1, 4, "🙂",
    "Played {a|face} cards give {m|+5} Mult when scored", "Lá {a|mặt người} tính điểm cho {m|+5} Mult",
    { scored: (c, card) => (isFace(c.s, card) ? M(5) : undefined) }),
  J("campfire", "Campfire", 3, 9, "🔥",
    ...withCur("This Joker gains {x|X0.25} Mult for each {a|card} sold, resets when {a|Boss Blind} is defeated",
      "Nhận {x|X0.25} Mult cho mỗi {a|lá} được bán, đặt lại khi hạ {a|Trùm}", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      anySold: (c) => { c.j.v.x += 0.25; },
      roundEnd: (c, boss) => {
        if (boss && c.j.v.x) {
          c.j.v.x = 0;
          return { text: "Reset", tone: "bad" };
        }
      },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("golden_ticket", "Golden Ticket", 1, 5, "🎫",
    "Played {a|Gold} cards earn {$|$4} when scored", "Lá {a|Vàng} được chơi cho {$|$4} khi tính điểm",
    { scored: (_c, card) => (card.enh === "gold" ? $(4) : undefined) }),
  J("mr_bones", "Mr. Bones", 2, 5, "💀",
    "Prevents Death if chips scored are at least {a|25%} of required chips. {m|Self destructs}",
    "Cứu bạn khỏi thua nếu điểm đạt ít nhất {a|25%} yêu cầu. {m|Tự hủy} sau đó", { bp: false }),
  J("acrobat", "Acrobat", 2, 6, "🤾",
    "{x|X3} Mult on {a|final hand} of round", "{x|X3} Mult ở {a|tay bài cuối cùng} của vòng",
    { main: (c) => (c.p!.final ? X(3) : undefined) }),
  J("sock_buskin", "Sock and Buskin", 2, 6, "🎭",
    "Retrigger all played {a|face} cards", "Kích hoạt lại mọi lá {a|mặt người} được chơi",
    { retrigger: (c, card) => (isFace(c.s, card) ? 1 : 0) }),
  J("swashbuckler", "Swashbuckler", 1, 4, "🏴‍☠️",
    "Adds the sell value of all other owned {a|Jokers} to Mult (Currently {m|+%0} Mult)",
    "Cộng giá bán của mọi {a|Joker} khác vào Mult (Hiện tại {m|+%0} Mult)",
    {
      vars: (j, s) => [s ? s.jokers.filter((x) => x.id !== j.id).reduce((a, x) => a + ops.sellValue(x), 0) : 0],
      main: (c) => {
        const n = c.s.jokers.filter((x) => x !== c.self).reduce((a, x) => a + ops.sellValue(x), 0);
        return n ? M(n) : undefined;
      },
    }),
  J("troubadour", "Troubadour", 2, 6, "🎻",
    "{a|+2} hand size, {c|-1} hand each round", "{a|+2} kích thước tay, {c|-1} lượt chơi mỗi vòng",
    { bp: false, handSize: 2, handsMod: -1 }),
  J("certificate", "Certificate", 2, 6, "📜",
    "When round begins, add a random {a|playing card} with a random {a|seal} to your hand",
    "Khi vòng bắt đầu, thêm một {a|lá bài} ngẫu nhiên có {a|dấu} ngẫu nhiên lên tay",
    {
      blindSelect: (c) => {
        const seal = pick<Seal>(c.s, ["gold", "red", "blue", "purple"]);
        ops.addCards(c.s, [newCard(c.s, pick(c.s, RANKS), pick(c.s, SUITS), { seal })], "hand");
        return { text: "+Card", tone: "info" };
      },
    }),
  J("smeared", "Smeared Joker", 2, 7, "🖌️",
    "{H|Hearts} and {D|Diamonds} count as the same suit, {S|Spades} and {C|Clubs} count as the same suit",
    "{H|Cơ} và {D|Rô} tính là cùng chất, {S|Bích} và {C|Chuồn} tính là cùng chất", { bp: false }),
  J("throwback", "Throwback", 2, 6, "📼",
    "{x|X0.25} Mult for each {a|Blind} skipped this run (Currently {x|X%0})",
    "{x|X0.25} Mult cho mỗi {a|Blind} đã bỏ qua trong ván (Hiện tại {x|X%0})",
    { vars: (_j, s) => [fmt(1 + 0.25 * (s?.stats.skips ?? 0))], main: (c) => (c.s.stats.skips ? X(1 + 0.25 * c.s.stats.skips) : undefined) }),
  J("hanging_chad", "Hanging Chad", 1, 4, "🗳️",
    "Retrigger {a|first} played card used in scoring {a|2} additional times",
    "Kích hoạt lại lá tính điểm {a|đầu tiên} thêm {a|2} lần",
    { retrigger: (_c, _card, i) => (i === 0 ? 2 : 0) }),
  J("rough_gem", "Rough Gem", 2, 7, "💠",
    "Played cards with {D|Diamond} suit earn {$|$1} when scored", "Lá chất {D|Rô} tính điểm cho {$|$1}",
    { scored: (c, card) => (isSuit(c.s, card, "D") ? $(1) : undefined) }),
  J("bloodstone", "Bloodstone", 2, 7, "🩸",
    "{g|%0} chance for played cards with {H|Heart} suit to give {x|X1.5} Mult when scored",
    "Lá chất {H|Cơ} tính điểm có {g|%0} khả năng cho {x|X1.5} Mult",
    { vars: (_j, s, l) => [odds(s, 1, 2, l)], scored: (c, card) => (isSuit(c.s, card, "H") && chance(c.s, 1, 2) ? X(1.5) : undefined) }),
  J("arrowhead", "Arrowhead", 2, 7, "🏹",
    "Played cards with {S|Spade} suit give {c|+50} Chips when scored", "Lá chất {S|Bích} tính điểm cho {c|+50} Chip",
    { scored: (c, card) => (isSuit(c.s, card, "S") ? C(50) : undefined) }),
  J("onyx", "Onyx Agate", 2, 7, "🖤",
    "Played cards with {C|Club} suit give {m|+7} Mult when scored", "Lá chất {C|Chuồn} tính điểm cho {m|+7} Mult",
    { scored: (c, card) => (isSuit(c.s, card, "C") ? M(7) : undefined) }),
  J("glass_joker", "Glass Joker", 2, 6, "🥃",
    ...withCur("This Joker gains {x|X0.75} Mult for every {a|Glass Card} that is destroyed",
      "Nhận {x|X0.75} Mult cho mỗi {a|Lá Kính} bị phá", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      cardsDestroyed: (c, cards) => { c.j.v.x += 0.75 * cards.filter((x) => x.enh === "glass").length; },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("showman", "Showman", 2, 5, "🎩",
    "{a|Joker}, {t|Tarot}, {p|Planet}, and {s|Spectral} cards may appear multiple times",
    "Các lá {a|Joker}, {t|Tarot}, {p|Hành Tinh}, {s|Spectral} có thể xuất hiện nhiều lần", { bp: false }),
  J("flower_pot", "Flower Pot", 2, 6, "🌻",
    "{x|X3} Mult if poker hand contains a {D|Diamond} card, {C|Club} card, {H|Heart} card, and {S|Spade} card",
    "{x|X3} Mult nếu tay bài có đủ lá {D|Rô}, {C|Chuồn}, {H|Cơ} và {S|Bích}",
    {
      main: (c) => {
        const cards = c.p!.scoring.filter((x) => !isStone(x));
        const wild = cards.filter((x) => x.enh === "wild").length;
        const missing = SUITS.filter((suit) => !cards.some((x) => x.enh !== "wild" && isSuit(c.s, x, suit))).length;
        return missing <= wild && cards.length >= 4 ? X(3) : undefined;
      },
    }),
  J("blueprint", "Blueprint", 3, 10, "📐",
    "Copies ability of {a|Joker} to the right", "Sao chép khả năng của {a|Joker} bên phải", { bp: false }),
  J("wee", "Wee Joker", 3, 8, "🐣",
    ...withCur("This Joker gains {c|+8} Chips when each played {a|2} is scored", "Nhận {c|+8} Chip mỗi khi lá {a|2} được tính điểm", "c"),
    {
      v0: { chips: 0 },
      vars: (j) => [j.v.chips ?? 0],
      scored: (c, card) => {
        if (own(c) && card.rank === 2 && !isStone(card)) {
          c.j.v.chips += 8;
          return up();
        }
      },
      main: (c) => (c.j.v.chips ? C(c.j.v.chips) : undefined),
    }),
  J("merry_andy", "Merry Andy", 2, 7, "🎪",
    "{m|+3} discards each round, {m|-1} hand size", "{m|+3} lượt bỏ bài mỗi vòng, {m|-1} kích thước tay",
    { bp: false, discardsMod: 3, handSize: -1 }),
  J("oops", "Oops! All 6s", 2, 4, "🎲",
    "Doubles all {a|listed} {g|probabilities} (ex: {g|1 in 3} -> {g|2 in 3})",
    "Nhân đôi mọi {g|xác suất} được ghi (vd: {g|1/3} -> {g|2/3})", { bp: false }),
  J("idol", "The Idol", 2, 6, "🗽",
    "Each played %0 of %1 gives {x|X2} Mult when scored. Card changes every round",
    "Mỗi lá %0 chất %1 tính điểm cho {x|X2} Mult. Lá thay đổi mỗi vòng",
    {
      vars: (j, _s, l) => [rankTxt(j.v.rank ?? 14, l), suitTxt(j.v.suit ?? 0, l)],
      init: (j, s) => {
        const card = s.cards.length ? pick(s, s.cards.filter((x) => !isStone(x))) : undefined;
        j.v.rank = card?.rank ?? 14;
        j.v.suit = SUITS.indexOf(card?.suit ?? "S");
      },
      scored: (c, card) => (!isStone(card) && card.rank === c.j.v.rank && isSuit(c.s, card, SUITS[c.j.v.suit]) ? X(2) : undefined),
      roundEnd: (c) => {
        const card = randomDeckCard(c);
        if (card) {
          c.j.v.rank = card.rank;
          c.j.v.suit = SUITS.indexOf(card.suit);
        }
      },
    }),
  J("seeing_double", "Seeing Double", 2, 6, "👯",
    "{x|X2} Mult if played hand has a scoring {C|Club} card and a scoring card of any other {a|suit}",
    "{x|X2} Mult nếu tay bài có lá {C|Chuồn} tính điểm và một lá {a|chất khác} tính điểm",
    {
      main: (c) => {
        const cards = c.p!.scoring.filter((x) => !isStone(x));
        const wild = cards.filter((x) => x.enh === "wild").length;
        const normal = cards.filter((x) => x.enh !== "wild");
        const club = normal.some((x) => isSuit(c.s, x, "C", true));
        const other = normal.some((x) => !isSuit(c.s, x, "C", true));
        return (club ? 0 : 1) + (other ? 0 : 1) <= wild ? X(2) : undefined;
      },
    }),
  J("matador", "Matador", 2, 7, "🗡️",
    "Earn {$|$8} if played hand triggers the {a|Boss Blind} ability",
    "Nhận {$|$8} nếu tay bài kích hoạt khả năng của {a|Trùm}",
    { before: (c) => (c.p!.bossTriggered ? $(8) : undefined) }),
  J("hit_road", "Hit the Road", 3, 8, "🛣️",
    ...withCur("This Joker gains {x|X0.5} Mult for every {a|Jack} discarded this round", "Nhận {x|X0.5} Mult cho mỗi lá {a|J} bị bỏ trong vòng", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      discard: (c, cards) => {
        if (!own(c)) return;
        const n = cards.filter((x) => x.rank === 11 && !isStone(x)).length;
        if (n) {
          c.j.v.x += 0.5 * n;
          return { text: "X" + fmt(1 + c.j.v.x), tone: "xmult" };
        }
      },
      roundEnd: (c) => { c.j.v.x = 0; },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  typeX("duo", "The Duo", "👥", "pair", 2),
  typeX("trio", "The Trio", "🔱", "three", 3),
  typeX("family", "The Family", "👨‍👩‍👧‍👦", "four", 4),
  typeX("order", "The Order", "🎖️", "straight", 3),
  typeX("tribe", "The Tribe", "⛺", "flush", 2),
  J("stuntman", "Stuntman", 3, 7, "🤸",
    "{c|+250} Chips, {m|-2} hand size", "{c|+250} Chip, {m|-2} kích thước tay", { handSize: -2, main: () => C(250) }),
  J("invisible", "Invisible Joker", 3, 8, "🌫️",
    "After {a|2} rounds, sell this card to {a|Duplicate} a random Joker (Currently {a|%0}/2)",
    "Sau {a|2} vòng, bán lá này để {a|nhân bản} một Joker ngẫu nhiên (Hiện tại {a|%0}/2)",
    {
      bp: false,
      v0: { n: 0 },
      vars: (j) => [Math.min(2, j.v.n ?? 0)],
      roundEnd: (c) => { c.j.v.n += 1; },
      sold: (c) => {
        if (c.j.v.n < 2) return;
        const others = c.s.jokers.filter((x) => x !== c.self);
        if (!others.length) return;
        const src = pick(c.s, others);
        const copy = { ...structuredClone(src), id: c.s.nextId++ };
        if (copy.ed === "negative") delete copy.ed;
        c.s.jokers.push(copy);
      },
    }),
  J("brainstorm", "Brainstorm", 3, 10, "🧠",
    "Copies the ability of leftmost {a|Joker}", "Sao chép khả năng của {a|Joker} ngoài cùng bên trái", { bp: false }),
  J("satellite", "Satellite", 2, 6, "🛰️",
    "Earn {$|$1} at end of round per unique {p|Planet} card used this run (Currently {$|$%0})",
    "Nhận {$|$1} cuối vòng cho mỗi loại lá {p|Hành Tinh} khác nhau đã dùng (Hiện tại {$|$%0})",
    { bp: false, vars: (_j, s) => [s?.planetsUsed.length ?? 0], payout: (c) => c.s.planetsUsed.length }),
  J("shoot_moon", "Shoot the Moon", 1, 5, "🌙",
    "Each {a|Queen} held in hand gives {m|+13} Mult", "Mỗi lá {a|Q} giữ trên tay cho {m|+13} Mult",
    { held: (_c, card) => (!isStone(card) && card.rank === 12 ? M(13) : undefined) }),
  J("drivers_license", "Driver's License", 3, 7, "🚗",
    "{x|X3} Mult if you have at least {a|16} Enhanced cards in your full deck (Currently {a|%0})",
    "{x|X3} Mult nếu bộ bài có ít nhất {a|16} lá có cường hóa (Hiện tại {a|%0})",
    { vars: (_j, s) => [s ? ops.enhancedCount(s) : 0], main: (c) => (ops.enhancedCount(c.s) >= 16 ? X(3) : undefined) }),
  J("cartomancer", "Cartomancer", 2, 6, "🧙",
    "Create a {t|Tarot} card when {a|Blind} is selected (Must have room)",
    "Tạo một lá {t|Tarot} khi chọn {a|Blind} (cần còn chỗ)",
    { blindSelect: (c) => (ops.createCons(c.s, "tarot") ? { text: "+Tarot", tone: "info" } : undefined) }),
  J("astronomer", "Astronomer", 2, 8, "🔭",
    "All {p|Planet} cards and {p|Celestial Packs} in the shop are {a|free}",
    "Mọi lá {p|Hành Tinh} và {p|Gói Thiên Văn} trong cửa hàng đều {a|miễn phí}", { bp: false }),
  J("burnt", "Burnt Joker", 3, 8, "🔥",
    "Upgrade the level of the first {a|discarded} poker hand each round",
    "Tăng cấp tay bài của lượt {a|bỏ bài} đầu tiên mỗi vòng",
    {
      discard: (c, cards) => {
        if (!c.first || !cards.length) return;
        const ev = evaluate(c.s, cards);
        ops.levelUp(c.s, ev.type);
        return { text: "Level up!", tone: "info" };
      },
    }),
  J("bootstraps", "Bootstraps", 2, 7, "👢",
    "{m|+2} Mult for every {$|$5} you have (Currently {m|+%0} Mult)",
    "{m|+2} Mult cho mỗi {$|$5} bạn có (Hiện tại {m|+%0} Mult)",
    {
      vars: (_j, s) => [2 * Math.max(0, Math.floor((s?.money ?? 0) / 5))],
      main: (c) => (c.s.money >= 5 ? M(2 * Math.floor(c.s.money / 5)) : undefined),
    }),
  // Legendary (only from The Soul)
  J("canio", "Canio", 4, 20, "🎭",
    ...withCur("This Joker gains {x|X1} Mult when a {a|face} card is destroyed", "Nhận {x|X1} Mult mỗi khi một lá {a|mặt người} bị phá", "x"),
    {
      v0: { x: 0 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0))],
      cardsDestroyed: (c, cards) => { c.j.v.x += cards.filter((x) => isFace(c.s, x)).length; },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("triboulet", "Triboulet", 4, 20, "🤴",
    "Played {a|Kings} and {a|Queens} each give {x|X2} Mult when scored",
    "Mỗi lá {a|K} và {a|Q} tính điểm cho {x|X2} Mult",
    { scored: (_c, card) => (!isStone(card) && (card.rank === 12 || card.rank === 13) ? X(2) : undefined) }),
  J("yorick", "Yorick", 4, 20, "☠️",
    ...withCur("This Joker gains {x|X1} Mult every {a|23} cards discarded ({a|%1} remaining)",
      "Nhận {x|X1} Mult sau mỗi {a|23} lá bị bỏ (còn {a|%1})", "x"),
    {
      v0: { x: 0, left: 23 },
      vars: (j) => [fmt(1 + (j.v.x ?? 0)), j.v.left ?? 23],
      discard: (c, cards) => {
        if (!own(c)) return;
        for (let i = 0; i < cards.length; i++) {
          c.j.v.left -= 1;
          if (c.j.v.left <= 0) {
            c.j.v.x += 1;
            c.j.v.left = 23;
          }
        }
      },
      main: (c) => (c.j.v.x ? X(1 + c.j.v.x) : undefined),
    }),
  J("chicot", "Chicot", 4, 20, "🃏",
    "Disables effect of every {a|Boss Blind}", "Vô hiệu hóa khả năng của mọi {a|Trùm}", { bp: false }),
  J("perkeo", "Perkeo", 4, 20, "🧞",
    "Creates a {d|Negative} copy of {a|1} random {a|consumable} card in your possession at the end of the {a|shop}",
    "Tạo một bản sao {d|Âm Bản} của {a|1} lá {a|tiêu hao} ngẫu nhiên bạn đang giữ khi rời {a|cửa hàng}",
    {
      bp: false,
      shopEnd: (c) => {
        if (!c.s.cons.length) return;
        const src = pick(c.s, c.s.cons);
        ops.addCons(c.s, src.key, true);
      },
    }),
];

export const JOKER_MAP: Record<string, JokerDef> = Object.fromEntries(JOKERS.map((j) => [j.key, j]));

export const RARITY_NAME: Record<number, { en: string; vi: string }> = {
  1: { en: "Common", vi: "Thường" },
  2: { en: "Uncommon", vi: "Không Phổ Biến" },
  3: { en: "Rare", vi: "Hiếm" },
  4: { en: "Legendary", vi: "Huyền Thoại" },
};

export type { Rank };
