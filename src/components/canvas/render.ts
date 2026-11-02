import type { DrawOp } from '../../../shared/types';

/** Backing-store pixels per logical pixel, for crisp lines. */
export const SCALE = 2;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The drawing layer is transparent; the background is a separate layer underneath. */
export function clearCtx(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
}

/** Scanline flood fill in backing-store pixels. Tolerance plus a 1px grow absorbs anti-aliased edges. */
export function floodFill(ctx: CanvasRenderingContext2D, lx: number, ly: number, color: string) {
  const { width: w, height: h } = ctx.canvas;
  const sx = Math.floor(lx * SCALE);
  const sy = Math.floor(ly * SCALE);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return;

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [fr, fg, fb] = hexToRgb(color);
  const s = (sy * w + sx) * 4;
  const tr = d[s], tg = d[s + 1], tb = d[s + 2], ta = d[s + 3];
  if (ta === 255 && Math.abs(tr - fr) + Math.abs(tg - fg) + Math.abs(tb - fb) < 8) return;

  const TOL = 110;
  const seen = new Uint8Array(w * h);
  const match = (p: number) => {
    if (seen[p]) return false;
    const i = p * 4;
    // Fully transparent pixels all count as "the same" whatever their stored RGB.
    if (ta === 0) return d[i + 3] <= TOL / 2;
    return Math.abs(d[i] - tr) + Math.abs(d[i + 1] - tg) + Math.abs(d[i + 2] - tb) + Math.abs(d[i + 3] - ta) <= TOL;
  };
  const paint = (p: number, mark: number) => {
    const i = p * 4;
    d[i] = fr;
    d[i + 1] = fg;
    d[i + 2] = fb;
    d[i + 3] = 255;
    seen[p] = mark;
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
      paint(p, 1);
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
      if (q >= 0 && q < seen.length && !seen[q]) paint(q, 2);
    }
  }
  ctx.putImageData(img, 0, 0);
}

export function drawShape(ctx: CanvasRenderingContext2D, op: Extract<DrawOp, { kind: 'shape' }>) {
  ctx.save();
  ctx.strokeStyle = ctx.fillStyle = op.color;
  ctx.lineWidth = op.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const x = Math.min(op.x0, op.x1), y = Math.min(op.y0, op.y1);
  const w = Math.abs(op.x1 - op.x0), h = Math.abs(op.y1 - op.y0);
  if (op.shape === 'line') {
    ctx.moveTo(op.x0, op.y0);
    ctx.lineTo(op.x1, op.y1);
    ctx.stroke();
  } else {
    if (op.shape === 'rect') ctx.rect(x, y, w, h);
    else ctx.ellipse(x + w / 2, y + h / 2, Math.max(0.5, w / 2), Math.max(0.5, h / 2), 0, 0, Math.PI * 2);
    if (op.filled) ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

export function renderOp(ctx: CanvasRenderingContext2D, op: DrawOp) {
  switch (op.kind) {
    case 'clear':
      clearCtx(ctx);
      return;
    case 'fill':
      floodFill(ctx, op.x, op.y, op.color);
      return;
    case 'shape':
      drawShape(ctx, op);
      return;
    case 'line': {
      ctx.save();
      ctx.globalCompositeOperation = op.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = ctx.fillStyle = op.color;
      ctx.lineWidth = op.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (op.x0 === op.x1 && op.y0 === op.y1) {
        ctx.arc(op.x0, op.y0, op.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(op.x0, op.y0);
        ctx.lineTo(op.x1, op.y1);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export function replay(ctx: CanvasRenderingContext2D, ops: DrawOp[]) {
  clearCtx(ctx);
  for (const op of ops) renderOp(ctx, op);
}
