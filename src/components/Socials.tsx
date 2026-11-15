import type { ReactNode } from 'react';
import { SOCIAL_LINKS } from '../config/socials';
import { useT } from '../i18n';

// Simple hand-drawn glyphs (the icon library has no brand logos); Discord uses its official round badge.
const ICONS: Record<keyof typeof SOCIAL_LINKS, { label: string; bg: string; round?: boolean; icon: ReactNode }> = {
  discord: {
    label: 'Discord',
    bg: 'bg-[#5865F2]',
    round: true,
    icon: (
      <svg viewBox="0 0 24 24" className="size-[26px]" fill="currentColor" aria-hidden>
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" />
      </svg>
    ),
  },
  instagram: {
    label: 'Instagram',
    bg: 'bg-[linear-gradient(45deg,#f9ce34,#ee2a7b,#6228d7)]',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.6" />
        <circle cx="16.8" cy="7.2" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  tiktok: {
    label: 'TikTok',
    bg: 'bg-[#111111]',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" fill="none" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
        <path d="M13.5 4v10.2a3.3 3.3 0 1 1-3.3-3.3" stroke="#25F4EE" transform="translate(-0.8 0.6)" />
        <path d="M13.5 4c.4 2.3 2 3.8 4.3 4" stroke="#FE2C55" transform="translate(0.8 -0.4)" />
        <path d="M13.5 4v10.2a3.3 3.3 0 1 1-3.3-3.3M13.5 4c.4 2.3 2 3.8 4.3 4" stroke="#fff" />
      </svg>
    ),
  },
  youtube: {
    label: 'YouTube',
    bg: 'bg-[#FF0000]',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
        <rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="currentColor" />
        <path d="M10 9v6l5.2-3Z" fill="#FF0000" />
      </svg>
    ),
  },
};

export default function Socials({ className = '' }: { className?: string }) {
  const t = useT();
  const links = (Object.keys(ICONS) as (keyof typeof ICONS)[]).filter((k) => SOCIAL_LINKS[k]);
  if (!links.length) return null;
  return (
    <div className={`flex flex-col items-center gap-2 lg:items-end ${className}`}>
      <span className="text-xs font-extrabold tracking-widest text-white/90 uppercase">{t('socials.title')}</span>
      <div className="flex gap-2">
        {links.map((k) => (
          <a
            key={k}
            href={SOCIAL_LINKS[k]}
            target="_blank"
            rel="noreferrer"
            aria-label={ICONS[k].label}
            title={ICONS[k].label}
            className={`grid size-12 place-items-center ${ICONS[k].round ? 'rounded-full' : 'rounded-2xl'} text-white lg:size-11 xl:size-12 shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:translate-y-[2px] ${ICONS[k].bg}`}
          >
            {ICONS[k].icon}
          </a>
        ))}
      </div>
    </div>
  );
}
