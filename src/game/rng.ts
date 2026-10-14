import type { Run } from "./types";

/** Hash a seed string into a 32-bit integer state. */
export function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 step; the state lives on the run so saves are deterministic. */
export function rand(s: Run): number {
  let t = (s.rng = (s.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(s: Run, min: number, max: number): number {
  return min + Math.floor(rand(s) * (max - min + 1));
}

export function pick<T>(s: Run, arr: readonly T[]): T {
  return arr[Math.floor(rand(s) * arr.length)];
}

export function shuffle<T>(s: Run, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(s) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function weighted<T>(s: Run, entries: [T, number][]): T {
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = rand(s) * total;
  for (const [v, w] of entries) {
    r -= w;
    if (r < 0) return v;
  }
  return entries[entries.length - 1][0];
}

/** "1 in d" chance, doubled per Oops! All 6s. */
export function chance(s: Run, n: number, d: number): boolean {
  const oops = s.jokers.filter((j) => j.key === "oops" && !j.debuff).length;
  return rand(s) < (n * Math.pow(2, oops)) / d;
}

export function oddsText(s: Run | null, n: number, d: number): string {
  const oops = s ? s.jokers.filter((j) => j.key === "oops" && !j.debuff).length : 0;
  return `${n * Math.pow(2, oops)} in ${d}`;
}

const SEED_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ123456789";
export function randomSeed(): string {
  let out = "";
  const buf = new Uint32Array(8);
  crypto.getRandomValues(buf);
  for (let i = 0; i < 8; i++) out += SEED_CHARS[buf[i] % SEED_CHARS.length];
  return out;
}
