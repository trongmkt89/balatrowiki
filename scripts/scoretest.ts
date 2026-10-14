/* Deterministic scoring checks against hand-computed values. */
import { newCard } from "../src/game/cards";
import { newRun, reduce } from "../src/game/engine";
import * as ops from "../src/game/ops";
import type { Card, Rank, Run, Suit } from "../src/game/types";

function setup(handSpec: string[], jokers: string[] = [], held: string[] = []): { s: Run; ids: number[] } {
  let s = newRun({ seed: "TEST", deck: "red", stake: 1, runId: "t" });
  s = reduce(s, { t: "selectBlind" });
  const parse = (x: string): Card => {
    const m = x.match(/^(10|[2-9JQKA])([SHCD])(.*)$/)!;
    const rank = ({ J: 11, Q: 12, K: 13, A: 14 } as Record<string, number>)[m[1]] ?? Number(m[1]);
    const c = newCard(s, rank as Rank, m[2] as Suit);
    for (const mod of m[3].split(",").filter(Boolean)) {
      if (["bonus", "mult", "wild", "glass", "steel", "stone", "gold", "lucky"].includes(mod)) c.enh = mod as Card["enh"];
      if (["foil", "holo", "poly"].includes(mod)) c.ed = mod as Card["ed"];
      if (mod.startsWith("seal:")) c.seal = mod.slice(5) as Card["seal"];
    }
    return c;
  };
  const playCards = handSpec.map(parse);
  const heldCards = held.map(parse);
  s.cards = [...playCards, ...heldCards];
  s.hand = [...playCards, ...heldCards].map((c) => c.id);
  s.draw = [];
  s.jokers = jokers.map((k) => {
    const [key, ed] = k.split(":");
    return ops.makeJoker(s, key, ed ? { ed: ed as Card["ed"] } : {});
  });
  s.target = 1e300;
  return { s, ids: playCards.map((c) => c.id) };
}

let fails = 0;
function expect(name: string, handSpec: string[], jokers: string[], want: number, held: string[] = [], type?: string) {
  const { s, ids } = setup(handSpec, jokers, held);
  const out = reduce(s, { t: "play", ids });
  const got = out.lastPlay!.total;
  const ok = got === want && (!type || out.lastPlay!.hand === type);
  if (!ok) fails++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: got ${got} (${out.lastPlay!.hand}) want ${want}${type ? ` (${type})` : ""}`);
}

expect("pair of kings", ["KS", "KH"], [], (10 + 10 + 10) * 2, [], "pair");
expect("pair + Joker", ["KS", "KH"], ["joker"], 30 * 6);
expect("high card ace", ["AS", "7H", "4C"], [], (5 + 11) * 1, [], "high");
expect("flush", ["2H", "5H", "7H", "9H", "KH"], [], (35 + 2 + 5 + 7 + 9 + 10) * 4, [], "flush");
expect("wheel straight", ["AS", "2H", "3C", "4D", "5S"], [], (30 + 11 + 2 + 3 + 4 + 5) * 4, [], "straight");
expect("broadway", ["10S", "JH", "QC", "KD", "AS"], [], (30 + 10 + 10 + 10 + 10 + 11) * 4, [], "straight");
expect("no wraparound", ["QS", "KH", "AC", "2D", "3S"], [], (5 + 11) * 1, [], "high");
expect("full house", ["QS", "QH", "QD", "4C", "4S"], [], (40 + 30 + 8) * 4, [], "full");
expect("four of a kind", ["8S", "8H", "8C", "8D", "2S"], [], (60 + 32) * 7, [], "four");
expect("two pair kicker not scored", ["KS", "KH", "7C", "7D", "2S"], [], (20 + 20 + 14) * 2, [], "twopair");
expect("four fingers flush", ["2H", "5H", "7H", "9H", "KS"], ["four_fingers"], (35 + 23) * 4, [], "flush");
expect("shortcut straight", ["2S", "4H", "6C", "8D", "10S"], ["shortcut"], (30 + 30) * 4, [], "straight");
expect("splash scores kicker", ["KS", "KH", "2C"], ["splash"], (10 + 22) * 2, [], "pair");
expect("blueprint copies joker", ["KS", "KH"], ["blueprint", "joker"], 30 * 10);
expect("red seal retrigger", ["KS,seal:red", "KH"], [], (10 + 20 + 10) * 2);
expect("glass x2", ["KS,glass", "KH"], [], Math.floor(30 * 4));
expect("bonus + mult cards", ["KS,bonus", "KH,mult"], [], (30 + 30) * 6);
expect("stone always scores", ["KS", "KH", "2C,stone"], [], (30 + 50) * 2);
expect("foil/holo/poly card", ["KS,foil", "KH,holo"], [], Math.floor((30 + 50) * 12));
expect("poly card", ["KS,poly", "KH"], [], Math.floor(30 * 3));
expect("steel held", ["KS", "KH"], [], Math.floor(30 * 3), ["2C,steel"]);
expect("baron held", ["2S"], ["baron"], Math.floor((5 + 2) * 1 * 1.5), ["KC"]);
expect("mime + baron", ["2S"], ["baron", "mime"], Math.floor((5 + 2) * 2.25), ["KC"]);
expect("the duo + jolly", ["KS", "KH"], ["jolly", "duo"], 30 * 10 * 2);
expect("order of xmult", ["KS", "KH"], ["duo", "jolly"], 30 * (4 + 8));
expect("hanging chad", ["KS", "KH"], ["hanging_chad"], (10 + 30 + 10) * 2);
expect("sock and buskin", ["KS", "KH"], ["sock_buskin"], (10 + 40) * 2);
expect("scholar", ["AS", "AH"], ["scholar"], (10 + 22 + 40) * (2 + 8));
expect("wild flush", ["2H", "5H", "7H", "9H", "KS,wild"], [], (35 + 33) * 4, [], "flush");
expect("smeared flush", ["2H", "5D", "7H", "9D", "KH"], ["smeared"], (35 + 33) * 4, [], "flush");
expect("raised fist", ["AS"], ["raised_fist"], (5 + 11) * (1 + 6), ["3C", "9D"]);
expect("flush five", ["AS", "AS", "AS", "AS", "AS"], [], (160 + 55) * 16, [], "ffive");
expect("five of a kind", ["AS", "AH", "AS", "AD", "AC"], [], (120 + 55) * 12, [], "five");
expect("flush house", ["7D", "7D", "7D", "4D", "4D"], [], (140 + 29) * 14, [], "fhouse");
expect("straight flush", ["QS", "JS", "10S", "9S", "8S"], [], (100 + 47) * 8, [], "sflush");
expect("joker foil edition", ["KS", "KH"], ["joker:foil"], 80 * 6);
expect("joker poly edition", ["KS", "KH"], ["joker:poly"], Math.floor(30 * 9));
console.log(fails ? `${fails} FAILED` : "all scoring checks passed");
