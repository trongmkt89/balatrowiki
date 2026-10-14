/* Tiny WebAudio synth — every sound is generated, no audio files. */

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function ac(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.06, slide = 0, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.05, hp = 1200) {
  const a = ac();
  if (!a) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hp;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start();
}

export const sfx = {
  click: () => tone(660, 0.05, "square", 0.03),
  select: () => tone(880, 0.06, "triangle", 0.05, 120),
  deselect: () => tone(620, 0.06, "triangle", 0.04, -120),
  card: () => noise(0.06, 0.05, 2500),
  chips: (step = 0) => tone(420 + step * 35, 0.09, "triangle", 0.07),
  mult: (step = 0) => tone(300 + step * 30, 0.1, "sawtooth", 0.035),
  xmult: () => {
    tone(260, 0.18, "sawtooth", 0.05, 260);
    tone(520, 0.18, "square", 0.03, 260, 0.03);
  },
  money: () => {
    tone(1320, 0.07, "square", 0.04);
    tone(1760, 0.1, "square", 0.04, 0, 0.06);
  },
  info: () => tone(990, 0.08, "triangle", 0.04),
  bad: () => tone(180, 0.2, "sawtooth", 0.05, -60),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, "square", 0.05, 0, i * 0.09)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, "triangle", 0.06, 0, i * 0.15)),
  buy: () => {
    tone(880, 0.06, "square", 0.04);
    tone(1175, 0.09, "square", 0.04, 0, 0.05);
  },
  total: () => {
    tone(523, 0.12, "square", 0.05);
    tone(784, 0.2, "square", 0.05, 0, 0.08);
  },
};
