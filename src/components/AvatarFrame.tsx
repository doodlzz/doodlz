import { useId } from 'react';
import type { FrameId } from '../../shared/cosmetics';

// Frames are drawn in the avatar's own SVG space: the head is a circle at (50, 54) with radius 42.
const CX = 50;
const CY = 54;
const R = 47.5;

/** Something placed on the ring at `angle` degrees (0 = top), pointing outward. */
function OnRing({ angle, r = R, children }: { angle: number; r?: number; children: React.ReactNode }) {
  return <g transform={`rotate(${angle} ${CX} ${CY}) translate(${CX} ${CY - r})`}>{children}</g>;
}

const around = (n: number, offset = 0) => Array.from({ length: n }, (_, i) => offset + (360 / n) * i);

/** Bought avatar frame (seen by everyone). Animations stop for players who prefer reduced motion. */
export default function AvatarFrame({ frame }: { frame: FrameId }) {
  const id = useId().replace(/:/g, '');
  const grad = `${id}-g`;
  const glow = `${id}-glow`;

  switch (frame) {
    case 'neon':
      return (
        <g className="fx-anim fx-pulse">
          <defs>
            <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#06b6d4" strokeWidth="9" filter={`url(#${glow})`} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#22d3ee" strokeWidth="4" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#ecfeff" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r={R + 5.5} fill="none" stroke="#ec4899" strokeWidth="6" filter={`url(#${glow})`} />
          <circle cx={CX} cy={CY} r={R + 5.5} fill="none" stroke="#f472b6" strokeWidth="2.5" />
          <circle cx={CX} cy={CY} r={R + 5.5} fill="none" stroke="#fdf2f8" strokeWidth="1" />
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
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5" />
          {around(8, 22.5).map((a) => (
            <OnRing key={a} angle={a} r={R + 1}>
              <path d="M0 -9 L3 -2 L0 2 L-3 -2 Z" fill="#e0f2fe" stroke="#0369a1" strokeWidth="1" strokeLinejoin="round" />
            </OnRing>
          ))}
          <g className="fx-anim fx-twinkle">
            <circle cx="20" cy="22" r="1.6" fill="#fff" />
            <circle cx="86" cy="80" r="1.3" fill="#fff" />
          </g>
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
          </defs>
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#92400e" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5.5" />
          <circle cx={CX} cy={CY} r={R - 1.5} fill="none" stroke="#fff7d6" strokeWidth="1" strokeDasharray="10 14" opacity="0.8" />
          {[
            [16, 16, 0],
            [86, 30, 0.6],
            [80, 94, 1.2],
          ].map(([x, y, delay]) => (
            <path
              key={x}
              className="fx-anim fx-twinkle"
              style={{ animationDelay: `${delay}s` }}
              transform={`translate(${x} ${y})`}
              d="M0 -6 Q0.8 -0.8 6 0 Q0.8 0.8 0 6 Q-0.8 0.8 -6 0 Q-0.8 -0.8 0 -6 Z"
              fill="#fffbeb"
              stroke="#f59e0b"
              strokeWidth="0.8"
            />
          ))}
        </g>
      );

    case 'rainbow':
      return (
        <g>
          <defs>
            <linearGradient id={grad} x1="0" y1="0" x2="1" y2="1">
              {['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#6366f1', '#d946ef'].map((c, i) => (
                <stop key={c} offset={i / 6} stopColor={c} />
              ))}
            </linearGradient>
          </defs>
          <g className="fx-anim fx-spin">
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="6.5" />
          </g>
          <circle cx={CX} cy={CY} r={R + 3.6} fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.5" />
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
          {around(12).map((a, i) => (
            <OnRing key={a} angle={a} r={R - 1}>
              <path
                className="fx-anim fx-flicker"
                style={{ animationDelay: `${(i % 4) * 0.18}s` }}
                d="M-5 1 Q-6 -6 -1 -10 Q-2 -14 0.5 -17 Q3 -11 5 -7 Q7 -3 5 1 Z"
                fill={i % 2 ? '#f97316' : '#facc15'}
                stroke="#7c2d12"
                strokeWidth="1"
                strokeLinejoin="round"
              />
            </OnRing>
          ))}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#7c2d12" strokeWidth="7.5" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5" />
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
            <filter id={glow} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>
          <circle cx={CX} cy={CY} r={R + 1} fill="none" stroke="#a855f7" strokeWidth="6" opacity="0.6" filter={`url(#${glow})`} />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1e1b4b" strokeWidth="8" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke={`url(#${grad})`} strokeWidth="5.5" />
          <g className="fx-anim fx-spin-slow">
            {around(7).map((a, i) => (
              <OnRing key={a} angle={a + (i % 2) * 9} r={R + (i % 3) - 1}>
                <circle r={i % 3 === 0 ? 1.8 : 1.1} fill="#fff" />
              </OnRing>
            ))}
          </g>
          <g className="fx-anim fx-spin-reverse">
            <OnRing angle={40} r={R + 6}>
              <path d="M0 -4 L1 -1 L4 0 L1 1 L0 4 L-1 1 L-4 0 L-1 -1 Z" fill="#fde68a" />
            </OnRing>
            <OnRing angle={220} r={R + 6}>
              <circle r="2.4" fill="#f0abfc" />
              <ellipse rx="4.5" ry="1" fill="none" stroke="#f5d0fe" strokeWidth="0.8" transform="rotate(-20)" />
            </OnRing>
          </g>
        </g>
      );
  }
}
