import type { Lang, Run } from "@/game/types";

/** Browser storage helpers. Every access is guarded: storage may be unavailable. */

const K = {
  pid: "bw.pid",
  name: "bw.name",
  run: "bw.run",
  settings: "bw.settings",
  profile: "bw.profile",
};

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function set(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const PID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function getPid(): string {
  let pid = get(K.pid);
  if (!pid || !PID_RE.test(pid)) {
    pid = crypto.randomUUID();
    set(K.pid, pid);
  }
  return pid;
}

export function setPid(pid: string) {
  set(K.pid, pid);
}

const ADJ = ["Lucky", "Wild", "Golden", "Steel", "Glass", "Cosmic", "Sly", "Jolly", "Crafty", "Mystic"];
const NOUN = ["Joker", "Ace", "King", "Queen", "Jack", "Clown", "Gambler", "Dealer", "Fool", "Hermit"];

export function getName(): string {
  let n = get(K.name);
  if (!n) {
    const r = new Uint32Array(3);
    crypto.getRandomValues(r);
    n = `${ADJ[r[0] % ADJ.length]}${NOUN[r[1] % NOUN.length]}${r[2] % 100}`;
    set(K.name, n);
  }
  return n;
}

export function setName(n: string) {
  set(K.name, n.slice(0, 20));
}

export function loadRun(): Run | null {
  const raw = get(K.run);
  if (!raw) return null;
  try {
    const r = JSON.parse(raw) as Run;
    return r && r.v ? r : null;
  } catch {
    return null;
  }
}

export function saveRunLocal(run: Run | null) {
  set(K.run, run ? JSON.stringify(run) : null);
}

export interface Settings {
  lang?: Lang;
  speed?: number;
  sound?: boolean;
  contrast?: boolean;
  deck?: string;
  stake?: number;
}

export function loadSettings(): Settings {
  try {
    return JSON.parse(get(K.settings) ?? "{}") as Settings;
  } catch {
    return {};
  }
}

export function saveSettings(s: Settings) {
  set(K.settings, JSON.stringify(s));
}

export interface Profile {
  discovered: string[];
  runs: number;
  wins: number;
  bestAnte: number;
  bestHand: number;
  maxStake: Record<string, number>;
}

export function emptyProfile(): Profile {
  return { discovered: [], runs: 0, wins: 0, bestAnte: 0, bestHand: 0, maxStake: {} };
}

export function loadProfile(): Profile {
  try {
    return { ...emptyProfile(), ...(JSON.parse(get(K.profile) ?? "{}") as Partial<Profile>) };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: Profile) {
  set(K.profile, JSON.stringify(p));
}

export function mergeProfiles(a: Profile, b: Partial<Profile>): Profile {
  const maxStake = { ...a.maxStake };
  for (const [k, v] of Object.entries(b.maxStake ?? {})) maxStake[k] = Math.max(maxStake[k] ?? 0, v);
  return {
    discovered: [...new Set([...a.discovered, ...(b.discovered ?? [])])],
    runs: Math.max(a.runs, b.runs ?? 0),
    wins: Math.max(a.wins, b.wins ?? 0),
    bestAnte: Math.max(a.bestAnte, b.bestAnte ?? 0),
    bestHand: Math.max(a.bestHand, b.bestHand ?? 0),
    maxStake,
  };
}
