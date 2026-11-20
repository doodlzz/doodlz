import { Crown, Gem } from 'lucide-react';
import { useT } from '../i18n';

/** Badge look by level: plain, bronze, silver, gold, diamond, then rainbow at 100. */
function tier(level: number): { cls: string; icon?: 'gem' | 'crown' } {
  if (level >= 100) return { cls: 'level-rainbow text-white', icon: 'crown' };
  if (level >= 75) return { cls: 'bg-sky-100 text-sky-800 ring-1 ring-sky-300 dark:bg-sky-400/20 dark:text-sky-200', icon: 'gem' };
  if (level >= 50) return { cls: 'bg-amber-100 text-amber-800 ring-1 ring-amber-400 dark:bg-amber-400/20 dark:text-amber-200' };
  // Indigo and slate already flip in dark mode (see index.css), so these two need no dark: variants.
  if (level >= 25) return { cls: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 dark:ring-slate-400' };
  if (level >= 10) return { cls: 'bg-orange-100 text-orange-800 ring-1 ring-orange-300 dark:bg-orange-400/20 dark:text-orange-200' };
  return { cls: 'bg-indigo-100 text-indigo-600' };
}

/** Small "Lv 12" chip shown next to signed-in players' names. */
export default function LevelBadge({ level, className = '' }: { level: number; className?: string }) {
  const t = useT();
  const { cls, icon } = tier(level);
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-px align-middle font-sans text-[11px] leading-4 font-extrabold whitespace-nowrap ${cls} ${className}`}
      title={t('level.title', { n: level })}
    >
      {icon === 'gem' && <Gem className="size-3" aria-hidden />}
      {icon === 'crown' && <Crown className="size-3" aria-hidden />}
      {t('level.short', { n: level })}
    </span>
  );
}
