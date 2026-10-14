import type { Card, Edition, Enh, Rank, Run, Seal, Suit, Txt } from "./types";

export const SUITS: Suit[] = ["S", "H", "C", "D"];
export const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
export const SUIT_SYM: Record<Suit, string> = { S: "♠", H: "♥", C: "♣", D: "♦" };
export const SUIT_NAME: Record<Suit, Txt> = {
  S: { en: "Spades", vi: "Bích" },
  H: { en: "Hearts", vi: "Cơ" },
  C: { en: "Clubs", vi: "Chuồn" },
  D: { en: "Diamonds", vi: "Rô" },
};
export const RANK_LABEL: Record<number, string> = {
  2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K", 14: "A",
};
export const RANK_NAME: Record<number, Txt> = {
  ...Object.fromEntries([2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => [r, { en: String(r), vi: String(r) }])),
  11: { en: "Jack", vi: "J" },
  12: { en: "Queen", vi: "Q" },
  13: { en: "King", vi: "K" },
  14: { en: "Ace", vi: "Át" },
};

export const ENH_NAME: Record<Enh, Txt> = {
  bonus: { en: "Bonus Card", vi: "Lá Thưởng" },
  mult: { en: "Mult Card", vi: "Lá Mult" },
  wild: { en: "Wild Card", vi: "Lá Đa Chất" },
  glass: { en: "Glass Card", vi: "Lá Kính" },
  steel: { en: "Steel Card", vi: "Lá Thép" },
  stone: { en: "Stone Card", vi: "Lá Đá" },
  gold: { en: "Gold Card", vi: "Lá Vàng" },
  lucky: { en: "Lucky Card", vi: "Lá May Mắn" },
};
export const ENH_TEXT: Record<Enh, Txt> = {
  bonus: { en: "{c|+30} extra chips", vi: "Thêm {c|+30} Chip" },
  mult: { en: "{m|+4} Mult", vi: "{m|+4} Mult" },
  wild: { en: "Can be used as any suit", vi: "Tính là mọi chất" },
  glass: { en: "{x|X2} Mult, {g|1 in 4} chance to destroy card", vi: "{x|X2} Mult, {g|1/4} khả năng vỡ" },
  steel: { en: "{x|X1.5} Mult while this card stays in hand", vi: "{x|X1.5} Mult khi lá này nằm trên tay" },
  stone: { en: "{c|+50} chips, no rank or suit, always scores", vi: "{c|+50} Chip, không số không chất, luôn tính điểm" },
  gold: { en: "{$|$3} if this card is held in hand at end of round", vi: "Nhận {$|$3} nếu lá này còn trên tay cuối vòng" },
  lucky: { en: "{g|1 in 5} chance for {m|+20} Mult, {g|1 in 15} chance to win {$|$20}", vi: "{g|1/5} khả năng {m|+20} Mult, {g|1/15} khả năng nhận {$|$20}" },
};
export const EDITION_NAME: Record<Edition, Txt> = {
  foil: { en: "Foil", vi: "Ánh Kim" },
  holo: { en: "Holographic", vi: "Ảnh Ba Chiều" },
  poly: { en: "Polychrome", vi: "Đa Sắc" },
  negative: { en: "Negative", vi: "Âm Bản" },
};
export const EDITION_TEXT: Record<Edition, Txt> = {
  foil: { en: "{c|+50} chips", vi: "{c|+50} Chip" },
  holo: { en: "{m|+10} Mult", vi: "{m|+10} Mult" },
  poly: { en: "{x|X1.5} Mult", vi: "{x|X1.5} Mult" },
  negative: { en: "{a|+1} Joker slot", vi: "{a|+1} ô Joker" },
};
export const SEAL_NAME: Record<Seal, Txt> = {
  gold: { en: "Gold Seal", vi: "Dấu Vàng" },
  red: { en: "Red Seal", vi: "Dấu Đỏ" },
  blue: { en: "Blue Seal", vi: "Dấu Xanh" },
  purple: { en: "Purple Seal", vi: "Dấu Tím" },
};
export const SEAL_TEXT: Record<Seal, Txt> = {
  gold: { en: "Earn {$|$3} when this card is played and scores", vi: "Nhận {$|$3} khi lá này được chơi và tính điểm" },
  red: { en: "Retrigger this card {a|1} time", vi: "Kích hoạt lại lá này {a|1} lần" },
  blue: { en: "Creates the {p|Planet} card for final played poker hand of round if held in hand", vi: "Tạo lá {p|Hành Tinh} của tay bài cuối vòng nếu lá này còn trên tay" },
  purple: { en: "Creates a {t|Tarot} card when discarded", vi: "Tạo một lá {t|Tarot} khi bị bỏ" },
};

export function chipValue(rank: Rank): number {
  if (rank === 14) return 11;
  if (rank >= 11) return 10;
  return rank;
}

export function isStone(c: Card) {
  return c.enh === "stone";
}

export function isFace(s: Run | null, c: Card): boolean {
  if (isStone(c)) return false;
  if (s && s.jokers.some((j) => j.key === "pareidolia" && !j.debuff)) return true;
  return c.rank >= 11 && c.rank <= 13;
}

export function smeared(s: Run | null): boolean {
  return !!s && s.jokers.some((j) => j.key === "smeared" && !j.debuff);
}

export function isSuit(s: Run | null, c: Card, suit: Suit, ignoreWild = false): boolean {
  if (isStone(c)) return false;
  if (c.enh === "wild" && !ignoreWild) return true;
  if (smeared(s)) {
    const red = suit === "H" || suit === "D";
    return red ? c.suit === "H" || c.suit === "D" : c.suit === "S" || c.suit === "C";
  }
  return c.suit === suit;
}

export function cardLabel(c: Card, lang: "en" | "vi" = "en"): string {
  if (isStone(c)) return ENH_NAME.stone[lang];
  return `${RANK_LABEL[c.rank]}${SUIT_SYM[c.suit]}`;
}

export function newCard(s: Run, rank: Rank, suit: Suit, extra?: Partial<Card>): Card {
  return { id: s.nextId++, rank, suit, extra: 0, ...extra };
}

export function findCard(s: Run, id: number): Card | undefined {
  return s.cards.find((c) => c.id === id);
}

export function cardsByIds(s: Run, ids: number[]): Card[] {
  const map = new Map(s.cards.map((c) => [c.id, c]));
  return ids.map((id) => map.get(id)).filter((c): c is Card => !!c);
}
