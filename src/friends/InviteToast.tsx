import { useEffect } from 'react';
import { DoorOpen, X } from 'lucide-react';
import Avatar from '../components/Avatar';
import TaggedName from '../components/TaggedName';
import { useT } from '../i18n';
import { useFriends } from './FriendsContext';

/** "name invited you to their room" with Join, shown for 20 seconds. */
export default function InviteToast() {
  const t = useT();
  const { pendingInvite: inv, dismissInvite, joinRoom, myRoomCode } = useFriends();

  useEffect(() => {
    if (!inv) return;
    const id = setTimeout(dismissInvite, 20_000);
    return () => clearTimeout(id);
  }, [inv, dismissInvite]);

  if (!inv || inv.code === myRoomCode) return null;
  return (
    <div className="panel fixed right-4 bottom-4 z-[75] flex w-[min(92vw,22rem)] animate-pop items-center gap-3 p-3" role="alert">
      <Avatar avatar={inv.avatar} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-bold text-indigo-950">
          <TaggedName name={inv.name} fx={inv.avatar.nameFx} />
        </div>
        <div className="text-xs font-bold text-indigo-400">{t('friends.invitedYou')}</div>
      </div>
      <button type="button" className="btn btn-green px-3 py-1.5 text-sm" onClick={() => joinRoom(inv.code)}>
        <DoorOpen className="size-4" /> {t('friends.join')}
      </button>
      <button type="button" className="btn btn-ghost size-8 p-0" onClick={dismissInvite} aria-label={t('set.close')}>
        <X className="size-4" />
      </button>
    </div>
  );
}
