export function fmtNum(n: number): string {
  if (!Number.isFinite(n)) return "naneinf";
  const a = Math.abs(n);
  if (a >= 1e11) {
    const [m, e] = n.toExponential(3).split("e");
    return `${m}e${Number(e)}`;
  }
  if (a < 100 && n % 1 !== 0) return String(Math.round(n * 100) / 100);
  return Math.floor(n).toLocaleString("en-US");
}

export function fmtMoney(n: number): string {
  return n < 0 ? `-$${Math.abs(n)}` : `$${n}`;
}

export function todayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
