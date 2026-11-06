// Account points: given out by the server when a ranked game ends, never trusted from the client.
//
// A game is ranked only when it is public (matchmade, so friends can't pick their own room), it finished
// normally, and at least POINTS.rankedMinPlayers different signed-in players were still there at the end,
// each on their own device and IP address. Players also need a score above zero (no AFK farming).
// Game points are capped per day; quests add a little on top.
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

  for (const p of finishers) {
    if (!p.socketId) continue;
    const place = 1 + finishers.filter((o) => o.score > p.score).length;
    const reason: UnrankedReason | undefined = !p.accountId ? 'guest' : (roomReason ?? (p.score <= 0 || paid.has(p.accountId) ? 'noScore' : undefined));
    const base: RewardSummary = { ranked: false, reason, place, gamePoints: 0, capped: false, questPoints: 0, questsDone: [] };

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
      ...(room.settings.mode === 'duo' ? { duoFinished: 1 } : {}),
      ...(room.settings.speed > 0 ? { speedFinished: 1 } : {}),
    };
    const result = accounts.award(p.accountId, { points: placePoints(place), events });
    if (!result) continue;
    io.to(p.socketId).emit('rewards', { ...base, ranked: true, reason: undefined, ...result });
    console.log(`room ${room.code}: ${p.name} +${result.gamePoints + result.questPoints} points (place ${place})`);
  }
}
