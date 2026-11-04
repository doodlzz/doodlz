import { useEffect, useState } from 'react';
import { CalendarCheck, Check } from 'lucide-react';
import { useT } from '../i18n';
import { loadProgress, msUntilReset, questsFor } from '../lib/quests';

function formatLeft(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function DailyQuests({ className = '' }: { className?: string }) {
  const t = useT();
  const [progress, setProgress] = useState(loadProgress);
  const [left, setLeft] = useState(msUntilReset);

  useEffect(() => {
    const refresh = () => {
      setProgress(loadProgress());
      setLeft(msUntilReset());
    };
    const id = setInterval(refresh, 30_000);
    window.addEventListener('doodlz:quests', refresh);
    window.addEventListener('storage', refresh); // other tabs
    return () => {
      clearInterval(id);
      window.removeEventListener('doodlz:quests', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const quests = questsFor(progress.day);

  return (
    <div className={`panel p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-indigo-950">
          <CalendarCheck className="size-5 text-emerald-500" /> {t('quests.title')}
        </h2>
        <span className="text-xs font-bold text-indigo-300">{t('quests.resets', { time: formatLeft(left) })}</span>
      </div>
      <p className="-mt-1.5 mb-2.5 text-xs font-bold text-indigo-400">{t('quests.note')}</p>
      <ul className="flex flex-col gap-2">
        {quests.map((q) => {
          const n = progress.progress[q.id] ?? 0;
          const done = n >= q.target;
          return (
            <li key={q.id} className={`rounded-2xl px-3 py-2 ${done ? 'bg-emerald-100' : 'bg-indigo-50/70'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {q.emoji}
                </span>
                <span className={`flex-1 text-sm font-bold ${done ? 'text-emerald-700' : 'text-indigo-900'}`}>{t(`quest.${q.id}`)}</span>
                {done ? (
                  <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-700">
                    <Check className="size-4" strokeWidth={3} /> {t('quests.done')}
                  </span>
                ) : (
                  <span className="text-xs font-extrabold text-indigo-400">
                    {n}/{q.target}
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-indigo-100">
                <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-pink-500'}`} style={{ width: `${(n / q.target) * 100}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
