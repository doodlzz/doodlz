# doodlz.gg

Real-time multiplayer drawing & guessing game. React + TypeScript + Vite + Tailwind on the front, Express + Socket.io on the back.

## Run it

```bash
npm install
npm run dev
```

- Game: http://localhost:5173 (the dev server proxies `/socket.io` to the game server)
- Game server: http://localhost:3001 (`/api/health` shows open rooms)

Open the game in two browser windows (or on your phone over the LAN address Vite prints) to play against yourself.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Game server (`tsx watch`) and Vite together via `concurrently` |
| `npm run typecheck` | Type-check client and server |
| `npm run build` | Type-check, build the client to `dist/` and the server to `dist-server/` |
| `npm start` | Production: one server on `$PORT` (default 3001) serving the app and sockets |

## Layout

```
shared/types.ts          Types and constants used by both sides (events, room state, draw ops)
server/index.ts          Express + Socket.io wiring
server/game.ts           Room engine: turns, timers, hints, scoring, chat masking
server/words.ts          Easy / medium / hard word lists
src/hooks/useGame.ts     Socket state for the UI (room state, chat, word choices, actions)
src/components/
  Lobby.tsx              Home screen (avatar builder, nickname, create/join) and waiting room (settings, players)
  Game.tsx               In-game layout: timer, word hint, overlays
  Canvas.tsx             Drawing canvas + toolbar (brush, eraser, fill, sizes, palette, clear)
  WordSelectModal.tsx    Drawer picks one of 3 words (×1 / ×1.5 / ×2 points)
  Chat.tsx               Guesses, system messages, masked answers
  Leaderboard.tsx        Live ranks, drawer / guessed indicators
  GameOver.tsx           Top-3 podium and play again
```

## How scoring works

- A correct guess earns `(100 + 400 × timeLeft%) × multiplier` points (easy ×1, medium ×1.5, hard ×2).
- The drawer earns `(40 + 80 × timeLeft%) × multiplier` for every player who guesses.
- The turn ends early once everyone has guessed.
- The secret word is masked (`*****`) in public chat. A guess one letter off gets a private "very close!" hint. Once you've guessed, you only chat with the drawer and the other players who've also guessed.

## Socket events

Client → server: `create_room`, `join_room`, `leave_room`, `update_settings`, `start_game`, `select_word`, `draw_stroke`, `clear_canvas`, `request_canvas`, `submit_guess`, `back_to_lobby`.

Server → client: `room_state` (per-player view), `word_choices` (drawer only), `draw_stroke`, `clear_canvas`, `canvas_history`, `chat_message`.

Room state lives in memory, so restarting the server closes all rooms.
