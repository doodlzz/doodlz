import type { ReportReason } from '../../shared/types.js';
import { withRoom, type HandlerContext } from './context.js';

const REASONS: ReportReason[] = ['drawing', 'chat', 'name', 'other'];

/** Words, guesses and hints. */
export function registerGameHandlers(ctx: HandlerContext): void {
  const { socket, safe } = ctx;
  socket.on('select_word', safe(withRoom(ctx, (room, id, index) => room.selectWord(id, index))));
  socket.on('reroll_words', safe(withRoom(ctx, (room, id) => room.reroll(id))));
  socket.on('submit_guess', safe(withRoom(ctx, (room, id, text) => room.guess(id, text))));
  socket.on('request_hint', safe(withRoom(ctx, (room, id) => room.requestHint(id))));
}

/** Drawing: strokes, undo, backgrounds, canvas sync. */
export function registerCanvasHandlers(ctx: HandlerContext): void {
  const { socket, safe } = ctx;
  socket.on('draw_stroke', safe(withRoom(ctx, (room, id, ops) => room.draw(id, ops))));
  socket.on('undo', safe(withRoom(ctx, (room, id) => room.undo(id))));
  socket.on('set_background', safe(withRoom(ctx, (room, id, bg) => room.setBackground(id, bg))));
  socket.on(
    'request_canvas',
    safe(() => socket.emit('canvas_history', ctx.current()?.room.canvas() ?? [])),
  );
}

/** Reports and host kicks. */
export function registerModerationHandlers(ctx: HandlerContext): void {
  const { socket, safe } = ctx;
  socket.on(
    'report_player',
    safe(
      withRoom(ctx, (room, id, p) => {
        const reason = REASONS.includes(p?.reason) ? p.reason : 'other';
        room.report(id, p?.targetId, reason);
      }),
    ),
  );
  socket.on('kick_player', safe(withRoom(ctx, (room, id, targetId) => room.hostKick(id, targetId))));
}
