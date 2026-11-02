import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';
import { useGame } from './hooks/useGame';
import Game from './components/Game';
import GameOver from './components/GameOver';
import Lobby from './components/Lobby';

export default function App() {
  const game = useGame();
  const code = game.state?.code;

  // Keep the room code in the URL so it can be shared and survives a refresh.
  useEffect(() => {
    if (code) history.replaceState(null, '', `/?room=${code}`);
  }, [code]);

  const phase = game.state?.phase;
  return (
    <>
      {!game.state || phase === 'lobby' ? <Lobby game={game} /> : phase === 'game_over' ? <GameOver game={game} /> : <Game game={game} />}

      {game.toast && (
        <div className="fixed top-4 left-1/2 z-[60] flex -translate-x-1/2 animate-pop items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.25)]" role="alert">
          <AlertCircle className="size-5 shrink-0" />
          {game.toast}
        </div>
      )}
    </>
  );
}
