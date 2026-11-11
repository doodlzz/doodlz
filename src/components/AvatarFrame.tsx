import { useId } from 'react';
import type { FrameId } from '../../shared/cosmetics';

// Frames are drawn in the avatar's own SVG space: the head is a circle at (50, 54) with radius 42.
// Each frame has a BACK layer (drawn before the head: ears, flames, wings, glow) and a FRONT layer
// (drawn after it: the ring, crowns, sparkles). Everything stays inside FRAMED_VIEWBOX so a decorated
// avatar never spills into its neighbours.
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
        <animateTransform
          attributeName="transform"
          type="rotate"
          from={`0 ${CX} ${CY}`}
          to={`${reverse ? -360 : 360} ${CX} ${CY}`}
          dur={`${dur}s`}
          repeatCount="indefinite"
        />
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

/** A four-point sparkle. */
const SPARKLE = 'M0 -6 Q0.8 -0.8 6 0 Q0.8 0.8 0 6 Q-0.8 0.8 -6 0 Q-0.8 -0.8 0 -6 Z';

function Sparkle({ x, y, delay = 0, scale = 1, fill = '#fffbeb', stroke = '#f59e0b' }: { x: number; y: number; delay?: number; scale?: number; fill?: string; stroke?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path className="fx-anim fx-twinkle" style={{ animationDelay: `${delay}s` }} d={SPARKLE} fill={fill} stroke={stroke} strokeWidth="0.8" />
    </g>
  );
}

function Cloud({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className="fx-anim fx-bob" style={{ animationDelay: `${delay}s` }}>
        <path
          d="M-11 6 Q-17 6 -16 0 Q-15 -5 -9 -4 Q-8 -11 0 -10 Q7 -10 8 -4 Q15 -5 16 1 Q16 6 10 6 Z"
          fill="#fff"
          stroke="#1e1b4b"
          strokeWidth="2.4"
          strokeLinejoin="round"
        />
      </g>
    </g>
  );
}

function useIds() {
  const id = useId().replace(/:/g, '');
  return { grad: `${id}-g`, grad2: `${id}-g2`, glow: `${id}-glow`, clip: `${id}-clip` };
}

const Glow = ({ id, blur = 2.2 }: { id: string; blur?: number }) => (
  <filter id={id} x="-40%" y="-40%" width="180%" height="180%">
    <feGaussianBlur stdDeviation={blur} />
  </filter>
);

// ---------------------------------------------------------------- shared shapes
const CAT_EARS = ['M16 38 L17 -6 L46 12', 'M84 38 L83 -6 L54 12'];
const CAT_EARS_INNER = ['M23 26 L24 6 L37 14', 'M77 26 L76 6 L63 14'];

/** The part drawn behind the head. */
export function FrameBack({ frame }: { frame: FrameId }) {
  const { grad, glow } = useIds();

  switch (frame) {
    case 'neon':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={2.4} />
          </defs>
          <g className="fx-anim fx-pulse">
            <g filter={`url(#${glow})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
              {CAT_EARS.map((d) => (
                <path key={d} d={d} stroke="#ec4899" strokeWidth="7" />
              ))}
              <circle cx={CX} cy={CY} r={R} stroke="#06b6d4" strokeWidth="9" />
              <circle cx={CX} cy={CY} r={R + 5.5} stroke="#ec4899" strokeWidth="5" opacity="0.8" />
            </g>
          </g>
          <g fill="#1a0b3a" strokeLinecap="round" strokeLinejoin="round">
            {CAT_EARS.map((d) => (
              <path key={d} d={d} stroke="#f472b6" strokeWidth="3.4" />
            ))}
            {CAT_EARS.map((d) => (
              <path key={`w${d}`} d={d} fill="none" stroke="#fdf2f8" strokeWidth="1.1" />
            ))}
            {CAT_EARS_INNER.map((d) => (
              <path key={d} d={d} fill="none" stroke="#22d3ee" strokeWidth="2" />
            ))}
          </g>
        </g>
      );

    case 'ice':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#0ea5e9" />
              <stop offset="1" stopColor="#f0f9ff" />
            </linearGradient>
          </defs>
          {around(16, 11.25).map((a, i) => {
            const len = i % 4 === 0 ? 26 : i % 2 === 0 ? 20 : 13;
            return (
              <OnRing key={a} angle={a} r={R - 3}>
                <path d={`M-5.5 0 L${i % 2 ? -1 : 1} ${-len} L5.5 0 Z`} fill={`url(#${grad})`} stroke="#0369a1" strokeWidth="1.4" strokeLinejoin="round" />
                <path d={`M0 -2 L${i % 2 ? -1 : 1} ${-len + 3}`} stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
              </OnRing>
            );
          })}
          {/* big crown of crystals on top */}
          <g stroke="#0369a1" strokeWidth="1.6" strokeLinejoin="round" fill={`url(#${grad})`}>
            <path d="M38 20 L34 -12 L46 8 Z" />
            <path d="M62 20 L66 -12 L54 8 Z" />
            <path d="M42 18 L50 -26 L58 18 Z" />
          </g>
        </g>
      );

    case 'gold':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fde68a" />
              <stop offset="0.5" stopColor="#f59e0b" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
          </defs>
          {/* laurel wreath */}
          {[-1, 1].map((side) =>
            Array.from({ length: 7 }, (_, k) => {
              const angle = side * (148 - k * 17);
              return (
                <OnRing key={`${side}${k}`} angle={angle} r={R + 1}>
                  <g transform={`rotate(${side * 62})`}>
                    <path d="M0 0 Q-4.5 -6.5 0 -14 Q4.5 -6.5 0 0 Z" fill={`url(#${grad})`} stroke="#78350f" strokeWidth="1.2" strokeLinejoin="round" />
                  </g>
                  <g transform={`rotate(${side * -8}) translate(0 3)`}>
                    <path d="M0 0 Q-3.6 -5.5 0 -11 Q3.6 -5.5 0 0 Z" fill={`url(#${grad})`} stroke="#78350f" strokeWidth="1.1" strokeLinejoin="round" opacity="0.95" />
                  </g>
                </OnRing>
              );
            }),
          )}
        </g>
      );

    case 'rainbow':
      return (
        <g>
          {/* the arch */}
          {['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6'].map((c, i) => {
            const r = 53 + i * 2.9;
            return <path key={c} d={`M${CX - r} ${CY} A${r} ${r} 0 0 1 ${CX + r} ${CY}`} fill="none" stroke={c} strokeWidth="3.1" />;
          })}
          <path d={`M${CX - 68} ${CY} A68 68 0 0 1 ${CX + 68} ${CY}`} fill="none" stroke="#1e1b4b" strokeWidth="1.2" opacity="0.5" />
          <Cloud x={-4} y={56} />
          <Cloud x={104} y={56} delay={0.8} />
        </g>
      );

    case 'fire':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#dc2626" />
              <stop offset="0.6" stopColor="#f97316" />
              <stop offset="1" stopColor="#fde047" />
            </linearGradient>
          </defs>
          {around(14).map((a, i) => {
            const tall = i === 0 || i === 1 || i === 13;
            const s = tall ? 1.5 : i % 2 ? 0.95 : 1.2;
            return (
              <OnRing key={a} angle={a} r={R - 4}>
                <g transform={`scale(${s})`}>
                  <path
                    className="fx-anim fx-flicker"
                    style={{ animationDelay: `${(i % 5) * 0.14}s` }}
                    d="M-9 2 Q-12 -9 -4 -16 Q-4 -22 1 -30 Q6 -19 10 -12 Q13 -5 9 2 Z"
                    fill={`url(#${grad})`}
                    stroke="#7c2d12"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    className="fx-anim fx-flicker"
                    style={{ animationDelay: `${(i % 5) * 0.14 + 0.1}s` }}
                    d="M-4 1 Q-6 -5 -1 -10 Q0 -14 2 -17 Q5 -10 6 -6 Q7 -2 4 1 Z"
                    fill="#fef08a"
                  />
                </g>
              </OnRing>
            );
          })}
        </g>
      );

    case 'bunny':
      return (
        <g>
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${50 + side * 20} 18)`}>
              <g className="fx-anim fx-wobble" style={{ animationDelay: side > 0 ? '0.5s' : '0s' }}>
                <g transform={`rotate(${side * 14})`}>
                  <ellipse cx="0" cy="-14" rx="10.5" ry="27" fill="#fff" stroke="#1e1b4b" strokeWidth="2.8" />
                  <ellipse cx="0" cy="-12" rx="5.2" ry="20" fill="#fda4af" />
                </g>
              </g>
            </g>
          ))}
        </g>
      );

    case 'cyber':
      return (
        <g>
          <path d={`M${CX} 12 L${CX} -14`} stroke="#475569" strokeWidth="3.2" strokeLinecap="round" />
          <circle className="fx-anim fx-blink" cx={CX} cy="-17" r="5" fill="#ef4444" stroke="#1e1b4b" strokeWidth="2.2" />
          {[-1, 1].map((side) => (
            <g key={side} transform={`translate(${50 + side * 49} 54)`}>
              <rect x="-8" y="-15" width="16" height="30" rx="6" fill="#64748b" stroke="#1e1b4b" strokeWidth="2.6" />
              <rect x="-3" y="-8" width="6" height="16" rx="2" fill="#22d3ee" className="fx-anim fx-pulse" />
            </g>
          ))}
        </g>
      );

    case 'angel': {
      const wing = 'M18 62 Q-20 66 -18 22 Q-8 30 -5 18 Q4 30 10 22 Q10 38 26 44 Z';
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#fef08a" strokeWidth="9" opacity="0.7" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          <g className="fx-anim fx-flap-l">
            <path d={wing} fill="#fff" stroke="#1e1b4b" strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M12 50 Q-8 52 -10 30 M16 56 Q-2 60 -12 44" fill="none" stroke="#c7d2fe" strokeWidth="1.6" strokeLinecap="round" />
          </g>
          <g className="fx-anim fx-flap-r">
            <path d={wing} transform="translate(100 0) scale(-1 1)" fill="#fff" stroke="#1e1b4b" strokeWidth="2.6" strokeLinejoin="round" />
            <path d="M88 50 Q108 52 110 30 M84 56 Q102 60 112 44" fill="none" stroke="#c7d2fe" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </g>
      );
    }

    case 'devil':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={3} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 2} fill="none" stroke="#dc2626" strokeWidth="9" opacity="0.7" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          {[-1, 1].map((side) => (
            <g key={side}>
              {/* little bat wings */}
              <path
                className="fx-anim fx-flap-l"
                d="M12 66 Q-14 62 -16 38 Q-8 44 -6 36 Q0 46 6 40 Q6 52 16 56 Z"
                transform={side > 0 ? 'translate(100 0) scale(-1 1)' : undefined}
                fill="#7f1d1d"
                stroke="#1e1b4b"
                strokeWidth="2.4"
                strokeLinejoin="round"
              />
              <path
                d="M27 26 Q14 12 22 -8 Q28 8 42 14 Z"
                transform={side > 0 ? 'translate(100 0) scale(-1 1)' : undefined}
                fill="#ef4444"
                stroke="#1e1b4b"
                strokeWidth="2.6"
                strokeLinejoin="round"
              />
            </g>
          ))}
        </g>
      );

    case 'galaxy':
      return (
        <g>
          <defs>
            <Glow id={glow} blur={4} />
          </defs>
          <circle cx={CX} cy={CY} r={R + 4} fill="none" stroke="#7c3aed" strokeWidth="10" opacity="0.75" filter={`url(#${glow})`} className="fx-anim fx-pulse" />
          <circle cx="12" cy="22" r="9" fill="#3b82f6" opacity="0.5" filter={`url(#${glow})`} />
          <circle cx="92" cy="86" r="10" fill="#d946ef" opacity="0.5" filter={`url(#${glow})`} />
          {/* planet ring, back half */}
          <ellipse cx={CX} cy={CY} rx="62" ry="15" transform={`rotate(-18 ${CX} ${CY})`} fill="none" stroke="#c4b5fd" strokeWidth="4" opacity="0.55" />
          {/* crescent moon */}
          <g className="fx-anim fx-bob">
            <path d="M50 -28 A15 15 0 1 0 66 -4 A12 12 0 1 1 50 -28 Z" fill="#fde68a" stroke="#92400e" strokeWidth="1.8" strokeLinejoin="round" />
          </g>
        </g>
      );
  }
}

/** The part drawn over the head. */
export function FrameFront({ frame }: { frame: FrameId }) {
  const { grad, grad2, glow, clip } = useIds();

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
          {/* whiskers */}
          <g stroke="#f9a8d4" strokeWidth="2.2" strokeLinecap="round" filter={`url(#${glow})`} opacity="0.9">
            {[-7, 0, 7].map((dy) => (
              <g key={dy}>
                <path d={`M10 ${62 + dy / 2} L-12 ${62 + dy * 1.6}`} />
                <path d={`M90 ${62 + dy / 2} L112 ${62 + dy * 1.6}`} />
              </g>
            ))}
          </g>
          <g stroke="#fdf2f8" strokeWidth="1" strokeLinecap="round">
            {[-7, 0, 7].map((dy) => (
              <g key={dy}>
                <path d={`M10 ${62 + dy / 2} L-12 ${62 + dy * 1.6}`} />
                <path d={`M90 ${62 + dy / 2} L112 ${62 + dy * 1.6}`} />
              </g>
            ))}
          </g>
          {/* light chasing round the ring */}
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
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f0f9ff" />
              <stop offset="0.5" stopColor="#7dd3fc" />
              <stop offset="1" stopColor="#0284c7" />
            </linearGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#0c4a6e" strokeWidth="7.5" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5" />
          <Spin dur={5}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="30 270" opacity="0.9" />
          </Spin>
          {/* frosty cheeks + dripping icicles */}
          {[30, 50, 70].map((x, i) => (
            <path key={x} d={`M${x - 3} ${99 - Math.abs(i - 1) * 2} L${x} ${111 - (i === 1 ? 4 : 0)} L${x + 3} ${99 - Math.abs(i - 1) * 2} Z`} fill={`url(#${grad})`} stroke="#0369a1" strokeWidth="1.2" strokeLinejoin="round" />
          ))}
          <Sparkle x={14} y={30} fill="#fff" stroke="#38bdf8" scale={0.9} />
          <Sparkle x={88} y={78} delay={0.7} fill="#fff" stroke="#38bdf8" />
          <Sparkle x={84} y={14} delay={1.3} fill="#fff" stroke="#38bdf8" scale={0.7} />
        </g>
      );

    case 'gold':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fef3c7" />
              <stop offset="0.35" stopColor="#facc15" />
              <stop offset="0.7" stopColor="#d97706" />
              <stop offset="1" stopColor="#fde68a" />
            </linearGradient>
            <linearGradient id={grad2} gradientUnits="userSpaceOnUse" x1="-40" y1="0" x2="-10" y2="0">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
            <clipPath id={clip}>
              <path clipRule="evenodd" d={`M${CX - R - 3} ${CY} a${R + 3} ${R + 3} 0 1 0 ${2 * R + 6} 0 a${R + 3} ${R + 3} 0 1 0 ${-(2 * R + 6)} 0 Z M${CX - R + 3} ${CY} a${R - 3} ${R - 3} 0 1 1 ${2 * R - 6} 0 a${R - 3} ${R - 3} 0 1 1 ${-(2 * R - 6)} 0 Z`} />
            </clipPath>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#92400e" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5.5" />
          <circle cx={CX} cy={CY} r={R - 1.5} fill="none" stroke="#fff7d6" strokeWidth="1" strokeDasharray="10 14" opacity="0.8" />
          {/* glint sweeping over the ring */}
          <g clipPath={`url(#${clip})`}>
            <g transform="rotate(25 50 54)">
              <rect x="-40" y="0" width="30" height="120" fill={`url(#${grad2})`}>
                {!reduceMotion && <animateTransform attributeName="transform" type="translate" from="0 0" to="150 0" dur="3.2s" repeatCount="indefinite" />}
              </rect>
            </g>
          </g>
          {/* the crown */}
          <g className="fx-anim fx-bob">
            <path d="M31 12 L27 -14 L40 -2 L50 -22 L60 -2 L73 -14 L69 12 Z" fill={`url(#${grad})`} stroke="#78350f" strokeWidth="2.6" strokeLinejoin="round" />
            <rect x="31" y="6" width="38" height="8" rx="2" fill="#d97706" stroke="#78350f" strokeWidth="2" />
            <circle cx="50" cy="10" r="3" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
            <circle cx="39" cy="10" r="2" fill="#38bdf8" stroke="#075985" strokeWidth="1" />
            <circle cx="61" cy="10" r="2" fill="#38bdf8" stroke="#075985" strokeWidth="1" />
            <circle cx="27" cy="-14" r="2.6" fill="#fff7d6" stroke="#78350f" strokeWidth="1.2" />
            <circle cx="73" cy="-14" r="2.6" fill="#fff7d6" stroke="#78350f" strokeWidth="1.2" />
            <circle cx="50" cy="-22" r="3" fill="#fff7d6" stroke="#78350f" strokeWidth="1.2" />
          </g>
          <Sparkle x={20} y={4} delay={0.2} />
          <Sparkle x={84} y={-2} delay={0.9} />
          <Sparkle x={88} y={90} delay={1.4} scale={0.8} />
          <Sparkle x={12} y={84} delay={0.5} scale={0.7} />
        </g>
      );

    case 'rainbow':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#d946ef', '#ef4444'].map((c, i) => (
                <stop key={i} offset={i / 7} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1b4b" strokeWidth="9" opacity="0.8" />
          <Spin dur={3}>
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="6.5" />
          </Spin>
          <circle cx={CX} cy={CY} r={R - 3.6} fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
          <Sparkle x={34} y={-12} delay={0.1} fill="#fff" stroke="#f472b6" />
          <Sparkle x={70} y={-16} delay={0.8} fill="#fff" stroke="#38bdf8" scale={0.8} />
          <Sparkle x={50} y={106} delay={0.4} fill="#fff" stroke="#facc15" scale={0.8} />
          <g className="fx-anim fx-bob" style={{ animationDelay: '0.3s' }}>
            <path d="M0 3 C-9 -3 -6 -9 0 -5 C6 -9 9 -3 0 3 Z" transform="translate(98 24)" fill="#f43f5e" stroke="#1e1b4b" strokeWidth="1.6" strokeLinejoin="round" />
          </g>
          <g className="fx-anim fx-bob" style={{ animationDelay: '1.1s' }}>
            <path d="M0 3 C-9 -3 -6 -9 0 -5 C6 -9 9 -3 0 3 Z" transform="translate(4 90) scale(0.8)" fill="#fb923c" stroke="#1e1b4b" strokeWidth="1.8" strokeLinejoin="round" />
          </g>
        </g>
      );

    case 'fire':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#7f1d1d" />
              <stop offset="0.5" stopColor="#ea580c" />
              <stop offset="1" stopColor="#facc15" />
            </linearGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#7c2d12" strokeWidth="7.5" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5" />
          {/* embers rising */}
          {[
            [22, 4, 0],
            [78, 8, 0.7],
            [6, 40, 1.3],
            [96, 44, 0.4],
            [38, -6, 1.8],
            [64, -8, 1],
          ].map(([x, y, d]) => (
            <circle key={`${x}${y}`} className="fx-anim fx-ember" style={{ animationDelay: `${d}s` }} cx={x} cy={y} r="2" fill="#fde047" stroke="#ea580c" strokeWidth="0.8" />
          ))}
        </g>
      );

    case 'bunny':
      return (
        <g>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1b4b" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fbcfe8" strokeWidth="5" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#fff" strokeWidth="1.5" strokeDasharray="2 9" strokeLinecap="round" />
          {/* bow tie */}
          <g transform="translate(50 100)">
            <path d="M0 0 L-12 -7 L-12 7 Z M0 0 L12 -7 L12 7 Z" fill="#f472b6" stroke="#1e1b4b" strokeWidth="2.4" strokeLinejoin="round" />
            <circle r="3.8" fill="#fb7185" stroke="#1e1b4b" strokeWidth="2" />
          </g>
          {[
            [100, 20, 0],
            [2, 14, 0.9],
            [104, 84, 1.5],
          ].map(([x, y, d]) => (
            <g key={`${x}${y}`} className="fx-anim fx-bob" style={{ animationDelay: `${d}s` }}>
              <path d="M0 3 C-9 -3 -6 -9 0 -5 C6 -9 9 -3 0 3 Z" transform={`translate(${x} ${y})`} fill="#f43f5e" stroke="#1e1b4b" strokeWidth="1.6" strokeLinejoin="round" />
            </g>
          ))}
        </g>
      );

    case 'cyber': {
      const hex = Array.from({ length: 6 }, (_, i) => {
        const a = ((60 * i - 30) * Math.PI) / 180;
        return `${CX + (R + 1) * Math.cos(a)},${CY + (R + 1) * Math.sin(a)}`;
      }).join(' ');
      return (
        <g>
          <defs>
            <Glow id={glow} blur={1.8} />
          </defs>
          <polygon points={hex} fill="none" stroke="#1e1b4b" strokeWidth="8" strokeLinejoin="round" />
          <polygon points={hex} fill="none" stroke="#94a3b8" strokeWidth="5" strokeLinejoin="round" />
          <polygon points={hex} fill="none" stroke="#22d3ee" strokeWidth="1.6" strokeLinejoin="round" strokeDasharray="6 8" />
          {/* corner bolts */}
          {Array.from({ length: 6 }, (_, i) => {
            const a = ((60 * i - 30) * Math.PI) / 180;
            return <circle key={i} cx={CX + (R + 1) * Math.cos(a)} cy={CY + (R + 1) * Math.sin(a)} r="2.6" fill="#e2e8f0" stroke="#1e1b4b" strokeWidth="1.3" />;
          })}
          <Spin dur={4}>
            <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="#22d3ee" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="14 285" filter={`url(#${glow})`} />
          </Spin>
          <Spin dur={4} reverse>
            <circle cx={CX} cy={CY} r={R + 8} fill="none" stroke="#a78bfa" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="14 285" strokeDashoffset="-150" filter={`url(#${glow})`} />
          </Spin>
          <path className="fx-anim fx-blink" d="M82 6 L90 6 L90 14" fill="none" stroke="#22d3ee" strokeWidth="2" />
        </g>
      );
    }

    case 'angel':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" />
              <stop offset="0.5" stopColor="#fef08a" />
              <stop offset="1" stopColor="#f59e0b" />
            </linearGradient>
            <Glow id={glow} blur={2} />
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#a16207" strokeWidth="7.5" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5" />
          <g className="fx-anim fx-bob">
            <ellipse cx={CX} cy="-8" rx="21" ry="6.5" fill="none" stroke="#fde047" strokeWidth="7" filter={`url(#${glow})`} opacity="0.8" />
            <ellipse cx={CX} cy="-8" rx="21" ry="6.5" fill="none" stroke="#92400e" strokeWidth="6.5" />
            <ellipse cx={CX} cy="-8" rx="21" ry="6.5" fill="none" stroke="#fef08a" strokeWidth="3.6" />
          </g>
          <Sparkle x={12} y={4} delay={0.2} fill="#fff" stroke="#fbbf24" />
          <Sparkle x={90} y={2} delay={0.9} fill="#fff" stroke="#fbbf24" scale={0.8} />
          <Sparkle x={52} y={108} delay={1.4} fill="#fff" stroke="#fbbf24" scale={0.7} />
        </g>
      );

    case 'devil':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0" stopColor="#450a0a" />
              <stop offset="1" stopColor="#dc2626" />
            </linearGradient>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1b4b" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5.2" />
          {/* pointy tail */}
          <g className="fx-anim fx-bob">
            <path d="M82 88 Q104 90 100 108 Q98 100 90 100" fill="none" stroke="#1e1b4b" strokeWidth="5.5" strokeLinecap="round" />
            <path d="M82 88 Q104 90 100 108 Q98 100 90 100" fill="none" stroke="#ef4444" strokeWidth="2.6" strokeLinecap="round" />
            <path d="M92 98 L88 108 L102 104 Z" fill="#ef4444" stroke="#1e1b4b" strokeWidth="2" strokeLinejoin="round" transform="translate(8 -2)" />
          </g>
          {[
            [20, 6, 0],
            [82, 4, 0.8],
            [6, 70, 1.4],
          ].map(([x, y, d]) => (
            <circle key={`${x}${y}`} className="fx-anim fx-ember" style={{ animationDelay: `${d}s` }} cx={x} cy={y} r="2" fill="#fca5a5" stroke="#b91c1c" strokeWidth="0.8" />
          ))}
        </g>
      );

    case 'galaxy':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#c026d3" />
              <stop offset="0.5" stopColor="#4c1d95" />
              <stop offset="1" stopColor="#2563eb" />
            </linearGradient>
            <clipPath id={clip}>
              <rect x="-30" y={CY} width="160" height="80" />
            </clipPath>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1b4b" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5.5" />
          <Spin dur={16}>
            {around(8).map((a, i) => (
              <OnRing key={a} angle={a + (i % 2) * 9} r={R + (i % 3) - 1}>
                <circle r={i % 3 === 0 ? 1.9 : 1.1} fill="#fff" />
              </OnRing>
            ))}
          </Spin>
          {/* planet ring, front half (passes in front of the face at the bottom) */}
          <g clipPath={`url(#${clip})`}>
            <ellipse cx={CX} cy={CY} rx="62" ry="15" transform={`rotate(-18 ${CX} ${CY})`} fill="none" stroke="#1e1b4b" strokeWidth="6.5" />
            <ellipse cx={CX} cy={CY} rx="62" ry="15" transform={`rotate(-18 ${CX} ${CY})`} fill="none" stroke="#ddd6fe" strokeWidth="3.5" />
          </g>
          {/* a little planet orbiting, plus twinkles */}
          <Spin dur={9} reverse>
            <OnRing angle={140} r={R + 11}>
              <circle r="4.4" fill="#f0abfc" stroke="#581c87" strokeWidth="1.4" />
              <ellipse rx="7.5" ry="1.8" fill="none" stroke="#fae8ff" strokeWidth="1" transform="rotate(-25)" />
            </OnRing>
          </Spin>
          <Sparkle x={14} y={10} delay={0.3} fill="#fff" stroke="#a78bfa" />
          <Sparkle x={90} y={20} delay={1} fill="#fde68a" stroke="#f59e0b" scale={0.8} />
          <Sparkle x={86} y={100} delay={1.5} fill="#fff" stroke="#60a5fa" scale={0.7} />
        </g>
      );
  }
}
