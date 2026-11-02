import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useGameSounds } from './audio/useGameSounds';
import Game from './components/Game';
import GameOver from './components/GameOver';
import Lobby from './components/Lobby';
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

  // Keep the room code in the URL so it can be shared.
  useEffect(() => {
    if (code) history.replaceState(null, '', `/?room=${code}`);
  }, [code]);

  const phase = game.state?.phase;
  return (
    <>
      {!game.state || phase === 'lobby' ? <Lobby game={game} /> : phase === 'game_over' ? <GameOver game={game} /> : <Game game={game} />}

      {game.toast && (
        <div
          className="fixed top-4 left-1/2 z-[80] flex max-w-[90vw] -translate-x-1/2 animate-pop items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]"
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
      <Shell />
    </SettingsProvider>
  );
}
