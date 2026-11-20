// Account points: given out by the server when a ranked game ends, never trusted from the client.
//
// A game is ranked only when it is public (matchmade, so friends can't pick their own room), it finished
// normally, and at least POINTS.rankedMinPlayers different signed-in players were still there at the end,
// each on their own device and IP address. Players also need a score above zero (no AFK farming).
// Game points are capped per day; daily and weekly quests add on top.
import { CASUAL_XP, levelOf } from '../../shared/levels.js';
import { POINTS, type QuestEvent, type RewardSummary, type UnrankedReason } from '../../shared/quests.js';
import type { AccountStore } from '../auth/accounts.js';
import { config } from '../config.js';
import type { IO, Player, Room } from '../rooms/Room.js';

/** How many different real players finished: distinct accounts, devices and (normally) IPs. */
export function distinctSignedIn(players: Player[]): number {
  const signedIn = players.filter((p) => p.accountId);
  const count = (key: (p: Player) => string) => new Set(signedIn.map(key)).size;
  const ips = config.rankedUniqueIp ? count((p) => p.ip) : Infinity;
  return Math.min(count((p) => p.accountId!), count((p) => p.deviceId), ips);
}

/** Different signed-in accounts on different devices (no IP check: friends often share a network). */
function distinctAccountsAndDevices(players: Player[]): number {
  const signedIn = players.filter((p) => p.accountId);
  return Math.min(new Set(signedIn.map((p) => p.accountId)).size, new Set(signedIn.map((p) => p.deviceId)).size);
}

export function placePoints(place: number): number {
  return POINTS.place[place - 1] ?? POINTS.finished;
}

export function gameOverRewards(io: IO, accounts: AccountStore, room: Room, complete: boolean): void {
  const finishers = [...room.players.values()].filter((p) => p.connected);
  const minPlayers = config.rankedMinPlayers;
  const roomReason: UnrankedReason | undefined = !room.isPublic
    ? 'private'
    : !complete
      ? 'unfinished'
      : distinctSignedIn(finishers) < minPlayers
        ? 'fewPlayers'
        : undefined;
  // Two tabs of one account only get paid once.
  const paid = new Set<string>();
  let levelled = false;

  for (const p of finishers) {
    if (!p.socketId) continue;
    const place = 1 + finishers.filter((o) => o.score > p.score).length;
    const reason: UnrankedReason | undefined = !p.accountId ? 'guest' : (roomReason ?? (p.score <= 0 || paid.has(p.accountId) ? 'noScore' : undefined));
    const base: RewardSummary = { ranked: false, reason, place, gamePoints: 0, capped: false, questPoints: 0, questsDone: [] };

    // Not ranked, but a finished game with friends still gives a little XP.
    const casual =
      p.accountId &&
      complete &&
      (reason === 'private' || reason === 'fewPlayers') &&
      p.score > 0 &&
      !paid.has(p.accountId) &&
      distinctAccountsAndDevices(finishers) >= CASUAL_XP.minPlayers;
    if (casual && p.accountId) {
      paid.add(p.accountId);
      const r = accounts.awardCasualXp(p.accountId, p.gameGuesses + p.gameDrawings);
      if (r) {
        p.avatar = { ...p.avatar, level: levelOf(r.xp) };
        levelled = true;
      }
      io.to(p.socketId).emit('rewards', r ? { ...base, ...r } : base);
      continue;
    }
    if (reason || !p.accountId) {
      io.to(p.socketId).emit('rewards', base);
      continue;
    }
    paid.add(p.accountId);

    const events: Partial<Record<QuestEvent, number>> = {
      gameFinished: 1,
      publicFinished: 1,
      guessed: p.gameGuesses,
      drew: p.gameDrawings,
      firstGuess: p.gameFirstGuesses,
      cleanGuess: p.gameCleanGuesses,
      fullHouse: p.gameFullHouses,
      ...(place === 1 ? { won: 1 } : {}),
      ...(place <= 3 ? { podium: 1 } : {}),
      ...(room.settings.mode === 'duo' ? { duoFinished: 1 } : {}),
      ...(room.settings.speed > 0 ? { speedFinished: 1 } : {}),
      ...(room.settings.singleColor ? { singleColorFinished: 1 } : {}),
      ...(room.settings.blindfold ? { blindfoldFinished: 1 } : {}),
    };
    const result = accounts.award(p.accountId, { points: placePoints(place), events });
    if (!result) continue;
    p.avatar = { ...p.avatar, level: levelOf(result.xp) };
    levelled = true;
    io.to(p.socketId).emit('rewards', { ...base, ranked: true, reason: undefined, ...result });
    console.log(`room ${room.code}: ${p.name} +${result.gamePoints + result.questPoints} points (place ${place})`);
  }
  // Show new levels on the end screen.
  if (levelled) room.broadcastState();
}
