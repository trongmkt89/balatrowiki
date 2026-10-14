import type { Run } from "@/game/types";
import type { Profile } from "./storage";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function cloudLoadSave(pid: string): Promise<{ data: Run | null; updatedAt: number } | null> {
  try {
    const r = await json<{ data: string | null; updatedAt: number }>(await fetch(`/api/save?pid=${pid}`, { cache: "no-store" }));
    return { data: r.data ? (JSON.parse(r.data) as Run) : null, updatedAt: r.updatedAt };
  } catch {
    return null;
  }
}

export async function cloudSave(pid: string, run: Run | null): Promise<boolean> {
  try {
    if (!run) {
      await fetch(`/api/save?pid=${pid}`, { method: "DELETE" });
      return true;
    }
    const res = await fetch(`/api/save`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pid, data: JSON.stringify(run), updatedAt: run.updatedAt }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function cloudLoadProfile(pid: string): Promise<{ name: string; profile: Partial<Profile> } | null> {
  try {
    return await json(await fetch(`/api/profile?pid=${pid}`, { cache: "no-store" }));
  } catch {
    return null;
  }
}

export async function cloudSaveProfile(pid: string, name: string, profile: Profile): Promise<boolean> {
  try {
    const res = await fetch(`/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pid, name, profile }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface RunSummary {
  runId: string;
  pid: string;
  name: string;
  seed: string;
  deck: string;
  stake: number;
  ante: number;
  round: number;
  bestHand: number;
  won: boolean;
  jokers: string[];
  favHand: string;
  daily?: string;
}

export async function submitRun(r: RunSummary): Promise<boolean> {
  try {
    const res = await fetch(`/api/runs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(r),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}
