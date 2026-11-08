import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { EyeOff } from 'lucide-react';
import { CANVAS_HEIGHT, CANVAS_WIDTH, type BackgroundId, type DrawOp, type ShapeKind } from '../../../shared/types';
import { useT } from '../../i18n';
import { socket } from '../../socket';
import { BACKGROUND_STYLES } from './backgrounds';
import { clearCtx, drawShape, renderOp, replay, SCALE } from './render';
import Toolbar, { PALETTE, SIZES, type Tool } from './Toolbar';

const FLUSH_MS = 30;
// Stroke ids only need to be unique per drawer per turn; a random start avoids clashes after a reconnect.
let strokeCounter = Math.floor(Math.random() * 1e9);

interface Props {
  isDrawer: boolean;
  canDraw: boolean;
  blindfolded: boolean;
  lockedColor: string | null;
  background: BackgroundId;
  onBackground: (bg: BackgroundId) => void;
  overlay?: ReactNode;
}

export default function Canvas({ isDrawer, canDraw, blindfolded, lockedColor, background, onBackground, overlay }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const queue = useRef<DrawOp[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);
  const shapeStart = useRef<{ x: number; y: number } | null>(null);
  const sid = useRef(0);

  const [tool, setTool] = useState<Tool>('brush');
  const [pickedColor, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState<number>(SIZES[1].value);
  const [filled, setFilled] = useState(false);
  const color = lockedColor ?? pickedColor;

  const flush = useCallback(() => {
    if (queue.current.length) socket.emit('draw_stroke', queue.current.splice(0));
  }, []);

  // Set up the context and subscribe to remote drawing.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true })!;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    clearCtx(ctx);
    ctxRef.current = ctx;
    previewRef.current!.getContext('2d')!.setTransform(SCALE, 0, 0, SCALE, 0, 0);

    const onStroke = (ops: DrawOp[]) => ops.forEach((op) => renderOp(ctx, op));
    const onClear = () => {
      queue.current = [];
      clearCtx(ctx);
    };
    const onHistory = (ops: DrawOp[]) => {
      queue.current = [];
      replay(ctx, ops);
    };
    socket.on('draw_stroke', onStroke);
    socket.on('clear_canvas', onClear);
    socket.on('canvas_history', onHistory);
    socket.emit('request_canvas');

    const timer = setInterval(flush, FLUSH_MS);
    return () => {
      socket.off('draw_stroke', onStroke);
      socket.off('clear_canvas', onClear);
      socket.off('canvas_history', onHistory);
      clearInterval(timer);
    };
  }, [flush]);

  const undo = useCallback(() => {
    flush();
    socket.emit('undo');
  }, [flush]);

  const clear = useCallback(() => {
    const op: DrawOp = { kind: 'clear', sid: ++strokeCounter };
    clearCtx(ctxRef.current!);
    queue.current.push(op);
    flush();
  }, [flush]);

  // Keyboard shortcuts for the drawer.
  useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canDraw) undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, Tool> = { b: 'brush', e: 'eraser', f: 'fill', l: 'line', r: 'rect', o: 'ellipse' };
      const k = e.key.toLowerCase();
      if (map[k]) setTool(map[k]);
      else if (k >= '1' && k <= '3') setSize(SIZES[Number(k) - 1].value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawer, canDraw, undo]);

  const emitLocal = (op: DrawOp) => {
    renderOp(ctxRef.current!, op);
    queue.current.push(op);
  };

  const toLogical = (e: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: Math.round(((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH * 10) / 10,
      y: Math.round(((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT * 10) / 10,
    };
  };

  const shapeOp = (a: { x: number; y: number }, b: { x: number; y: number }): Extract<DrawOp, { kind: 'shape' }> => ({
    kind: 'shape',
    sid: sid.current,
    shape: tool as ShapeKind,
    x0: a.x,
    y0: a.y,
    x1: b.x,
    y1: b.y,
    color,
    size,
    filled: filled && tool !== 'line',
  });

  const clearPreview = () => {
    const p = previewRef.current!.getContext('2d')!;
    p.save();
    p.setTransform(1, 0, 0, 1, 0, 0);
    p.clearRect(0, 0, p.canvas.width, p.canvas.height);
    p.restore();
  };

  const moveCursor = (e: ReactPointerEvent) => {
    const el = cursorRef.current;
    if (!el) return;
    if (!canDraw || e.pointerType !== 'mouse' || tool === 'fill' || blindfolded) {
      el.style.opacity = '0';
      return;
    }
    const rect = canvasRef.current!.getBoundingClientRect();
    const px = (size * rect.width) / CANVAS_WIDTH;
    el.style.opacity = '1';
    el.style.width = el.style.height = `${px}px`;
    el.style.transform = `translate(${e.clientX - rect.left - px / 2}px, ${e.clientY - rect.top - px / 2}px)`;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    const p = toLogical(e);
    sid.current = ++strokeCounter;
    if (tool === 'fill') {
      emitLocal({ kind: 'fill', sid: sid.current, x: p.x, y: p.y, color });
      flush();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    if (tool === 'line' || tool === 'rect' || tool === 'ellipse') {
      shapeStart.current = p;
      return;
    }
    last.current = p;
    emitLocal({ kind: 'line', sid: sid.current, x0: p.x, y0: p.y, x1: p.x, y1: p.y, color, size, ...(tool === 'eraser' ? { erase: true } : {}) });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    moveCursor(e);
    if (!canDraw) return;
    if (shapeStart.current) {
      clearPreview();
      drawShape(previewRef.current!.getContext('2d')!, shapeOp(shapeStart.current, toLogical(e)));
      return;
    }
    if (!last.current) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const p = toLogical(ev);
      const prev = last.current!;
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1) continue;
      emitLocal({ kind: 'line', sid: sid.current, x0: prev.x, y0: prev.y, x1: p.x, y1: p.y, color, size, ...(tool === 'eraser' ? { erase: true } : {}) });
      last.current = p;
    }
  };

  const endStroke = (e?: ReactPointerEvent<HTMLCanvasElement>) => {
    if (shapeStart.current) {
      const end = e ? toLogical(e) : shapeStart.current;
      clearPreview();
      const op = shapeOp(shapeStart.current, end);
      shapeStart.current = null;
      if (Math.abs(op.x1 - op.x0) + Math.abs(op.y1 - op.y0) > 2) emitLocal(op);
      flush();
      return;
    }
    if (!last.current) return;
    last.current = null;
    flush();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="panel relative overflow-hidden p-0">
        <div className="relative aspect-[4/3] w-full" style={BACKGROUND_STYLES[background]}>
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH * SCALE}
            height={CANVAS_HEIGHT * SCALE}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endStroke}
            onPointerCancel={() => endStroke()}
            onLostPointerCapture={() => endStroke()}
            onPointerLeave={(e) => {
              if (cursorRef.current) cursorRef.current.style.opacity = '0';
              if (e.pointerType !== 'mouse') endStroke();
            }}
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute inset-0 block size-full touch-none ${canDraw ? (tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'}`}
            aria-label="Drawing canvas"
          />
          <canvas ref={previewRef} width={CANVAS_WIDTH * SCALE} height={CANVAS_HEIGHT * SCALE} className="pointer-events-none absolute inset-0 size-full" />
          <div
            ref={cursorRef}
            className="pointer-events-none absolute top-0 left-0 rounded-full border-2 border-slate-500/70 opacity-0"
            style={{ backgroundColor: tool === 'eraser' ? 'rgba(255,255,255,0.6)' : `${color}55` }}
          />
          {blindfolded && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black text-center text-white">
              <div className="flex flex-col items-center gap-2 px-6">
                <EyeOff className="size-12 text-pink-400" />
                <p className="font-display text-2xl font-bold">{t('game.blindfolded')}</p>
                <p className="font-bold text-white/90">{t('game.blindfoldedText')}</p>
              </div>
            </div>
          )}
        </div>
        {overlay}
      </div>

      {isDrawer && (
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          size={size}
          setSize={setSize}
          filled={filled}
          setFilled={setFilled}
          lockedColor={lockedColor}
          background={background}
          onBackground={onBackground}
          onUndo={undo}
          onClear={clear}
          enabled={canDraw}
        />
      )}
    </div>
  );
}
