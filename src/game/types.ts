export type Lang = "en" | "vi";
export type Txt = { en: string; vi: string };

export type Suit = "S" | "H" | "C" | "D";
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;
export type Enh = "bonus" | "mult" | "wild" | "glass" | "steel" | "stone" | "gold" | "lucky";
export type Edition = "foil" | "holo" | "poly" | "negative";
export type Seal = "gold" | "red" | "blue" | "purple";

export interface Card {
  id: number;
  rank: Rank;
  suit: Suit;
  enh?: Enh;
  ed?: Edition;
  seal?: Seal;
  /** Permanent bonus chips (Hiker). */
  extra: number;
}

export type HandType =
  | "high"
  | "pair"
  | "twopair"
  | "three"
  | "straight"
  | "flush"
  | "full"
  | "four"
  | "sflush"
  | "five"
  | "fhouse"
  | "ffive";

export interface Joker {
  id: number;
  key: string;
  ed?: Edition;
  /** Per-joker counters (mult, chips, x, n, target rank/suit/hand...). */
  v: Record<string, number>;
  /** Buy price used for sell value. */
  cost: number;
  extraSell: number;
  eternal?: boolean;
  perish?: number; // rounds left before perishing
  rental?: boolean;
  /** Runtime flags */
  debuff?: boolean;
  flipped?: boolean;
}

export type ConsKind = "tarot" | "planet" | "spectral";
export interface Consumable {
  id: number;
  key: string;
  neg?: boolean;
  extraSell: number;
}

export type PackKind = "arcana" | "celestial" | "buffoon" | "standard" | "spectral";
export type PackSize = "normal" | "jumbo" | "mega";

export type ShopItem =
  | { uid: number; kind: "joker"; joker: Joker; cost: number }
  | { uid: number; kind: "cons"; cons: Consumable; cost: number }
  | { uid: number; kind: "card"; card: Card; cost: number }
  | { uid: number; kind: "pack"; pack: string; cost: number }
  | { uid: number; kind: "voucher"; voucher: string; cost: number };

export interface Shop {
  items: ShopItem[];
  packs: ShopItem[];
  vouchers: ShopItem[];
  rerollCost: number;
  rerolls: number;
  freeRerolls: number;
}

export interface PackState {
  key: string;
  kind: PackKind;
  options: ShopItem[];
  picks: number;
  /** Where to go when the pack closes. */
  back: "shop" | "blind";
  /** Arcana / spectral packs draw a hand for targeting. */
  drew: boolean;
}

export type Phase = "blind" | "play" | "scoring" | "cashout" | "shop" | "pack" | "over" | "won";

export interface ScoreEvent {
  /** Where the popup is anchored. */
  at: "card" | "held" | "joker" | "cons" | "hand" | "deck";
  id?: number;
  chips?: number;
  mult?: number;
  xmult?: number;
  money?: number;
  /** Absolute values after this event (so the UI can just display them). */
  c: number;
  m: number;
  text?: string;
  tone?: "chips" | "mult" | "xmult" | "money" | "info" | "bad" | "good";
}

export interface PlayResult {
  played: number[];
  scoring: number[];
  hand: HandType;
  level: number;
  baseChips: number;
  baseMult: number;
  events: ScoreEvent[];
  chips: number;
  mult: number;
  total: number;
  notAllowed?: boolean;
  destroyed: number[];
}

export interface CashLine {
  label: Txt;
  amount: number;
  tone?: "money" | "hands" | "interest";
}

export interface Cashout {
  lines: CashLine[];
  total: number;
}

export type BlindStatus = "upcoming" | "current" | "skipped" | "defeated";

export interface Tag {
  id: number;
  key: string;
  /** Orbital tag stores its hand. */
  hand?: HandType;
}

export interface RunStats {
  bestHand: number;
  handsPlayed: number;
  cardsPlayed: number;
  cardsDiscarded: number;
  discardsUsed: number;
  unusedDiscards: number;
  rerolls: number;
  skips: number;
  purchases: number;
  tarotsUsed: number;
  planetsUsed: number;
  moneyEarned: number;
  jokersSeen: string[];
}

export interface Run {
  v: number;
  runId: string;
  seed: string;
  rng: number;
  daily?: string;
  deck: string;
  stake: number;
  createdAt: number;
  updatedAt: number;

  ante: number;
  round: number;
  blind: 0 | 1 | 2;
  blindStatus: [BlindStatus, BlindStatus, BlindStatus];
  boss: string;
  skipTags: [string, string];
  bossRerollUsed: boolean;
  bossDisabled: boolean;
  phase: Phase;
  winAnte: number;
  endless: boolean;

  money: number;
  hands: number;
  discards: number;
  handsUsedRound: number;
  discardsUsedRound: number;
  roundScore: number;
  target: number;

  cards: Card[];
  draw: number[];
  hand: number[];
  discardPile: number[];
  faceDown: number[];
  forced?: number;
  /** Cards played this ante (The Pillar). */
  antePlayed: number[];

  jokers: Joker[];
  cons: Consumable[];

  levels: Record<HandType, number>;
  playCount: Record<HandType, number>;
  roundHands: HandType[];
  mouthHand?: HandType;

  vouchers: string[];
  shopVoucher?: string;
  tags: Tag[];
  /** Transient popups (discard money, tag effects...). */
  fx: { id: number; at: ScoreEvent["at"]; ref?: number; text: string; tone?: ScoreEvent["tone"] }[];
  shop?: Shop;
  pack?: PackState;
  pendingPacks: string[];
  nextId: number;

  /** Base modifiers (vouchers, spectrals...). */
  handSizeMod: number;
  jokerSlotMod: number;
  consSlotMod: number;
  handsMod: number;
  discardsMod: number;

  lastCons?: string;
  planetsUsed: string[];
  stats: RunStats;
  flags: Record<string, number>;

  lastPlay?: PlayResult;
  cashout?: Cashout;
  log: string[];
}

export interface Effect {
  chips?: number;
  mult?: number;
  xmult?: number;
  money?: number;
  text?: string;
  tone?: ScoreEvent["tone"];
}

export interface PlayCtx {
  played: Card[];
  scoring: Card[];
  held: Card[];
  hand: HandType;
  contains: Set<HandType>;
  final: boolean;
  firstHand: boolean;
  /** Hand counts before this play (for Card Sharp / Obelisk). */
  roundBefore: HandType[];
  countBefore: Record<HandType, number>;
  bossTriggered: boolean;
  /** Card ids to destroy after scoring. */
  destroy: Set<number>;
  /** Card ids debuffed by the boss. */
  debuffed: Set<number>;
}

export interface Ctx {
  s: Run;
  /** The joker whose state/effect is used (target of Blueprint). */
  j: Joker;
  /** The physical joker slot running this (Blueprint itself). */
  self: Joker;
  p?: PlayCtx;
  /** First discard of the round (discard hooks). */
  first?: boolean;
  /** Blind index being selected (blindSelect hooks). */
  blind?: number;
}

export interface JokerDef {
  key: string;
  name: string;
  rarity: 1 | 2 | 3 | 4;
  cost: number;
  icon: string;
  text: Txt;
  /** Values substituted into %0, %1... in text. */
  vars?: (j: Joker, s: Run | null, lang: Lang) => (string | number)[];
  /** Static starting counters. */
  v0?: Record<string, number>;
  /** Randomised starting counters. */
  init?: (j: Joker, s: Run) => void;
  /** Blueprint/Brainstorm compatible. */
  bp?: boolean;
  /** Can't appear in shop unless flag is set. */
  gate?: (s: Run) => boolean;
  handSize?: number;
  discardsMod?: number;
  handsMod?: number;
  before?: (c: Ctx) => Effect | void;
  scored?: (c: Ctx, card: Card) => Effect | Effect[] | void;
  held?: (c: Ctx, card: Card) => Effect | void;
  main?: (c: Ctx) => Effect | void;
  retrigger?: (c: Ctx, card: Card, index: number) => number;
  retriggerHeld?: (c: Ctx, card: Card) => number;
  after?: (c: Ctx) => Effect | void;
  discard?: (c: Ctx, cards: Card[]) => Effect | void;
  roundEnd?: (c: Ctx, boss: boolean) => Effect | void;
  payout?: (c: Ctx) => number;
  blindSelect?: (c: Ctx) => Effect | void;
  sold?: (c: Ctx) => void;
  anySold?: (c: Ctx) => void;
  reroll?: (c: Ctx) => void;
  packSkipped?: (c: Ctx) => void;
  packOpened?: (c: Ctx) => void;
  planetUsed?: (c: Ctx) => void;
  cardsAdded?: (c: Ctx, n: number) => void;
  cardsDestroyed?: (c: Ctx, cards: Card[]) => void;
  luckyTriggered?: (c: Ctx) => void;
  shopEnd?: (c: Ctx) => void;
}

export interface ConsDef {
  key: string;
  kind: ConsKind;
  name: Txt;
  icon: string;
  text: Txt;
  cost: number;
  /** Required selected card count [min, max]; undefined = no selection. */
  select?: [number, number];
  hand?: HandType;
  /** room = free consumable slots after this card is used. */
  canUse?: (s: Run, sel: Card[], room: number) => boolean;
  use: (s: Run, sel: Card[]) => void;
}
