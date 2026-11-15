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

/** The slim ring every frame shares: soft shadow (or a solid cartoon outline with `edge`), gradient body, rim light. */
function Ring({ fill, w = 4, r = R, edge }: { fill: string; w?: number; r?: number; edge?: string }) {
  return (
    <g fill="none">
      <circle cx={CX} cy={CY} r={r} stroke={edge ?? '#000'} strokeOpacity={edge ? 1 : 0.25} strokeWidth={w + (edge ? 2.8 : 2)} />
      <circle cx={CX} cy={CY} r={r} stroke={`url(#${fill})`} strokeWidth={w} />
      <circle cx={CX} cy={CY} r={r - w * 0.22} stroke="#fff" strokeOpacity="0.55" strokeWidth="0.8" />
    </g>
  );
}

/** Rocks a child back and forth about the origin of its own coordinate space. */
function Wobble({ amp, dur, begin = 0, children }: { amp: number; dur: number; begin?: number; children: React.ReactNode }) {
  return (
    <g>
      {!reduceMotion && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          values={`${-amp} 0 0;${amp} 0 0;${-amp} 0 0`}
          keyTimes="0;0.5;1"
          calcMode="spline"
          keySplines=".45 0 .55 1;.45 0 .55 1"
          dur={`${dur}s`}
          begin={`${begin}s`}
          repeatCount="indefinite"
        />
      )}
      {children}
    </g>
  );
}

/** Point on a circle around the head, `deg` clockwise from the top. */
const polar = (r: number, deg: number): [number, number] => [CX + r * Math.sin((deg * Math.PI) / 180), CY - r * Math.cos((deg * Math.PI) / 180)];
/** A clockwise arc around the head from `a1` to `a2` degrees. */
const arc = (r: number, a1: number, a2: number) => {
  const [x1, y1] = polar(r, a1);
  const [x2, y2] = polar(r, a2);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

/** Triangular teeth pointing inward around the head. */
const SHARK_TEETH = Array.from({ length: 22 }, (_, i) => {
  const mid = (i / 22) * Math.PI * 2;
  const half = (Math.PI / 22) * 0.8;
  const pt = (r: number, a: number) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
  return `M${pt(43.5, mid - half)} L${pt(35.8, mid)} L${pt(43.5, mid + half)} Z`;
});

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

// Inferno: swirling flame wisps, designed on a 120x120 board centred on (60, 60) and fitted to the head.
const INFERNO_TRANSFORM = 'translate(-19 -15) scale(1.15)';
const OUTER_HEIGHTS = [7.2, 5.1, 8.4, 6.0, 7.8, 4.8, 8.1, 5.6, 7.5, 6.3, 8.6, 5.3];
const INNER_HEIGHTS = [4.8, 6.2, 4.1, 5.7, 6.5, 4.4, 5.9, 5.0, 6.4, 4.3, 5.5, 6.0];
const SWEEP_BIAS = [0.16, 0.21, 0.14, 0.19, 0.23, 0.15, 0.2, 0.17, 0.22, 0.13, 0.18, 0.21];

/** One flame tongue rooted on the circle at `angle`, its tip swept sideways by `sweep` radians. */
function flameWisp(angle: number, rBase: number, height: number, half: number, sweep: number) {
  const pt = (r: number, a: number) => `${(60 + r * Math.cos(a)).toFixed(2)} ${(60 + r * Math.sin(a)).toFixed(2)}`;
  return (
    `M ${pt(rBase, angle - half)} ` +
    `Q ${pt(rBase + height * 0.58, angle - half * 0.15 + sweep * 0.45)} ${pt(rBase + height, angle + sweep)} ` +
    `Q ${pt(rBase + height * 0.44, angle + half * 0.35 + sweep * 0.72)} ${pt(rBase, angle + half)} Z`
  );
}

const INFERNO_OUTER = Array.from({ length: 44 }, (_, i) => {
  const step = (Math.PI * 2) / 44;
  return flameWisp(i * step - Math.PI / 2, 42.1, OUTER_HEIGHTS[i % 12], step * 0.72, SWEEP_BIAS[i % 12]);
});
const INFERNO_INNER = Array.from({ length: 36 }, (_, i) => {
  const step = (Math.PI * 2) / 36;
  return flameWisp(i * step - Math.PI / 2 + step * 0.45, 42, INNER_HEIGHTS[i % 12], step * 0.68, SWEEP_BIAS[(i + 3) % 12] * 0.9);
});
const INFERNO_EMBERS = Array.from({ length: 26 }, (_, i) => {
  const angle = i * ((Math.PI * 2) / 26) + (i % 3) * 0.06;
  const radius = 49.4 + (i % 4) * 1.15;
  return {
    x: +(60 + radius * Math.cos(angle)).toFixed(2),
    y: +(60 + radius * Math.sin(angle)).toFixed(2),
    rx: i % 2 === 0 ? 1.15 : 0.85,
    rot: +((angle * 180) / Math.PI + 98).toFixed(1),
    opacity: i % 3 === 0 ? 0.9 : 0.65,
  };
});

/** Overlapping scales around a ring: two rows, each scale a small U opening outward. */
const DRAGON_SCALES = [0, 1].flatMap((row) =>
  Array.from({ length: 30 }, (_, i) => {
    const deg = (i + row * 0.5) * (360 / 30);
    const [x, y] = polar(row ? 50.6 : 45.4, deg);
    return `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(1)})`;
  }),
);

/** Where the rivets sit on a helmet's ring (the top is hidden by the brow band). */
const RIVET_ANGLES = [72, 92, 112, 132, 152, 172, 192, 212, 232, 252, 272, 288];

/** The part drawn behind the head. */
export function FrameBack({ frame }: { frame: FrameId }) {
  const { a, b, c, clip, glow } = useIds();

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

    // A shark: dorsal fin on top and a swept fin on each side.
    case 'shark':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#9fb3c6'], [1, '#5f7a92']]} />
          </defs>
          {[0, 1].map((m) => (
            <path key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined} d="M10 60 C0 70 -10 86 -15 100 C-2 98 12 93 22 86 Z" fill={`url(#${a})`} stroke="#334e63" strokeWidth="1.5" />
          ))}
          <g className="fx-anim fx-fin">
            <path d="M66 10 C62 -4 50 -18 33 -26 C39 -12 35 -2 31 12 Z" fill={`url(#${a})`} stroke="#334e63" strokeWidth="1.5" />
            <path d="M58 6 C55 -4 48 -12 40 -17" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        </g>
      );

    // Red-and-gold shoulder guards.
    case 'samurai':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#ef4444'], [1, '#991b1b']]} />
          </defs>
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
              <g transform="rotate(-10 6 82)">
                {[56, 68, 80, 92].map((y, i) => {
                  const l = -6 - i * 2.4;
                  const r = 20 + i * 0.8;
                  return (
                    <g key={y}>
                      <path d={`M${l} ${y} L${r} ${y} L${r - 1} ${y + 12} Q${(l + r) / 2} ${y + 17} ${l - 1.6} ${y + 12} Z`} fill={`url(#${a})`} stroke="#4c0f1c" strokeWidth="1.4" />
                      <path d={`M${l - 1.4} ${y + 10.4} Q${(l + r) / 2} ${y + 15.4} ${r - 0.9} ${y + 10.4} L${r - 1} ${y + 12} Q${(l + r) / 2} ${y + 17} ${l - 1.6} ${y + 12} Z`} fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />
                    </g>
                  );
                })}
              </g>
            </g>
          ))}
        </g>
      );

    // Feathery gills on both sides and a curling tail.
    case 'axolotl':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={1} y2={1} stops={[[0, '#f0abfc'], [1, '#c026d3']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fce7f3'], [1, '#f9a8d4']]} />
          </defs>
          <path d="M44 96 C52 114 82 116 98 106 C108 99 107 88 98 87 C102 95 92 102 80 99 C68 96 62 92 58 86 Z" fill={`url(#${b})`} stroke="#b02a8a" strokeWidth="1.4" />
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
              {[-58, -90, -122].map((rot, gi) => (
                <g key={rot} transform={`translate(9 ${40 + gi * 13}) rotate(${rot})`}>
                  <Wobble amp={4} dur={3.2} begin={gi * 0.4}>
                    <path d="M0 0 L0 -29" stroke="#a21caf" strokeWidth="1.8" />
                    {[0.2, 0.4, 0.6, 0.8].map((t, li) =>
                      [-1, 1].map((sd) => (
                        <ellipse key={`${li}${sd}`} transform={`translate(0 ${-29 * t}) rotate(${sd * 58})`} cx="0" cy="-6" rx={4.1 - li * 0.3} ry={8 - li * 1} fill={`url(#${a})`} stroke="#a21caf" strokeWidth="1.1" />
                      )),
                    )}
                    <ellipse cx="0" cy="-30" rx="3.2" ry="5.4" fill={`url(#${a})`} stroke="#a21caf" strokeWidth="1.1" />
                  </Wobble>
                </g>
              ))}
            </g>
          ))}
        </g>
      );

    // The red cape behind the ermine collar.
    case 'king':
      return (
        <g fill="none" strokeLinecap="round">
          <path d={arc(R + 3, 104, 256)} stroke="#7f1d1d" strokeWidth="20" />
          <path d={arc(R + 3, 104, 256)} stroke="#dc2626" strokeWidth="17" />
          <path d={arc(R + 8, 112, 248)} stroke="#f87171" strokeOpacity="0.55" strokeWidth="1.6" />
        </g>
      );

    // Bat wings and golden horns around a scaled ring.
    case 'dragon':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#c62828'], [1, '#7f1d1d']]} />
            <Grad id={b} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#b45309'], [0.5, '#f59e0b'], [1, '#fde68a']]} />
          </defs>
          {[0, 1].map((m) => (
            <g key={m} className={`fx-anim ${m ? 'fx-flap-r' : 'fx-flap-l'}`}>
              <g transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
                <path d="M16 52 C2 34 -8 16 -19 2 C-19 18 -20 34 -19 48 Q-14 49 -11 58 Q-8 62 -6 72 Q0 72 3 80 Q10 80 13 74 Z" fill={`url(#${a})`} stroke="#450a0a" strokeWidth="1.4" />
                <path d="M16 52 L-19 2 M16 52 L-19 48 M16 52 L-11 58 M16 52 L-6 72" fill="none" stroke="#fca5a5" strokeOpacity="0.45" strokeWidth="1" />
              </g>
            </g>
          ))}
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
              <path d="M33 14 C20 4 21 -12 33 -26 C32 -11 38 -1 48 8 Z" fill={`url(#${b})`} stroke="#78350f" strokeWidth="1.4" />
              <path d="M29 2 C28 -4 29 -10 31 -14" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.3" />
            </g>
          ))}
        </g>
      );

    // A pair of cactus arms.
    case 'cactus':
      return (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {['M9 74 Q-10 74 -10 54', 'M91 62 Q110 62 110 40'].map((d) => (
            <g key={d}>
              <path d={d} stroke="#14532d" strokeWidth="12" />
              <path d={d} stroke="#22c55e" strokeWidth="9" />
              <path d={d} stroke="#4ade80" strokeWidth="3" transform="translate(-1.4 -1.2)" />
            </g>
          ))}
        </g>
      );

    // Steel shoulder plates.
    case 'knight':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#94a3b8'], [1, '#475569']]} />
          </defs>
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
              <path d="M14 64 C-2 60 -16 70 -18 92 C-8 100 4 100 14 93 Z" fill={`url(#${a})`} stroke="#1e293b" strokeWidth="1.5" />
              <path d="M-12 80 Q0 85 13 80" fill="none" stroke="#e2e8f0" strokeOpacity="0.5" strokeWidth="1.2" />
            </g>
          ))}
        </g>
      );

    // A fox's ears and its big tail curling round the bottom.
    case 'fox':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#ef4444'], [1, '#b91c1c']]} />
            <clipPath id={clip}>
              <path d="M26 74 C4 76 -18 92 -8 106 C2 115 40 115 74 111 C96 108 108 100 113 91 C96 98 84 98 70 94 C50 90 36 84 32 74 Z" />
            </clipPath>
          </defs>
          <path d="M26 74 C4 76 -18 92 -8 106 C2 115 40 115 74 111 C96 108 108 100 113 91 C96 98 84 98 70 94 C50 90 36 84 32 74 Z" fill={`url(#${a})`} stroke="#7f1d1d" strokeWidth="1.5" />
          <g clipPath={`url(#${clip})`}>
            <path d="M74 86 C84 98 78 106 72 118 L118 118 L118 86 Z" fill="#fff7ed" />
            <path d="M-4 96 C0 106 20 110 50 108" fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
          </g>
          <path d="M26 74 C4 76 -18 92 -8 106 C2 115 40 115 74 111 C96 108 108 100 113 91 C96 98 84 98 70 94 C50 90 36 84 32 74 Z" fill="none" stroke="#7f1d1d" strokeWidth="1.5" />
          {[-1, 1].map((side) => (
            <OnRing key={side} angle={side * 34}>
              <g className={side > 0 ? 'fx-anim fx-twitch' : undefined}>
                <path d="M-12 5 C-13 -12 -9 -26 -3 -35 C5 -25 12 -12 13 5 Z" fill={`url(#${a})`} stroke="#7f1d1d" strokeWidth="1.5" />
                <path d="M-6.5 3 C-7 -9 -5 -19 -2.5 -26 C1 -18 6.5 -9 6.5 3 Z" fill="#fff7ed" stroke="#fecaca" strokeWidth="0.8" />
              </g>
            </OnRing>
          ))}
        </g>
      );

    // Curved horns on a steel helmet.
    case 'viking':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#a8a07f'], [0.5, '#f5efd0'], [1, '#fffbeb']]} />
          </defs>
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
              <path d="M24 38 C4 36 -10 18 -10 -14 C-2 6 10 16 28 24 Z" fill={`url(#${a})`} stroke="#57534e" strokeWidth="1.4" />
              <path d="M-4 0 C0 8 6 14 14 19" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M15 40 L28 24 L33 29 L22 43 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.2" />
            </g>
          ))}
        </g>
      );

    // Striped royal headcloth hanging down both sides.
    case 'pharaoh':
      return (
        <g strokeLinejoin="round">
          <defs>
            <clipPath id={clip}>
              <path d="M22 28 L6 32 L-16 104 L14 108 L22 98 Z" />
            </clipPath>
          </defs>
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined}>
              <path d="M22 28 L6 32 L-16 104 L14 108 L22 98 Z" fill="#1e40af" />
              <g clipPath={`url(#${clip})`}>
                {Array.from({ length: 8 }, (_, i) => (
                  <rect key={i} x="-20" y={36 + i * 10} width="50" height="5" fill="#fbbf24" />
                ))}
              </g>
              <path d="M22 28 L6 32 L-16 104 L14 108 L22 98 Z" fill="none" stroke="#92400e" strokeWidth="1.5" />
            </g>
          ))}
        </g>
      );

    case 'pirate':
    case 'painter':
    case 'astronaut':
    case 'wizard':
    case 'ninja':
    case 'mushroom':
      return null;

    // Swirling fire: an orange heat haze, outer flame wisps with embers turning one way, golden licks the other.
    case 'fire':
      return (
        <g transform={INFERNO_TRANSFORM}>
          <defs>
            <radialGradient id={c} cx="60" cy="60" r="58" gradientUnits="userSpaceOnUse">
              <stop offset="0.68" stopColor="#f97316" stopOpacity="0.7" />
              <stop offset="0.86" stopColor="#ea580c" stopOpacity="0.28" />
              <stop offset="1" stopColor="#ea580c" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={a} cx="60" cy="60" r="51.5" gradientUnits="userSpaceOnUse">
              <stop offset="0.81" stopColor="#fef08a" />
              <stop offset="0.87" stopColor="#f97316" />
              <stop offset="0.95" stopColor="#ea580c" />
              <stop offset="1" stopColor="#c2410c" stopOpacity="0.85" />
            </radialGradient>
            <radialGradient id={b} cx="60" cy="60" r="49" gradientUnits="userSpaceOnUse">
              <stop offset="0.84" stopColor="#fef9c3" />
              <stop offset="0.91" stopColor="#fde047" />
              <stop offset="1" stopColor="#fb923c" />
            </radialGradient>
            <filter id={glow} x="-25%" y="-25%" width="150%" height="150%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="soft" />
              <feMerge>
                <feMergeNode in="soft" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle className="fx-anim fx-inferno-glow" cx="60" cy="60" r="58" fill={`url(#${c})`} />
          <g filter={`url(#${glow})`}>
            <g className="fx-anim fx-inferno-cw">
              {INFERNO_OUTER.map((d, i) => (
                <path key={i} d={d} fill={`url(#${a})`} />
              ))}
              {INFERNO_EMBERS.map((e, i) => (
                <ellipse key={i} cx={e.x} cy={e.y} rx={e.rx} ry="0.55" transform={`rotate(${e.rot} ${e.x} ${e.y})`} fill="#fdba74" opacity={e.opacity} />
              ))}
            </g>
          </g>
          <g className="fx-anim fx-inferno-ccw">
            {INFERNO_INNER.map((d, i) => (
              <path key={i} d={d} fill={`url(#${b})`} />
            ))}
          </g>
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
  const { a, b, c, clip, glow } = useIds();

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

    // White-hot rim, copper band, gold accent and a dark slate bevel around the face.
    case 'fire':
      return (
        <g transform={INFERNO_TRANSFORM} fill="none">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#f97316'], [0.45, '#d95b16'], [1, '#7c2d12']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#3b3659'], [0.5, '#26223b'], [1, '#191629']]} />
            <filter id={glow} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="rim" />
              <feMerge>
                <feMergeNode in="rim" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx="60" cy="60" r="42.5" stroke="#fef9c3" strokeWidth="1.6" filter={`url(#${glow})`} />
          <circle cx="60" cy="60" r="40.3" stroke={`url(#${a})`} strokeWidth="3.8" />
          <circle cx="60" cy="60" r="38.1" stroke="#fbbf24" strokeWidth="1.05" opacity="0.95" />
          <circle cx="60" cy="60" r="36" stroke={`url(#${b})`} strokeWidth="3.2" />
          <circle cx="60" cy="60" r="33.7" stroke="#130f26" strokeWidth="1.7" />
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

    // Gold frame with a red beret, a paintbrush and a palette.
    case 'painter':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} stops={[[0, '#fde68a'], [0.45, '#f59e0b'], [1, '#b45309']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#ef4444'], [1, '#991b1b']]} />
          </defs>
          <Ring fill={a} w={6} edge="#6b3a0a" />
          {/* palette */}
          <path d="M-8 86 C-12 98 -4 111 12 111 C26 111 31 101 25 95 C21 91 15 94 14 88 C12 80 -2 78 -8 86 Z" fill="#fcd9a6" stroke="#6b4423" strokeWidth="1.5" />
          <ellipse cx="17" cy="103" rx="2.6" ry="2" fill="#6b4423" />
          {[
            [-3, 93, '#ef4444'],
            [3, 85.5, '#facc15'],
            [10, 96.5, '#22c55e'],
            [-1, 103, '#3b82f6'],
          ].map(([x, y, f]) => (
            <circle key={x} cx={x} cy={y} r="3.4" fill={f as string} stroke="#00000040" strokeWidth="0.8" />
          ))}
          {/* brush */}
          <g transform="translate(106 50) rotate(7)">
            <Wobble amp={3.5} dur={3.4}>
              <path d="M-4 -23 L4 -23 L2.4 50 L-2.4 50 Z" fill="#fbbf24" stroke="#92400e" strokeWidth="1.3" />
              <path d="M-2 -20 L-0.8 46" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2" />
              <rect x="-5" y="-33" width="10" height="11" rx="2" fill="#cbd5e1" stroke="#475569" strokeWidth="1.2" />
              <path d="M-5 -29 H5 M-5 -25.5 H5" stroke="#64748b" strokeWidth="0.9" />
              <path d="M-5 -33 C-6 -41 -2 -48 1 -52 C4 -47 6 -40 5 -33 Z" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1.3" />
              <path d="M-2.2 -37 C-2 -42 -0.5 -46 0.5 -48" fill="none" stroke="#bfdbfe" strokeWidth="1.2" />
            </Wobble>
          </g>
          {/* beret */}
          <g transform="rotate(-8 40 10)">
            <path d="M8 22 C2 4 24 -10 46 -9 C66 -8 74 8 66 22 C50 29 24 29 8 22 Z" fill={`url(#${b})`} stroke="#7f1d1d" strokeWidth="1.6" />
            <path d="M8 22 C24 29 50 29 66 22 C62 18 52 16 40 16 C26 16 14 18 8 22 Z" fill="#7f1d1d" fillOpacity="0.28" />
            <path d="M14 8 C20 -1 32 -6 42 -7" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2.2" />
            <path d="M18 -3 L14 -11 L22 -9 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth="1.3" />
          </g>
        </g>
      );

    // The shark's body with a ring of teeth.
    case 'shark':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} stops={[[0, '#b6c7d6'], [0.5, '#7b93a8'], [1, '#556f86']]} />
          </defs>
          <Ring fill={a} w={13} r={48} edge="#334e63" />
          <circle cx={CX} cy={CY} r="42.6" fill="none" stroke="#e2e8f0" strokeWidth="1.6" />
          {SHARK_TEETH.map((d, i) => (
            <path key={i} d={d} fill="#fff" stroke="#64748b" strokeWidth="1" />
          ))}
          <path d={arc(52, 300, 352)} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.8" strokeLinecap="round" />
        </g>
      );

    // Crimson ring, kabuto helmet and a golden crescent crest.
    case 'samurai':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} stops={[[0, '#f43f5e'], [0.5, '#be123c'], [1, '#7f1d1d']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#ef4444'], [1, '#991b1b']]} />
            <Grad id={c} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fef3c7'], [0.5, '#fbbf24'], [1, '#d97706']]} />
          </defs>
          <Ring fill={a} w={7} edge="#3f0d14" />
          <circle cx={CX} cy={CY} r="43.6" fill="none" stroke="#fbbf24" strokeWidth="1.3" />
          {/* crest */}
          {[0, 1].map((m) => (
            <path key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined} d="M45 -2 C38 -12 24 -20 8 -19 C18 -13 26 -5 34 6 Z" fill={`url(#${c})`} stroke="#92400e" strokeWidth="1.3" />
          ))}
          {/* helmet */}
          <path d="M12 28 C14 8 32 -6 50 -6 C68 -6 86 8 88 28 C70 18 30 18 12 28 Z" fill={`url(#${b})`} stroke="#4c0f1c" strokeWidth="1.5" />
          <path d="M10 31 Q50 12 90 31 L90.6 37 Q50 18 9.4 37 Z" fill={`url(#${c})`} stroke="#92400e" strokeWidth="1.2" />
          <path d="M22 10 C28 2 38 -2 46 -3" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
          <path d="M34 28 L40 8 M50 22 L50 2 M66 28 L60 8" stroke="#7f1d1d" strokeOpacity="0.55" strokeWidth="1.1" fill="none" />
          <path d="M42 -12 A9 9 0 1 0 58 -12 A6.6 6.6 0 1 1 42 -12 Z" transform="translate(0 -4)" fill={`url(#${c})`} stroke="#92400e" strokeWidth="1.3" />
          <path className="fx-anim fx-twinkle" d="M50 -4 Q50.6 -0.6 54 0 Q50.6 0.6 50 4 Q49.4 0.6 46 0 Q49.4 -0.6 50 -4 Z" transform="translate(0 -7)" fill="#fff" />
        </g>
      );

    // A soft pink body ring with a pale lilac inner line.
    case 'axolotl':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#fff1f8'], [0.5, '#fbcfe8'], [1, '#f472b6']]} />
          </defs>
          <Ring fill={a} w={7} edge="#b02a8a" />
          <circle cx={CX} cy={CY} r="43.6" fill="none" stroke="#c4b5fd" strokeWidth="1.5" />
        </g>
      );

    // Gold ring, ermine collar and a jewelled crown.
    case 'king': {
      const tips: [number, number][] = [[23, -5], [36.5, -13], [50, -22], [63.5, -13], [77, -5]];
      const vals = [30, 43, 57, 70];
      const crown = `M22 15 L${tips[0].join(' ')} L${vals[0]} 1 L${tips[1].join(' ')} L${vals[1]} 1 L${tips[2].join(' ')} L${vals[2]} 1 L${tips[3].join(' ')} L${vals[3]} 1 L${tips[4].join(' ')} L78 15 Q50 22 22 15 Z`;
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} stops={[[0, '#fef3c7'], [0.45, '#fbbf24'], [1, '#b45309']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fde68a'], [1, '#f59e0b']]} />
          </defs>
          <Ring fill={a} w={6} edge="#6b3a0a" />
          {/* ermine collar */}
          <path d={arc(R + 1.6, 118, 242)} fill="none" stroke="#6b7280" strokeWidth="12.4" />
          <path d={arc(R + 1.6, 118, 242)} fill="none" stroke="#f8fafc" strokeWidth="9.6" />
          {[134, 157, 180, 203, 226].map((deg) => {
            const [x, y] = polar(R + 1.6, deg);
            return <path key={deg} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg})`} d="M0 -3.2 C2.2 -1 1.5 2 0 4.6 C-1.5 2 -2.2 -1 0 -3.2 Z" fill="#1f2937" />;
          })}
          {/* crown */}
          <path d={crown} fill={`url(#${b})`} stroke="#92400e" strokeWidth="1.4" />
          <path d="M50 -22 L57 1 L63.5 -13 L70 1 L77 -5 L78 15 Q64 19 50 19 Z" fill="#b45309" fillOpacity="0.18" />
          <path d="M22 15 Q50 22 78 15 L78 9 Q50 16 22 9 Z" fill="#d97706" stroke="#92400e" strokeWidth="1.1" />
          {tips.map(([x, y]) => (
            <circle key={x} cx={x} cy={y - 1} r="3" fill="#fff7ed" stroke="#92400e" strokeWidth="1" />
          ))}
          {[
            [50, '#ef4444', '#7f1d1d'],
            [35, '#3b82f6', '#1e3a8a'],
            [65, '#3b82f6', '#1e3a8a'],
          ].map(([x, f, st]) => (
            <path key={x} d={`M${x} 6 L${(x as number) + 4} 11 L${x} 16 L${(x as number) - 4} 11 Z`} fill={f as string} stroke={st as string} strokeWidth="1" />
          ))}
          <path className="fx-anim fx-twinkle" d="M50 4 Q50.6 8.4 55 9 Q50.6 9.6 50 14 Q49.4 9.6 45 9 Q49.4 8.4 50 4 Z" fill="#fff" />
        </g>
      );
    }

    // A scaled ring with fangs on the inner rim.
    case 'dragon':
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} stops={[[0, '#f05252'], [0.5, '#b91c1c'], [1, '#7f1d1d']]} />
          </defs>
          <Ring fill={a} w={11} r={48} edge="#450a0a" />
          <g fill="none" stroke="#450a0a" strokeOpacity="0.5" strokeWidth="0.9" strokeLinecap="round">
            {DRAGON_SCALES.map((tf) => (
              <path key={tf} transform={tf} d="M-2.8 -1.4 A2.8 2.8 0 0 0 2.8 -1.4" />
            ))}
          </g>
          {[38, 142, 218, 322].map((deg) => {
            const [x, y] = polar(42.6, deg);
            return <path key={deg} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg})`} d="M-2.6 -0.6 L2.6 -0.6 L0 5.2 Z" fill="#fef3c7" stroke="#92400e" strokeWidth="0.9" />;
          })}
        </g>
      );

    // A ribbed green ring with spines and a pink flower on top.
    case 'cactus':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} stops={[[0, '#bbf7d0'], [0.45, '#4ade80'], [1, '#15803d']]} />
            <Grad id={b} x1={0} y1={1} x2={0} y2={0} stops={[[0, '#ec4899'], [1, '#fbcfe8']]} />
            <clipPath id={clip}>
              <path clipRule="evenodd" d={`M${CX - 53.5} ${CY} a53.5 53.5 0 1 0 107 0 a53.5 53.5 0 1 0 -107 0 Z M${CX - 42.5} ${CY} a42.5 42.5 0 1 1 85 0 a42.5 42.5 0 1 1 -85 0 Z`} />
            </clipPath>
          </defs>
          <Ring fill={a} w={11} r={48} edge="#14532d" />
          <g clipPath={`url(#${clip})`} fill="none" stroke="#14532d" strokeOpacity="0.5" strokeWidth="1">
            {[9, 21, 33, 44].map((rx) => (
              <ellipse key={rx} cx={CX} cy={CY} rx={rx} ry="62" />
            ))}
          </g>
          {Array.from({ length: 12 }, (_, i) => {
            const [x, y] = polar(48, 15 + i * 30);
            return <path key={i} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)})`} d="M-1.7 -1.7 L1.7 1.7 M1.7 -1.7 L-1.7 1.7" stroke="#fefce8" strokeWidth="0.9" />;
          })}
          <g transform="translate(50 5)">
            <Wobble amp={3} dur={3.6}>
              {[-66, 66, -33, 33, 0].map((rot) => (
                <path key={rot} transform={`rotate(${rot})`} d="M0 0 C-5.4 -5 -5.4 -13 0 -20 C5.4 -13 5.4 -5 0 0 Z" fill={`url(#${b})`} stroke="#9d174d" strokeWidth="1.2" />
              ))}
              <path d="M0 -2 L0 -13" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.2" />
            </Wobble>
          </g>
        </g>
      );

    // Steel helmet with a gold crown, plus golden scrolls on the shoulders.
    case 'knight': {
      const rivets = [0.08, 0.24, 0.4, 0.5, 0.6, 0.76, 0.92].map((t) => [8 + 84 * t, 36 - 40 * t * (1 - t) - 0.4]);
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#94a3b8'], [1, '#475569']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fef3c7'], [0.5, '#fbbf24'], [1, '#d97706']]} />
          </defs>
          <Ring fill={a} w={8} edge="#1e293b" />
          {/* scrolls */}
          {[0, 1].map((m) => (
            <g key={m} transform={m ? 'translate(100 0) scale(-1 1)' : undefined} fill="none">
              {['#92400e', '#fbbf24'].map((c, i) => (
                <path key={c} d="M12 88 C2 98 -10 100 -15 94 C-18 89 -12 84 -9 87 C-7 90 -11 93 -12 91" stroke={c} strokeWidth={i ? 3 : 5.4} />
              ))}
            </g>
          ))}
          {/* helmet */}
          <path d="M10 32 C10 8 28 -5 50 -5 C72 -5 90 8 90 32 C70 24 30 24 10 32 Z" fill={`url(#${a})`} stroke="#1e293b" strokeWidth="1.5" />
          <path d="M18 14 C24 4 34 -1 44 -2" fill="none" stroke="#fff" strokeOpacity="0.4" strokeWidth="2.2" />
          <path d="M8 35 Q50 15 92 35 L93 43 Q50 23 7 43 Z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.4" />
          {rivets.map(([x, y]) => (
            <circle key={x} cx={x} cy={y + 4} r="1.9" fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />
          ))}
          {/* crown */}
          <path d="M36 -4 L33 -21 L43 -13 L50 -27 L57 -13 L67 -21 L64 -4 Q50 0 36 -4 Z" fill={`url(#${b})`} stroke="#92400e" strokeWidth="1.4" />
          <path d="M50 -17 L53.4 -11 L50 -5 L46.6 -11 Z" fill="#fff7ed" stroke="#92400e" strokeWidth="0.9" />
          <path className="fx-anim fx-twinkle" d="M50 -17 Q50.5 -13.2 54 -12.6 Q50.5 -12 50 -8 Q49.5 -12 46 -12.6 Q49.5 -13.2 50 -17 Z" fill="#fff" />
        </g>
      );
    }

    // A red ring with a white-lined muzzle-free fox look: just the ring, the ears and tail do the work.
    case 'fox':
      return (
        <g>
          <defs>
            <Grad id={a} stops={[[0, '#f87171'], [0.5, '#dc2626'], [1, '#991b1b']]} />
          </defs>
          <Ring fill={a} w={10} r={47.5} edge="#7f1d1d" />
        </g>
      );

    // A dome helmet with a nasal band, brow band and rivets.
    case 'viking': {
      const rivets = [0.06, 0.2, 0.34, 0.66, 0.8, 0.94].map((t) => [8 + 84 * t, 36 - 40 * t * (1 - t)]);
      return (
        <g strokeLinejoin="round">
          <defs>
            <Grad id={a} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#94a3b8'], [1, '#475569']]} />
            <Grad id={b} x1={0} y1={0} x2={1} y2={0} stops={[[0, '#64748b'], [0.5, '#cbd5e1'], [1, '#64748b']]} />
          </defs>
          <Ring fill={a} w={8} edge="#1e293b" />
          {RIVET_ANGLES.map((deg) => {
            const [x, y] = polar(R, deg);
            return <circle key={deg} cx={x} cy={y} r="1.8" fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />;
          })}
          <path d="M10 33 C10 10 28 -4 50 -4 C72 -4 90 10 90 33 C70 25 30 25 10 33 Z" fill={`url(#${a})`} stroke="#1e293b" strokeWidth="1.5" />
          <path d="M43 -4 L57 -4 L57.6 26 L42.4 26 Z" fill={`url(#${b})`} stroke="#1e293b" strokeWidth="1.2" />
          {[2, 10, 18].map((y) => (
            <circle key={y} cx="50" cy={y} r="1.6" fill="#fbbf24" stroke="#92400e" strokeWidth="0.7" />
          ))}
          <path d="M8 36 Q50 16 92 36 L93 44 Q50 24 7 44 Z" fill="#cbd5e1" stroke="#1e293b" strokeWidth="1.4" />
          {rivets.map(([x, y]) => (
            <circle key={x} cx={x} cy={y + 4.4} r="1.9" fill="#fbbf24" stroke="#92400e" strokeWidth="0.8" />
          ))}
          <path className="fx-anim fx-twinkle" d="M24 10 Q24.6 14 29 14.6 Q24.6 15.2 24 19 Q23.4 15.2 19 14.6 Q23.4 14 24 10 Z" fill="#fff" />
        </g>
      );
    }

    // Striped nemes headdress with a gold cobra and collar.
    case 'pharaoh':
      return (
        <g strokeLinejoin="round" strokeLinecap="round">
          <defs>
            <Grad id={a} stops={[[0, '#4f6df0'], [1, '#1e3a8a']]} />
            <Grad id={b} x1={0} y1={0} x2={0} y2={1} stops={[[0, '#fef3c7'], [0.5, '#fbbf24'], [1, '#d97706']]} />
            <clipPath id={clip}>
              <path d="M12 32 C13 8 30 -8 50 -8 C70 -8 87 8 88 32 C70 24 30 24 12 32 Z" />
            </clipPath>
          </defs>
          <Ring fill={a} w={6} edge="#0f1d4d" />
          <circle cx={CX} cy={CY} r="44" fill="none" stroke="#fbbf24" strokeWidth="1.2" />
          <path d={arc(R + 3.5, 138, 222)} fill="none" stroke="#92400e" strokeWidth="9.6" />
          <path d={arc(R + 3.5, 138, 222)} fill="none" stroke={`url(#${b})`} strokeWidth="7" />
          <path d="M12 32 C13 8 30 -8 50 -8 C70 -8 87 8 88 32 C70 24 30 24 12 32 Z" fill="#1e40af" />
          <g clipPath={`url(#${clip})`}>
            {Array.from({ length: 6 }, (_, i) => (
              <rect key={i} x="0" y={-6 + i * 7.5} width="100" height="3.6" fill="#fbbf24" />
            ))}
          </g>
          <path d="M12 32 C13 8 30 -8 50 -8 C70 -8 87 8 88 32 C70 24 30 24 12 32 Z" fill="none" stroke="#92400e" strokeWidth="1.5" />
          <path d="M10 34 Q50 20 90 34 L90 40 Q50 26 10 40 Z" fill={`url(#${b})`} stroke="#92400e" strokeWidth="1.2" />
          {/* cobra */}
          <path d="M50 -25 C43 -25 40 -16 43 -8 L57 -8 C60 -16 57 -25 50 -25 Z" fill={`url(#${b})`} stroke="#92400e" strokeWidth="1.3" />
          <path d="M50 -19 L50 -9" stroke="#92400e" strokeWidth="1" />
          <circle cx="47.6" cy="-20" r="1" fill="#1e1b4b" />
          <circle cx="52.4" cy="-20" r="1" fill="#1e1b4b" />
          <path className="fx-anim fx-twinkle" d="M56 -16 Q56.5 -12.6 60 -12 Q56.5 -11.4 56 -8 Q55.5 -11.4 52 -12 Q55.5 -12.6 56 -16 Z" fill="#fff" />
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
