/* Headless fuzz/sim: plays many runs with a simple bot and checks invariants. */
import { cardsByIds } from "../src/game/cards";
import { CONS_MAP } from "../src/game/consumables";
import { consUsable, newRun, reduce, type Action } from "../src/game/engine";
import { DECKS } from "../src/game/meta";
import * as ops from "../src/game/ops";
import { previewHand } from "../src/game/scoring";
import type { Run } from "../src/game/types";

let seedCounter = 1;
function rnd() {
  seedCounter = (seedCounter * 1103515245 + 12345) & 0x7fffffff;
  return seedCounter / 0x7fffffff;
}
const pickR = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];

function combos(ids: number[], k: number): number[][] {
  const out: number[][] = [];
  const rec = (start: number, acc: number[]) => {
    if (acc.length === k) return void out.push([...acc]);
    for (let i = start; i < ids.length; i++) rec(i + 1, [...acc, ids[i]]);
  };
  rec(0, []);
  return out;
}

function check(s: Run, where: string) {
  const ids = new Set(s.cards.map((c) => c.id));
  const seen = new Set<number>();
  for (const pile of [s.hand, s.draw, s.discardPile]) {
    for (const id of pile) {
      if (!ids.has(id)) throw new Error(`${where}: dangling card id ${id}`);
      if (seen.has(id)) throw new Error(`${where}: duplicate card id ${id}`);
      seen.add(id);
    }
  }
  if (!Number.isFinite(s.money)) throw new Error(`${where}: money ${s.money}`);
  if (s.jokers.length > ops.jokerSlots(s) + 2) throw new Error(`${where}: too many jokers ${s.jokers.length}`);
  if (s.phase === "play" && s.hand.length === 0 && s.draw.length > 0) throw new Error(`${where}: empty hand`);
  if (s.phase === "pack" && !s.pack) throw new Error(`${where}: pack phase without pack`);
}

function botAction(s: Run): Action | null {
  switch (s.phase) {
    case "blind":
      if (s.blind < 2 && rnd() < 0.15) return { t: "skipBlind" };
      return { t: "selectBlind" };
    case "play": {
      // try a consumable
      if (s.cons.length && rnd() < 0.3) {
        const c = pickR(s.cons);
        const def = CONS_MAP[c.key];
        const n = def.select ? def.select[0] + Math.floor(rnd() * (def.select[1] - def.select[0] + 1)) : 0;
        const sel = [...s.hand].sort(() => rnd() - 0.5).slice(0, n);
        if (consUsable(s, c.id, sel)) return { t: "useCons", id: c.id, sel };
      }
      const forced = s.forced;
      let best: number[] = [];
      let bestScore = -1;
      for (let k = 1; k <= Math.min(5, s.hand.length); k++) {
        for (const combo of combos(s.hand, k)) {
          if (forced && !combo.includes(forced)) continue;
          const p = previewHand(s, cardsByIds(s, combo));
          const sc = p ? p.chips * p.mult + k : 0;
          if (sc > bestScore) {
            bestScore = sc;
            best = combo;
          }
        }
      }
      if (s.boss === "psychic" && s.blind === 2 && best.length < 5) best = s.hand.slice(0, 5);
      const need = s.target - s.roundScore;
      if (s.discards > 0 && bestScore * 3 * s.hands < need && rnd() < 0.8) {
        const rest = s.hand.filter((id) => !best.includes(id));
        const disc = rest.slice(0, 5);
        if (forced && !disc.includes(forced)) disc[0] = forced;
        if (disc.length) return { t: "discard", ids: disc.slice(0, 5) };
      }
      return { t: "play", ids: best };
    }
    case "scoring":
      return { t: "resolve" };
    case "cashout":
      return { t: "cashOut" };
    case "shop": {
      const shop = s.shop!;
      const all = [...shop.items, ...shop.packs, ...shop.vouchers].filter((x) => ops.canAfford(s, x.cost));
      if (s.jokers.length && rnd() < 0.05) {
        const j = pickR(s.jokers);
        if (!j.eternal) return { t: "sellJoker", id: j.id };
      }
      if (s.jokers.length > 1 && rnd() < 0.1) return { t: "moveJoker", id: s.jokers[0].id, to: s.jokers.length - 1 };
      if (s.cons.length && rnd() < 0.2) {
        const c = pickR(s.cons);
        if (consUsable(s, c.id, [])) return { t: "useCons", id: c.id, sel: [] };
      }
      if (all.length && rnd() < 0.7) {
        const it = pickR(all);
        return { t: "buy", uid: it.uid, use: it.kind === "cons" && rnd() < 0.5 };
      }
      if (rnd() < 0.15 && ops.canAfford(s, shop.rerollCost)) return { t: "reroll" };
      return { t: "nextRound" };
    }
    case "pack": {
      const pack = s.pack!;
      if (rnd() < 0.1) return { t: "skipPack" };
      const opt = pickR(pack.options);
      let sel: number[] = [];
      if (opt.kind === "cons") {
        const def = CONS_MAP[opt.cons.key];
        if (def.select) sel = [...s.hand].sort(() => rnd() - 0.5).slice(0, def.select[1]);
      }
      return { t: "pickPack", uid: opt.uid, sel };
    }
    case "won":
      return rnd() < 0.6 ? { t: "endless" } : null;
    case "over":
      return null;
  }
}

const N = Number(process.argv[2] ?? 200);
const COVER = process.argv[3] === "cover";
const results: { ante: number; won: boolean; deck: string; stake: number; best: number }[] = [];
let errors = 0;
const t0 = Date.now();
for (let i = 0; i < N; i++) {
  seedCounter = i + 1;
  const deck = DECKS[i % DECKS.length].key;
  const stake = 1 + (i % 8);
  let s = newRun({ seed: `SIM${i}`, deck, stake, runId: `r${i}` });
  let steps = 0;
  let stuck = 0;
  try {
    while (steps++ < 20000) {
      const a = botAction(s);
      if (!a) break;
      const before = JSON.stringify(s);
      if (COVER && a.t === "resolve" && rnd() < 0.85) s.roundScore = Math.max(s.roundScore, s.target);
      const next = reduce(s, a);
      check(next, `${a.t}@ante${next.ante}`);
      if (JSON.stringify({ ...next, updatedAt: 0 }) === JSON.stringify({ ...JSON.parse(before), updatedAt: 0 })) {
        stuck++;
        if (stuck > 200) throw new Error(`stuck on ${a.t} in phase ${s.phase}`);
      } else stuck = 0;
      s = next;
      if (s.ante > 14) break;
    }
  } catch (e) {
    errors++;
    console.error(`run ${i} (${deck}, stake ${stake}) failed:`, (e as Error).stack?.split("\n").slice(0, 4).join("\n"));
  }
  results.push({ ante: s.ante, won: s.phase === "won" || s.endless, deck, stake, best: s.stats.bestHand });
}
const avg = results.reduce((a, r) => a + r.ante, 0) / results.length;
const wins = results.filter((r) => r.won).length;
console.log(`runs=${N} errors=${errors} avgAnte=${avg.toFixed(2)} wins=${wins} maxAnte=${Math.max(...results.map((r) => r.ante))} best=${Math.max(...results.map((r) => r.best)).toExponential(2)} time=${Date.now() - t0}ms`);
