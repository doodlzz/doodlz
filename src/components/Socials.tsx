import type { ReactNode } from 'react';
import { SOCIAL_LINKS } from '../config/socials';
import { useT } from '../i18n';

// Simple hand-drawn glyphs (the icon library has no brand logos).
const ICONS: Record<keyof typeof SOCIAL_LINKS, { label: string; bg: string; icon: ReactNode }> = {
  discord: {
    label: 'Discord',
    bg: 'bg-[#5865F2]',
    icon: (
      <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden>
        <path d="M7.5 5.5c1.4-.6 2.9-1 4.5-1s3.1.4 4.5 1c1.9 2.7 2.8 5.7 2.6 9.3-1.3 1.1-2.8 1.9-4.4 2.4l-.9-1.6c.6-.2 1.1-.5 1.6-.8-2.3 1.1-4.5 1.1-6.8 0 .5.3 1 .6 1.6.8l-.9 1.6c-1.6-.5-3.1-1.3-4.4-2.4-.2-3.6.7-6.6 2.6-9.3Z" />
        <circle cx="9.3" cy="11.8" r="1.4" className="fill-[#5865F2]" />
        <circle cx="14.7" cy="11.8" r="1.4" className="fill-[#5865F2]" />
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
    <div className={`flex flex-col items-center gap-2 xl:items-end ${className}`}>
      <span className="text-xs font-extrabold tracking-widest text-white/70 uppercase">{t('socials.title')}</span>
      <div className="flex gap-2">
        {links.map((k) => (
          <a
            key={k}
            href={SOCIAL_LINKS[k]}
            target="_blank"
            rel="noreferrer"
            aria-label={ICONS[k].label}
            title={ICONS[k].label}
            className={`grid size-12 place-items-center rounded-2xl text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] transition hover:-translate-y-0.5 active:translate-y-[2px] ${ICONS[k].bg}`}
          >
            {ICONS[k].icon}
          </a>
        ))}
      </div>
    </div>
  );
}
