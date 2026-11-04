import { useEffect, useState } from 'react';
import { Check, Copy, Crown, DoorOpen, Globe2, Loader2, Lock, Play, RefreshCw, Shuffle, Tags, UserPlus, Users, Wifi, WifiOff } from 'lucide-react';
import type { Category } from '../../shared/types';
import AuthButtons from '../auth/AuthButtons';
import { useAuth } from '../auth/AuthContext';
import CategoryPicker, { CategoryTile } from './CategoryPicker';
import DailyQuests from './DailyQuests';
import Socials from './Socials';
import type { GameApi } from '../hooks/useGame';
import { useCountdown } from '../hooks/useCountdown';
import { useT } from '../i18n';
import { AVATAR_PARTS_FREE, AVATAR_PARTS_MEMBER } from '../../shared/types';
import { limitAvatar, loadProfile, saveProfile } from '../lib/avatar';
import { guestTag } from '../lib/session';
import Avatar from './Avatar';
import AvatarBuilder from './AvatarBuilder';
import Chat from './Chat';
import GameSettingsPanel from './GameSettingsPanel';
import { PlayerMenu } from './Leaderboard';
import Logo from './Logo';
import { CodeEyeButton, maskCode, useCodeVisibility } from './RoomCode';
import { AdSlot, SupportCard } from './Promo';
import SettingsButton from './SettingsModal';
import TaggedName from './TaggedName';

function ConnectionBadge({ connected, resuming }: { connected: boolean; resuming: boolean }) {
  const t = useT();
  const cls = resuming ? 'bg-amber-400 text-amber-950' : connected ? 'bg-emerald-400/90 text-emerald-950' : 'bg-rose-500 text-white';
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${cls}`} role="status">
      {resuming ? <Loader2 className="size-3.5 animate-spin" /> : connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {resuming ? t('home.reconnecting') : connected ? t('home.connected') : t('home.connecting')}
    </div>
  );
}

function OnlineBadge({ online }: { online: number | null }) {
  const t = useT();
  if (online === null) return null;
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-extrabold text-white backdrop-blur-sm" role="status">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
      </span>
      {t('home.online', { n: online.toLocaleString() })}
    </div>
  );
}

// ---------------- home ----------------

function HomeView({ game }: { game: GameApi }) {
  const t = useT();
  const [profile] = useState(loadProfile);
  const [name, setName] = useState(profile.name);
  const [face, setFace] = useState(() => limitAvatar(profile.avatar, AVATAR_PARTS_MEMBER));
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false); // choosing a category for a new private room
  const [invited, setInvited] = useState(() => new URLSearchParams(location.search).has('room'));
  const ready = game.connected && !busy && !game.resuming;
  const { account, open, requireAccount, updateAccount } = useAuth();
  // Signed-in players get all 12 of each part and their uploaded picture; guests get the first 6.
  const parts = account ? AVATAR_PARTS_MEMBER : AVATAR_PARTS_FREE;
  const image = account?.avatar?.image;
  const avatar = { ...limitAvatar(face, parts), ...(image ? { image } : {}) };

  // Signing in loads the face saved on the account (so it follows you to other devices)…
  const accountId = account?.id;
  const savedFace = account?.avatar;
  useEffect(() => {
    if (savedFace) setFace(limitAvatar(savedFace, AVATAR_PARTS_MEMBER));
  }, [accountId]);

  // …and changes are saved back to it shortly after you stop clicking.
  useEffect(() => {
    if (!accountId) return;
    const id = setTimeout(() => updateAccount({ avatar: face }), 700);
    return () => clearTimeout(id);
  }, [face, accountId]);
  const [myGuestTag] = useState(guestTag);

  useEffect(() => saveProfile(name, face), [name, face]);

  // A failed reconnect clears "?room=" from the URL; drop the invite view with it.
  useEffect(() => {
    if (!game.resuming && !new URLSearchParams(location.search).has('room')) setInvited(false);
  }, [game.resuming]);

  // Every way into a game asks to register / play as guest first (once).
  // `fn` gets the nickname to use; signed-in players always play as their account name#tag (set by the server).
  const run = (fn: (name: string) => Promise<boolean>) =>
    requireAccount(async (acc) => {
      setBusy(true);
      await fn(name.trim() || acc?.username || '');
      setBusy(false);
    });

  const createWith = (c: Category) => {
    setPicking(false);
    run((n) => game.createRoom(n, avatar, { categories: [c] }));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 pt-16 pb-8 sm:py-12">
      {picking && <CategoryPicker onPick={createWith} onClose={() => setPicking(false)} />}
      <div className="absolute top-4 left-4">
        <OnlineBadge online={game.online} />
      </div>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <AuthButtons avatar={avatar} onAvatarChange={setFace} parts={parts} />
        <SettingsButton />
      </div>
      <Logo />
      <p className="mt-2 mb-6 text-center font-display text-lg font-medium text-white/90">{t('app.tagline')}</p>
      <ConnectionBadge connected={game.connected} resuming={game.resuming} />

      <div className="panel mt-5 w-full max-w-xl animate-pop p-5 sm:p-7">
        <label className="label" htmlFor="nickname">
          {t('home.nickname')}
        </label>
        {/* Everyone plays as name#1234. Signed-in players use their account name, changed in account settings. */}
        <div className="relative mb-5">
          <input
            id="nickname"
            className={`input pr-20 text-lg ${account ? 'cursor-default' : ''}`}
            placeholder={t('home.nicknamePlaceholder')}
            value={account ? account.username : name}
            maxLength={20}
            readOnly={!!account}
            onChange={(e) => setName(e.target.value.replace(/#/g, ''))}
            autoFocus={!account}
          />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-display text-lg font-semibold text-indigo-300">
            #{account ? account.tag : myGuestTag}
          </span>
          {account && (
            <p className="mt-1.5 px-1 text-xs font-bold text-indigo-400">
              {t('home.nameFromAccount')}{' '}
              <button type="button" className="cursor-pointer text-pink-500 underline underline-offset-2 hover:text-pink-400" onClick={() => open('account')}>
                {t('auth.accountTitle')}
              </button>
            </p>
          )}
        </div>

        <span className="label">{t('home.avatar')}</span>
        <div className="mb-6 flex justify-center">
          <AvatarBuilder avatar={avatar} onChange={setFace} parts={parts} />
        </div>

        {invited ? (
          <button className="btn btn-green w-full py-4 text-xl" disabled={!ready || !code} onClick={() =>
              run(async (n) => {
                const ok = await game.joinRoom(code, n, avatar);
                // Dead or full invite: show the normal buttons again instead of trapping the player here.
                if (!ok) {
                  setInvited(false);
                  history.replaceState(null, '', '/');
                }
                return ok;
              })
            }
          >
            <UserPlus className="size-6" /> {t('home.joinInvite', { code })}
          </button>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <button className="btn btn-green py-4 text-lg" disabled={!ready} onClick={() => run((n) => game.quickPlay(n, avatar))}>
              <Shuffle className="size-5" /> {t('home.playRandoms')}
            </button>
            <button className="btn btn-blue py-4 text-lg" disabled={!ready} onClick={() => requireAccount(() => setPicking(true))}>
              <Play className="size-5 fill-current" /> {t('home.createPrivate')}
            </button>
          </div>
        )}

        <div className="my-4 flex items-center gap-3 text-xs font-extrabold tracking-widest text-indigo-300 uppercase">
          <div className="h-1 flex-1 rounded bg-indigo-50" /> {t('home.orJoin')} <div className="h-1 flex-1 rounded bg-indigo-50" />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) run((n) => game.joinRoom(code.trim(), n, avatar));
          }}
        >
          <input
            className="input text-center font-display text-xl tracking-[0.3em] uppercase"
            placeholder={t('home.code')}
            aria-label={t('lobby.roomCode')}
            value={code}
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button type="submit" className="btn btn-violet shrink-0" disabled={!ready || code.length < 5}>
            <DoorOpen className="size-5" /> {t('home.join')}
          </button>
        </form>
      </div>

      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        {(
          [
            ['✏️', 'home.howDraw', 'home.howDrawText'],
            ['💬', 'home.howGuess', 'home.howGuessText'],
            ['🏆', 'home.howWin', 'home.howWinText'],
          ] as const
        ).map(([emoji, title, text]) => (
          <div key={title} className="rounded-3xl bg-white/15 p-4 text-white backdrop-blur-sm">
            <div className="text-2xl">{emoji}</div>
            <div className="font-display text-lg font-semibold">{t(title)}</div>
            <div className="text-sm font-semibold text-white/80">{t(text)}</div>
          </div>
        ))}
      </div>
      <SupportCard className="mt-4 w-full max-w-xl" />
      <AdSlot className="mt-4 w-full max-w-xl" />
      {/* Pinned to the bottom corners on wide screens; stacked at the end on smaller ones. */}
      <DailyQuests className="mt-4 w-full max-w-xl xl:fixed xl:bottom-4 xl:left-4 xl:z-10 xl:mt-0 xl:w-80" />
      <Socials className="mt-6 xl:fixed xl:right-4 xl:bottom-4 xl:z-10 xl:mt-0" />
    </div>
  );
}

// ---------------- room lobby ----------------

function RoomView({ game }: { game: GameApi }) {
  const t = useT();
  const state = game.state!;
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === state.you;
  const inviteUrl = `${location.origin}/?room=${state.code}`;
  const emptySlots = Math.max(0, state.settings.maxPlayers - state.players.length);
  const autoLeft = useCountdown(state.autoStartAt ? game.toLocalTime(state.autoStartAt) : null);
  const connectedCount = state.players.filter((p) => p.connected).length;
  const { hidden: codeHidden } = useCodeVisibility();
  const [changing, setChanging] = useState(false); // private host switching category
  const pickEndsAt = state.categoryPickEndsAt ? game.toLocalTime(state.categoryPickEndsAt) : null;
  const category = state.settings.categories.length === 1 ? state.settings.categories[0] : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt(t('lobby.copyPrompt'), inviteUrl);
    }
  };

  // Random lobby, first one in: pick the category before seeing anything else.
  if (state.categoryPending && isHost) {
    return <CategoryPicker onPick={game.chooseCategory} onClose={game.leaveRoom} endsAt={pickEndsAt} subtitle={t('pick.subtitlePublic')} />;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
      {changing && (
        <CategoryPicker
          selected={category ?? undefined}
          closeKind="close"
          onClose={() => setChanging(false)}
          onPick={(c) => {
            game.chooseCategory(c);
            setChanging(false);
          }}
        />
      )}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Logo size="sm" />
        <div className="flex gap-2">
          <SettingsButton />
          <button className="btn btn-ghost py-2 text-base" onClick={game.leaveRoom}>
            <DoorOpen className="size-5" /> {t('lobby.leave')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1.2fr_1fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <span className="label flex items-center gap-1.5">
              {state.isPublic && <Globe2 className="size-4" />}
              {state.isPublic ? t('lobby.publicRoom') : t('lobby.roomCode')}
            </span>
            <div className="flex items-center gap-2">
              <div className="flex flex-1 items-center rounded-2xl bg-indigo-950 py-1.5 pr-1.5 pl-3 dark:bg-black/40">
                <span className="flex-1 text-center font-display text-3xl font-bold tracking-[0.3em] text-yellow-300">{maskCode(state.code, codeHidden)}</span>
                <CodeEyeButton className="size-10 text-yellow-300/80 hover:bg-white/10 hover:text-yellow-300" />
              </div>
              <button className={`btn ${copied ? 'btn-green' : 'btn-blue'} h-[52px]`} onClick={copy} title={t('lobby.invite')}>
                {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                <span className="hidden sm:inline">{copied ? t('lobby.copied') : t('lobby.invite')}</span>
              </button>
            </div>
          </div>
          <div className="panel p-5">
            <span className="label flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Tags className="size-4" /> {t('lobby.category')}
              </span>
              {state.isPublic ? (
                <span className="flex items-center gap-1 normal-case">
                  <Lock className="size-3.5" /> {t('lobby.locked')}
                </span>
              ) : (
                isHost && (
                  <button type="button" className="chip flex items-center gap-1 bg-indigo-50 py-1 normal-case" onClick={() => setChanging(true)}>
                    <RefreshCw className="size-3.5" /> {t('lobby.change')}
                  </button>
                )
              )}
            </span>
            {category ? (
              <CategoryTile category={category} small />
            ) : state.categoryPending ? (
              <div className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-50 py-5 text-center font-display text-lg font-semibold text-indigo-500">
                <Loader2 className="size-5 animate-spin" /> {t('lobby.picking')}
              </div>
            ) : (
              <div className="rounded-2xl bg-indigo-50 py-4 text-center font-display text-lg font-semibold text-indigo-500">{t('pick.title')}</div>
            )}
          </div>
          <GameSettingsPanel
            settings={state.settings}
            editable={isHost}
            isPublic={state.isPublic}
            onChange={game.updateSettings}
            minPlayers={state.players.length}
          />
        </div>

        <div className="panel flex flex-col p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-indigo-900">
            <Users className="size-5 text-emerald-500" /> {t('lobby.players')}
            <span className="ml-auto rounded-full bg-indigo-100 px-3 py-0.5 text-sm text-indigo-700">
              {state.players.length}/{state.settings.maxPlayers}
            </span>
          </h2>
          <div className="grid auto-rows-min grid-cols-2 gap-3 sm:grid-cols-3">
            {state.players.map((p) => (
              <div
                key={p.id}
                className={`relative flex animate-pop flex-col items-center rounded-2xl p-3 ${p.id === state.you ? 'bg-pink-50 ring-4 ring-pink-200' : 'bg-indigo-50/70'} ${p.connected ? '' : 'opacity-50'}`}
              >
                {p.id === state.hostId && (
                  <span className="absolute top-2 left-2 grid size-7 place-items-center rounded-full bg-amber-400" title="Host">
                    <Crown className="size-4 text-amber-950" />
                  </span>
                )}
                {p.id !== state.you && (
                  <div className="absolute top-1.5 right-1.5">
                    <PlayerMenu player={p} state={state} game={game} />
                  </div>
                )}
                <Avatar avatar={p.avatar} size={64} />
                <TaggedName name={p.name} stacked className="mt-1 w-full text-center font-bold text-indigo-950" />
                {p.id === state.you && <div className="text-xs font-extrabold text-pink-500">{t('lobby.thatsYou')}</div>}
              </div>
            ))}
            {Array.from({ length: Math.min(emptySlots, 3) }, (_, i) => (
              <div key={i} className="grid min-h-[118px] place-items-center rounded-2xl border-4 border-dashed border-indigo-100 text-center text-sm font-bold text-indigo-200">
                {t('lobby.waiting')}
              </div>
            ))}
          </div>

          <div className="mt-5">
            {state.isPublic && (
              <div className="mb-2 rounded-2xl bg-indigo-50 py-3 text-center font-display text-lg font-semibold text-indigo-500">
                {state.autoStartAt ? t('lobby.autoStart', { s: autoLeft }) : t('lobby.waitingPlayers')}
              </div>
            )}
            {isHost ? (
              <button className="btn btn-green w-full py-4 text-xl" disabled={connectedCount < 2} onClick={game.startGame}>
                <Play className="size-6 fill-current" /> {t('lobby.start')}
              </button>
            ) : (
              !state.isPublic && (
                <div className="rounded-2xl bg-indigo-50 py-4 text-center font-display text-lg font-semibold text-indigo-500">{t('lobby.waitingHost')}</div>
              )
            )}
            {isHost && connectedCount < 2 && <p className="mt-2 text-center text-sm font-bold text-indigo-400">{t('lobby.inviteOne')}</p>}
          </div>
        </div>

        <Chat messages={game.messages} onSend={game.sendGuess} placeholder={t('chat.phLobby')} title={t('chat.title')} className="h-[360px] lg:sticky lg:top-4 lg:h-[560px]" />
      </div>
    </div>
  );
}

export default function Lobby({ game }: { game: GameApi }) {
  return game.state ? <RoomView game={game} /> : <HomeView game={game} />;
}
