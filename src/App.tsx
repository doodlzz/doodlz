import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGameSounds } from './audio/useGameSounds';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Game from './components/Game';
import GameOver from './components/GameOver';
import Lobby from './components/Lobby';
import MouseTrail from './components/MouseTrail';
import { useGame } from './hooks/useGame';
import { useQuestTracker } from './hooks/useQuestTracker';
import { useT } from './i18n';
import { SettingsProvider, useSettings } from './settings/SettingsContext';

function Shell() {
  const t = useT();
  const { settings } = useSettings();
  const game = useGame(settings.lang);
  useGameSounds(game);
  useQuestTracker(game);
  const code = game.state?.code;
  const { applyReward, refresh } = useAuth();
  const [shopNote, setShopNote] = useState<'success' | 'cancel' | null>(null);

  // Back from Stripe's payment page. The points are added when Stripe confirms the payment to the
  // server, which can take a few seconds, so check the account again a few times.
  useEffect(() => {
    const result = new URLSearchParams(location.search).get('points');
    if (result !== 'success' && result !== 'cancel') return;
    history.replaceState(null, '', '/');
    setShopNote(result);
    const timers = result === 'success' ? [1500, 4000, 8000, 15000].map((ms) => setTimeout(refresh, ms)) : [];
    timers.push(setTimeout(() => setShopNote(null), 6000));
    return () => timers.forEach(clearTimeout);
  }, []);

  // A ranked game paid out: update the account's points and quests on screen.
  useEffect(() => {
    if (game.reward) applyReward(game.reward);
  }, [game.reward]);

  // Keep the room code in the URL so it can be shared.
  useEffect(() => {
    if (code) history.replaceState(null, '', `/?room=${code}`);
  }, [code]);

  const phase = game.state?.phase;
  return (
    <>
      <MouseTrail />
      {!game.state || phase === 'lobby' ? <Lobby game={game} /> : phase === 'game_over' ? <GameOver game={game} /> : <Game game={game} />}

      {shopNote && !game.toast && (
        <div
          className={`fixed top-4 left-1/2 z-[80] flex w-max max-w-[90vw] -translate-x-1/2 animate-pop items-center gap-2 rounded-2xl px-4 py-3 font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.25)] ${shopNote === 'success' ? 'bg-emerald-500' : 'bg-slate-600'}`}
          role="status"
        >
          <CheckCircle2 className="size-5 shrink-0" />
          {t(shopNote === 'success' ? 'shop.thanks' : 'shop.cancelled')}
        </div>
      )}
      {game.toast && (
        <div
          className="fixed top-4 left-1/2 z-[80] flex w-max max-w-[90vw] -translate-x-1/2 animate-pop items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]"
          role="alert"
        >
          <AlertCircle className="size-5 shrink-0" />
          {t(game.toast.key, game.toast.params)}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </SettingsProvider>
  );
}
