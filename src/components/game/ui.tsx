"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type Tip, TipBox } from "../cards";

/* ---------------- Stage (fixed virtual resolution, scaled to fit) ---------------- */

export type Orientation = "landscape" | "portrait";
export const STAGE = { landscape: { w: 1280, h: 720 }, portrait: { w: 720, h: 1280 } };

interface StageCtx {
  scale: number;
  orient: Orientation;
  el: HTMLDivElement | null;
  w: number;
  h: number;
}
const StageContext = createContext<StageCtx>({ scale: 1, orient: "landscape", el: null, w: 1280, h: 720 });
export const useStage = () => useContext(StageContext);

export function Stage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const [box, setBox] = useState({ scale: 1, orient: "landscape" as Orientation, ready: false, w: 1280, h: 720 });
  const ref = useRef<HTMLDivElement>(null);
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const orient: Orientation = vw / vh < 0.95 ? "portrait" : "landscape";
      // Stretch the virtual stage along the long axis so it fills the screen.
      let { w, h } = STAGE[orient];
      if (orient === "landscape") w = Math.round(Math.max(1280, Math.min(1560, (720 * vw) / vh)));
      else h = Math.round(Math.max(1280, Math.min(1640, (720 * vh) / vw)));
      setBox({ scale: Math.min(vw / w, vh / h), orient, ready: true, w, h });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  useEffect(() => setEl(ref.current), []);
  const { w, h } = box;
  const value = useMemo(() => ({ scale: box.scale, orient: box.orient, el, w, h }), [box.scale, box.orient, el, w, h]);
  return (
    <div className="viewport">
      <div
        ref={ref}
        className={`stage ${box.orient} ${className}`}
        style={{ width: w, height: h, transform: `translate(-50%, -50%) scale(${box.scale})`, visibility: box.ready ? "visible" : "hidden" }}
      >
        <StageContext.Provider value={value}>
          <TipProvider>{children}</TipProvider>
        </StageContext.Provider>
      </div>
    </div>
  );
}

/* ---------------- Tooltips ---------------- */

interface TipState {
  tip: Tip;
  x: number;
  y: number;
  below: boolean;
  pinned: boolean;
  anchor: HTMLElement;
}
interface TipCtx {
  show: (el: HTMLElement, tip: Tip, pinned?: boolean) => void;
  hide: (el?: HTMLElement) => void;
}
const TipContext = createContext<TipCtx>({ show: () => {}, hide: () => {} });
export const useTip = () => useContext(TipContext);

function TipProvider({ children }: { children: React.ReactNode }) {
  const { scale, el: stage, w } = useStage();
  const [state, setState] = useState<TipState | null>(null);
  const pinnedRef = useRef<TipState | null>(null);

  const place = useCallback(
    (el: HTMLElement, tip: Tip, pinned: boolean): TipState | null => {
      if (!stage) return null;
      const sr = stage.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      const cx = (r.left + r.width / 2 - sr.left) / scale;
      const top = (r.top - sr.top) / scale;
      const bottom = (r.bottom - sr.top) / scale;
      const below = top < 260;
      return { tip, x: Math.max(150, Math.min(w - 150, cx)), y: below ? bottom + 10 : top - 10, below, pinned, anchor: el };
    },
    [stage, scale, w],
  );

  const show = useCallback(
    (el: HTMLElement, tip: Tip, pinned = false) => {
      const st = place(el, tip, pinned);
      if (!st) return;
      if (pinned) pinnedRef.current = st;
      setState(st);
    },
    [place],
  );
  const hide = useCallback((el?: HTMLElement) => {
    if (el && pinnedRef.current?.anchor === el) pinnedRef.current = null;
    setState((cur) => {
      if (!cur) return null;
      if (el && cur.anchor !== el) return cur;
      if (!el && cur.pinned) return cur;
      return pinnedRef.current && pinnedRef.current.anchor.isConnected ? pinnedRef.current : null;
    });
  }, []);

  // Drop tips whose anchors were removed from the DOM.
  useEffect(() => {
    if (!state) return;
    const id = setInterval(() => {
      if (!state.anchor.isConnected) {
        if (pinnedRef.current?.anchor === state.anchor) pinnedRef.current = null;
        setState(null);
      }
    }, 300);
    return () => clearInterval(id);
  }, [state]);

  const api = useMemo(() => ({ show, hide }), [show, hide]);
  return (
    <TipContext.Provider value={api}>
      {children}
      {state && (
        <div className={`tip-layer ${state.below ? "below" : "above"}`} style={{ left: state.x, top: state.y }}>
          <TipBox tip={state.tip} />
        </div>
      )}
    </TipContext.Provider>
  );
}

/** Hover props for an element showing a tooltip. */
export function useHoverTip(getTip: () => Tip | null) {
  const { show, hide } = useTip();
  return {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      const t = getTip();
      if (t) show(e.currentTarget, t);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLElement>) => {
      if (e.pointerType !== "mouse") return;
      hide(e.currentTarget);
    },
  };
}

/* ---------------- Score popups ---------------- */

export interface Pop {
  text: string;
  tone: string;
  n: number;
}
const PopContext = createContext<Record<string, Pop>>({});
export const PopProvider = PopContext.Provider;
export const usePop = (key: string) => useContext(PopContext)[key];

export function PopLabel({ pop }: { pop?: Pop }) {
  if (!pop) return null;
  return (
    <span key={pop.n} className={`pop pop-${pop.tone}`}>
      {pop.text}
    </span>
  );
}
