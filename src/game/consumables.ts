import { newCard, RANKS, SUITS } from "./cards";
import { HAND_ORDER, HANDS } from "./hands";
import * as ops from "./ops";
import { chance, pick, shuffle } from "./rng";
import type { Card, ConsDef, Edition, Enh, HandType, Rank, Run, Seal, Suit } from "./types";

const ENHS: Enh[] = ["bonus", "mult", "wild", "glass", "steel", "stone", "gold", "lucky"];

function sortByHand(s: Run, sel: Card[]) {
  return [...sel].sort((a, b) => s.hand.indexOf(a.id) - s.hand.indexOf(b.id));
}

function enhance(key: string, roman: string, en: string, vi: string, icon: string, enh: Enh, max: number): ConsDef {
  return {
    key, kind: "tarot", icon, cost: 3,
    name: { en: `${roman} ${en}`, vi: `${roman} ${en}` },
    text: {
      en: `Enhances {a|${max}} selected card${max > 1 ? "s" : ""} into ${max > 1 ? "" : "a "}{a|${vi.split("|")[0]}}`,
      vi: `Cường hóa {a|${max}} lá được chọn thành {a|${vi.split("|")[1]}}`,
    },
    select: [1, max],
    use: (_s, sel) => sel.forEach((c) => (c.enh = enh)),
  };
}

function suitTarot(key: string, roman: string, en: string, icon: string, suit: Suit, viSuit: string): ConsDef {
  const enSuit = { S: "Spades", H: "Hearts", C: "Clubs", D: "Diamonds" }[suit];
  return {
    key, kind: "tarot", icon, cost: 3,
    name: { en: `${roman} ${en}`, vi: `${roman} ${en}` },
    text: { en: `Converts up to {a|3} selected cards to {${suit}|${enSuit}}`, vi: `Đổi tối đa {a|3} lá được chọn thành chất {${suit}|${viSuit}}` },
    select: [1, 3],
    use: (_s, sel) => sel.forEach((c) => (c.suit = suit)),
  };
}

function planet(key: string, en: string, vi: string, icon: string, hand: HandType): ConsDef {
  const h = HANDS[hand];
  return {
    key, kind: "planet", icon, cost: 3, hand,
    name: { en, vi },
    text: {
      en: `Level up {a|${h.name.en}}: {m|+${h.lm}} Mult and {c|+${h.lc}} Chips`,
      vi: `Tăng cấp {a|${h.name.vi}}: {m|+${h.lm}} Mult và {c|+${h.lc}} Chip`,
    },
    use: (s) => {
      ops.levelUp(s, hand);
      if (!s.planetsUsed.includes(key)) s.planetsUsed.push(key);
      s.stats.planetsUsed++;
      ops.runPassiveHook(s, "planetUsed");
    },
  };
}

function seal(key: string, en: string, vi: string, icon: string, sealKind: Seal, viSeal: string, color: string): ConsDef {
  return {
    key, kind: "spectral", icon, cost: 4,
    name: { en, vi },
    text: { en: `Add a {${color}|${sealKind[0].toUpperCase() + sealKind.slice(1)} Seal} to {a|1} selected card in your hand`, vi: `Gắn {${color}|${viSeal}} cho {a|1} lá được chọn trên tay` },
    select: [1, 1],
    use: (_s, sel) => sel.forEach((c) => (c.seal = sealKind)),
  };
}

function randomEnhanced(s: Run, ranks: Rank[]): Card {
  return newCard(s, pick(s, ranks), pick(s, SUITS), { enh: pick(s, ENHS.filter((e) => e !== "stone")) });
}

function destroyRandomInHand(s: Run, n: number): Card[] {
  const ids = shuffle(s, [...s.hand]).slice(0, n);
  return ops.destroyCards(s, ids);
}

export const CONS: ConsDef[] = [
  // ---------- Tarot ----------
  {
    key: "fool", kind: "tarot", icon: "🃏", cost: 3,
    name: { en: "0 The Fool", vi: "0 The Fool" },
    text: {
      en: "Creates the last {t|Tarot} or {p|Planet} card used during this run ({t|The Fool} excluded)",
      vi: "Tạo lại lá {t|Tarot} hoặc {p|Hành Tinh} được dùng gần nhất trong ván (trừ {t|The Fool})",
    },
    canUse: (s, _sel, room) => !!s.lastCons && s.lastCons !== "fool" && room > 0,
    use: (s) => {
      if (s.lastCons) ops.addCons(s, s.lastCons);
    },
  },
  enhance("magician", "I", "The Magician", "Lucky Cards|Lá May Mắn", "🎩", "lucky", 2),
  {
    key: "high_priestess", kind: "tarot", icon: "🌙", cost: 3,
    name: { en: "II The High Priestess", vi: "II The High Priestess" },
    text: { en: "Creates up to {a|2} random {p|Planet} cards (Must have room)", vi: "Tạo tối đa {a|2} lá {p|Hành Tinh} ngẫu nhiên (cần còn chỗ)" },
    canUse: (_s, _sel, room) => room > 0,
    use: (s) => {
      for (let i = 0; i < 2; i++) ops.createCons(s, "planet");
    },
  },
  enhance("empress", "III", "The Empress", "Mult Cards|Lá Mult", "👸", "mult", 2),
  {
    key: "emperor", kind: "tarot", icon: "🤴", cost: 3,
    name: { en: "IV The Emperor", vi: "IV The Emperor" },
    text: { en: "Creates up to {a|2} random {t|Tarot} cards (Must have room)", vi: "Tạo tối đa {a|2} lá {t|Tarot} ngẫu nhiên (cần còn chỗ)" },
    canUse: (_s, _sel, room) => room > 0,
    use: (s) => {
      for (let i = 0; i < 2; i++) {
        if (!ops.canAddCons(s)) break;
        ops.addCons(s, ops.randomConsKey(s, "tarot", ["emperor"]));
      }
    },
  },
  enhance("hierophant", "V", "The Hierophant", "Bonus Cards|Lá Thưởng", "⛪", "bonus", 2),
  enhance("lovers", "VI", "The Lovers", "Wild Card|Lá Đa Chất", "💞", "wild", 1),
  enhance("chariot", "VII", "The Chariot", "Steel Card|Lá Thép", "🏇", "steel", 1),
  enhance("justice", "VIII", "Justice", "Glass Card|Lá Kính", "⚖️", "glass", 1),
  {
    key: "hermit", kind: "tarot", icon: "🏮", cost: 3,
    name: { en: "IX The Hermit", vi: "IX The Hermit" },
    text: { en: "Doubles money (Max of {$|$20})", vi: "Nhân đôi số tiền (tối đa {$|$20})" },
    use: (s) => ops.earn(s, Math.max(0, Math.min(20, s.money))),
  },
  {
    key: "wheel", kind: "tarot", icon: "🎡", cost: 3,
    name: { en: "X The Wheel of Fortune", vi: "X The Wheel of Fortune" },
    text: {
      en: "{g|1 in 4} chance to add {a|Foil}, {a|Holographic}, or {a|Polychrome} edition to a random {a|Joker}",
      vi: "{g|1/4} khả năng thêm phiên bản {a|Ánh Kim}, {a|Ba Chiều} hoặc {a|Đa Sắc} cho một {a|Joker} ngẫu nhiên",
    },
    canUse: (s) => s.jokers.some((j) => !j.ed),
    use: (s) => {
      const pool = s.jokers.filter((j) => !j.ed);
      if (!pool.length || !chance(s, 1, 4)) {
        s.flags.nope = (s.flags.nope ?? 0) + 1;
        return;
      }
      const j = pick(s, pool);
      j.ed = pick<Edition>(s, ["foil", "foil", "foil", "holo", "holo", "poly"]);
    },
  },
  {
    key: "strength", kind: "tarot", icon: "💪", cost: 3,
    name: { en: "XI Strength", vi: "XI Strength" },
    text: { en: "Increases rank of up to {a|2} selected cards by {a|1}", vi: "Tăng số của tối đa {a|2} lá được chọn lên {a|1} bậc" },
    select: [1, 2],
    use: (_s, sel) => sel.forEach((c) => (c.rank = (c.rank === 14 ? 2 : c.rank + 1) as Rank)),
  },
  {
    key: "hanged_man", kind: "tarot", icon: "🙃", cost: 3,
    name: { en: "XII The Hanged Man", vi: "XII The Hanged Man" },
    text: { en: "Destroys up to {a|2} selected cards", vi: "Phá tối đa {a|2} lá được chọn" },
    select: [1, 2],
    use: (s, sel) => {
      ops.destroyCards(s, sel.map((c) => c.id));
    },
  },
  {
    key: "death", kind: "tarot", icon: "💀", cost: 3,
    name: { en: "XIII Death", vi: "XIII Death" },
    text: { en: "Select {a|2} cards, convert the {a|left} card into the {a|right} card", vi: "Chọn {a|2} lá, biến lá {a|bên trái} thành bản sao của lá {a|bên phải}" },
    select: [2, 2],
    use: (s, sel) => {
      const [left, right] = sortByHand(s, sel);
      const { id } = left;
      Object.assign(left, structuredClone(right), { id });
      if (!right.enh) delete left.enh;
      if (!right.ed) delete left.ed;
      if (!right.seal) delete left.seal;
    },
  },
  {
    key: "temperance", kind: "tarot", icon: "🍷", cost: 3,
    name: { en: "XIV Temperance", vi: "XIV Temperance" },
    text: { en: "Gives the total sell value of all current Jokers (Max of {$|$50})", vi: "Nhận tổng giá bán của mọi Joker hiện có (tối đa {$|$50})" },
    use: (s) => ops.earn(s, Math.min(50, s.jokers.reduce((a, j) => a + ops.sellValue(j), 0))),
  },
  enhance("devil", "XV", "The Devil", "Gold Card|Lá Vàng", "😈", "gold", 1),
  enhance("tower", "XVI", "The Tower", "Stone Card|Lá Đá", "🗼", "stone", 1),
  suitTarot("star", "XVII", "The Star", "⭐", "D", "Rô"),
  suitTarot("moon", "XVIII", "The Moon", "🌑", "C", "Chuồn"),
  suitTarot("sun", "XIX", "The Sun", "☀️", "H", "Cơ"),
  {
    key: "judgement", kind: "tarot", icon: "📯", cost: 3,
    name: { en: "XX Judgement", vi: "XX Judgement" },
    text: { en: "Creates a random {a|Joker} card (Must have room)", vi: "Tạo một lá {a|Joker} ngẫu nhiên (cần còn chỗ)" },
    canUse: (s) => ops.canAddJoker(s),
    use: (s) => {
      ops.createJoker(s);
    },
  },
  suitTarot("world", "XXI", "The World", "🌍", "S", "Bích"),

  // ---------- Planets ----------
  planet("pluto", "Pluto", "Sao Diêm Vương", "♇", "high"),
  planet("mercury", "Mercury", "Sao Thủy", "☿", "pair"),
  planet("uranus", "Uranus", "Sao Thiên Vương", "⛢", "twopair"),
  planet("venus", "Venus", "Sao Kim", "♀", "three"),
  planet("saturn", "Saturn", "Sao Thổ", "♄", "straight"),
  planet("jupiter", "Jupiter", "Sao Mộc", "♃", "flush"),
  planet("earth", "Earth", "Trái Đất", "♁", "full"),
  planet("mars", "Mars", "Sao Hỏa", "♂", "four"),
  planet("neptune", "Neptune", "Sao Hải Vương", "♆", "sflush"),
  planet("planet_x", "Planet X", "Hành Tinh X", "✕", "five"),
  planet("ceres", "Ceres", "Ceres", "⚳", "fhouse"),
  planet("eris", "Eris", "Eris", "⯰", "ffive"),

  // ---------- Spectral ----------
  {
    key: "familiar", kind: "spectral", icon: "🐈", cost: 4,
    name: { en: "Familiar", vi: "Familiar" },
    text: { en: "Destroy {a|1} random card in your hand, add {a|3} random {a|Enhanced face} cards to your hand", vi: "Phá {a|1} lá ngẫu nhiên trên tay, thêm {a|3} lá {a|mặt người có cường hóa} lên tay" },
    canUse: (s) => s.hand.length > 0,
    use: (s) => {
      destroyRandomInHand(s, 1);
      ops.addCards(s, [0, 1, 2].map(() => randomEnhanced(s, [11, 12, 13])), "hand");
    },
  },
  {
    key: "grim", kind: "spectral", icon: "⚰️", cost: 4,
    name: { en: "Grim", vi: "Grim" },
    text: { en: "Destroy {a|1} random card in your hand, add {a|2} random {a|Enhanced Aces} to your hand", vi: "Phá {a|1} lá ngẫu nhiên trên tay, thêm {a|2} lá {a|Át có cường hóa} lên tay" },
    canUse: (s) => s.hand.length > 0,
    use: (s) => {
      destroyRandomInHand(s, 1);
      ops.addCards(s, [0, 1].map(() => randomEnhanced(s, [14])), "hand");
    },
  },
  {
    key: "incantation", kind: "spectral", icon: "📿", cost: 4,
    name: { en: "Incantation", vi: "Incantation" },
    text: { en: "Destroy {a|1} random card in your hand, add {a|4} random {a|Enhanced numbered} cards to your hand", vi: "Phá {a|1} lá ngẫu nhiên trên tay, thêm {a|4} lá {a|số có cường hóa} lên tay" },
    canUse: (s) => s.hand.length > 0,
    use: (s) => {
      destroyRandomInHand(s, 1);
      ops.addCards(s, [0, 1, 2, 3].map(() => randomEnhanced(s, [2, 3, 4, 5, 6, 7, 8, 9, 10])), "hand");
    },
  },
  seal("talisman", "Talisman", "Talisman", "🧿", "gold", "Dấu Vàng", "$"),
  {
    key: "aura", kind: "spectral", icon: "💫", cost: 4,
    name: { en: "Aura", vi: "Aura" },
    text: { en: "Add {a|Foil}, {a|Holographic}, or {a|Polychrome} effect to {a|1} selected card in hand", vi: "Thêm hiệu ứng {a|Ánh Kim}, {a|Ba Chiều} hoặc {a|Đa Sắc} cho {a|1} lá được chọn" },
    select: [1, 1],
    canUse: (_s, sel) => sel.length === 1 && !sel[0].ed,
    use: (s, sel) => {
      sel[0].ed = pick<Edition>(s, ["foil", "foil", "holo", "holo", "poly"]);
    },
  },
  {
    key: "wraith", kind: "spectral", icon: "👻", cost: 4,
    name: { en: "Wraith", vi: "Wraith" },
    text: { en: "Creates a random {m|Rare} {a|Joker}, sets money to {$|$0}", vi: "Tạo một {a|Joker} {m|Hiếm} ngẫu nhiên, đặt tiền về {$|$0}" },
    canUse: (s) => ops.canAddJoker(s),
    use: (s) => {
      ops.createJoker(s, 3);
      if (s.money > 0) s.money = 0;
    },
  },
  {
    key: "sigil", kind: "spectral", icon: "🔯", cost: 4,
    name: { en: "Sigil", vi: "Sigil" },
    text: { en: "Converts all cards in hand to a single random {a|suit}", vi: "Đổi mọi lá trên tay thành cùng một {a|chất} ngẫu nhiên" },
    canUse: (s) => s.hand.length > 0,
    use: (s) => {
      const suit = pick(s, SUITS);
      for (const c of ops.handCards(s)) c.suit = suit;
    },
  },
  {
    key: "ouija", kind: "spectral", icon: "🔤", cost: 4,
    name: { en: "Ouija", vi: "Ouija" },
    text: { en: "Converts all cards in hand to a single random {a|rank}. {m|-1} hand size", vi: "Đổi mọi lá trên tay thành cùng một {a|số} ngẫu nhiên. {m|-1} kích thước tay" },
    canUse: (s) => s.hand.length > 0,
    use: (s) => {
      const rank = pick(s, RANKS);
      for (const c of ops.handCards(s)) c.rank = rank;
      s.handSizeMod -= 1;
    },
  },
  {
    key: "ectoplasm", kind: "spectral", icon: "🧪", cost: 4,
    name: { en: "Ectoplasm", vi: "Ectoplasm" },
    text: { en: "Add {d|Negative} to a random {a|Joker}, {m|-1} hand size", vi: "Thêm {d|Âm Bản} cho một {a|Joker} ngẫu nhiên, {m|-1} kích thước tay" },
    canUse: (s) => s.jokers.some((j) => !j.ed),
    use: (s) => {
      const pool = s.jokers.filter((j) => !j.ed);
      if (pool.length) pick(s, pool).ed = "negative";
      s.handSizeMod -= 1;
    },
  },
  {
    key: "immolate", kind: "spectral", icon: "🔥", cost: 4,
    name: { en: "Immolate", vi: "Immolate" },
    text: { en: "Destroys {a|5} random cards in hand, gain {$|$20}", vi: "Phá {a|5} lá ngẫu nhiên trên tay, nhận {$|$20}" },
    canUse: (s) => s.hand.length > 0,
    use: (s) => {
      destroyRandomInHand(s, 5);
      ops.earn(s, 20);
    },
  },
  {
    key: "ankh", kind: "spectral", icon: "⚱️", cost: 4,
    name: { en: "Ankh", vi: "Ankh" },
    text: { en: "Create a copy of a random {a|Joker}, destroy all other Jokers (Removes {d|Negative} from copy)", vi: "Tạo bản sao của một {a|Joker} ngẫu nhiên, phá mọi Joker khác (bản sao mất {d|Âm Bản})" },
    canUse: (s) => s.jokers.length > 0,
    use: (s) => {
      const src = pick(s, s.jokers);
      s.jokers = s.jokers.filter((j) => j === src || j.eternal);
      const copy = { ...structuredClone(src), id: s.nextId++ };
      if (copy.ed === "negative") delete copy.ed;
      s.jokers.push(copy);
    },
  },
  seal("deja_vu", "Deja Vu", "Deja Vu", "🔁", "red", "Dấu Đỏ", "m"),
  {
    key: "hex", kind: "spectral", icon: "☣️", cost: 4,
    name: { en: "Hex", vi: "Hex" },
    text: { en: "Add {a|Polychrome} to a random {a|Joker}, and destroy all others", vi: "Thêm {a|Đa Sắc} cho một {a|Joker} ngẫu nhiên và phá mọi Joker khác" },
    canUse: (s) => s.jokers.some((j) => !j.ed),
    use: (s) => {
      const pool = s.jokers.filter((j) => !j.ed);
      const keep = pick(s, pool);
      keep.ed = "poly";
      s.jokers = s.jokers.filter((j) => j === keep || j.eternal);
    },
  },
  seal("trance", "Trance", "Trance", "🌀", "blue", "Dấu Xanh", "c"),
  seal("medium", "Medium", "Medium", "🔮", "purple", "Dấu Tím", "t"),
  {
    key: "cryptid", kind: "spectral", icon: "🦶", cost: 4,
    name: { en: "Cryptid", vi: "Cryptid" },
    text: { en: "Create {a|2} copies of {a|1} selected card in your hand", vi: "Tạo {a|2} bản sao của {a|1} lá được chọn trên tay" },
    select: [1, 1],
    use: (s, sel) => {
      ops.addCards(s, [0, 1].map(() => ({ ...structuredClone(sel[0]), id: s.nextId++ })), "hand");
    },
  },
  {
    key: "soul", kind: "spectral", icon: "💠", cost: 4,
    name: { en: "The Soul", vi: "The Soul" },
    text: { en: "Creates a {a|Legendary} Joker (Must have room)", vi: "Tạo một Joker {a|Huyền Thoại} (cần còn chỗ)" },
    canUse: (s) => ops.canAddJoker(s),
    use: (s) => {
      ops.createJoker(s, 4);
    },
  },
  {
    key: "black_hole", kind: "spectral", icon: "🕳️", cost: 4,
    name: { en: "Black Hole", vi: "Hố Đen" },
    text: { en: "Upgrade every {a|poker hand} by {a|1} level", vi: "Tăng mọi {a|tay bài} lên {a|1} cấp" },
    use: (s) => {
      for (const h of HAND_ORDER) ops.levelUp(s, h);
    },
  },
];

export const CONS_MAP: Record<string, ConsDef> = Object.fromEntries(CONS.map((c) => [c.key, c]));

export const PLANET_FOR: Record<HandType, string> = Object.fromEntries(
  CONS.filter((c) => c.kind === "planet").map((c) => [c.hand!, c.key]),
) as Record<HandType, string>;

