import type { Avatar as AvatarConfig } from '../../shared/types';

const INK = '#1e1b4b';

function Eyes({ type }: { type: number }) {
  switch (type) {
    case 1: // googly
      return (
        <g>
          <circle cx="36" cy="46" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <circle cx="64" cy="46" r="11" fill="#fff" stroke={INK} strokeWidth="2.5" />
          <circle cx="39" cy="49" r="5" fill={INK} />
          <circle cx="61" cy="43" r="5" fill={INK} />
        </g>
      );
    case 2: // happy ^ ^
      return (
        <g fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round">
          <path d="M28 50 Q36 38 44 50" />
          <path d="M56 50 Q64 38 72 50" />
        </g>
      );
    case 3: // sleepy
      return (
        <g fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round">
          <path d="M28 46 Q36 53 44 46" />
          <path d="M56 46 Q64 53 72 46" />
        </g>
      );
    case 4: // wink
      return (
        <g>
          <circle cx="36" cy="46" r="6" fill={INK} />
          <circle cx="38" cy="44" r="2" fill="#fff" />
          <path d="M56 47 Q64 39 72 47" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    case 5: // grumpy
      return (
        <g>
          <circle cx="36" cy="49" r="5.5" fill={INK} />
          <circle cx="64" cy="49" r="5.5" fill={INK} />
          <path d="M27 37 L44 43 M73 37 L56 43" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
        </g>
      );
    default: // dots
      return (
        <g>
          <circle cx="36" cy="46" r="6.5" fill={INK} />
          <circle cx="64" cy="46" r="6.5" fill={INK} />
          <circle cx="38.5" cy="43.5" r="2.2" fill="#fff" />
          <circle cx="66.5" cy="43.5" r="2.2" fill="#fff" />
        </g>
      );
  }
}

function Mouth({ type }: { type: number }) {
  switch (type) {
    case 1: // grin
      return <path d="M34 62 Q50 84 66 62 Z" fill={INK} stroke={INK} strokeWidth="3" strokeLinejoin="round" />;
    case 2: // wow
      return <ellipse cx="50" cy="69" rx="6.5" ry="8" fill={INK} />;
    case 3: // meh
      return <path d="M38 68 L62 68" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
    case 4: // silly
      return (
        <g>
          <path d="M36 63 Q50 74 64 63" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M45 68 Q45 80 51 80 Q57 80 56 68" fill="#fb7185" stroke={INK} strokeWidth="3" />
        </g>
      );
    case 5: // kitty
      return <path d="M38 64 Q44 71 50 64 Q56 71 62 64" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
    default: // smile
      return <path d="M36 63 Q50 77 64 63" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
  }
}

function Accessory({ type }: { type: number }) {
  switch (type) {
    case 1: // party hat
      return (
        <g>
          <path d="M36 20 L50 -6 L64 20 Z" fill="#facc15" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <path d="M42 9 L58 9" stroke="#f43f5e" strokeWidth="4" />
          <circle cx="50" cy="-7" r="5" fill="#f43f5e" stroke={INK} strokeWidth="2.5" />
        </g>
      );
    case 2: // crown
      return (
        <path
          d="M30 20 L30 2 L40 12 L50 -2 L60 12 L70 2 L70 20 Z"
          fill="#fbbf24"
          stroke={INK}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      );
    case 3: // bow
      return (
        <g transform="translate(72 18) rotate(20)">
          <path d="M0 0 L-14 -9 L-14 9 Z M0 0 L14 -9 L14 9 Z" fill="#f43f5e" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
          <circle r="4.5" fill="#fb7185" stroke={INK} strokeWidth="2.5" />
        </g>
      );
    case 4: // glasses
      return (
        <g fill="rgba(255,255,255,0.35)" stroke={INK} strokeWidth="3.5">
          <circle cx="36" cy="46" r="12" />
          <circle cx="64" cy="46" r="12" />
          <path d="M48 46 L52 46 M24 44 L14 40 M76 44 L86 40" fill="none" />
        </g>
      );
    case 5: // antenna
      return (
        <g>
          <path d="M50 16 Q46 4 54 -4" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="54" cy="-5" r="6" fill="#a3e635" stroke={INK} strokeWidth="3" />
        </g>
      );
    default:
      return null;
  }
}

interface Props {
  avatar: AvatarConfig;
  size?: number;
  className?: string;
}

export default function Avatar({ avatar, size = 48, className = '' }: Props) {
  return (
    <svg viewBox="0 -14 100 118" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <circle cx="50" cy="54" r="42" fill={avatar.color} stroke={INK} strokeWidth="4" />
      <ellipse cx="34" cy="28" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-25 34 28)" />
      <circle cx="24" cy="63" r="6" fill="#fb7185" opacity="0.35" />
      <circle cx="76" cy="63" r="6" fill="#fb7185" opacity="0.35" />
      <Eyes type={avatar.eyes} />
      <Mouth type={avatar.mouth} />
      <Accessory type={avatar.accessory} />
    </svg>
  );
}
