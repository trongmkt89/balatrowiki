"use client";

import { useEffect, useRef, useState } from "react";
import type { Tip } from "../cards";
import { useStage, useTip } from "./ui";

interface Props {
  ids: number[];
  width: number;
  height: number;
  itemW: number;
  gap?: number;
  fan?: boolean;
  raised?: Set<number>;
  render: (id: number, i: number) => React.ReactNode;
  onTap?: (id: number, el: HTMLElement) => void;
  onMove?: (id: number, to: number) => void;
  hoverTip?: (id: number) => Tip | null;
  dealFrom?: { x: number; y: number };
  className?: string;
  /** Extra content rendered next to a given item (e.g. Sell button). */
  attach?: (id: number) => React.ReactNode;
  /** How far raised items move up. */
  lift?: number;
}

interface Drag {
  id: number;
  pointerId: number;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
  active: boolean;
}

export function DragRow({ ids, width, height, itemW, gap = 10, fan, raised, render, onTap, onMove, hoverTip, dealFrom, className = "", attach, lift: liftBy = 28 }: Props) {
  const { scale } = useStage();
  const { show, hide } = useTip();
  const [drag, setDrag] = useState<Drag | null>(null);
  const known = useRef<Set<number> | null>(null);
  const fresh = useRef<Set<number>>(new Set());

  // Track newly appearing ids so they can animate in.
  if (known.current === null) known.current = new Set(ids);
  const nowFresh = new Set<number>();
  for (const id of ids) if (!known.current.has(id)) nowFresh.add(id);
  if (nowFresh.size) for (const id of nowFresh) fresh.current.add(id);
  useEffect(() => {
    known.current = new Set(ids);
    const t = setTimeout(() => (fresh.current = new Set()), 500);
    return () => clearTimeout(t);
  }, [ids]);

  const n = ids.length;
  const step = n > 1 ? Math.min(itemW + gap, (width - itemW) / (n - 1)) : 0;
  const total = itemW + step * Math.max(0, n - 1);
  const x0 = (width - total) / 2;
  const mid = (n - 1) / 2;

  const order = [...ids];
  let dragTarget = -1;
  if (drag?.active) {
    const from = ids.indexOf(drag.id);
    dragTarget = step > 0 ? Math.max(0, Math.min(n - 1, Math.round((x0 + from * step + drag.dx - x0) / step))) : 0;
    order.splice(from, 1);
    order.splice(dragTarget, 0, drag.id);
  }

  const onDown = (e: React.PointerEvent<HTMLDivElement>, id: number) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({ id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, active: false });
  };
  const onMoveP = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = (e.clientX - drag.sx) / scale;
    const dy = (e.clientY - drag.sy) / scale;
    const active = drag.active || (!!onMove && Math.hypot(dx, dy) > 10);
    if (active && !drag.active) hide();
    setDrag({ ...drag, dx, dy, active });
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag || e.pointerId !== drag.pointerId) return;
    if (drag.active) {
      if (onMove && dragTarget >= 0 && dragTarget !== ids.indexOf(drag.id)) onMove(drag.id, dragTarget);
    } else onTap?.(drag.id, e.currentTarget);
    setDrag(null);
  };

  return (
    <div className={`dragrow ${className}`} style={{ width, height }}>
      {ids.map((id) => {
        const i = order.indexOf(id);
        const isDrag = drag?.active && drag.id === id;
        const rot = fan ? (i - mid) * Math.min(2.2, 14 / Math.max(1, n)) : 0;
        const arc = fan ? Math.pow(Math.abs(i - mid), 2) * Math.min(1.6, 10 / Math.max(1, n)) : 0;
        const lift = raised?.has(id) ? -liftBy : 0;
        let x = x0 + i * step;
        let y = arc + lift;
        if (isDrag) {
          x = x0 + ids.indexOf(id) * step + drag!.dx;
          y = drag!.dy * 0.3 + lift - 10;
        }
        const isFresh = fresh.current.has(id) && dealFrom;
        return (
          <div
            key={id}
            className={`dr-item ${isDrag ? "dragging" : ""}`}
            style={{ transform: `translate(${x}px, ${y}px) rotate(${isDrag ? 0 : rot}deg)`, zIndex: isDrag ? 100 : attach?.(id) ? 90 : i + 1, width: itemW }}
            onPointerDown={(e) => onDown(e, id)}
            onPointerMove={onMoveP}
            onPointerUp={onUp}
            onPointerCancel={() => setDrag(null)}
            onPointerEnter={(e) => {
              if (e.pointerType !== "mouse" || drag?.active) return;
              const t = hoverTip?.(id);
              if (t) show(e.currentTarget, t);
            }}
            onPointerLeave={(e) => {
              if (e.pointerType === "mouse") hide(e.currentTarget);
            }}
          >
            <div className={isFresh ? "deal-in" : ""} style={isFresh ? ({ ["--fx" as string]: `${dealFrom!.x - x}px`, ["--fy" as string]: `${dealFrom!.y - y}px` } as React.CSSProperties) : undefined}>
              {render(id, i)}
            </div>
            {attach?.(id)}
          </div>
        );
      })}
    </div>
  );
}
