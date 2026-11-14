import { useId } from 'react';
import type { FrameId } from '../../shared/cosmetics';

// Frames are drawn in the avatar's own SVG space: the head is a circle at (50, 54) with radius 42.
// Each frame has a BACK layer (behind the head) and a FRONT layer (over it), and stays inside
// FRAMED_VIEWBOX so a decorated avatar never spills into its neighbours.
//
// House style, so the set reads as one collection:
//   - a slim ring plus ONE motif, in ONE colour family
//   - cel shading (base, one shadow, one highlight) with a thin outline in a darker shade of the hue
//   - exactly ONE subtle animation per frame; no scattered sparkles or particles
export const FRAMED_VIEWBOX = '-20 -33 140 148';

const CX = 50;
const CY = 54;
const R = 47.5;

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Something placed on the ring at `angle` degrees (0 = top); local -y points outward. */
function OnRing({ angle, r = R, children }: { angle: number; r?: number; children: React.ReactNode }) {
  return <g transform={`rotate(${angle} ${CX} ${CY}) translate(${CX} ${CY - r})`}>{children}</g>;
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

/** The slim ring every frame shares: soft shadow, gradient body, rim light. */
function Ring({ fill, w = 4, r = R }: { fill: string; w?: number; r?: number }) {
  return (
    <g fill="none">
      <circle cx={CX} cy={CY} r={r} stroke="#000" strokeOpacity="0.25" strokeWidth={w + 2} />
      <circle cx={CX} cy={CY} r={r} stroke={`url(#${fill})`} strokeWidth={w} />
      <circle cx={CX} cy={CY} r={r - w * 0.22} stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" />
    </g>
  );
}

/** A cut crystal pointing outward (local -y): lit face, shaded face, one outline. */
function Crystal({ w, h, rot = 0 }: { w: number; h: number; rot?: number }) {
  const s = h * 0.66;
  return (
    <g transform={`rotate(${rot})`} strokeLinejoin="round">
      <path d={`M${-w} 0 L${-w} ${-s} L0 ${-h} L0 0 Z`} fill="#e0f2fe" />
      <path d={`M0 0 L0 ${-h} L${w} ${-s} L${w} 0 Z`} fill="#7dd3fc" />
      <path d={`M${-w} ${-s} L0 ${-h} L${w} ${-s} L0 ${-s + w * 0.7} Z`} fill="#fff" fillOpacity="0.75" />
      <path d={`M${-w} 0 L${-w} ${-s} L0 ${-h} L${w} ${-s} L${w} 0 Z`} fill="none" stroke="#0284c7" strokeWidth="1.1" />
    </g>
  );
}

const FLAME = 'M0 2 C-9 2 -11 -8 -6 -15 C-5 -10 -2 -11 -2 -15 C-2 -22 2 -27 3 -31 C5 -24 11 -16 10 -7 C10 -1 6 2 0 2 Z';

/** A three-tone flame that always burns upward. */
function Flame({ scale, lean, delay, a, b }: { scale: number; lean: number; delay: number; a: string; b: string }) {
  return (
    <g transform={`rotate(${lean}) scale(${scale})`}>
      <g className="fx-anim fx-flicker" style={{ animationDelay: `${delay}s` }}>
        <path d={FLAME} fill={`url(#${a})`} />
        <path d={FLAME} transform="translate(0.6 0) scale(0.62)" fill={`url(#${b})`} />
        <path d={FLAME} transform="translate(0.8 0) scale(0.3)" fill="#fff7c2" />
      </g>
    </g>
  );
}

/** One side of a feathered wing, fanning out from the shoulder. `flip` mirrors it to the right side. */
function Wing({ flip, light, dark }: { flip?: boolean; light: string; dark: string }) {
  const rows = [
    { fill: dark, len: [34, 37, 36, 34, 31, 26], base: -28, step: -14 },
    { fill: light, len: [24, 27, 28, 27, 24, 19], base: -34, step: -14 },
  ];
  return (
    <g transform={flip ? 'translate(100 0) scale(-1 1)' : undefined}>
      {rows.map((row, ri) =>
        row.len.map((len, i) => (
          <path
            key={`${ri}${i}`}
            transform={`translate(12 56) rotate(${row.base + i * row.step})`}
            d={`M0 0 Q-7.6 ${-len * 0.5} 0 ${-len} Q7.6 ${-len * 0.5} 0 0 Z`}
            fill={`url(#${row.fill})`}
            stroke="#a5b4fc"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        )),
      )}
    </g>
  );
}

/** A planet travelling the tilted orbit (the same motion is drawn in both layers so it passes behind the head). */
const ORBIT = `M${CX - 62} ${CY} a62 15 0 1 0 124 0 a62 15 0 1 0 -124 0`;
function Planet({ fill }: { fill: string }) {
  return (
    <g>
      {!reduceMotion && <animateMotion dur="9s" repeatCount="indefinite" path={ORBIT} />}
      <g transform={reduceMotion ? `translate(${CX + 44} ${CY + 10.5})` : undefined}>
        <circle r="5" fill={`url(#${fill})`} stroke="#86198f" strokeWidth="1" />
        <circle cx="-1.6" cy="-1.8" r="1.4" fill="#fff" fillOpacity="0.7" />
      </g>
    </g>
  );
}

const hexPoints = (r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const ang = ((60 * i - 30) * Math.PI) / 180;
    return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)];
  });

const starPath = (cx: number, cy: number, ro: number, ri: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const ang = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 ? ri : ro;
    return `${i ? 'L' : 'M'}${(cx + r * Math.cos(ang)).toFixed(2)} ${(cy + r * Math.sin(ang)).toFixed(2)}`;
  }).join(' ') + ' Z';

/** The part drawn behind the head. */
export function FrameBack({ frame }: { frame: FrameId }) {
  const { a, b, glow } = useIds();

  switch (frame) {
    // Crystals growing out from behind the ring: a big cluster lower-left, a small echo upper-right.
    case 'ice':
      return (
        <g>
          <OnRing angle={232} r={R - 3}>
            <Crystal w={7.5} h={27} rot={-40} />
            <Crystal w={7.5} h={29} rot={38} />
            <Crystal w={10} h={41} />
          </OnRing>
          <OnRing angle={50} r={R - 3}>
            <Crystal w={6} h={18} rot={36} />
            <Crystal w={7.5} h={29} rot={-6} />
          </OnRing>
        </g>
      );

    case 'gold':
      return null;

    case 'cyber': {
      const hexBack = hexPoints(R + 4).map((p) => p.join(',')).join(' ');
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3.4} />
          </defs>
          <polygon points={hexBack} filter={`url(#${glow})`} fill="none" stroke="#22d3ee" strokeWidth="6" opacity="0.7" />
        </g>
      );
    }

    // Big green hood and a pair of webbed feet.
    case 'frog':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#86efac'], [1, '#22c55e']]} />
          </defs>
          {[24, 76].map((x) => (
            <ellipse key={x} cx={x} cy="103" rx="13" ry="6.5" fill={`url(#${a})`} stroke="#15803d" strokeWidth="1.3" />
          ))}
          <circle cx={CX} cy={CY} r={R + 1} fill={`url(#${a})`} stroke="#15803d" strokeWidth="1.3" />
        </g>
      );

    case 'pirate':
    case 'astronaut':
    case 'wizard':
    case 'ninja':
    case 'mushroom':
      return null;

    // A crown of fire: flames rise from behind the head, tallest on top.
    case 'fire':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#dc2626'], [0.6, '#f97316'], [1, '#fb923c']]} />
            <Grad id={b} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#f97316'], [1, '#fde047']]} />
          </defs>
          {[-112, 112, -84, 84, -58, 58, -34, 34, -12, 14].map((ang, i) => {
            const t = 1 - Math.abs(ang) / 112;
            const rad = (ang * Math.PI) / 180;
            return (
              <g key={ang} transform={`translate(${CX + (R - 6) * Math.sin(rad)} ${CY - (R - 6) * Math.cos(rad) + 4})`}>
                <Flame scale={0.8 + t * 0.75} lean={ang * 0.16} delay={(i % 4) * 0.22} a={a} b={b} />
              </g>
            );
          })}
        </g>
      );

    // The far half of a planet's orbit.
    case 'galaxy':
      return (
        <g transform={`rotate(-18 ${CX} ${CY})`}>
          <defs>
            <radialGradient id={a}>
              <stop offset="0" stopColor="#f5d0fe" />
              <stop offset="1" stopColor="#c026d3" />
            </radialGradient>
          </defs>
          <ellipse cx={CX} cy={CY} rx="62" ry="15" fill="none" stroke="#a78bfa" strokeWidth="2.2" opacity="0.7" />
          <Planet fill={a} />
        </g>
      );

    case 'bunny': {
      const ear = 'M-9 8 C-14 -14 -10 -40 0 -45 C10 -40 14 -14 9 8 Z';
      const inner = 'M-4.6 4 C-7.5 -12 -5.4 -32 0 -37 C5.4 -32 7.5 -12 4.6 4 Z';
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#ffffff'], [1, '#fce7f3']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fbcfe8'], [1, '#f472b6']]} />
          </defs>
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${50 + side * 19} 22) rotate(${side * 13})`}>
              <g className={side > 0 ? 'fx-anim fx-twitch' : undefined}>
                <path d={ear} fill={`url(#${a})`} stroke="#ec4899" strokeWidth="1.3" strokeLinejoin="round" />
                <path d={inner} fill={`url(#${b})`} />
              </g>
            </g>
          ))}
        </g>
      );
    }

    case 'angel':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#ffffff'], [1, '#eef2ff']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#e0e7ff'], [1, '#c7d2fe']]} />
          </defs>
          <g className="fx-anim fx-flap-l">
            <Wing light={a} dark={b} />
          </g>
          <g className="fx-anim fx-flap-r">
            <Wing flip light={a} dark={b} />
          </g>
        </g>
      );

    case 'devil':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#991b1b'], [0.6, '#ef4444'], [1, '#fca5a5']]} />
          </defs>
          {[-1, 1].map((side) => (
            <g key={side} transform={side > 0 ? 'translate(100 0) scale(-1 1)' : undefined}>
              <path d="M27 28 C16 20 12 4 20 -11 C24 2 32 10 44 15 Z" fill={`url(#${a})`} stroke="#7f1d1d" strokeWidth="1.3" strokeLinejoin="round" />
              <path d="M22.5 10 C20.5 4 20.5 -1 21.5 -5" fill="none" stroke="#fff" strokeOpacity="0.6" strokeWidth="1.3" strokeLinecap="round" />
            </g>
          ))}
        </g>
      );
  }
}

/** The part drawn over the head. */
export function FrameFront({ frame }: { frame: FrameId }) {
  const { a, b, c, clip } = useIds();

  switch (frame) {
    case 'ice':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#f0f9ff'], [0.5, '#7dd3fc'], [1, '#0ea5e9']]} />
          </defs>
          <Ring fill={a} />
          {/* a single glint on the tallest crystal */}
          <g transform="translate(-6 108)">
            <path className="fx-anim fx-twinkle" d="M0 -6 Q0.8 -0.8 6 0 Q0.8 0.8 0 6 Q-0.8 0.8 -6 0 Q-0.8 -0.8 0 -6 Z" fill="#fff" />
          </g>
        </g>
      );

    // A slim gold band and a crown worn at a tilt; a glint sweeps the band.
    case 'gold':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fef3c7'], [0.4, '#fbbf24'], [0.75, '#d97706'], [1, '#fde68a']]} />
            <Grad id={b} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#fde68a'], [0.55, '#fbbf24'], [1, '#f59e0b']]} />
            <linearGradient id={c} gradientUnits="userSpaceOnUse" x1="-40" y1="0" x2="-14" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.9" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clip}>
              <path clipRule="evenodd" d={`M${CX - R - 2.2} ${CY} a${R + 2.2} ${R + 2.2} 0 1 0 ${2 * R + 4.4} 0 a${R + 2.2} ${R + 2.2} 0 1 0 ${-(2 * R + 4.4)} 0 Z M${CX - R + 2.2} ${CY} a${R - 2.2} ${R - 2.2} 0 1 1 ${2 * R - 4.4} 0 a${R - 2.2} ${R - 2.2} 0 1 1 ${-(2 * R - 4.4)} 0 Z`} />
            </clipPath>
          </defs>
          <Ring fill={a} />
          <g clipPath={`url(#${clip})`}>
            <g transform="rotate(25 50 54)">
              <rect x="-40" y="0" width="26" height="120" fill={`url(#${c})`}>
                {!reduceMotion && <animateTransform attributeName="transform" type="translate" values="0 0; 150 0; 150 0" keyTimes="0; 0.35; 1" dur="4.5s" repeatCount="indefinite" />}
              </rect>
            </g>
          </g>
          <g transform={`rotate(-16 ${CX} ${CY})`} strokeLinejoin="round">
            <path d="M29 15 L24 -11 L38 0 L50 -19 L62 0 L76 -11 L71 15 Q50 6.5 29 15 Z" fill={`url(#${b})`} stroke="#92400e" strokeWidth="1.3" />
            <path d="M50 -19 L62 0 L76 -11 L71 15 Q60 10 50 9 Z" fill="#b45309" fillOpacity="0.22" />
            <path d="M29 15 Q50 6.5 71 15 L72 9.6 Q50 1.4 28 9.6 Z" fill="#d97706" stroke="#92400e" strokeWidth="1.1" />
            <circle cx="50" cy="6.6" r="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="0.9" />
            <circle cx="49" cy="5.6" r="0.9" fill="#fff" fillOpacity="0.85" />
            {[
              [24, -11],
              [50, -19],
              [76, -11],
            ].map(([x, y]) => (
              <circle key={x} cx={x} cy={y} r="2.5" fill="#fef3c7" stroke="#92400e" strokeWidth="1" />
            ))}
          </g>
        </g>
      );

    case 'fire':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#7f1d1d'], [0.55, '#ea580c'], [1, '#fbbf24']]} />
          </defs>
          <Ring fill={a} />
        </g>
      );

    case 'galaxy':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#c084fc'], [0.5, '#6d28d9'], [1, '#3b82f6']]} />
            <radialGradient id={b}>
              <stop offset="0" stopColor="#f5d0fe" />
              <stop offset="1" stopColor="#c026d3" />
            </radialGradient>
            <clipPath id={clip}>
              <rect x="-30" y={CY} width="160" height="40" />
            </clipPath>
          </defs>
          <Ring fill={a} w={4.6} />
          {[20, 95, 160, 235, 300].map((ang, i) => (
            <OnRing key={ang} angle={ang}>
              <circle r={i % 2 ? 0.8 : 1.1} fill="#fff" />
            </OnRing>
          ))}
          {/* the near half of the orbit passes in front of the face */}
          <g transform={`rotate(-18 ${CX} ${CY})`}>
            <g clipPath={`url(#${clip})`}>
              <ellipse cx={CX} cy={CY} rx="62" ry="15" fill="none" stroke="#000" strokeOpacity="0.25" strokeWidth="4" />
              <ellipse cx={CX} cy={CY} rx="62" ry="15" fill="none" stroke="#ddd6fe" strokeWidth="2.2" />
              <Planet fill={b} />
            </g>
          </g>
        </g>
      );

    case 'bunny':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fdf2f8'], [0.5, '#f9a8d4'], [1, '#f472b6']]} />
          </defs>
          <Ring fill={a} />
        </g>
      );

    // A brushed-metal hexagon helmet frame: glow, ear modules and a light running the edge.
    case 'cyber': {
      const hex = hexPoints(R + 4).map((p) => p.join(',')).join(' ');
      const inner = hexPoints(R - 2).map((p) => p.join(',')).join(' ');
      return (
        <g fill="none" strokeLinejoin="round">
          <defs>
            <Grad id={a} stops={[[0, '#f1f5f9'], [0.45, '#94a3b8'], [1, '#334155']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#64748b'], [1, '#1e293b']]} />
          </defs>
          <polygon points={hex} stroke="#000" strokeOpacity="0.3" strokeWidth="7.4" />
          <polygon points={hex} stroke={`url(#${a})`} strokeWidth="5.4" />
          <polygon points={hexPoints(R + 2).map((p) => p.join(',')).join(' ')} stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" />
          <polygon points={inner} stroke="#22d3ee" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="6 3" />
          <polygon className="fx-anim fx-dash" points={hex} stroke="#67e8f9" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="38 271" />
          {/* ear modules */}
          {[-1, 1].map((s) => (
            <g key={s} transform={`translate(${CX + s * 45} ${CY})`}>
              <rect x="-6" y="-13" width="12" height="26" rx="4" fill={`url(#${b})`} stroke="#0f172a" strokeWidth="1.3" />
              <rect x="-2.2" y="-8" width="4.4" height="16" rx="2" fill="#22d3ee" />
              <rect x="-0.8" y="-8" width="1.6" height="16" rx="0.8" fill="#ecfeff" />
            </g>
          ))}
          {/* circuit nodes on the vertices */}
          {hexPoints(R + 4).map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="2.2" fill="#cffafe" stroke="#0e7490" strokeWidth="0.9" />
          ))}
        </g>
      );
    }

    // Tricorn hat, red bandana and a gold hoop earring.
    case 'pirate':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#5b2a6e'], [1, '#2e1442']]} />
          </defs>
          <path d="M72 28 C84 30 90 40 87 52 C84 46 80 40 76 38 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
          <path d="M8 30 C4 18 12 12 22 12 C28 -6 40 -12 50 -12 C60 -12 72 -6 78 12 C88 12 96 18 92 30 C70 20 30 20 8 30 Z" fill={`url(#${a})`} stroke="#1e1030" strokeWidth="1.4" />
          <path d="M8 30 C30 20 70 20 92 30" fill="none" stroke="#fbbf24" strokeWidth="2.6" />
          <path d="M10 36 Q50 26 90 36 L90 42 Q50 32 10 42 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
          <circle cx="50" cy="3" r="6.2" fill="#fde68a" stroke="#b45309" strokeWidth="1.1" />
          <circle cx="47.5" cy="2.5" r="1.5" fill="#3b1f4d" />
          <circle cx="52.5" cy="2.5" r="1.5" fill="#3b1f4d" />
          <rect x="47.8" y="6.5" width="4.4" height="3.4" rx="1" fill="#fde68a" stroke="#b45309" strokeWidth="0.8" />
          <g className="fx-anim fx-sway">
            <circle cx="8" cy="68" r="5" fill="none" stroke="#b45309" strokeWidth="3.4" />
            <circle cx="8" cy="68" r="5" fill="none" stroke="#fbbf24" strokeWidth="1.8" />
          </g>
        </g>
      );

    // Eyes on the hood, one slow blink.
    case 'frog':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} stops={[[0, '#bbf7d0'], [0.5, '#4ade80'], [1, '#16a34a']]} />
          </defs>
          <Ring fill={a} w={5} />
          {[26, 74].map((x) => (
            <g key={x} transform={`translate(${x} 6)`}>
              <circle r="13" fill="#4ade80" stroke="#15803d" strokeWidth="1.4" />
              <circle r="9.4" fill="#fff" stroke="#15803d" strokeWidth="1" />
              <g className="fx-anim fx-blink">
                <circle cx="1" cy="1" r="5.4" fill="#0f172a" />
                <circle cx="-0.8" cy="-1" r="1.8" fill="#fff" />
              </g>
            </g>
          ))}
        </g>
      );

    // Glass helmet with ear pieces.
    case 'astronaut':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} stops={[[0, '#f8fafc'], [0.5, '#bae6fd'], [1, '#60a5fa']]} />
          </defs>
          <circle cx={CX} cy={CY} r={R - 3} fill="#38bdf8" fillOpacity="0.14" />
          <Ring fill={a} w={6} />
          <path d={`M${CX - 30} ${CY - 26} A38 38 0 0 1 ${CX - 8} ${CY - 38}`} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="3.2" />
          <circle cx={CX - 36} cy={CY - 16} r="1.8" fill="#fff" fillOpacity="0.85" />
          {[-1, 1].map((s) => (
            <rect key={s} x={CX + s * 47 - 5} y={CY - 13} width="10" height="26" rx="4.5" fill="#38bdf8" stroke="#0369a1" strokeWidth="1.3" />
          ))}
          <path d={`M${CX - 20} ${CY + 46} Q${CX} ${CY + 52} ${CX + 20} ${CY + 46}`} fill="none" stroke="#475569" strokeWidth="3.4" />
        </g>
      );

    // Pointed hat that bends over, with a gold star.
    case 'wizard': {
      const star = starPath(52, 4, 7.5, 3.3);
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#8b5cf6'], [1, '#4c1d95']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#c4b5fd'], [1, '#8b5cf6']]} />
          </defs>
          <path d="M24 22 C32 6 38 -14 54 -28 C60 -22 68 -22 78 -26 C72 -14 70 6 76 22 Z" fill={`url(#${a})`} stroke="#2e1065" strokeWidth="1.4" />
          <path d="M24 22 Q50 30 76 22 L75.5 13 Q50 21 24.5 13 Z" fill={`url(#${b})`} stroke="#2e1065" strokeWidth="1.1" />
          <path d="M3 25 C3 12 98 12 98 25 C98 35 3 35 3 25 Z" fill={`url(#${a})`} stroke="#2e1065" strokeWidth="1.4" />
          <path d="M3 25 C3 12 98 12 98 25 C80 20 20 20 3 25 Z" fill="#fff" fillOpacity="0.18" />
          <path className="fx-anim fx-breathe" d={star} fill="#fde047" stroke="#b45309" strokeWidth="1" />
        </g>
      );
    }

    // Dark headband with a metal plate and fluttering tails.
    case 'ninja':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#4c3a6b'], [1, '#1e1b3a']]} />
            <Grad id={b} stops={[[0, '#f1f5f9'], [1, '#94a3b8']]} />
          </defs>
          <g transform="translate(0 -5)">
          <g className="fx-anim fx-sway">
            <path d="M88 42 C98 36 108 38 114 32 C112 42 108 46 114 54 C104 52 98 52 90 50 Z" fill={`url(#${a})`} stroke="#0f0a1f" strokeWidth="1.3" />
            <path d="M90 46 C98 52 104 62 100 72 C96 66 92 62 88 56 Z" fill={`url(#${a})`} stroke="#0f0a1f" strokeWidth="1.3" />
          </g>
          <path d="M6 40 Q50 20 94 40 L94 53 Q50 33 6 53 Z" fill={`url(#${a})`} stroke="#0f0a1f" strokeWidth="1.4" />
          <path d="M8 43 Q50 24 92 43" fill="none" stroke="#fff" strokeOpacity="0.18" strokeWidth="1.2" />
          <rect x="35" y="26" width="30" height="14" rx="3" transform="rotate(-2 50 33)" fill={`url(#${b})`} stroke="#334155" strokeWidth="1.2" />
          <path d="M44 36 L50 28 L56 36 M44 32 L56 32" transform="rotate(-2 50 33)" fill="none" stroke="#334155" strokeWidth="1.5" />
          </g>
        </g>
      );

    // A spotted toadstool cap.
    case 'mushroom':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#f87171'], [1, '#b91c1c']]} />
          </defs>
          <path d="M2 36 C-4 6 24 -18 50 -18 C76 -18 104 6 98 36 C84 30 16 30 2 36 Z" fill={`url(#${a})`} stroke="#7f1d1d" strokeWidth="1.5" />
          <path d="M2 36 C16 30 84 30 98 36 C96 42 80 38 50 38 C20 38 4 42 2 36 Z" fill="#fde7c7" stroke="#a16207" strokeWidth="1.2" />
          <path d="M10 14 C16 2 28 -6 38 -10" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="2.4" strokeLinecap="round" />
          {[
            [26, 10, 7],
            [52, -3, 8.5],
            [76, 14, 6.5],
            [40, 24, 4.2],
            [66, 24, 4.4],
          ].map(([x, y, r], i) => (
            <circle key={i} className={i === 1 ? 'fx-anim fx-breathe' : undefined} cx={x} cy={y} r={r} fill="#fff7ed" stroke="#fdba74" strokeWidth="1" />
          ))}
        </g>
      );

    case 'angel':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fffbeb'], [0.5, '#fde68a'], [1, '#f59e0b']]} />
          </defs>
          <Ring fill={a} />
          <g transform="rotate(-6 50 -8)" fill="none">
            <ellipse cx={CX} cy="-9" rx="20" ry="6" stroke="#b45309" strokeWidth="5.2" />
            <ellipse cx={CX} cy="-9" rx="20" ry="6" stroke={`url(#${a})`} strokeWidth="3.2" />
            <ellipse cx={CX} cy="-9.7" rx="20" ry="6" stroke="#fff" strokeOpacity="0.7" strokeWidth="0.8" />
          </g>
        </g>
      );

    case 'devil':
      return (
        <g>
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#7f1d1d'], [0.6, '#dc2626'], [1, '#f87171']]} />
          </defs>
          <Ring fill={a} />
          <g className="fx-anim fx-sway" strokeLinecap="round" strokeLinejoin="round">
            <path d="M80 90 C96 86 108 94 102 106" fill="none" stroke="#7f1d1d" strokeWidth="5" />
            <path d="M80 90 C96 86 108 94 102 106" fill="none" stroke="#ef4444" strokeWidth="2.6" />
            <path d="M95.5 103.5 L108.5 106 L100 116 Z" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
          </g>
        </g>
      );
  }
}
