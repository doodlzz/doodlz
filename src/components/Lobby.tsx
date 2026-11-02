import { useEffect, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Dices,
  DoorOpen,
  Lightbulb,
  Minus,
  Play,
  Plus,
  Repeat,
  Settings,
  UserPlus,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { SETTING_LIMITS, type Avatar as AvatarConfig, type RoomSettings } from '../../shared/types';
import type { GameApi } from '../hooks/useGame';
import { ACCESSORY_NAMES, AVATAR_COLORS, AVATAR_PARTS, EYE_NAMES, MOUTH_NAMES, loadProfile, randomAvatar, saveProfile } from '../lib/avatar';
import Avatar from './Avatar';
import Chat from './Chat';
import Logo from './Logo';

const DRAW_TIMES = [30, 45, 60, 80, 100, 120, 150, 180];

// ---------------- Avatar builder ----------------

function PartPicker({ label, value, names, onChange }: { label: string; value: number; names: string[]; onChange: (v: number) => void }) {
  const step = (d: number) => onChange((value + d + AVATAR_PARTS) % AVATAR_PARTS);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => step(-1)} className="btn btn-ghost size-9 p-0" aria-label={`Previous ${label}`}>
        <ChevronLeft className="size-5" />
      </button>
      <div className="w-24 text-center leading-tight">
        <div className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-300">{label}</div>
        <div className="font-display font-semibold text-indigo-900">{names[value]}</div>
      </div>
      <button type="button" onClick={() => step(1)} className="btn btn-ghost size-9 p-0" aria-label={`Next ${label}`}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

function AvatarBuilder({ avatar, onChange }: { avatar: AvatarConfig; onChange: (a: AvatarConfig) => void }) {
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative">
        <div className="grid size-36 place-items-center rounded-full bg-indigo-50">
          <Avatar avatar={avatar} size={116} className="animate-float" />
        </div>
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="btn btn-yellow absolute -right-1 -bottom-1 size-11 rounded-full p-0"
          aria-label="Randomize avatar"
          title="Randomize"
        >
          <Dices className="size-5" />
        </button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PartPicker label="Eyes" value={avatar.eyes} names={EYE_NAMES} onChange={(eyes) => onChange({ ...avatar, eyes })} />
        <PartPicker label="Mouth" value={avatar.mouth} names={MOUTH_NAMES} onChange={(mouth) => onChange({ ...avatar, mouth })} />
        <PartPicker
          label="Extra"
          value={avatar.accessory}
          names={ACCESSORY_NAMES}
          onChange={(accessory) => onChange({ ...avatar, accessory })}
        />
        <div className="mt-1 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Avatar color">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={avatar.color === c}
              aria-label={`Color ${c}`}
              onClick={() => onChange({ ...avatar, color: c })}
              style={{ backgroundColor: c }}
              className={`grid size-7 cursor-pointer place-items-center rounded-full border-[3px] transition hover:scale-110 ${
                avatar.color === c ? 'scale-110 border-indigo-950' : 'border-white shadow'
              }`}
            >
              {avatar.color === c && <Check className="size-4 text-indigo-950" strokeWidth={3} />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------- Settings ----------------

function SettingRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-indigo-50/70 px-3 py-2.5">
      <div className="flex items-center gap-2 font-bold text-indigo-900">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

function Stepper({ value, min, max, onChange, disabled }: { value: number; min: number; max: number; onChange: (v: number) => void; disabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className="btn btn-ghost size-8 rounded-xl p-0" aria-label="Decrease">
        <Minus className="size-4" />
      </button>
      <span className="w-7 text-center font-display text-xl font-bold text-indigo-950">{value}</span>
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className="btn btn-ghost size-8 rounded-xl p-0" aria-label="Increase">
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function SettingsPanel({ settings, editable, onChange, minPlayers }: { settings: RoomSettings; editable: boolean; onChange: (s: Partial<RoomSettings>) => void; minPlayers: number }) {
  return (
    <div className="panel p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-indigo-900">
          <Settings className="size-5 text-sky-500" /> Game settings
        </h2>
        {!editable && <span className="text-xs font-bold text-indigo-300">Only the host can change these</span>}
      </div>
      <div className="flex flex-col gap-2">
        <SettingRow icon={<Repeat className="size-4 text-pink-500" />} label="Rounds">
          <Stepper value={settings.rounds} min={SETTING_LIMITS.rounds[0]} max={SETTING_LIMITS.rounds[1]} disabled={!editable} onChange={(rounds) => onChange({ rounds })} />
        </SettingRow>
        <SettingRow icon={<Users className="size-4 text-emerald-500" />} label="Max players">
          <Stepper
            value={settings.maxPlayers}
            min={Math.max(SETTING_LIMITS.maxPlayers[0], minPlayers)}
            max={SETTING_LIMITS.maxPlayers[1]}
            disabled={!editable}
            onChange={(maxPlayers) => onChange({ maxPlayers })}
          />
        </SettingRow>
        <div className="rounded-2xl bg-indigo-50/70 px-3 py-2.5">
          <div className="mb-2 flex items-center gap-2 font-bold text-indigo-900">
            <Clock className="size-4 text-amber-500" /> Draw time
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {DRAW_TIMES.map((t) => (
              <button
                key={t}
                type="button"
                disabled={!editable}
                onClick={() => onChange({ drawTime: t })}
                className={`rounded-xl py-1.5 font-display font-semibold transition ${
                  settings.drawTime === t ? 'bg-indigo-500 text-white shadow-[0_3px_0_#3730a3]' : 'bg-white text-indigo-700 enabled:hover:bg-indigo-100'
                } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
              >
                {t}s
              </button>
            ))}
          </div>
        </div>
        <SettingRow icon={<Lightbulb className="size-4 text-yellow-500" />} label="Letter hints">
          <button
            type="button"
            role="switch"
            aria-checked={settings.hints}
            disabled={!editable}
            onClick={() => onChange({ hints: !settings.hints })}
            className={`relative h-8 w-14 rounded-full transition ${settings.hints ? 'bg-emerald-500' : 'bg-slate-300'} ${editable ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition-all ${settings.hints ? 'left-7' : 'left-1'}`} />
          </button>
        </SettingRow>
      </div>
    </div>
  );
}

// ---------------- Views ----------------

function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ${
        connected ? 'bg-emerald-400/90 text-emerald-950' : 'bg-rose-500 text-white'
      }`}
    >
      {connected ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
      {connected ? 'Connected' : 'Connecting to server…'}
    </div>
  );
}

function HomeView({ game }: { game: GameApi }) {
  const [profile] = useState(loadProfile);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [code, setCode] = useState(() => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '');
  const [busy, setBusy] = useState(false);
  const invited = new URLSearchParams(location.search).has('room');

  useEffect(() => saveProfile(name, avatar), [name, avatar]);

  const run = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    await fn();
    setBusy(false);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-4 py-8 sm:py-12">
      <Logo />
      <p className="mt-2 mb-6 text-center font-display text-lg font-medium text-white/90">Draw it. Guess it. Win it. ✏️</p>
      <ConnectionBadge connected={game.connected} />

      <div className="panel mt-5 w-full max-w-xl animate-pop p-5 sm:p-7">
        <label className="label" htmlFor="nickname">
          Your nickname
        </label>
        <input
          id="nickname"
          className="input mb-5 text-lg"
          placeholder="Enter a nickname"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <span className="label">Your avatar</span>
        <div className="mb-6 flex justify-center">
          <AvatarBuilder avatar={avatar} onChange={setAvatar} />
        </div>

        {invited ? (
          <button
            className="btn btn-green w-full py-4 text-xl"
            disabled={!game.connected || busy || !code}
            onClick={() => run(() => game.joinRoom(code, name, avatar))}
          >
            <UserPlus className="size-6" /> Join room {code}
          </button>
        ) : (
          <button
            className="btn btn-green w-full py-4 text-xl"
            disabled={!game.connected || busy}
            onClick={() => run(() => game.createRoom(name, avatar))}
          >
            <Play className="size-6 fill-current" /> Create private room
          </button>
        )}

        <div className="my-4 flex items-center gap-3 text-xs font-extrabold uppercase tracking-widest text-indigo-300">
          <div className="h-1 flex-1 rounded bg-indigo-50" /> or join with a code <div className="h-1 flex-1 rounded bg-indigo-50" />
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim()) run(() => game.joinRoom(code.trim(), name, avatar));
          }}
        >
          <input
            className="input text-center font-display text-xl tracking-[0.3em] uppercase"
            placeholder="CODE"
            aria-label="Room code"
            value={code}
            maxLength={5}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          />
          <button type="submit" className="btn btn-blue shrink-0" disabled={!game.connected || busy || code.length < 5}>
            <DoorOpen className="size-5" /> Join
          </button>
        </form>
      </div>

      <div className="mt-6 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['✏️', 'Draw', 'Pick a word and sketch it for your friends.'],
          ['💬', 'Guess', 'Type guesses in chat — faster means more points.'],
          ['🏆', 'Win', 'Top the leaderboard after the final round.'],
        ].map(([emoji, title, text]) => (
          <div key={title} className="rounded-3xl bg-white/15 p-4 text-white backdrop-blur-sm">
            <div className="text-2xl">{emoji}</div>
            <div className="font-display text-lg font-semibold">{title}</div>
            <div className="text-sm font-semibold text-white/80">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoomView({ game }: { game: GameApi }) {
  const state = game.state!;
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === state.you;
  const inviteUrl = `${location.origin}/?room=${state.code}`;
  const emptySlots = Math.max(0, state.settings.maxPlayers - state.players.length);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('Copy this invite link:', inviteUrl);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Logo size="sm" />
        <button className="btn btn-ghost py-2 text-base" onClick={game.leaveRoom}>
          <DoorOpen className="size-5" /> Leave
        </button>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr_1fr]">
        <div className="flex flex-col gap-4">
          <div className="panel p-5">
            <span className="label">Room code</span>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-2xl bg-indigo-950 py-2 text-center font-display text-3xl font-bold tracking-[0.3em] text-yellow-300">
                {state.code}
              </div>
              <button className={`btn ${copied ? 'btn-green' : 'btn-blue'} h-[52px]`} onClick={copy} title="Copy invite link">
                {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Invite'}</span>
              </button>
            </div>
          </div>
          <SettingsPanel settings={state.settings} editable={isHost} onChange={game.updateSettings} minPlayers={state.players.length} />
        </div>

        <div className="panel flex flex-col p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-semibold text-indigo-900">
            <Users className="size-5 text-emerald-500" /> Players
            <span className="ml-auto rounded-full bg-indigo-100 px-3 py-0.5 text-sm text-indigo-700">
              {state.players.length}/{state.settings.maxPlayers}
            </span>
          </h2>
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 sm:grid-cols-3">
            {state.players.map((p) => (
              <div key={p.id} className={`relative flex animate-pop flex-col items-center rounded-2xl p-3 ${p.id === state.you ? 'bg-pink-50 ring-4 ring-pink-200' : 'bg-indigo-50/70'}`}>
                {p.id === state.hostId && (
                  <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-amber-400" title="Host">
                    <Crown className="size-4 text-amber-950" />
                  </span>
                )}
                <Avatar avatar={p.avatar} size={64} />
                <div className="mt-1 w-full truncate text-center font-bold text-indigo-950">{p.name}</div>
                {p.id === state.you && <div className="text-xs font-extrabold text-pink-500">that's you!</div>}
              </div>
            ))}
            {Array.from({ length: Math.min(emptySlots, 3) }, (_, i) => (
              <div key={i} className="grid min-h-[118px] place-items-center rounded-2xl border-4 border-dashed border-indigo-100 text-center text-sm font-bold text-indigo-200">
                Waiting…
              </div>
            ))}
          </div>

          <div className="mt-5">
            {isHost ? (
              <button className="btn btn-green w-full py-4 text-xl" disabled={state.players.length < 2} onClick={game.startGame}>
                <Play className="size-6 fill-current" /> Start game
              </button>
            ) : (
              <div className="rounded-2xl bg-indigo-50 py-4 text-center font-display text-lg font-semibold text-indigo-500">
                Waiting for the host to start…
              </div>
            )}
            {isHost && state.players.length < 2 && (
              <p className="mt-2 text-center text-sm font-bold text-indigo-400">Invite at least one friend to start</p>
            )}
          </div>
        </div>

        <Chat messages={game.messages} onSend={game.sendGuess} placeholder="Say something…" className="h-[360px] lg:h-auto" />
      </div>
    </div>
  );
}

export default function Lobby({ game }: { game: GameApi }) {
  return game.state ? <RoomView game={game} /> : <HomeView game={game} />;
}
