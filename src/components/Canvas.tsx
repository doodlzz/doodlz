import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Brush, Eraser, PaintBucket, Trash2 } from 'lucide-react';
import { CANVAS_HEIGHT, CANVAS_WIDTH, type DrawOp } from '../../shared/types';
import { socket } from '../socket';

type Tool = 'brush' | 'eraser' | 'fill';

const SCALE = 2; // backing-store pixels per logical pixel, for crisp lines
const BACKGROUND = '#ffffff';
const FLUSH_MS = 30;

export const PALETTE = [
  '#000000', '#4b5563', '#9ca3af', '#ffffff',
  '#ef4444', '#f97316', '#facc15', '#84cc16',
  '#16a34a', '#06b6d4', '#3b82f6', '#1e3a8a',
  '#8b5cf6', '#ec4899', '#fbcfe8', '#92400e',
];

const SIZES = [
  { label: 'Small', value: 4, dot: 6 },
  { label: 'Medium', value: 12, dot: 12 },
  { label: 'Large', value: 28, dot: 20 },
];

// ---------------- rendering ----------------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Scanline flood fill in backing-store pixels. Tolerance absorbs anti-aliased edges. */
function floodFill(ctx: CanvasRenderingContext2D, lx: number, ly: number, color: string) {
  const { width: w, height: h } = ctx.canvas;
  const sx = Math.floor(lx * SCALE);
  const sy = Math.floor(ly * SCALE);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [fr, fg, fb] = hexToRgb(color);
  const s = (sy * w + sx) * 4;
  const tr = d[s], tg = d[s + 1], tb = d[s + 2], ta = d[s + 3];
  if (Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 8 && ta === 255) return;

  const TOL = 110;
  const seen = new Uint8Array(w * h);
  const match = (p: number) => {
    if (seen[p]) return false;
    const i = p * 4;
    return Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - ta) <= TOL;
  };
  const paint = (p: number) => {
    const i = p * 4;
    d[i] = fr;
    d[i + 1] = fg;
    d[i + 2] = fb;
    d[i + 3] = 255;
    seen[p] = 1;
  };

  const stack: number[] = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    let p = y * w + x;
    while (x >= 0 && match(p)) {
      x--;
      p--;
    }
    x++;
    p++;
    let up = false;
    let down = false;
    while (x < w && match(p)) {
      paint(p);
      if (y > 0) {
        if (match(p - w)) {
          if (!up) {
            stack.push(x, y - 1);
            up = true;
          }
        } else up = false;
      }
      if (y < h - 1) {
        if (match(p + w)) {
          if (!down) {
            stack.push(x, y + 1);
            down = true;
          }
        } else down = false;
      }
      x++;
      p++;
    }
  }

  // Grow the filled area by one pixel so anti-aliased edges don't leave a faint halo.
  for (let p = 0; p < seen.length; p++) {
    if (seen[p] !== 1) continue;
    const x = p % w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
      if (q >= 0 && q < seen.length && !seen[q]) {
        const i = q * 4;
        d[i] = fr;
        d[i + 1] = fg;
        d[i + 2] = fb;
        d[i + 3] = 255;
        seen[q] = 2;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
}

function renderOp(ctx: CanvasRenderingContext2D, op: DrawOp) {
  if (op.kind === 'fill') {
    floodFill(ctx, op.x, op.y, op.color);
    return;
  }
  ctx.strokeStyle = ctx.fillStyle = op.color;
  ctx.lineWidth = op.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (op.x0 === op.x1 && op.y0 === op.y1) {
    ctx.beginPath();
    ctx.arc(op.x0, op.y0, op.size / 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(op.x0, op.y0);
    ctx.lineTo(op.x1, op.y1);
    ctx.stroke();
  }
}

function clearCtx(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

// ---------------- component ----------------

interface Props {
  isDrawer: boolean;
  canDraw: boolean;
  overlay?: ReactNode;
}

function ToolButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`grid size-11 cursor-pointer place-items-center rounded-2xl transition ${
        active ? 'bg-indigo-500 text-white shadow-[0_3px_0_#3730a3]' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
      }`}
    >
      {children}
    </button>
  );
}

export default function Canvas({ isDrawer, canDraw, overlay }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const queue = useRef<DrawOp[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);

  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState(PALETTE[0]);
  const [size, setSize] = useState(SIZES[1].value);

  const flush = useCallback(() => {
    if (queue.current.length) socket.emit('draw_stroke', queue.current.splice(0));
  }, []);

  // Set up the context and subscribe to remote drawing.
  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true })!;
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    clearCtx(ctx);
    ctxRef.current = ctx;

    const onStroke = (ops: DrawOp[]) => ops.forEach((op) => renderOp(ctx, op));
    const onClear = () => {
      queue.current = [];
      clearCtx(ctx);
    };
    const onHistory = (ops: DrawOp[]) => {
      clearCtx(ctx);
      ops.forEach((op) => renderOp(ctx, op));
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

  // Keyboard shortcuts for the drawer: B / E / F tools, 1–3 sizes.
  useEffect(() => {
    if (!isDrawer) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'b') setTool('brush');
      else if (k === 'e') setTool('eraser');
      else if (k === 'f') setTool('fill');
      else if (k >= '1' && k <= '3') setSize(SIZES[Number(k) - 1].value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDrawer]);

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

  const strokeColor = tool === 'eraser' ? BACKGROUND : color;

  const moveCursor = (e: ReactPointerEvent) => {
    const el = cursorRef.current;
    if (!el || !canDraw || e.pointerType !== 'mouse' || tool === 'fill') {
      if (el) el.style.opacity = '0';
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
    if (tool === 'fill') {
      emitLocal({ kind: 'fill', x: p.x, y: p.y, color });
      flush();
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    last.current = p;
    emitLocal({ kind: 'line', x0: p.x, y0: p.y, x1: p.x, y1: p.y, color: strokeColor, size });
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    moveCursor(e);
    if (!canDraw || !last.current) return;
    const events = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    for (const ev of events.length ? events : [e.nativeEvent]) {
      const p = toLogical(ev);
      const prev = last.current!;
      if (Math.hypot(p.x - prev.x, p.y - prev.y) < 1) continue;
      emitLocal({ kind: 'line', x0: prev.x, y0: prev.y, x1: p.x, y1: p.y, color: strokeColor, size });
      last.current = p;
    }
  };

  const endStroke = () => {
    if (!last.current) return;
    last.current = null;
    flush();
  };

  const clear = () => {
    clearCtx(ctxRef.current!);
    queue.current = [];
    socket.emit('clear_canvas');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="panel relative overflow-hidden p-0">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH * SCALE}
          height={CANVAS_HEIGHT * SCALE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onLostPointerCapture={endStroke}
          onPointerLeave={(e) => {
            if (cursorRef.current) cursorRef.current.style.opacity = '0';
            if (e.pointerType !== 'mouse') endStroke();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className={`block aspect-[4/3] w-full touch-none bg-white ${
            canDraw ? (tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'
          }`}
        />
        <div
          ref={cursorRef}
          className="pointer-events-none absolute top-0 left-0 rounded-full border-2 border-slate-500/70 opacity-0"
          style={{ backgroundColor: tool === 'eraser' ? 'rgba(255,255,255,0.6)' : `${color}55` }}
        />
        {overlay}
      </div>

      {isDrawer && (
        <div className={`panel flex flex-wrap items-center gap-3 p-3 transition ${canDraw ? '' : 'pointer-events-none opacity-60'}`}>
          <div className="grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Color">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
                aria-label={`Color ${c}`}
                onClick={() => {
                  setColor(c);
                  if (tool === 'eraser') setTool('brush');
                }}
                style={{ backgroundColor: c }}
                className={`size-8 cursor-pointer rounded-xl border-[3px] transition hover:scale-110 ${
                  color === c && tool !== 'eraser' ? 'scale-110 border-indigo-950 shadow-lg' : 'border-indigo-100'
                }`}
              />
            ))}
          </div>

          <div className="h-10 w-1 rounded bg-indigo-50 max-sm:hidden" />

          <div className="flex gap-1.5">
            <ToolButton active={tool === 'brush'} onClick={() => setTool('brush')} label="Brush (B)">
              <Brush className="size-5" />
            </ToolButton>
            <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} label="Eraser (E)">
              <Eraser className="size-5" />
            </ToolButton>
            <ToolButton active={tool === 'fill'} onClick={() => setTool('fill')} label="Fill bucket (F)">
              <PaintBucket className="size-5" />
            </ToolButton>
          </div>

          <div className="flex gap-1.5">
            {SIZES.map((s, i) => (
              <ToolButton key={s.value} active={size === s.value} onClick={() => setSize(s.value)} label={`${s.label} brush (${i + 1})`}>
                <span className="rounded-full bg-current" style={{ width: s.dot, height: s.dot }} />
              </ToolButton>
            ))}
          </div>

          <button type="button" onClick={clear} className="btn btn-pink ml-auto px-4 py-2.5 text-base" title="Clear canvas">
            <Trash2 className="size-5" /> Clear
          </button>
        </div>
      )}
    </div>
  );
}
