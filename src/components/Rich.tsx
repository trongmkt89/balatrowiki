import { Fragment } from "react";

/** Renders description markup: {k|text} spans with %0.. substitution. */
export function fill(text: string, vars?: (string | number)[]) {
  if (!vars) return text;
  return text.replace(/%(\d)/g, (_, i) => String(vars[Number(i)] ?? ""));
}

export function Rich({ text, vars, className }: { text: string; vars?: (string | number)[]; className?: string }) {
  const src = fill(text, vars);
  const parts: React.ReactNode[] = [];
  const re = /\{([a-zA-Z$])\|([^{}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) parts.push(<Fragment key={i++}>{src.slice(last, m.index)}</Fragment>);
    const k = m[1] === "$" ? "money" : m[1];
    parts.push(
      <span key={i++} className={`rt rt-${k}`}>
        {m[2]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < src.length) parts.push(<Fragment key={i++}>{src.slice(last)}</Fragment>);
  return <span className={className}>{parts}</span>;
}
