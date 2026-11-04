import { useEffect, useRef, useState } from 'react';
import { HelpCircle, Lightbulb, Pencil, Target, Trophy, Zap } from 'lucide-react';
import { SCORING } from '../../shared/types';
import { useT } from '../i18n';

/** "?" button that explains exactly how points are earned. */
export default function ScoringHelp({ targetScore = 0, className = '' }: { targetScore?: number; className?: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const rows = [
    {
      icon: <Trophy className="size-4 text-amber-500" />,
      title: t('score.guess'),
      value: `${SCORING.word.easy} / ${SCORING.word.medium} / ${SCORING.word.hard}`,
      note: t('score.guessNote'),
    },
    { icon: <Zap className="size-4 text-pink-500" />, title: t('score.fast'), value: `+${SCORING.firstBonus} / +${SCORING.secondBonus}`, note: t('score.fastNote') },
    { icon: <Lightbulb className="size-4 text-yellow-500" />, title: t('score.hint'), value: `−${SCORING.hintCost}`, note: t('score.hintNote') },
    {
      icon: <Pencil className="size-4 text-sky-500" />,
      title: t('score.draw'),
      value: `+${SCORING.drawerPerGuess}`,
      note: t('score.drawNote', { max: SCORING.drawerMax }),
    },
  ];

  return (
    <div className={`relative ${className}`} ref={root}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-7 cursor-pointer place-items-center rounded-full text-indigo-300 transition hover:bg-indigo-100 hover:text-indigo-600"
        aria-label={t('score.title')}
        title={t('score.title')}
        aria-expanded={open}
      >
        <HelpCircle className="size-5" />
      </button>
      {open && (
        <div className="panel absolute top-full right-0 z-50 mt-2 w-72 animate-pop p-4 text-left font-sans" role="dialog" aria-label={t('score.title')}>
          <h3 className="mb-2 font-display text-lg font-semibold text-indigo-950">{t('score.title')}</h3>
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <li key={r.title} className="rounded-xl bg-indigo-50/70 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                  {r.icon}
                  <span className="flex-1">{r.title}</span>
                  <span className="font-display text-base text-indigo-950">{r.value}</span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-indigo-400">{r.note}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs font-bold text-indigo-500">
            <Target className="mt-0.5 size-4 shrink-0 text-emerald-500" />
            {targetScore > 0 ? t('score.winTarget', { n: targetScore }) : t('score.winRounds')}
          </p>
        </div>
      )}
    </div>
  );
}
