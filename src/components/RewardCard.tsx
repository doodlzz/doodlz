import { Star } from 'lucide-react';
import { POINTS, type RewardSummary } from '../../shared/quests';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';

/** End screen: what this game earned the player in account points, or why it didn't count. */
export default function RewardCard({ reward }: { reward: RewardSummary }) {
  const t = useT();
  const { open } = useAuth();

  if (!reward.ranked) {
    return (
      <div className="mb-4 flex items-center gap-3 rounded-2xl bg-indigo-50 px-4 py-3">
        <Star className="size-6 shrink-0 text-indigo-300" />
        <p className="flex-1 text-sm font-bold text-indigo-500">
          {t(`reward.${reward.reason ?? 'noScore'}`, { n: POINTS.rankedMinPlayers })}
          {reward.reason === 'guest' && (
            <>
              {' '}
              <button type="button" className="cursor-pointer text-pink-500 underline underline-offset-2 hover:text-pink-400" onClick={() => open('register')}>
                {t('auth.register')}
              </button>
            </>
          )}
        </p>
      </div>
    );
  }

  const earned = reward.gamePoints + reward.questPoints;
  const placeKey = reward.place <= 3 ? `reward.place${reward.place}` : 'reward.finished';
  return (
    <div className="mb-4 animate-pop rounded-2xl bg-amber-50 px-4 py-3 ring-4 ring-amber-200 dark:bg-amber-400/10 dark:ring-amber-400/30">
      <div className="flex items-center gap-3">
        <Star className="size-8 shrink-0 fill-amber-400 text-amber-500" />
        <div className="flex-1">
          <div className="font-display text-2xl font-bold text-amber-600">{t('reward.earned', { n: earned })}</div>
          <div className="text-xs font-bold text-amber-700/80 dark:text-amber-300/80">{t('reward.total', { n: (reward.total ?? 0).toLocaleString() })}</div>
        </div>
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-sm font-bold text-amber-800 dark:text-amber-200">
        <li className="flex justify-between gap-2">
          <span>{t(placeKey)}</span>
          <span>+{reward.gamePoints}</span>
        </li>
        {reward.questsDone.map((q) => (
          <li key={q} className="flex justify-between gap-2">
            <span>{t('reward.quest', { quest: t(`quest.${q}`) })}</span>
            <span>+{POINTS.quest}</span>
          </li>
        ))}
      </ul>
      {reward.capped && <p className="mt-1.5 text-xs font-bold text-amber-700/80 dark:text-amber-300/80">{t('reward.capped', { n: POINTS.dailyGameCap })}</p>}
    </div>
  );
}
