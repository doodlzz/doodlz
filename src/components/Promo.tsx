import { Heart } from 'lucide-react';
import { useT } from '../i18n';

// Placeholder modules. Set VITE_SUPPORT_URL at build time to point the button at a real donation page.
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL as string | undefined;

export function SupportCard({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <div className={`flex items-center gap-3 rounded-3xl bg-white/15 p-4 text-white backdrop-blur-sm ${className}`}>
      <Heart className="size-8 shrink-0 fill-pink-400 text-pink-300" />
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-semibold">{t('support.title')}</div>
        <div className="text-sm font-semibold text-white/80">{t('support.text')}</div>
      </div>
      <a
        href={SUPPORT_URL || '#'}
        target={SUPPORT_URL ? '_blank' : undefined}
        rel="noreferrer"
        onClick={(e) => !SUPPORT_URL && e.preventDefault()}
        className="btn btn-pink shrink-0 px-4 py-2 text-base"
      >
        {t('support.button')}
      </a>
    </div>
  );
}

/** Reserved ad space. Swap the inner box for an ad network's tag when you have one. */
export function AdSlot({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <div className={`grid min-h-[90px] place-items-center rounded-3xl border-4 border-dashed border-white/25 text-xs font-extrabold tracking-widest text-white/50 uppercase ${className}`} aria-label={t('ad.label')}>
      {t('ad.label')}
    </div>
  );
}
