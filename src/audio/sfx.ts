// Sound effects synthesized with the Web Audio API — no audio files, nothing to license.

export type Sfx = 'pop' | 'join' | 'correct' | 'myCorrect' | 'close' | 'tick' | 'turnStart' | 'turnEnd' | 'win' | 'warning';

let ctx: AudioContext | null = null;
let volume = 0.6;

export function audioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setSfxVolume(v: number) {
  volume = v;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.25) {
  const c = audioContext();
  if (!c || volume <= 0) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain * volume, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const SOUNDS: Record<Sfx, () => void> = {
  pop: () => tone(660, 0, 0.08, 'triangle', 0.2),
  join: () => [523, 784].forEach((f, i) => tone(f, i * 0.08, 0.15, 'triangle', 0.18)),
  correct: () => [659, 880].forEach((f, i) => tone(f, i * 0.09, 0.18, 'sine', 0.2)),
  myCorrect: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.25, 'triangle', 0.22)),
  close: () => tone(440, 0, 0.12, 'square', 0.08),
  tick: () => tone(1200, 0, 0.04, 'square', 0.06),
  turnStart: () => [392, 523].forEach((f, i) => tone(f, i * 0.12, 0.2, 'sine', 0.2)),
  turnEnd: () => [523, 392, 330].forEach((f, i) => tone(f, i * 0.1, 0.22, 'triangle', 0.18)),
  win: () => [523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, 'triangle', 0.22)),
  warning: () => [220, 196].forEach((f, i) => tone(f, i * 0.12, 0.18, 'sawtooth', 0.08)),
};

export function playSfx(name: Sfx) {
  try {
    SOUNDS[name]();
  } catch {
    // audio not available
  }
}
