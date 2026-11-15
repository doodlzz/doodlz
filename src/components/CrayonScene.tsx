import { memo, type ReactNode } from 'react';

/**
 * Landing page backdrop: a deep purple sheet covered in kids' crayon doodles, plus the SVG
 * filters the crayon UI outlines use (`filter: url(#cr-edge-a)` etc. in index.css).
 *
 * The doodles are placed once, from a fixed seed, so they never tile or jump between renders.
 * They cover the whole sheet edge to edge; panels sit on top and the doodles show in every gap.
 * Narrow screens get their own portrait layout.
 */

// Each doodle is drawn in a 100×100 box with round crayon strokes.
const SHAPES = {
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
  fish: (
    <>
      <path d="M20 50q25-26 52 0-27 26-52 0ZM72 50l18-14v28ZM33 46v2M44 38q6 6 0 12" />
      <circle cx="12" cy="30" r="3" />
      <circle cx="8" cy="18" r="2" />
    </>
  ),
  tree: <path d="M44 92V64M56 92V64M50 64C26 66 18 52 26 40c-6-14 10-24 20-18 8-12 26-6 26 8 14 2 12 24-2 30-6 6-14 4-20 4ZM40 44l6 6M58 36l-4 8" />,
  moon: <path d="M60 14a36 36 0 1 0 26 52 28 28 0 1 1-26-52ZM20 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" />,
  butterfly: (
    <path d="M50 30v44M50 40C34 18 14 24 20 42c4 12 20 10 30 4ZM50 40c16-22 36-16 30 2-4 12-20 10-30 4ZM50 50c-12 4-22 16-14 24 8 4 14-8 14-18ZM50 50c12 4 22 16 14 24-8 4-14-8-14-18ZM48 30q-4-10-10-12M52 30q4-10 10-12" />
  ),
  snail: <path d="M54 66a20 20 0 1 1 14-34 14 14 0 1 1-22 14 8 8 0 1 1 12-6M12 70h68q8 0 8-8M18 70q-6-14 2-22M20 48l-6-10M22 48l2-12" />,
  bolt: <path d="M56 8 26 54h22l-8 38 34-50H52Z" />,
  rainbow: <path d="M10 76a40 40 0 0 1 80 0M20 76a30 30 0 0 1 60 0M30 76a20 20 0 0 1 40 0M4 78q6-8 14-2 6-6 12 2ZM70 78q6-8 14-2 6-6 12 2Z" />,
  icecream: <path d="M34 50 50 92l16-42ZM40 58l14 14M44 52l18 18M32 50q-6-18 10-20 2-14 16-10 14-2 12 14 10 6 2 16Z" />,
  plane: <path d="M10 52 82 40q10 0 8 8L18 62ZM40 48 30 26h8l18 18M44 58l-6 18h8l14-20M14 54 8 42h6l8 8" />,
  boat: <path d="M14 62h72L74 80H26ZM50 62V14M50 18l28 38H50ZM50 26 28 56h22M8 90q8-6 16 0t16 0 16 0 16 0 16 0" />,
  note: <path d="M38 72V24l40-10v48M38 34l40-10M38 72a9 7 0 1 1-18 0 9 7 0 1 1 18 0ZM78 62a9 7 0 1 1-18 0 9 7 0 1 1 18 0Z" />,
  pencil: <path d="M20 80 70 30l10 10-50 50-14 4ZM64 36l10 10M20 80l6 6" />,
  cupcake: (
    <>
      <path d="M28 56h44l-6 34H34ZM40 56l2 34M50 56v34M60 56l-2 34M24 56q-4-14 12-16 2-14 14-12 12-2 14 12 16 2 12 16ZM50 17q2-8 8-10" />
      <circle cx="50" cy="22" r="5" />
    </>
  ),
  ghost: (
    <>
      <path d="M26 88V44a24 24 0 0 1 48 0v44l-8-8-8 8-8-8-8 8-8-8ZM42 44v4M58 44v4" />
      <circle cx="50" cy="58" r="4" />
    </>
  ),
  dino: <path d="M14 74q6-20 30-22 10-30 26-26 12 2 12 12-2 8-12 8-4 14-2 28M30 74v14M50 74v14M14 74q-6 4-10 0M38 74h20M30 52l4-8 4 8 4-8 4 8M72 32v1" />,
  umbrella: <path d="M12 52a38 38 0 0 1 76 0q-6-6-13 0-6-6-12 0-6-6-12 0-6-6-12 0-6-6-12 0-7-6-15 0ZM50 52v30q0 8-8 8t-8-8M50 14v-4" />,
  crown: (
    <>
      <path d="M18 72 14 34l20 18 16-26 16 26 20-18-4 38ZM18 82h64" />
      <circle cx="34" cy="64" r="3" />
      <circle cx="50" cy="62" r="3" />
      <circle cx="66" cy="64" r="3" />
    </>
  ),
  planet: (
    <>
      <circle cx="50" cy="50" r="20" />
      <ellipse cx="50" cy="50" rx="42" ry="11" transform="rotate(-20 50 50)" />
      <path d="M14 16v6M11 19h6M84 80v6M81 83h6" />
    </>
  ),
  mushroom: (
    <>
      <path d="M14 52q2-34 36-36 34 2 36 36ZM38 52q-4 30 2 36h20q6-6 2-36" />
      <circle cx="34" cy="36" r="5" />
      <circle cx="58" cy="28" r="4" />
      <circle cx="68" cy="42" r="4" />
    </>
  ),
  snowman: (
    <>
      <circle cx="50" cy="70" r="20" />
      <circle cx="50" cy="36" r="14" />
      <path d="M36 24h28M42 24V10h16v14M30 64 14 54M70 64l16-10M45 34v1M55 34v1M50 39l6 2" />
    </>
  ),
  tulip: <path d="M36 26l6 10 8-14 8 14 6-10v18q0 12-14 12T36 44ZM50 56v38M50 80q-14-12-20-8 6 12 20 12" />,
  kite: <path d="M50 8l26 32-26 40-26-40ZM50 8v72M24 40h52M50 80q-10 6 0 12t-4 8M44 86l-4-2M52 94l4-1" />,
  apple: <path d="M50 30q-26-10-30 16-2 30 22 40 8-4 16 0 24-10 22-40-4-26-30-16ZM50 30q0-12 6-18M52 22q12-8 18 2-10 6-18-2M32 46q0-8 6-10" />,
} satisfies Record<string, ReactNode>;

type Kind = keyof typeof SHAPES;

const KINDS = Object.keys(SHAPES) as Kind[];
// Muted pastel crayons: soft pink, warm yellow, sky blue, coral, mint, lilac, peach, lime, aqua.
const COLORS = ['#f9a8d4', '#fde68a', '#93c5fd', '#fca5a5', '#a7f3d0', '#c4b5fd', '#fdba74', '#d9f99d', '#a5f3fc'];

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

/**
 * Scatter doodles over a w×h sheet without overlaps. Big ones are placed first and smaller ones
 * fill the gaps between them. Kinds come from a shuffled bag, so every kind appears about equally.
 */
function scatter(w: number, h: number, count: number, seed: number, minSize: number, maxSize: number) {
  const rand = rng(seed);
  const out: Doodle[] = [];
  let bag: Kind[] = [];
  let lastColor = '';
  const DRAWN = 10; // how many doodles get the draw-in animation
  for (let tries = 0; out.length < count && tries < 30000; tries++) {
    // Shrinks as the sheet fills up, so later doodles squeeze into the leftover space.
    const t = Math.min(1, tries / 12000);
    const size = minSize + (maxSize - minSize) * (1 - t) * (0.55 + rand() * 0.45);
    const x = rand() * (w - size * 0.6) - size * 0.2;
    const y = rand() * (h - size * 0.6) - size * 0.2;
    const cx = x + size / 2;
    const cy = y + size / 2;
    if (out.some((d) => Math.hypot(d.x + d.size / 2 - cx, d.y + d.size / 2 - cy) < (d.size + size) / 2 * 0.92 + 2)) continue;
    if (!bag.length) {
      bag = [...KINDS];
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
    }
    const kind = bag.pop()!;
    let color = COLORS[Math.floor(rand() * COLORS.length)];
    if (color === lastColor) color = COLORS[(COLORS.indexOf(color) + 1) % COLORS.length];
    lastColor = color;
    out.push({ kind, x, y, size, rot: (rand() - 0.5) * 50, color, draw: out.length % 7 === 0 && out.length < DRAWN * 7 });
  }
  return out;
}

const WIDE = scatter(1600, 1000, 220, 7, 34, 120);
const NARROW = scatter(420, 900, 70, 11, 26, 80);

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
