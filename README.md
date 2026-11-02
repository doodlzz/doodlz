# doodlz.io

Real-time multiplayer drawing & guessing game. React + TypeScript + Vite + Tailwind on the front, Express + Socket.io on the back.

## Run it

```bash
npm install
npm run dev
```

- Game: http://localhost:5173 (Vite proxies `/socket.io` to the game server)
- Game server: http://localhost:3001 (`/api/health` shows open rooms)

In dev, several tabs of one browser may join the same room (`ALLOW_SAME_DEVICE=1` is set by `npm run dev`). In production that's blocked.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Game server (`tsx watch`) and Vite together |
| `npm run typecheck` | Type-check client and server |
| `npm run build` | Type-check, build the client to `dist/` and the server to `dist-server/` |
| `npm start` | Production: one server on `$PORT` serving the app and sockets |

## Server environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` / `SERVER_PORT` | 3001 | Listen port (`SERVER_PORT` wins) |
| `MAX_PLAYERS_PER_IP` | 4 | Max players from one IP in a room |
| `RECONNECT_GRACE_MS` | 60000 | How long a dropped player's slot and score are kept |
| `TRUST_PROXY` | on | Read client IPs from `X-Forwarded-For` (set `0` if not behind a proxy) |
| `ALLOW_SAME_DEVICE` | off | Dev only: let tabs of one browser share a room |

Client build variable: `VITE_SUPPORT_URL` points the "Support us" button at a donation page.

## Layout

```
shared/types.ts                Types, constants and socket event contracts used by both sides
server/
  index.ts                     Express + Socket.io bootstrap
  config.ts                    Environment configuration
  handlers/                    Socket controllers: lobby (rooms, matchmaking, resume), game, canvas, moderation
  rooms/RoomManager.ts         Rooms, reconnection tokens, public matchmaking
  rooms/Room.ts                Room engine: turns, duo drawers, hints, rerolls, scoring, moderation, auto-start
  game/                        Word bank (categories + compounds), word picker, scoring curve, text matching
  moderation/profanity.ts      Multilingual profanity filter
  util/sanitize.ts             Validation for every client payload
src/
  hooks/useGame.ts             Socket state and actions (with session resume)
  i18n/                        UI strings in EN, ES, PT, FR, DE, RU, ZH
  settings/SettingsContext.tsx Language, theme, sound and music preferences
  audio/                       Synthesized sound effects and ambient music (no audio files)
  components/
    Lobby.tsx                  Home (avatar, nickname, matchmaking, private rooms) and room lobby
    GameSettingsPanel.tsx      Mode, rounds, timers, modifiers, categories, custom words
    Game.tsx                   In-game layout: timer, word hint, hint button, overlays
    canvas/                    Canvas, toolbar, color wheel, renderer (undo, shapes, fill), backgrounds
    WordSelectModal.tsx        Word choice with re-roll
    Chat.tsx / Leaderboard.tsx Chat log and live ranks with report / kick menu
    GameOver.tsx               Podium and rematch
    SettingsModal.tsx          Audio, theme and language settings
    Promo.tsx                  "Support us" card and ad placeholder
```

## Gameplay rules

- **Modes:** Classic (one drawer) or Duo Draw (two drawers split a compound word, e.g. space · ship; needs 3+ players).
- **Modifiers:** Speed mode (caps the timer at 30s or 40s), Single color only, Blindfolded drawer.
- **Words:** 9 categories, or host-supplied custom words (mixed in, or custom only). The drawer can re-roll their choices once per turn.
- **Scoring:** a correct guess earns `300 × difficulty × (35% + 65% × time left) × order bonus × hint penalty`, so a hard word is worth at most 600. Drawers are paid at turn end: 75% of the average guess score × share of players who guessed (60% each in Duo).
- **Hints:** guessers can reveal up to 3 letters for themselves; each costs 25% of their points for that word.
- **Chat:** the answer is starred out in public chat; guesses 1–2 letters off are highlighted as close; profanity is censored and earns warnings (3 = kicked).
- **Moderation:** report a player from the ⋮ menu; enough reports (at least 2, or half the room) kick them and block them from rejoining. Hosts of private rooms can kick directly.
- **Reconnects:** a dropped player keeps their slot and score for 60 seconds; refreshing the tab rejoins automatically.
- **Matchmaking:** "Play with randoms" joins the busiest open public room or opens one; public rooms auto-start 15 seconds after a second player joins.

Room state lives in memory, so restarting the server closes every room. Accounts, progression, shop, friends and global leaderboards are Phase 2 (Postgres on Neon).
