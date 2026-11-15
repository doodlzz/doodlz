import { memo, type ReactNode } from 'react';

/**
 * Landing page backdrop: a deep purple sheet covered in kids' crayon doodles, plus the SVG
 * filters the crayon UI outlines use (`filter: url(#cr-edge-a)` etc. in index.css).
 *
 * The doodles are placed once, from a fixed seed, so they never tile or jump between renders.
 * Wide screens keep the middle column (logo + card) clear; narrow screens use a portrait layout
 * that sits behind the card, since the card covers most of the screen there anyway.
 */

type Kind = 'sun' | 'car' | 'kid' | 'cat' | 'house' | 'rocket' | 'star' | 'spiral' | 'smiley' | 'cloud' | 'heart' | 'flower' | 'squiggle' | 'balloon';

// Each doodle is drawn in a 100×100 box with round crayon strokes.
const SHAPES: Record<Kind, ReactNode> = {
  sun: (
    <>
      <circle cx="50" cy="50" r="17" />
      <path d="M41 46q9-7 18 0M39 53q11-7 22 0M43 60q7-4 14 0" />
      <path d="M50 8v15M50 77v15M8 50h15M77 50h15M20 20l11 11M69 69l11 11M80 20 69 31M31 69 20 80" />
    </>
  ),
  car: (
    <>
      <path d="M8 66 13 50q4-5 12-5l9-15q3-4 9-4h21q6 0 9 4l9 14q10 2 11 10v12Z" />
      <path d="M38 45l5-12h13v12ZM61 33h8l6 12H61Z" />
      <circle cx="28" cy="68" r="9" />
      <circle cx="74" cy="68" r="9" />
    </>
  ),
  kid: (
    <>
      <circle cx="50" cy="20" r="11" />
      <path d="M45 22q5 4 10 0M46 17v1M54 17v1" />
      <path d="M42 11 39 4M50 9V2M58 11l3-7" />
      <path d="M50 31v32M29 40l21 7 21-9M50 63 36 90M50 63l14 27" />
    </>
  ),
  cat: (
    <>
      <path d="M28 48 26 22l14 12q10-4 20 0l14-12-2 26q0 18-22 20-22-2-22-20Z" />
      <path d="M41 45v2M59 45v2M48 53h4l-2 3ZM34 55l-14-3M34 58l-14 2M66 55l14-3M66 58l14 2" />
      <path d="M38 68q-8 22 2 26h22q10-4 2-26M64 90q22 2 20-18" />
    </>
  ),
  house: (
    <>
      <path d="M16 50 50 20l34 30M24 46v44h52V46" />
      <path d="M44 90V68h12v22M30 56h12v10H30ZM36 56v10M30 61h12" />
      <path d="M64 34V22h8v18M68 16q4-4 0-8t0-8" />
    </>
  ),
  rocket: (
    <>
      <path d="M50 8q18 18 16 54H34Q32 26 50 8Z" />
      <circle cx="50" cy="34" r="7" />
      <path d="M34 50 22 68l12-4M66 50l12 18-12-4M40 64q4 16 10 26 6-10 10-26" />
    </>
  ),
  star: <path d="M50 10l11 28 30 1-24 19 9 30-26-18-26 18 9-30L9 39l30-1Z" />,
  spiral: <path d="M50 50a4 4 0 0 1 8 0 8 8 0 0 1-16 0 12 12 0 0 1 24 0 16 16 0 0 1-32 0 20 20 0 0 1 40 0 24 24 0 0 1-48 0" />,
  smiley: (
    <>
      <circle cx="50" cy="50" r="32" />
      <path d="M40 40v6M60 40v6M34 58q16 18 32 0" />
    </>
  ),
  cloud: <path d="M24 66q-14 0-12-12t16-10q2-16 18-14 10-12 22 0 16-2 16 14 10 4 6 16-4 8-16 6Z" />,
  heart: (
    <>
      <path d="M50 84Q14 58 18 36q4-16 20-14 10 2 12 14 2-12 12-14 16-2 20 14 4 22-32 48Z" />
      <path d="M30 38l10-8M28 48l22-18M34 56l26-22M42 64l24-20" opacity=".6" />
    </>
  ),
  flower: (
    <>
      <circle cx="50" cy="38" r="7" />
      <circle cx="50" cy="22" r="9" />
      <circle cx="65" cy="33" r="9" />
      <circle cx="59" cy="51" r="9" />
      <circle cx="41" cy="51" r="9" />
      <circle cx="35" cy="33" r="9" />
      <path d="M50 60q-2 16 0 34M50 78q12-10 20-4-10 10-20 6" />
    </>
  ),
  squiggle: <path d="M8 60q10-20 20 0t20 0 20 0 20 0 10-6" />,
  balloon: (
    <>
      <ellipse cx="50" cy="36" rx="22" ry="27" />
      <path d="M47 63h6l-3 4ZM50 67q-8 10 2 18t-2 13" />
    </>
  ),
};

const KINDS = Object.keys(SHAPES) as Kind[];
// Muted pastel crayons: soft pink, warm yellow, sky blue, coral, mint, lilac.
const COLORS = ['#f9a8d4', '#fde68a', '#93c5fd', '#fca5a5', '#a7f3d0', '#c4b5fd'];

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Doodle {
  kind: Kind;
  x: number;
  y: number;
  size: number;
  rot: number;
  color: string;
  draw: boolean;
}

/** Scatter doodles over a w×h sheet without overlaps, skipping the `clear` rectangle. */
function scatter(w: number, h: number, count: number, seed: number, clear?: { x0: number; x1: number; y0: number; y1: number }) {
  const rand = rng(seed);
  const out: Doodle[] = [];
  let lastKind: Kind | null = null;
  for (let tries = 0; out.length < count && tries < 4000; tries++) {
    const size = 70 + rand() * 60;
    const x = rand() * (w - size);
    const y = rand() * (h - size);
    const cx = x + size / 2;
    const cy = y + size / 2;
    if (clear && x + size > clear.x0 && x < clear.x1 && y + size > clear.y0 && y < clear.y1) continue;
    if (out.some((d) => Math.hypot(d.x + d.size / 2 - cx, d.y + d.size / 2 - cy) < (d.size + size) / 2 + 16)) continue;
    let kind = KINDS[Math.floor(rand() * KINDS.length)];
    if (kind === lastKind) kind = KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length];
    lastKind = kind;
    out.push({ kind, x, y, size, rot: (rand() - 0.5) * 40, color: COLORS[out.length % COLORS.length], draw: out.length % 6 === 0 });
  }
  return out;
}

const WIDE = scatter(1600, 1000, 34, 7, { x0: 450, x1: 1150, y0: -1, y1: 1001 });
const NARROW = scatter(420, 900, 12, 11, { x0: 30, x1: 390, y0: 50, y1: 230 });

function Sheet({ doodles, viewBox, className }: { doodles: Doodle[]; viewBox: string; className: string }) {
  let drawn = 0;
  return (
    <svg className={className} viewBox={viewBox} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {doodles.map((d, i) => (
        <g key={i} transform={`translate(${d.x} ${d.y}) rotate(${d.rot} ${d.size / 2} ${d.size / 2})`} filter={`url(#cr-doodle-${i % 3})`}>
          <use
            href={`#dz-${d.kind}`}
            width={d.size}
            height={d.size}
            color={d.color}
            className={d.draw ? 'doodle-draw' : undefined}
            style={d.draw ? { animationDelay: `${0.15 + drawn++ * 0.25}s` } : undefined}
          />
        </g>
      ))}
    </svg>
  );
}

function CrayonScene() {
  return (
    <div className="crayon-scene pointer-events-none fixed inset-0 -z-20" aria-hidden="true">
      <svg width="0" height="0" className="absolute">
        <defs>
          {KINDS.map((k) => (
            <symbol key={k} id={`dz-${k}`} viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="4.4" strokeLinecap="round" strokeLinejoin="round">
              {SHAPES[k]}
            </symbol>
          ))}
          {/* Doodle strokes: a slight hand wobble plus waxy gaps in the line. */}
          {[3, 9, 17].map((seed, i) => (
            <filter key={seed} id={`cr-doodle-${i}`} x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed={seed} result="warp" />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="wobbly" />
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed={seed + 1} result="grain" />
              <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -0.6" result="mask" />
              <feComposite in="wobbly" in2="mask" operator="in" />
            </filter>
          ))}
          {/* UI outlines: used from CSS on ::before/::after only, so text never goes through it. */}
          {[
            ['a', 2],
            ['b', 13],
          ].map(([id, seed]) => (
            <filter key={id} id={`cr-edge-${id}`} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed={seed} result="warp" />
              <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="wobbly" />
              <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" seed={Number(seed) + 5} result="grain" />
              <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.45" result="mask" />
              <feComposite in="wobbly" in2="mask" operator="in" />
            </filter>
          ))}
        </defs>
      </svg>
      <Sheet doodles={WIDE} viewBox="0 0 1600 1000" className="absolute inset-0 hidden size-full md:block" />
      <Sheet doodles={NARROW} viewBox="0 0 420 900" className="absolute inset-0 size-full md:hidden" />
    </div>
  );
}

export default memo(CrayonScene);
