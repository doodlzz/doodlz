import { useEffect, useState } from 'react';
import { CalendarCheck, Check, Star } from 'lucide-react';
import { POINTS, utcDay } from '../../shared/quests';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import { loadProgress, msUntilReset, questsFor } from '../lib/quests';

function formatLeft(ms: number) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

export default function DailyQuests({ className = '' }: { className?: string }) {
  const t = useT();
  const { account, open } = useAuth();
  const [local, setLocal] = useState(loadProgress);
  const [left, setLeft] = useState(msUntilReset);

  useEffect(() => {
    const refresh = () => {
      setLocal(loadProgress());
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

  // Signed-in players see the server's count (ranked games only); guests see this browser's.
  const day = utcDay();
  const progress = account ? (account.daily.day === day ? account.daily.progress : {}) : local.day === day ? local.progress : {};
  const quests = questsFor(day);

  return (
    <div className={`panel p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-indigo-950">
          <CalendarCheck className="size-5 text-emerald-500" /> {t('quests.title')}
        </h2>
        <span className="text-xs font-bold text-indigo-300">{t('quests.resets', { time: formatLeft(left) })}</span>
      </div>
      <p className="-mt-1.5 mb-2.5 text-xs font-bold text-indigo-400">
        {account ? (
          t('quests.rankedNote', { n: POINTS.rankedMinPlayers })
        ) : (
          <>
            {t('quests.note')}{' '}
            <button type="button" className="cursor-pointer text-pink-500 underline underline-offset-2 hover:text-pink-400" onClick={() => open('register')}>
              {t('quests.signIn')}
            </button>
          </>
        )}
      </p>
      <ul className="flex flex-col gap-2">
        {quests.map((q) => {
          const n = progress[q.id] ?? 0;
          const done = n >= q.target;
          return (
            <li key={q.id} className={`rounded-2xl px-3 py-2 ${done ? 'bg-emerald-100' : 'bg-indigo-50/70'}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg" aria-hidden>
                  {q.emoji}
                </span>
                <span className={`flex-1 text-sm font-bold ${done ? 'text-emerald-700' : 'text-indigo-900'}`}>{t(`quest.${q.id}`)}</span>
                {account && (
                  <span className="flex items-center gap-0.5 text-xs font-extrabold text-amber-500" title={t('points.title')}>
                    +{POINTS.quest} <Star className="size-3 fill-current" />
                  </span>
                )}
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
