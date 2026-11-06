import { useId } from 'react';
import AvatarFrame from './AvatarFrame';
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
    case 6: // hearts
      return (
        <g fill="#f43f5e" stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M36 54 C24 46 26 36 36 42 C46 36 48 46 36 54 Z" />
          <path d="M64 54 C52 46 54 36 64 42 C74 36 76 46 64 54 Z" />
        </g>
      );
    case 7: // stars
      return (
        <g fill="#facc15" stroke={INK} strokeWidth="2.5" strokeLinejoin="round">
          <path d="M36 36 L39 43 L46 44 L41 49 L42 56 L36 52 L30 56 L31 49 L26 44 L33 43 Z" />
          <path d="M64 36 L67 43 L74 44 L69 49 L70 56 L64 52 L58 56 L59 49 L54 44 L61 43 Z" />
        </g>
      );
    case 8: // knocked out
      return (
        <g stroke={INK} strokeWidth="4.5" strokeLinecap="round">
          <path d="M30 40 L42 52 M42 40 L30 52" />
          <path d="M58 40 L70 52 M70 40 L58 52" />
        </g>
      );
    case 9: // cyclops
      return (
        <g>
          <circle cx="50" cy="44" r="15" fill="#fff" stroke={INK} strokeWidth="3" />
          <circle cx="50" cy="46" r="7.5" fill={INK} />
          <circle cx="53" cy="42.5" r="2.6" fill="#fff" />
        </g>
      );
    case 10: // sparkly
      return (
        <g>
          <ellipse cx="36" cy="46" rx="7.5" ry="10" fill={INK} />
          <ellipse cx="64" cy="46" rx="7.5" ry="10" fill={INK} />
          <circle cx="38.5" cy="42" r="3" fill="#fff" />
          <circle cx="66.5" cy="42" r="3" fill="#fff" />
          <circle cx="34" cy="50" r="1.6" fill="#fff" />
          <circle cx="62" cy="50" r="1.6" fill="#fff" />
        </g>
      );
    case 11: // dizzy
      return (
        <g fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round">
          <path d="M36 46 m0 -1.5 a1.5 1.5 0 1 1 -1.5 1.5 a4 4 0 1 1 4 4 a6.5 6.5 0 1 1 6.5 -6.5" />
          <path d="M64 46 m0 -1.5 a1.5 1.5 0 1 1 -1.5 1.5 a4 4 0 1 1 4 4 a6.5 6.5 0 1 1 6.5 -6.5" />
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
    case 6: // frown
      return <path d="M37 72 Q50 61 63 72" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
    case 7: // fangs
      return (
        <g>
          <path d="M36 63 Q50 75 64 63" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M41 66 L44 74 L47 68.5 Z M53 68.5 L56 74 L59 66 Z" fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
        </g>
      );
    case 8: // toothy
      return (
        <g stroke={INK} strokeLinejoin="round">
          <path d="M33 62 Q50 84 67 62 Z" fill="#fff" strokeWidth="3.5" />
          <path d="M42 63 L43 72 M50 63 L50 75 M58 63 L57 72" fill="none" strokeWidth="2.5" />
        </g>
      );
    case 9: // nervous
      return <path d="M34 68 L40 63.5 L46 69 L52 63.5 L58 69 L64 63.5" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
    case 10: // mustache
      return (
        <g>
          <path d="M44 72 Q50 76 56 72" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
          <path d="M50 63 C44 58 34 60 30 68 C36 66 42 68 50 66 C58 68 64 66 70 68 C66 60 56 58 50 63 Z" fill="#7c4a2d" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    case 11: // kiss
      return <path d="M46 63 Q53 66 47 69 Q53 72 46 75" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />;
    default: // smile
      return <path d="M36 63 Q50 77 64 63" fill="none" stroke={INK} strokeWidth="4.5" strokeLinecap="round" />;
  }
}

function Accessory({ type, color }: { type: number; color: string }) {
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
    case 6: // halo
      return (
        <g fill="none">
          <ellipse cx="50" cy="2" rx="22" ry="6.5" stroke={INK} strokeWidth="8" />
          <ellipse cx="50" cy="2" rx="22" ry="6.5" stroke="#fde047" strokeWidth="4" />
        </g>
      );
    case 7: // devil horns
      return (
        <g fill="#ef4444" stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M27 24 Q18 10 24 -2 Q30 12 40 16 Z" />
          <path d="M73 24 Q82 10 76 -2 Q70 12 60 16 Z" />
        </g>
      );
    case 8: // cat ears
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M16 36 L20 0 L46 15 Z" fill={color} />
          <path d="M84 36 L80 0 L54 15 Z" fill={color} />
          <path d="M22 26 L24 9 L36 16 Z M78 26 L76 9 L64 16 Z" fill="#fda4af" strokeWidth="0" />
        </g>
      );
    case 9: // headphones
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M12 52 Q10 4 50 4 Q90 4 88 52" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" />
          <path d="M12 52 Q10 4 50 4 Q90 4 88 52" fill="none" stroke="#818cf8" strokeWidth="3" strokeLinecap="round" />
          <rect x="2" y="42" width="15" height="26" rx="6" fill="#818cf8" />
          <rect x="83" y="42" width="15" height="26" rx="6" fill="#818cf8" />
        </g>
      );
    case 10: // sunglasses
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M22 39 L48 39 L46 51 Q36 58 26 51 Z" fill={INK} />
          <path d="M52 39 L78 39 L74 51 Q64 58 54 51 Z" fill={INK} />
          <path d="M48 42 L52 42 M22 40 L12 37 M78 40 L88 37" fill="none" />
          <path d="M27 43 L33 43" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </g>
      );
    case 11: // wizard hat
      return (
        <g stroke={INK} strokeWidth="3" strokeLinejoin="round">
          <path d="M30 18 Q42 2 60 -12 Q60 4 70 18 Z" fill="#7c3aed" />
          <path d="M51 4 L53 8.5 L58 9 L54.5 12 L55.5 17 L51 14.5 L46.5 17 L47.5 12 L44 9 L49 8.5 Z" fill="#facc15" strokeWidth="1.5" />
          <ellipse cx="50" cy="19" rx="29" ry="6" fill="#6d28d9" />
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
  const clip = useId();
  if (avatar.image) {
    // Uploaded picture, cropped to the same round head.
    return (
      <svg viewBox="0 -14 100 118" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
        <defs>
          <clipPath id={clip}>
            <circle cx="50" cy="54" r="42" />
          </clipPath>
        </defs>
        <circle cx="50" cy="54" r="42" fill={avatar.color} />
        <image href={avatar.image} x="8" y="12" width="84" height="84" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
        <circle cx="50" cy="54" r="42" fill="none" stroke={INK} strokeWidth="4" />
        {avatar.frame && <AvatarFrame frame={avatar.frame} />}
      </svg>
    );
  }
  return (
    <svg viewBox="0 -14 100 118" width={size} height={size} className={`shrink-0 overflow-visible ${className}`} aria-hidden>
      <circle cx="50" cy="54" r="42" fill={avatar.color} stroke={INK} strokeWidth="4" />
      <ellipse cx="34" cy="28" rx="12" ry="7" fill="#fff" opacity="0.35" transform="rotate(-25 34 28)" />
      <circle cx="24" cy="63" r="6" fill="#fb7185" opacity="0.35" />
      <circle cx="76" cy="63" r="6" fill="#fb7185" opacity="0.35" />
      <Eyes type={avatar.eyes} />
      <Mouth type={avatar.mouth} />
      <Accessory type={avatar.accessory} color={avatar.color} />
      {avatar.frame && <AvatarFrame frame={avatar.frame} />}
    </svg>
  );
}
