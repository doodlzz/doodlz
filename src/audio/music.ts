import { audioContext } from './sfx';

// Calm ambient music generated live: soft chord pads plus a sparse pentatonic melody.
// Being synthesized in the browser, it's royalty-free by construction.

const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G
];
const MELODY = [523.25, 587.33, 659.25, 783.99, 880.0];
const BAR = 4; // seconds per chord

let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextBar = 0;
let bar = 0;
let level = 0.4;

function voice(c: AudioContext, out: AudioNode, freq: number, start: number, dur: number, gain: number, type: OscillatorType) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.linearRampToValueAtTime(gain, start + dur * 0.3);
  g.gain.linearRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.1);
}

function schedule() {
  const c = audioContext();
  if (!c || !master) return;
  while (nextBar < c.currentTime + BAR * 2) {
    const chord = CHORDS[bar % CHORDS.length];
    for (const f of chord) voice(c, master, f / 2, nextBar, BAR * 1.2, 0.05, 'sine');
    for (let i = 0; i < 2; i++) {
      if (Math.random() < 0.6) {
        voice(c, master, MELODY[Math.floor(Math.random() * MELODY.length)], nextBar + i * (BAR / 2) + Math.random() * 0.4, 1.6, 0.03, 'triangle');
      }
    }
    nextBar += BAR;
    bar++;
  }
}

export function startMusic() {
  const c = audioContext();
  if (!c || timer) return;
  master = c.createGain();
  master.gain.value = level * 0.6;
  master.connect(c.destination);
  nextBar = c.currentTime + 0.1;
  schedule();
  timer = setInterval(schedule, 1000);
}

export function stopMusic() {
  if (timer) clearInterval(timer);
  timer = null;
  if (master) {
    const m = master;
    const c = audioContext();
    if (c) m.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.5);
    setTimeout(() => m.disconnect(), 700);
  }
  master = null;
}

export function setMusicVolume(v: number) {
  level = v;
  const c = audioContext();
  if (master && c) master.gain.linearRampToValueAtTime(v * 0.6, c.currentTime + 0.2);
}

export const isMusicPlaying = () => timer !== null;
