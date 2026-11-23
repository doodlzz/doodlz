import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useGameSounds } from './audio/useGameSounds';
import { AuthProvider, useAuth } from './auth/AuthContext';
import CookieNotice from './components/CookieNotice';
import CrayonScene from './components/CrayonScene';
import Lobby from './components/Lobby';
import { FriendsProvider, useFriends } from './friends/FriendsContext';
import InviteToast from './friends/InviteToast';
import { loadProfile } from './lib/avatar';
import MouseTrail from './components/MouseTrail';
import { useGame } from './hooks/useGame';
import { useQuestTracker } from './hooks/useQuestTracker';
import { useT } from './i18n';
import { isLegalPath } from './legal/paths';
import { SettingsProvider, useSettings } from './settings/SettingsContext';

// Screens and windows that aren't on the home screen load as separate files, so the first visit downloads less.
// They're fetched in the background once the home screen is up, so opening them later is still instant.
const loadGame = () => import('./components/Game');
const loadGameOver = () => import('./components/GameOver');
const loadShop = () => import('./components/Shop');
const loadLevels = () => import('./components/LevelsModal');
const loadFriendsPanel = () => import('./friends/FriendsPanel');
const Game = lazy(loadGame);
const GameOver = lazy(loadGameOver);
const Shop = lazy(loadShop);
const LevelsModal = lazy(loadLevels);
const FriendsPanel = lazy(loadFriendsPanel);
const RulesModal = lazy(() => import('./components/RulesModal'));
const LegalPage = lazy(() => import('./legal/LegalPages').then((m) => ({ default: m.LegalPage })));

function preloadScreens() {
  const go = () => [loadGame, loadGameOver, loadShop, loadLevels, loadFriendsPanel, () => import('./components/RulesModal')].forEach((load) => void load().catch(() => {}));
  if ('requestIdleCallback' in window) requestIdleCallback(go, { timeout: 4000 });
  else setTimeout(go, 1500);
}

function Shell() {
  const t = useT();
  const { settings } = useSettings();
  const game = useGame(settings.lang);
  useGameSounds(game);
  useQuestTracker(game);
  const code = game.state?.code;
  const { account, applyReward, refresh, shopTab, closeShop, levelsOpen, closeLevels } = useAuth();
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

  // Joining a friend's room uses the saved nickname and face (signed-in players get their account name anyway).
  const joinFriend = useCallback(
    (roomCode: string) => {
      const p = loadProfile();
      void game.joinRoom(roomCode, p.name, p.avatar);
    },
    [game.joinRoom],
  );

  useEffect(preloadScreens, []);

  // The rules pop up when a game in your room actually starts (the host picked the mode and pressed Start),
  // or when you join one that's already running. Once per room, remembered per tab so a refresh doesn't repeat it.
  const [rulesFor, setRulesFor] = useState<string | null>(null);
  const playing = game.state?.phase === 'choosing' || game.state?.phase === 'drawing' || game.state?.phase === 'turn_end';
  useEffect(() => {
    if (!code) return setRulesFor(null);
    if (!playing) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem('doodlz:rulesSeen') ?? '[]');
    } catch {
      // storage unavailable: show them
    }
    if (!seen.includes(code)) setRulesFor(code);
  }, [code, playing]);
  const closeRules = useCallback(() => {
    if (rulesFor) {
      try {
        const seen: string[] = JSON.parse(sessionStorage.getItem('doodlz:rulesSeen') ?? '[]');
        sessionStorage.setItem('doodlz:rulesSeen', JSON.stringify([...seen, rulesFor].slice(-20)));
      } catch {
        // ignore
      }
    }
    setRulesFor(null);
  }, [rulesFor]);

  const phase = game.state?.phase;
  return (
    <FriendsProvider onJoin={joinFriend} myRoomCode={code ?? null}>
      <a href="#main" className="skip-link">
        {t('a11y.skip')}
      </a>
      {/* The doodle backdrop (and the crayon outline filters) behind every game screen. */}
      <CrayonScene />
      {/* Off during a round: it redraws a full-screen canvas every frame, which costs drawing smoothness. */}
      {!playing && <MouseTrail />}
      <div id="main" tabIndex={-1}>
        <Suspense fallback={null}>
          {!game.state || phase === 'lobby' ? <Lobby game={game} /> : phase === 'game_over' ? <GameOver game={game} /> : <Game game={game} />}
        </Suspense>
      </div>

      <CookieNotice />
      <Suspense fallback={null}>
        {game.state && rulesFor === game.state.code && <RulesModal state={game.state} onClose={closeRules} />}
        {shopTab && account && <Shop initialTab={shopTab} onClose={closeShop} />}
        {levelsOpen && account && <LevelsModal xp={account.xp ?? 0} onClose={closeLevels} />}
      </Suspense>
      <FriendsOverlays />
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
    </FriendsProvider>
  );
}

/** The friends window and friend invites, over every screen. */
function FriendsOverlays() {
  const { panelOpen } = useFriends();
  return (
    <>
      <Suspense fallback={null}>{panelOpen && <FriendsPanel />}</Suspense>
      <InviteToast />
    </>
  );
}

/** Policy pages live at their own addresses (/privacy, /terms, …); everything else is the game. */
function Routes() {
  const path = location.pathname.replace(/\/$/, '') || '/';
  if (isLegalPath(path)) {
    return (
      <>
        <Suspense fallback={null}>
          <LegalPage path={path} />
        </Suspense>
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
