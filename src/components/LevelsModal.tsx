import { useEffect, useRef } from 'react';
import { Check, Gift, Star, TrendingUp, X } from 'lucide-react';
import { BADGE_TIERS, CASUAL_XP, LEVEL_UP_POINTS, MAX_LEVEL, levelInfo, xpForLevel } from '../../shared/levels';
import { POINTS } from '../../shared/quests';
import { useAfterFirstPaint } from '../hooks/useAfterFirstPaint';
import { useT } from '../i18n';
import LevelBadge from './LevelBadge';

/** Every level from 2 to the max: what it unlocks and how much XP it takes. Scrolls to the next level. */
export default function LevelsModal({ xp, onClose }: { xp: number; onClose: () => void }) {
  const t = useT();
  const { level, into, span } = levelInfo(xp);
  const nextRow = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    nextRow.current?.scrollIntoView({ block: 'center' });
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Opens with the levels up to a dozen past yours (so it can scroll to the next one), and adds the rest a
  // frame later, after the window is on screen.
  const full = useAfterFirstPaint();
  const last = full ? MAX_LEVEL : Math.min(MAX_LEVEL, level + 12);
  const levels = Array.from({ length: last - 1 }, (_, i) => i + 2);

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="levels-title" onClick={onClose}>
      <div className="panel flex max-h-[90vh] w-full max-w-lg animate-modal flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="levels-title" className="flex items-center gap-2 font-display text-2xl font-bold text-indigo-950">
            <TrendingUp className="size-6 text-violet-500" /> {t('levels.title')}
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost size-10 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>

        {/* Where you are now. */}
        <div className="mb-3 rounded-2xl bg-violet-50 px-4 py-3 dark:bg-violet-400/10">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 font-display text-xl font-semibold text-indigo-950">
              <LevelBadge level={level} /> {t('level.title', { n: level })}
            </span>
            <span className="text-sm font-extrabold text-violet-600 dark:text-violet-300">{t('levels.totalXp', { n: xp.toLocaleString() })}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-violet-100 dark:bg-white/10">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${span ? (into / span) * 100 : 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs font-bold text-indigo-500">
            {span ? t('levels.toNext', { n: (span - into).toLocaleString(), level: level + 1 }) : t('level.max')}
          </p>
        </div>

        {/* How XP is earned. */}
        <ul className="mb-3 grid gap-1 text-xs font-bold text-indigo-500">
          <li>🌍 {t('levels.howPublic', { n: POINTS.rankedMinPlayers })}</li>
          <li>📅 {t('levels.howQuests')}</li>
          <li>🏠 {t('levels.howPrivate', { game: CASUAL_XP.perGame, day: CASUAL_XP.perDay })}</li>
        </ul>

        {/* The track. */}
        <ol className="-mx-1 flex-1 overflow-y-auto px-1">
          {levels.map((n) => {
            const need = xpForLevel(n);
            const reached = level >= n;
            const isNext = n === level + 1;
            const tier = BADGE_TIERS.find((b) => b.level === n);
            return (
              <li
                key={n}
                ref={isNext ? nextRow : undefined}
                className={`mb-1.5 flex items-center gap-3 rounded-2xl px-3 py-2 ${
                  isNext ? 'bg-pink-50 ring-2 ring-pink-300 dark:bg-pink-400/10' : reached ? 'bg-emerald-50 dark:bg-emerald-400/10' : 'bg-indigo-50/70'
                } ${tier ? 'py-3' : ''}`}
              >
                <span className="w-16 shrink-0">
                  <LevelBadge level={n} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm font-bold text-indigo-950">
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-300">
                      <Star className="size-3.5 fill-current" /> {t('level.bonus', { n: LEVEL_UP_POINTS })}
                    </span>
                    {tier && (
                      <span className="flex items-center gap-1 text-violet-600 dark:text-violet-300">
                        <Gift className="size-3.5" /> {t(`levels.tier.${tier.id}`)}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-bold text-indigo-400">{t('levels.needs', { n: need.toLocaleString() })}</div>
                </div>
                {reached ? (
                  <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-600">
                    <Check className="size-4" strokeWidth={3} /> {t('quests.done')}
                  </span>
                ) : (
                  <span className={`text-right text-xs font-extrabold ${isNext ? 'text-pink-500' : 'text-indigo-400'}`}>{t('levels.toGo', { n: (need - xp).toLocaleString() })}</span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
