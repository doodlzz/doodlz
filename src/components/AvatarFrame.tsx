import { useId } from 'react';
import type { FrameId } from '../../shared/cosmetics';

// Frames are drawn in the avatar's own SVG space: the head is a circle at (50, 54) with radius 42.
// Each frame has a BACK layer (behind the head: ears, wings, flames, glow) and a FRONT layer (over it:
// the ring, crowns, sparkles). Everything stays inside FRAMED_VIEWBOX so a decorated avatar never
// spills into its neighbours. The look is soft gradients + glows + floating particles (no heavy outlines).
export const FRAMED_VIEWBOX = '-20 -33 140 148';

const CX = 50;
const CY = 54;
const R = 47.5;

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Rotates its children around the head. */
function Spin({ dur, reverse = false, children }: { dur: number; reverse?: boolean; children: React.ReactNode }) {
  return (
    <g>
      {!reduceMotion && (
        <animateTransform attributeName="transform" type="rotate" from={`0 ${CX} ${CY}`} to={`${reverse ? -360 : 360} ${CX} ${CY}`} dur={`${dur}s`} repeatCount="indefinite" />
      )}
      {children}
    </g>
  );
}

/** Something placed on the ring at `angle` degrees (0 = top); local -y points outward. */
function OnRing({ angle, r = R, children }: { angle: number; r?: number; children: React.ReactNode }) {
  return <g transform={`rotate(${angle} ${CX} ${CY}) translate(${CX} ${CY - r})`}>{children}</g>;
}

const around = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => offset + (360 / n) * i);

const SPARKLE = 'M0 -7 Q0.9 -0.9 7 0 Q0.9 0.9 0 7 Q-0.9 0.9 -7 0 Q-0.9 -0.9 0 -7 Z';

function Sparkle({ x, y, delay = 0, scale = 1, color = '#fff' }: { x: number; y: number; delay?: number; scale?: number; color?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className="fx-anim fx-twinkle" style={{ animationDelay: `${delay}s` }} d={SPARKLE} fill={color} />
    </g>
  );
}

/** A little floating dot: rises (embers) or falls (snow). */
function Mote({ x, y, delay = 0, r = 1.6, color = '#fff', fall = false }: { x: number; y: number; delay?: number; r?: number; color?: string; fall?: boolean }) {
  return <circle className={`fx-anim ${fall ? 'fx-fall' : 'fx-ember'}`} style={{ animationDelay: `${delay}s` }} cx={x} cy={y} r={r} fill={color} />;
}

function Heart({ x, y, delay = 0, scale = 1, fill }: { x: number; y: number; delay?: number; scale?: number; fill: string }) {
  return (
    <g className="fx-anim fx-bob" style={{ animationDelay: `${delay}s` }}>
      <path d="M0 4 C-11 -3 -7 -11 0 -6 C7 -11 11 -3 0 4 Z" transform={`translate(${x} ${y}) scale(${scale})`} fill={fill} />
    </g>
  );
}

function useIds() {
  const id = useId().replace(/:/g, '');
  return { a: `${id}-a`, b: `${id}-b`, c: `${id}-c`, glow: `${id}-glow`, clip: `${id}-clip` };
}

const Glow = ({ id, blur = 2.2 }: { id: string; blur?: number }) => (
  <filter id={id} x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation={blur} />
  </filter>
);

type Stop = [number, string];
const Grad = ({ id, stops, x1 = 0, y1 = 0, x2 = 1, y2 = 1 }: { id: string; stops: Stop[]; x1?: number; y1?: number; x2?: number; y2?: number }) => (
  <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
    {stops.map(([o, c]) => (
      <stop key={o} offset={o} stopColor={c} />
    ))}
  </linearGradient>
);

/** A ring with depth: soft shadow, gradient body, bright rim light. */
function Ring({ fill, w = 5, r = R }: { fill: string; w?: number; r?: number }) {
  return (
    <g fill="none">
      <circle cx={CX} cy={CY} r={r} stroke="#000" strokeOpacity="0.28" strokeWidth={w + 2.6} />
      <circle cx={CX} cy={CY} r={r} stroke={`url(#${fill})`} strokeWidth={w} />
      <circle cx={CX} cy={CY} r={r - w * 0.25} stroke="#fff" strokeOpacity="0.5" strokeWidth="0.9" />
    </g>
  );
}

/** A two-tone crystal: lit left face, shaded right face. Negative h points it down. */
function Shard({ x, y, w, h, rot = 0, light = '#f0f9ff', dark = '#7dd3fc' }: { x: number; y: number; w: number; h: number; rot?: number; light?: string; dark?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M${-w} 0 L${-w * 0.15} ${-h} L0 0 Z`} fill={light} />
      <path d={`M0 0 L${-w * 0.15} ${-h} L${w} 0 Z`} fill={dark} />
    </g>
  );
}

/** One side of a feathered wing, fanning out from the shoulder. `flip` mirrors it to the right side. */
function Wing({ flip, light, dark, edge }: { flip?: boolean; light: string; dark: string; edge: string }) {
  const rows = [
    { fill: dark, len: [34, 37, 36, 34, 31, 26], base: -28, step: -14 },
    { fill: light, len: [24, 27, 28, 27, 24, 19], base: -34, step: -14 },
  ];
  return (
    <g transform={flip ? 'translate(100 0) scale(-1 1)' : undefined}>
      {rows.map((row, ri) =>
        row.len.map((len, i) => (
          <g key={`${ri}${i}`} transform={`translate(12 56) rotate(${row.base + i * row.step})`}>
            <path d={`M0 0 Q-6.2 ${-len * 0.55} 0 ${-len} Q6.2 ${-len * 0.55} 0 0 Z`} fill={`url(#${row.fill})`} stroke={edge} strokeOpacity="0.55" strokeWidth="0.7" />
            <path d={`M0 -2 L0 ${-len + 3}`} stroke="#fff" strokeOpacity="0.55" strokeWidth="0.7" strokeLinecap="round" />
          </g>
        )),
      )}
    </g>
  );
}

const CAT_EARS = ['M16 38 L17 -6 L46 12', 'M84 38 L83 -6 L54 12'];
const CAT_EARS_INNER = ['M23 26 L24 6 L37 14', 'M77 26 L76 6 L63 14'];

/** The part drawn behind the head. */
export function FrameBack({ frame }: { frame: FrameId }) {
  const { a, b, glow } = useIds();

  switch (frame) {
    case 'neon':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={2.6} />
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#ec4899'], [1, '#6d28d9']]} />
          </defs>
          <g className="fx-anim fx-pulse" filter={`url(#${glow})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
            {CAT_EARS.map((d) => (
              <path key={d} d={d} stroke="#ec4899" strokeWidth="7" />
            ))}
            <circle cx={CX} cy={CY} r={R} stroke="#06b6d4" strokeWidth="9" />
            <circle cx={CX} cy={CY} r={R + 5.5} stroke="#ec4899" strokeWidth="5" opacity="0.8" />
          </g>
          <g strokeLinecap="round" strokeLinejoin="round">
            {CAT_EARS.map((d) => (
              <path key={d} d={d} fill={`url(#${a})`} fillOpacity="0.4" stroke="#f9a8d4" strokeWidth="2.6" />
            ))}
            {CAT_EARS.map((d) => (
              <path key={`w${d}`} d={d} fill="none" stroke="#fff" strokeWidth="0.9" />
            ))}
            {CAT_EARS_INNER.map((d) => (
              <path key={d} d={d} fill="none" stroke="#67e8f9" strokeWidth="1.8" />
            ))}
          </g>
        </g>
      );

    case 'ice':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 3} fill="none" stroke="#38bdf8" strokeWidth="8" opacity="0.5" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          {around(16, 11.25).map((ang, i) => (
            <OnRing key={ang} angle={ang} r={R - 2}>
              <Shard x={0} y={0} w={5.2} h={i % 4 === 0 ? 24 : i % 2 === 0 ? 18 : 12} rot={i % 2 ? -3 : 3} />
            </OnRing>
          ))}
          <Shard x={50} y={20} w={9} h={46} />
          <Shard x={38} y={22} w={7} h={32} rot={-24} />
          <Shard x={62} y={22} w={7} h={32} rot={24} />
          <Shard x={27} y={30} w={5.5} h={20} rot={-50} />
          <Shard x={73} y={30} w={5.5} h={20} rot={50} />
        </g>
      );

    case 'gold':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fef3c7'], [0.45, '#fbbf24'], [1, '#b45309']]} />
          </defs>
          {[-1, 1].map((side) =>
            Array.from({ length: 6 }, (_, k) => {
              const angle = side * (150 - k * 19);
              return (
                <OnRing key={`${side}${k}`} angle={angle} r={R + 1}>
                  {[62, -10].map((tilt, j) => (
                    <g key={tilt} transform={`rotate(${side * tilt}) translate(0 ${j * 3})`}>
                      <path d="M0 0 Q-5.5 -8 0 -17 Q5.5 -8 0 0 Z" fill={`url(#${a})`} stroke="#92400e" strokeOpacity="0.5" strokeWidth="0.7" />
                      <path d="M0 -1.5 L0 -14" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.7" strokeLinecap="round" />
                    </g>
                  ))}
                </OnRing>
              );
            }),
          )}
        </g>
      );

    case 'rainbow': {
      const bands = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6'];
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3} />
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fff'], [1, '#c7d2fe']]} />
          </defs>
          {bands.map((col, i) => {
            const r = 53 + i * 2.9;
            return <path key={`g${col}`} d={`M${CX - r} ${CY} A${r} ${r} 0 0 1 ${CX + r} ${CY}`} fill="none" stroke={col} strokeWidth="3.4" opacity="0.5" filter={`url(#${glow})`} />;
          })}
          {bands.map((col, i) => {
            const r = 53 + i * 2.9;
            return <path key={col} d={`M${CX - r} ${CY} A${r} ${r} 0 0 1 ${CX + r} ${CY}`} fill="none" stroke={col} strokeWidth="3" />;
          })}
          {[
            [-4, 0],
            [104, 0.8],
          ].map(([x, d]) => (
            <g key={x} transform={`translate(${x} 56)`}>
              <g className="fx-anim fx-bob" style={{ animationDelay: `${d}s` }}>
                <path d="M-11 7 Q-18 7 -16 0 Q-14 -6 -8 -4 Q-7 -12 1 -11 Q8 -11 9 -4 Q16 -5 17 2 Q17 7 11 7 Z" fill={`url(#${a})`} stroke="#c7d2fe" strokeWidth="1" strokeLinejoin="round" />
              </g>
            </g>
          ))}
        </g>
      );
    }

    case 'fire':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={4} />
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#b91c1c'], [0.55, '#ea580c'], [1, '#fb923c']]} />
            <Grad id={b} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#ea580c'], [1, '#fde047']]} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="#f97316" strokeWidth="11" opacity="0.7" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          {around(14).map((ang, i) => {
            const tall = i === 0 || i === 1 || i === 13;
            const s = tall ? 1.55 : i % 2 ? 0.95 : 1.2;
            const dl = `${(i % 5) * 0.14}s`;
            return (
              <OnRing key={ang} angle={ang} r={R - 4}>
                <g transform={`scale(${s})`}>
                  <path className="fx-anim fx-flicker" style={{ animationDelay: dl }} d="M-9 2 Q-12 -9 -4 -16 Q-4 -22 1 -30 Q6 -19 10 -12 Q13 -5 9 2 Z" fill={`url(#${a})`} />
                  <path className="fx-anim fx-flicker" style={{ animationDelay: dl }} d="M-6 2 Q-8 -6 -2 -12 Q-1 -17 2 -22 Q5 -14 7 -9 Q8 -3 6 2 Z" fill={`url(#${b})`} />
                  <path className="fx-anim fx-flicker" style={{ animationDelay: dl }} d="M-3 1 Q-4 -4 0 -8 Q3 -4 3.5 1 Z" fill="#fffbd0" />
                </g>
              </OnRing>
            );
          })}
        </g>
      );

    case 'galaxy':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={4.5} />
            <Grad id={a} stops={[[0, '#fef9c3'], [1, '#fbbf24']]} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="#7c3aed" strokeWidth="11" opacity="0.7" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          <circle cx="10" cy="24" r="10" fill="#3b82f6" opacity="0.55" filter={`url(#${glow})`} />
          <circle cx="94" cy="86" r="11" fill="#d946ef" opacity="0.55" filter={`url(#${glow})`} />
          <ellipse cx={CX} cy={CY} rx="62" ry="15" transform={`rotate(-18 ${CX} ${CY})`} fill="none" stroke="#c4b5fd" strokeWidth="3.4" opacity="0.5" />
          <g className="fx-anim fx-bob">
            <path d="M50 -27 A15 15 0 1 0 66 -4 A12 12 0 1 1 50 -27 Z" fill={`url(#${a})`} />
            <circle cx="46" cy="-8" r="1.5" fill="#f59e0b" opacity="0.5" />
          </g>
        </g>
      );

    case 'bunny':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fff'], [1, '#e2e8f0']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fbcfe8'], [1, '#f472b6']]} />
          </defs>
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${50 + side * 20} 20)`}>
              <g className="fx-anim fx-wobble" style={{ animationDelay: side > 0 ? '0.5s' : '0s' }}>
                <g transform={`rotate(${side * 13})`}>
                  <ellipse cx="0" cy="-14" rx="10.5" ry="27" fill={`url(#${a})`} stroke="#cbd5e1" strokeWidth="1.2" />
                  <ellipse cx="0" cy="-12" rx="5.4" ry="20" fill={`url(#${b})`} />
                  <ellipse cx="-3" cy="-22" rx="1.6" ry="9" fill="#fff" opacity="0.7" />
                </g>
              </g>
            </g>
          ))}
        </g>
      );

    case 'cyber':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={2} />
            <Grad id={a} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#e2e8f0'], [0.5, '#94a3b8'], [1, '#475569']]} />
            <radialGradient id={b}>
              <stop offset="0" stopColor="#fecaca" />
              <stop offset="1" stopColor="#ef4444" />
            </radialGradient>
          </defs>
          <path d={`M${CX} 12 L${CX} -13`} stroke={`url(#${a})`} strokeWidth="3" strokeLinecap="round" />
          <circle className="fx-anim fx-blink" cx={CX} cy="-17" r="7" fill="#ef4444" opacity="0.6" filter={`url(#${glow})`} />
          <circle className="fx-anim fx-blink" cx={CX} cy="-17" r="4.2" fill={`url(#${b})`} />
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${50 + side * 49} 54)`}>
              <rect x="-8" y="-16" width="16" height="32" rx="7" fill={`url(#${a})`} stroke="#64748b" strokeWidth="0.8" />
              <rect x="-3" y="-9" width="6" height="18" rx="3" fill="#22d3ee" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
              <rect x="-2" y="-8" width="4" height="16" rx="2" fill="#ecfeff" />
            </g>
          ))}
        </g>
      );

    case 'angel':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3.4} />
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fff'], [1, '#e0e7ff']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#dbeafe'], [1, '#a5b4fc']]} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#fde047" strokeWidth="10" opacity="0.6" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          <g className="fx-anim fx-flap-l">
            <Wing light={a} dark={b} edge="#818cf8" />
          </g>
          <g className="fx-anim fx-flap-r">
            <Wing flip light={a} dark={b} edge="#818cf8" />
          </g>
        </g>
      );

    case 'devil':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3.4} />
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#9f1239'], [1, '#3b0a1e']]} />
            <Grad id={b} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#7f1d1d'], [1, '#f87171']]} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#dc2626" strokeWidth="10" opacity="0.65" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          {[-1, 1].map((side) => (
            <g key={side} transform={side > 0 ? 'translate(100 0) scale(-1 1)' : undefined}>
              <g className="fx-anim fx-flap-l">
                <path d="M16 62 Q-16 58 -18 24 Q-8 32 -4 22 Q2 36 10 32 Q8 46 20 50 Z" fill={`url(#${a})`} stroke="#f87171" strokeOpacity="0.6" strokeWidth="0.9" strokeLinejoin="round" />
                <path d="M16 60 L-17 26 M16 60 L-3 24 M16 60 L10 34" stroke="#fb7185" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
              </g>
              <path d="M28 27 Q12 14 20 -10 Q30 8 44 16 Z" fill={`url(#${b})`} />
              <path d="M24 12 Q20 4 22 -4" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.4" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
  }
}

/** The part drawn over the head. */
export function FrontPart({ frame }: { frame: FrameId }) {
  return <FrameFront frame={frame} />;
}

export function FrameFront({ frame }: { frame: FrameId }) {
  const { a, b, c, glow, clip } = useIds();

  switch (frame) {
    case 'neon':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={2} />
          </defs>
          <g className="fx-anim fx-pulse">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#22d3ee" strokeWidth="4" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#ecfeff" strokeWidth="1.4" />
            <circle cx={CX} cy={CY} r={R + 5.5} fill="none" stroke="#f472b6" strokeWidth="2.2" />
          </g>
          <g stroke="#f9a8d4" strokeWidth="2" strokeLinecap="round" filter={`url(#${glow})`} opacity="0.9">
            {[-7, 0, 7].map((dy) => (
              <g key={dy}>
                <path d={`M10 ${62 + dy / 2} L-12 ${62 + dy * 1.6}`} />
                <path d={`M90 ${62 + dy / 2} L112 ${62 + dy * 1.6}`} />
              </g>
            ))}
          </g>
          <g stroke="#fff" strokeWidth="0.9" strokeLinecap="round">
            {[-7, 0, 7].map((dy) => (
              <g key={dy}>
                <path d={`M10 ${62 + dy / 2} L-12 ${62 + dy * 1.6}`} />
                <path d={`M90 ${62 + dy / 2} L112 ${62 + dy * 1.6}`} />
              </g>
            ))}
          </g>
          <Spin dur={2.6}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fff" strokeWidth="4.2" strokeLinecap="round" strokeDasharray="22 280" filter={`url(#${glow})`} />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeDasharray="22 280" />
          </Spin>
        </g>
      );

    case 'ice':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#f0f9ff'], [0.5, '#7dd3fc'], [1, '#0ea5e9']]} />
          </defs>
          <Ring fill={a} w={5} />
          <Spin dur={5}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 270" opacity="0.9" />
          </Spin>
          <Shard x={32} y={97} w={3} h={-10} />
          <Shard x={50} y={101} w={3.4} h={-14} />
          <Shard x={68} y={97} w={3} h={-10} />
          {[
            [8, 20, 0],
            [92, 30, 0.9],
            [24, 6, 1.7],
            [78, 8, 0.4],
            [100, 70, 1.3],
            [2, 76, 2.1],
          ].map(([x, y, d]) => (
            <Mote key={`${x}${y}`} x={x} y={y} delay={d} r={1.5} fall />
          ))}
          <Sparkle x={14} y={30} color="#e0f2fe" scale={0.9} />
          <Sparkle x={88} y={78} delay={0.7} color="#e0f2fe" />
          <Sparkle x={84} y={14} delay={1.3} color="#fff" scale={0.7} />
        </g>
      );

    case 'gold':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fef3c7'], [0.35, '#facc15'], [0.7, '#d97706'], [1, '#fde68a']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fef9c3'], [0.5, '#fbbf24'], [1, '#b45309']]} />
            <linearGradient id={c} gradientUnits="userSpaceOnUse" x1="-40" y1="0" x2="-10" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clip}>
              <path clipRule="evenodd" d={`M${CX - R - 3} ${CY} a${R + 3} ${R + 3} 0 1 0 ${2 * R + 6} 0 a${R + 3} ${R + 3} 0 1 0 ${-(2 * R + 6)} 0 Z M${CX - R + 3} ${CY} a${R - 3} ${R - 3} 0 1 1 ${2 * R - 6} 0 a${R - 3} ${R - 3} 0 1 1 ${-(2 * R - 6)} 0 Z`} />
            </clipPath>
          </defs>
          <Ring fill={a} w={5.5} />
          <g clipPath={`url(#${clip})`}>
            <g transform="rotate(25 50 54)">
              <rect x="-40" y="0" width="30" height="120" fill={`url(#${c})`}>
                {!reduceMotion && <animateTransform attributeName="transform" type="translate" from="0 0" to="150 0" dur="3.2s" repeatCount="indefinite" />}
              </rect>
            </g>
          </g>
          <g className="fx-anim fx-bob">
            <path d="M31 12 L27 -14 L40 -2 L50 -22 L60 -2 L73 -14 L69 12 Z" fill={`url(#${b})`} stroke="#b45309" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M40 -2 L50 -22 L50 8 Z" fill="#fff" opacity="0.28" />
            <path d="M31 12 L69 12 L69 6 L31 6 Z" fill="#b45309" opacity="0.85" />
            <rect x="31" y="6" width="38" height="3" fill="#fde68a" opacity="0.6" />
            <circle cx="50" cy="9" r="3.2" fill="#ef4444" />
            <circle cx="49" cy="8" r="1" fill="#fff" opacity="0.8" />
            <circle cx="39" cy="9" r="2.1" fill="#38bdf8" />
            <circle cx="61" cy="9" r="2.1" fill="#38bdf8" />
            {[
              [27, -14],
              [73, -14],
              [50, -22],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="2.6" fill="#fff7d6" stroke="#d97706" strokeWidth="0.8" />
            ))}
          </g>
          <Sparkle x={20} y={4} delay={0.2} color="#fffbeb" />
          <Sparkle x={84} y={-2} delay={0.9} color="#fffbeb" />
          <Sparkle x={88} y={90} delay={1.4} color="#fde68a" scale={0.8} />
          <Sparkle x={12} y={84} delay={0.5} color="#fde68a" scale={0.7} />
        </g>
      );

    case 'rainbow':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={2} />
            <Grad id={a} stops={[[0, '#ef4444'], [0.17, '#f97316'], [0.34, '#eab308'], [0.5, '#22c55e'], [0.67, '#06b6d4'], [0.84, '#8b5cf6'], [1, '#ef4444']]} />
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="9" />
          <Spin dur={3}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${a})`} strokeWidth="7" filter={`url(#${glow})`} opacity="0.7" />
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${a})`} strokeWidth="5.4" />
          </Spin>
          <circle cx={CX} cy={CY} r={R - 1.8} fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="0.9" />
          <Sparkle x={34} y={-12} delay={0.1} color="#fbcfe8" />
          <Sparkle x={70} y={-16} delay={0.8} color="#bae6fd" scale={0.8} />
          <Sparkle x={50} y={106} delay={0.4} color="#fef08a" scale={0.8} />
          <Heart x={98} y={24} fill="#fb7185" />
          <Heart x={4} y={90} delay={1.1} scale={0.8} fill="#fdba74" />
        </g>
      );

    case 'fire':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#7f1d1d'], [0.5, '#ea580c'], [1, '#fbbf24']]} />
          </defs>
          <Ring fill={a} w={5} />
          {[
            [22, 4, 0],
            [78, 8, 0.7],
            [6, 40, 1.3],
            [96, 44, 0.4],
            [38, -6, 1.8],
            [64, -8, 1],
            [90, 70, 0.2],
            [10, 78, 1.5],
          ].map(([x, y, d], i) => (
            <Mote key={`${x}${y}`} x={x} y={y} delay={d} r={i % 2 ? 1.3 : 1.9} color={i % 2 ? '#fde047' : '#fb923c'} />
          ))}
        </g>
      );

    case 'galaxy':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#d946ef'], [0.5, '#6d28d9'], [1, '#3b82f6']]} />
            <Grad id={b} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#e9d5ff'], [1, '#93c5fd']]} />
            <radialGradient id={c}>
              <stop offset="0" stopColor="#fbcfe8" />
              <stop offset="1" stopColor="#c026d3" />
            </radialGradient>
            <clipPath id={clip}>
              <rect x="-30" y={CY} width="160" height="80" />
            </clipPath>
          </defs>
          <Ring fill={a} w={5.5} />
          <Spin dur={16}>
            {around(8).map((ang, i) => (
              <OnRing key={ang} angle={ang + (i % 2) * 9} r={R + (i % 3) - 1}>
                <circle r={i % 3 === 0 ? 1.9 : 1.1} fill="#fff" />
              </OnRing>
            ))}
          </Spin>
          <g clipPath={`url(#${clip})`}>
            <ellipse cx={CX} cy={CY} rx="62" ry="15" transform={`rotate(-18 ${CX} ${CY})`} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="5.6" />
            <ellipse cx={CX} cy={CY} rx="62" ry="15" transform={`rotate(-18 ${CX} ${CY})`} fill="none" stroke={`url(#${b})`} strokeWidth="3.2" />
          </g>
          <Spin dur={9} reverse>
            <OnRing angle={140} r={R + 11}>
              <circle r="4.6" fill={`url(#${c})`} />
              <ellipse rx="8" ry="1.9" fill="none" stroke="#fae8ff" strokeWidth="1" transform="rotate(-25)" />
            </OnRing>
          </Spin>
          <g className="fx-anim fx-shoot">
            <path d="M92 6 L100 -2" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="92" cy="6" r="1.8" fill="#fff" />
          </g>
          <Sparkle x={14} y={10} delay={0.3} color="#ddd6fe" />
          <Sparkle x={90} y={22} delay={1} color="#fde68a" scale={0.8} />
          <Sparkle x={86} y={100} delay={1.5} color="#bfdbfe" scale={0.7} />
        </g>
      );

    case 'bunny':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fdf2f8'], [0.5, '#f9a8d4'], [1, '#f472b6']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fda4af'], [1, '#e11d48']]} />
          </defs>
          <Ring fill={a} w={5} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="1.5 9" strokeLinecap="round" />
          <g transform="translate(50 100)">
            <path d="M0 0 L-12 -7 Q-14 0 -12 7 Z M0 0 L12 -7 Q14 0 12 7 Z" fill={`url(#${b})`} />
            <circle r="3.8" fill="#fb7185" />
            <circle cx="-1" cy="-1.2" r="1.2" fill="#fff" opacity="0.7" />
          </g>
          <Heart x={100} y={20} fill="#fb7185" />
          <Heart x={2} y={14} delay={0.9} scale={0.8} fill="#f9a8d4" />
          <Heart x={104} y={84} delay={1.5} scale={0.7} fill="#fda4af" />
          <Sparkle x={86} y={4} delay={0.6} color="#fff" scale={0.8} />
        </g>
      );

    case 'cyber': {
      const pts = Array.from({ length: 6 }, (_, i) => {
        const ang = ((60 * i - 30) * Math.PI) / 180;
        return [CX + (R + 1) * Math.cos(ang), CY + (R + 1) * Math.sin(ang)];
      });
      const hex = pts.map((p) => p.join(',')).join(' ');
      return (
        <g>
          <defs>
            <Glow id={glow} blur={1.8} />
            <Grad id={a} stops={[[0, '#e2e8f0'], [0.5, '#94a3b8'], [1, '#475569']]} />
          </defs>
          <polygon points={hex} fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="8" strokeLinejoin="round" />
          <polygon points={hex} fill="none" stroke={`url(#${a})`} strokeWidth="5" strokeLinejoin="round" />
          <polygon points={hex} fill="none" stroke="#22d3ee" strokeWidth="1.3" strokeLinejoin="round" strokeDasharray="6 8" className="fx-anim fx-pulse" />
          {pts.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="3.4" fill="#22d3ee" opacity="0.6" filter={`url(#${glow})`} />
              <circle cx={x} cy={y} r="2" fill="#ecfeff" />
            </g>
          ))}
          <Spin dur={4}>
            <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="14 285" filter={`url(#${glow})`} />
          </Spin>
          <Spin dur={4} reverse>
            <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="14 285" strokeDashoffset="-150" filter={`url(#${glow})`} />
          </Spin>
          <path className="fx-anim fx-blink" d="M82 6 L90 6 L90 14" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );
    }

    case 'angel':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={2} />
            <Grad id={a} stops={[[0, '#fff'], [0.5, '#fef08a'], [1, '#f59e0b']]} />
          </defs>
          <Ring fill={a} w={4.6} />
          <g className="fx-anim fx-bob">
            <ellipse cx={CX} cy="-8" rx="21" ry="6.5" fill="none" stroke="#fde047" strokeWidth="7" filter={`url(#${glow})`} opacity="0.85" />
            <ellipse cx={CX} cy="-8" rx="21" ry="6.5" fill="none" stroke={`url(#${a})`} strokeWidth="3.4" />
            <ellipse cx={CX} cy="-8.6" rx="21" ry="6.5" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
          </g>
          {[
            [10, 8, 0],
            [90, 6, 0.9],
            [4, 70, 1.6],
            [98, 76, 0.4],
          ].map(([x, y, d]) => (
            <Mote key={`${x}${y}`} x={x} y={y} delay={d} r={1.4} color="#fff" fall />
          ))}
          <Sparkle x={14} y={-4} delay={0.2} color="#fff" />
          <Sparkle x={88} y={-6} delay={0.9} color="#fef08a" scale={0.8} />
          <Sparkle x={52} y={108} delay={1.4} color="#fff" scale={0.7} />
        </g>
      );

    case 'devil':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#450a0a'], [1, '#ef4444']]} />
            <Grad id={b} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#f87171'], [1, '#991b1b']]} />
          </defs>
          <Ring fill={a} w={5} />
          <g className="fx-anim fx-bob">
            <path d="M82 88 Q106 88 101 108" fill="none" stroke="#000" strokeOpacity="0.28" strokeWidth="4.6" strokeLinecap="round" />
            <path d="M82 88 Q106 88 101 108" fill="none" stroke={`url(#${b})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M101 100 L95 110 L107 109 Z" fill="#ef4444" />
          </g>
          {[
            [20, 6, 0],
            [82, 4, 0.8],
            [6, 70, 1.4],
            [96, 56, 0.3],
          ].map(([x, y, d], i) => (
            <Mote key={`${x}${y}`} x={x} y={y} delay={d} r={i % 2 ? 1.2 : 1.8} color={i % 2 ? '#fecaca' : '#f87171'} />
          ))}
        </g>
      );
  }
}
