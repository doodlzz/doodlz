import { Users } from 'lucide-react';
import { useT } from '../i18n';
import { useFriends } from './FriendsContext';

/** Top-bar button for signed-in players: opens the friends window; the dot counts requests and unread messages. */
export default function FriendsButton() {
  const t = useT();
  const { state, badge, openPanel } = useFriends();
  if (!state) return null;
  return (
    <button
      type="button"
      onClick={() => openPanel()}
      className="relative flex cursor-pointer items-center rounded-2xl bg-white/15 px-2.5 py-2 text-white backdrop-blur-sm transition hover:bg-white/25"
      title={t('friends.title')}
      aria-label={badge ? t('friends.openWithCount', { n: badge }) : t('friends.title')}
    >
      <Users className="size-5" />
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-[11px] font-extrabold text-white ring-2 ring-white/70">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}
