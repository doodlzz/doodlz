import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGameSounds } from './audio/useGameSounds';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { readToken } from './auth/storage';
import CookieNotice from './components/CookieNotice';
import CrayonScene from './components/CrayonScene';
import Game from './components/Game';
import GameOver from './components/GameOver';
import Lobby from './components/Lobby';
import Shop from './components/Shop';
import MouseTrail from './components/MouseTrail';
import { useGame } from './hooks/useGame';
import { useQuestTracker } from './hooks/useQuestTracker';
import { useT } from './i18n';
import { isLegalPath, LegalPage } from './legal/LegalPages';
import { SettingsProvider, useSettings } from './settings/SettingsContext';

/** Read once when the page loads (not in an effect, which React may run twice and the URL is cleaned up after). */
const PAYMENT_RETURN = (() => {
  const params = new URLSearchParams(location.search);
  const result = params.get('points');
  return result === 'success' || result === 'cancel' ? { result: result as 'success' | 'cancel', txn: params.get('txn') } : null;
})();

function Shell() {
  const t = useT();
  const { settings } = useSettings();
  const game = useGame(settings.lang);
  useGameSounds(game);
  useQuestTracker(game);
  const code = game.state?.code;
  const { account, applyReward, refresh, shopTab, closeShop } = useAuth();
  const [shopNote, setShopNote] = useState<'success' | 'cancel' | null>(null);

  // Back from the payment page. The points are added once the payment provider confirms the payment to
  // the server, which can take a few seconds, so check the account again a few times. For Paddle we also
  // ask the server to look the transaction up with Paddle, in case its webhook is late or can't reach us.
  useEffect(() => {
    if (!PAYMENT_RETURN) return;
    const { result, txn } = PAYMENT_RETURN;
    history.replaceState(null, '', '/');
    setShopNote(result);
    const check = async () => {
      if (txn) {
        await fetch('/api/shop/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${readToken() ?? ''}` },
          body: JSON.stringify({ transactionId: txn }),
        }).catch(() => null);
      }
      refresh();
    };
    const timers = result === 'success' ? [500, 3000, 7000, 15000, 30000].map((ms) => setTimeout(check, ms)) : [];
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
      <a href="#main" className="skip-link">
        {t('a11y.skip')}
      </a>
      {/* The doodle backdrop (and the crayon outline filters) behind every game screen. */}
      <CrayonScene />
      <MouseTrail />
      <div id="main" tabIndex={-1}>
        {!game.state || phase === 'lobby' ? <Lobby game={game} /> : phase === 'game_over' ? <GameOver game={game} /> : <Game game={game} />}
      </div>

      <CookieNotice />
      {shopTab && account && <Shop initialTab={shopTab} onClose={closeShop} />}
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

/** Policy pages live at their own addresses (/privacy, /terms, …); everything else is the game. */
function Routes() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (isLegalPath(path)) {
    return (
      <>
        <LegalPage path={path} />
        <CookieNotice />
      </>
    );
  }
  return <Shell />;
}

export default function App() {
  return (
    <SettingsProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </SettingsProvider>
  );
}
