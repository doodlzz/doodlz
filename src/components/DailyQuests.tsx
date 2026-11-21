import { useEffect, useState, type ReactNode } from 'react';
import { CalendarCheck, CalendarRange, Check, ChevronDown, Star } from 'lucide-react';
import { levelInfo } from '../../shared/levels';
import { POINTS, utcDay, utcWeek } from '../../shared/quests';
import LevelBadge from './LevelBadge';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import { loadProgress, loadWeeklyProgress, msUntilReset, msUntilWeeklyReset, questsFor, weeklyQuestsFor, type QuestDef, type QuestId } from '../lib/quests';

function formatLeft(ms: number) {
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return d > 0 ? `${d}d ${h}h` : `${h}h ${String(m).padStart(2, '0')}m`;
}

/** Signed-in players: current level and XP toward the next one. */
function LevelBar({ xp }: { xp: number }) {
  const t = useT();
  const { openLevels } = useAuth();
  const { level, into, span } = levelInfo(xp);
  return (
    <button
      type="button"
      onClick={openLevels}
      title={t('levels.open')}
      className="mb-4 block w-full cursor-pointer rounded-2xl bg-indigo-50/70 px-3 py-2.5 text-left transition hover:bg-indigo-100 hover:ring-2 hover:ring-violet-300"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-display text-base font-semibold text-indigo-950">
          <LevelBadge level={level} /> {t('level.title', { n: level })}
        </span>
        <span className="text-xs font-extrabold text-indigo-400">{span ? t('level.progress', { into, span }) : t('level.max')}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-indigo-100" role="progressbar" aria-valuemin={0} aria-valuemax={span || 1} aria-valuenow={span ? into : 1}>
        <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${span ? (into / span) * 100 : 100}%` }} />
      </div>
    </button>
  );
}

function QuestList({ quests, progress, showPoints }: { quests: QuestDef[]; progress: Partial<Record<QuestId, number>>; showPoints: boolean }) {
  const t = useT();
  return (
    <ul className="flex flex-col gap-2">
      {quests.map((q) => {
        const n = progress[q.id as QuestId] ?? 0;
        const done = n >= q.target;
        return (
          <li key={q.id} className={`rounded-2xl px-3 py-2 ${done ? 'bg-emerald-100' : 'bg-indigo-50/70'}`}>
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden>
                {q.emoji}
              </span>
              <span className={`flex-1 text-sm font-bold ${done ? 'text-emerald-700' : 'text-indigo-900'}`}>{t(`quest.${q.id}`)}</span>
              {showPoints && (
                <span className="flex items-center gap-0.5 text-xs font-extrabold text-amber-500" title={t('points.title')}>
                  +{q.points} <Star className="size-3 fill-current" />
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
  );
}

/** Remembers whether a quest section is folded up, per browser. */
function useCollapsed(key: string) {
  const storageKey = `doodlz:quests-collapsed:${key}`;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(storageKey, c ? '0' : '1');
      } catch {
        /* storage blocked: still works for this visit */
      }
      return !c;
    });
  return [collapsed, toggle] as const;
}

/** Section title that folds its quests away when clicked; the arrow flips to match. */
function SectionToggle({ icon, title, collapsed, onToggle }: { icon: ReactNode; title: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <h2 className="font-display text-lg font-semibold text-indigo-950">
      <button type="button" onClick={onToggle} aria-expanded={!collapsed} className="group flex cursor-pointer items-center gap-2 rounded-lg text-left whitespace-nowrap">
        {icon} {title}
        <ChevronDown className={`size-5 text-indigo-400 transition-transform duration-200 group-hover:text-violet-500 ${collapsed ? '-rotate-90' : ''}`} strokeWidth={2.5} aria-hidden />
      </button>
    </h2>
  );
}

/** Smoothly folds its children open and shut. */
function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <div className={`grid transition-[grid-template-rows] duration-200 ease-out ${collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`} inert={collapsed}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export default function DailyQuests({ className = '' }: { className?: string }) {
  const t = useT();
  const { account, open } = useAuth();
  const [local, setLocal] = useState(loadProgress);
  const [localWeek, setLocalWeek] = useState(loadWeeklyProgress);
  const [left, setLeft] = useState(msUntilReset);
  const [weekLeft, setWeekLeft] = useState(msUntilWeeklyReset);
  const [dailyCollapsed, toggleDaily] = useCollapsed('daily');
  const [weeklyCollapsed, toggleWeekly] = useCollapsed('weekly');

  useEffect(() => {
    const refresh = () => {
      setLocal(loadProgress());
      setLocalWeek(loadWeeklyProgress());
      setLeft(msUntilReset());
      setWeekLeft(msUntilWeeklyReset());
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
  const week = utcWeek();
  const weekProgress = account ? (account.weekly?.week === week ? account.weekly.progress : {}) : localWeek.week === week ? localWeek.progress : {};
  const weekly = weeklyQuestsFor(week);

  return (
    <div className={`panel p-4 ${className}`}>
      {account && <LevelBar xp={account.xp ?? 0} />}
      <div className={`flex items-center justify-between gap-2 transition-[margin] duration-200 ${dailyCollapsed ? 'mb-0' : 'mb-1.5'}`}>
        <SectionToggle icon={<CalendarCheck className="size-5 text-emerald-500" />} title={t('quests.title')} collapsed={dailyCollapsed} onToggle={toggleDaily} />
        <span className="text-right text-xs font-bold text-indigo-300">{t('quests.resets', { time: formatLeft(left) })}</span>
      </div>
      <Collapsible collapsed={dailyCollapsed}>
        <p className="mb-2.5 text-xs font-bold text-indigo-400">
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
        <QuestList quests={quests} progress={progress} showPoints={!!account} />
      </Collapsible>

      <div className={`mt-4 flex items-center justify-between gap-2 transition-[margin] duration-200 ${weeklyCollapsed ? 'mb-0' : 'mb-2'}`}>
        <SectionToggle icon={<CalendarRange className="size-5 text-violet-500" />} title={t('quests.weeklyTitle')} collapsed={weeklyCollapsed} onToggle={toggleWeekly} />
        <span className="text-right text-xs font-bold text-indigo-300">{t('quests.resets', { time: formatLeft(weekLeft) })}</span>
      </div>
      <Collapsible collapsed={weeklyCollapsed}>
        <QuestList quests={weekly} progress={weekProgress} showPoints={!!account} />
      </Collapsible>
    </div>
  );
}
