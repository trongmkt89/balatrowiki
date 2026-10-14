"use client";

import { useEffect, useRef } from "react";
import { BOSS_MAP } from "@/game/meta";
import type { Run } from "@/game/types";

type RGB = [number, number, number];

function hex(h: string): RGB {
  const n = parseInt(h.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
const shade = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

export const MENU_COLORS: [string, string, string] = ["#c0392f", "#2a5ea8", "#1a1f2b"];

export function bgColorsFor(run: Run | null): [string, string, string] {
  if (!run) return MENU_COLORS;
  if (run.phase === "over") return ["#7a2a2a", "#3a1f2a", "#120d12"];
  if (run.phase === "won") return ["#d79a2b", "#2a8a6a", "#1b2a24"];
  if ((run.phase === "play" || run.phase === "scoring") && run.blind === 2) {
    const c = BOSS_MAP[run.boss]?.color ?? "#a33";
    return [c, "#2b2f36", "#121418"];
  }
  if (run.phase === "shop" || run.phase === "pack") return ["#3f7a63", "#2c4f6b", "#162024"];
  return ["#3c8a68", "#1f5546", "#10221d"];
}

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 res;
uniform float t;
uniform vec3 c1;
uniform vec3 c2;
uniform vec3 c3;
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);
  float r = length(uv);
  float a = atan(uv.y, uv.x) + (1.4 - r) * 2.2 + t * 0.06;
  vec2 q = vec2(cos(a), sin(a)) * r * 3.2;
  for (int i = 0; i < 5; i++) {
    q += vec2(sin(q.y * 1.6 + t * 0.21 + float(i)), cos(q.x * 1.4 - t * 0.17)) * 0.42;
  }
  float v = sin(q.x * 0.9 + q.y * 1.1) * 0.5 + 0.5;
  float w = sin(length(q) * 1.3 - t * 0.35) * 0.5 + 0.5;
  vec3 col = mix(c3, c1, smoothstep(0.15, 0.85, v));
  col = mix(col, c2, smoothstep(0.45, 1.0, w) * 0.75);
  col *= 0.82 + 0.18 * smoothstep(1.6, 0.2, r);
  col = floor(col * 28.0) / 28.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export function Background({ colors }: { colors: [string, string, string] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const target = useRef<RGB[]>(colors.map(hex));
  const current = useRef<RGB[]>(colors.map(hex));

  useEffect(() => {
    target.current = colors.map(hex);
  }, [colors]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, preserveDrawingBuffer: false });
    if (!gl) return;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "res");
    const uT = gl.getUniformLocation(prog, "t");
    const uC = [gl.getUniformLocation(prog, "c1"), gl.getUniformLocation(prog, "c2"), gl.getUniformLocation(prog, "c3")];

    const resize = () => {
      const k = 0.25;
      canvas.width = Math.max(64, Math.floor(window.innerWidth * k));
      canvas.height = Math.max(64, Math.floor(window.innerHeight * k));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const frame = (now: number) => {
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) current.current[i][j] += (target.current[i][j] - current.current[i][j]) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uT, reduce ? 0 : (now - t0) / 1000);
      current.current.forEach((c, i) => gl.uniform3f(uC[i], ...shade(c, 1)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="bg-canvas" aria-hidden />;
}
