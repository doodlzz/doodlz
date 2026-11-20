import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, Check, DoorOpen, Loader2, MessageCircle, Send, UserMinus, UserPlus, Users, X } from 'lucide-react';
import type { FriendInfo, FriendRequestInfo, FriendStatus } from '../../shared/friends';
import Avatar from '../components/Avatar';
import TaggedName from '../components/TaggedName';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import { useFriends } from './FriendsContext';

const DOT: Record<FriendStatus, string> = {
  offline: 'bg-slate-300 dark:bg-slate-600',
  online: 'bg-emerald-400',
  lobby: 'bg-sky-400',
  playing: 'bg-amber-400',
};

function StatusLine({ status }: { status: FriendStatus }) {
  const t = useT();
  return (
    <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-400">
      <span className={`size-2 rounded-full ${DOT[status]}`} aria-hidden /> {t(`friends.status.${status}`)}
    </span>
  );
}

function AddFriend() {
  const t = useT();
  const { request } = useFriends();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; key: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nameTag = value.trim();
    if (!/^.+#\d{4}$/.test(nameTag)) return setNote({ ok: false, key: 'friends.err.format' });
    setBusy(true);
    const res = await request({ nameTag });
    setBusy(false);
    if ('error' in res) return setNote({ ok: false, key: res.error });
    setNote({ ok: true, key: res.accepted ? 'friends.nowFriends' : 'friends.sent' });
    setValue('');
  };

  return (
    <form onSubmit={submit} className="mb-3">
      <label className="label" htmlFor="add-friend">
        {t('friends.add')}
      </label>
      <div className="flex gap-2">
        <input
          id="add-friend"
          className="input py-2"
          placeholder={t('friends.addPlaceholder')}
          value={value}
          maxLength={30}
          onChange={(e) => {
            setValue(e.target.value);
            setNote(null);
          }}
        />
        <button type="submit" className="btn btn-pink shrink-0 px-4 py-2 text-base" disabled={busy || !value.trim()}>
          {busy ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />}
          <span className="hidden sm:inline">{t('friends.send')}</span>
        </button>
      </div>
      {note && (
        <p className={`mt-1.5 px-1 text-xs font-bold ${note.ok ? 'text-emerald-600' : 'text-rose-600'}`} role="status">
          {t(note.key)}
        </p>
      )}
    </form>
  );
}

function FriendRow({ f }: { f: FriendInfo }) {
  const t = useT();
  const { joinRoom, invite, remove, setChatWith, myRoomCode } = useFriends();
  const [confirm, setConfirm] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const canJoin = !!f.roomCode && f.roomCode !== myRoomCode;
  const canInvite = !!myRoomCode && f.status !== 'offline' && f.roomCode !== myRoomCode;

  return (
    <li className="rounded-2xl bg-indigo-50/70 px-3 py-2">
      <div className="flex items-center gap-3">
        <Avatar avatar={f.avatar} size={40} className={f.status === 'offline' ? 'opacity-60 grayscale' : ''} />
        <div className="min-w-0 flex-1">
          <TaggedName name={f.name} fx={f.avatar.nameFx} level={f.avatar.level} className="text-sm font-bold text-indigo-950" />
          <StatusLine status={f.status} />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canJoin && (
            <button type="button" className="btn btn-green px-3 py-1.5 text-sm" onClick={() => joinRoom(f.roomCode!)} title={t('friends.join')}>
              <DoorOpen className="size-4" /> <span className="hidden sm:inline">{t('friends.join')}</span>
            </button>
          )}
          {canInvite && (
            <button
              type="button"
              className="btn btn-blue px-3 py-1.5 text-sm"
              onClick={async () => setNote((await invite(f.id)) ?? 'friends.invited')}
              title={t('friends.invite')}
            >
              <UserPlus className="size-4" /> <span className="hidden sm:inline">{t('friends.invite')}</span>
            </button>
          )}
          <button type="button" className="btn btn-ghost relative size-9 p-0" onClick={() => setChatWith(f.id)} aria-label={t('friends.message')} title={t('friends.message')}>
            <MessageCircle className="size-5" />
            {f.unread > 0 && (
              <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-[11px] font-extrabold text-white">{f.unread}</span>
            )}
          </button>
          <button
            type="button"
            className={`btn size-9 p-0 ${confirm ? 'btn-pink' : 'btn-ghost'}`}
            onClick={() => (confirm ? remove(f.id) : setConfirm(true))}
            onBlur={() => setConfirm(false)}
            aria-label={confirm ? t('friends.removeConfirm') : t('friends.remove')}
            title={confirm ? t('friends.removeConfirm') : t('friends.remove')}
          >
            <UserMinus className="size-4" />
          </button>
        </div>
      </div>
      {note && (
        <p className={`mt-1 px-1 text-xs font-bold ${note === 'friends.invited' ? 'text-emerald-600' : 'text-rose-600'}`} role="status">
          {t(note)}
        </p>
      )}
    </li>
  );
}

function RequestRow({ r, incoming }: { r: FriendRequestInfo; incoming: boolean }) {
  const t = useT();
  const { respond, cancel } = useFriends();
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-indigo-50/70 px-3 py-2">
      <Avatar avatar={r.avatar} size={36} />
      <TaggedName name={r.name} fx={r.avatar.nameFx} level={r.avatar.level} className="min-w-0 flex-1 text-sm font-bold text-indigo-950" />
      {incoming ? (
        <>
          <button type="button" className="btn btn-green px-3 py-1.5 text-sm" onClick={() => respond(r.id, true)}>
            <Check className="size-4" /> {t('friends.accept')}
          </button>
          <button type="button" className="btn btn-ghost size-9 p-0" onClick={() => respond(r.id, false)} aria-label={t('friends.decline')} title={t('friends.decline')}>
            <X className="size-4" />
          </button>
        </>
      ) : (
        <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => cancel(r.id)}>
          {t('friends.cancel')}
        </button>
      )}
    </li>
  );
}

function Chat({ friend }: { friend: FriendInfo }) {
  const t = useT();
  const { account } = useAuth();
  const { messages, loadMessages, sendMessage, setChatWith } = useFriends();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = messages[friend.id];
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages(friend.id);
  }, [friend.id, loadMessages]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [list?.length]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const err = await sendMessage(friend.id, text);
    setError(err);
    if (!err) setText('');
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2">
        <button type="button" className="btn btn-ghost size-9 p-0" onClick={() => setChatWith(null)} aria-label={t('friends.back')}>
          <ArrowLeft className="size-5" />
        </button>
        <Avatar avatar={friend.avatar} size={32} />
        <div className="min-w-0">
          <TaggedName name={friend.name} fx={friend.avatar.nameFx} level={friend.avatar.level} className="text-sm font-bold text-indigo-950" />
          <StatusLine status={friend.status} />
        </div>
      </div>
      <div className="min-h-48 flex-1 overflow-y-auto rounded-2xl bg-indigo-50/70 p-3" aria-live="polite">
        {!list ? (
          <Loader2 className="mx-auto size-5 animate-spin text-indigo-300" />
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm font-bold text-indigo-400">{t('friends.sayHi')}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {list.map((m) => {
              const mine = m.from === account?.id;
              return (
                <li key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <span
                    className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm font-semibold break-words ${mine ? 'rounded-br-md bg-pink-500 text-white' : 'rounded-bl-md bg-white text-indigo-950 dark:bg-white/10'}`}
                    title={new Date(m.ts).toLocaleString()}
                  >
                    {m.text}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <div ref={bottom} />
      </div>
      <form onSubmit={submit} className="mt-2 flex gap-2">
        <input
          className="input py-2"
          placeholder={t('friends.messagePlaceholder')}
          value={text}
          maxLength={300}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          autoFocus
        />
        <button type="submit" className="btn btn-pink shrink-0 px-4 py-2" disabled={!text.trim()} aria-label={t('friends.sendMessage')}>
          <Send className="size-5" />
        </button>
      </form>
      {error && <p className="mt-1 px-1 text-xs font-bold text-rose-600">{t(error)}</p>}
    </div>
  );
}

/** The friends window: your friends and where they are, requests, adding by name#1234, and chats. */
export default function FriendsPanel() {
  const t = useT();
  const { state, closePanel, chatWith } = useFriends();
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePanel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closePanel]);

  const friend = chatWith ? state?.friends.find((f) => f.id === chatWith) : undefined;
  const requests = (state?.incoming.length ?? 0) + (state?.outgoing.length ?? 0);
  const online = state?.friends.filter((f) => f.status !== 'offline').length ?? 0;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="friends-title" onClick={closePanel}>
      <div className="panel flex h-[min(640px,90vh)] w-full max-w-md animate-pop flex-col p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 id="friends-title" className="flex items-center gap-2 font-display text-2xl font-bold text-indigo-950">
            <Users className="size-6 text-emerald-500" /> {t('friends.title')}
          </h2>
          <button type="button" onClick={closePanel} className="btn btn-ghost size-10 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>

        {!state ? (
          <Loader2 className="mx-auto mt-8 size-6 animate-spin text-indigo-300" />
        ) : friend ? (
          <Chat friend={friend} />
        ) : (
          <>
            <AddFriend />
            <div className="mb-2 grid grid-cols-2 gap-1.5">
              <button type="button" className={`chip py-2 ${tab === 'friends' ? 'chip-on' : 'bg-indigo-50'}`} onClick={() => setTab('friends')}>
                {t('friends.tabFriends', { n: state.friends.length })}
              </button>
              <button type="button" className={`chip relative py-2 ${tab === 'requests' ? 'chip-on' : 'bg-indigo-50'}`} onClick={() => setTab('requests')}>
                {t('friends.tabRequests', { n: requests })}
                {state.incoming.length > 0 && <span className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full bg-pink-500 px-1 text-[11px] font-extrabold text-white">{state.incoming.length}</span>}
              </button>
            </div>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
              {tab === 'friends' ? (
                state.friends.length === 0 ? (
                  <p className="py-8 text-center text-sm font-bold text-indigo-400">{t('friends.none')}</p>
                ) : (
                  <>
                    <p className="mb-1.5 px-1 text-xs font-extrabold tracking-wider text-indigo-300 uppercase">{t('friends.onlineCount', { n: online })}</p>
                    <ul className="flex flex-col gap-1.5">
                      {state.friends.map((f) => (
                        <FriendRow key={f.id} f={f} />
                      ))}
                    </ul>
                  </>
                )
              ) : requests === 0 ? (
                <p className="py-8 text-center text-sm font-bold text-indigo-400">{t('friends.noRequests')}</p>
              ) : (
                <>
                  {state.incoming.length > 0 && (
                    <>
                      <p className="mb-1.5 px-1 text-xs font-extrabold tracking-wider text-indigo-300 uppercase">{t('friends.incoming')}</p>
                      <ul className="mb-3 flex flex-col gap-1.5">
                        {state.incoming.map((r) => (
                          <RequestRow key={r.id} r={r} incoming />
                        ))}
                      </ul>
                    </>
                  )}
                  {state.outgoing.length > 0 && (
                    <>
                      <p className="mb-1.5 px-1 text-xs font-extrabold tracking-wider text-indigo-300 uppercase">{t('friends.outgoing')}</p>
                      <ul className="flex flex-col gap-1.5">
                        {state.outgoing.map((r) => (
                          <RequestRow key={r.id} r={r} incoming={false} />
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
