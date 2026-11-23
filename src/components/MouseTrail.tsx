import { useEffect, useRef } from 'react';

// How long each part of the line stays before it has fully faded.
const LIFETIME_MS = 1500;
// A pause longer than this starts a new line instead of joining on to the old one.
const BREAK_MS = 120;
// Parts of the line drawn within this much time of each other share one stroke and one fade level.
const CHUNK_MS = 40;
const WIDTH = 7;

type Point = { x: number; y: number; t: number; start: boolean };

const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * A line that follows the mouse in the empty space behind the page, a little darker than the background, like a
 * dent pressed into it. The canvas is solid black made see-through with CSS opacity, so the line takes on the
 * background's colour, just darker.
 *
 * Every frame the line is redrawn from the remembered mouse positions: older parts fainter, gone after
 * LIFETIME_MS, so nothing lingers. Positions close in time are drawn as one continuous stroke with flat ends where
 * strokes meet, so the line doesn't show darker dots at the joins. Only runs while there is a line to draw.
 */
export default function MouseTrail() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const points: Point[] = [];
    let frame = 0;
    let lastMove = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = () => {
      const now = performance.now();
      while (points.length && now - points[0].t > LIFETIME_MS) points.shift();
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = WIDTH;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';

      // Walk the line as curves through the midpoints between positions (round on fast moves), starting a new
      // stroke whenever the age bucket changes or a new line starts.
      let chunk = -1;
      let open = false;
      const flush = () => {
        if (open) ctx.stroke();
        open = false;
      };
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (b.start) {
          flush();
          continue;
        }
        const from = i >= 2 && !a.start ? mid(points[i - 2], a) : a;
        const to = mid(a, b);
        const isEnd = i === points.length - 1 || points[i + 1].start;
        const bucket = Math.floor((now - b.t) / CHUNK_MS);
        if (!open || bucket !== chunk) {
          flush();
          chunk = bucket;
          const life = Math.max(0, 1 - (now - b.t) / LIFETIME_MS);
          ctx.globalAlpha = life * life * (3 - 2 * life); // eases out: stays strong a moment, then fades away
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          open = true;
        }
        ctx.quadraticCurveTo(a.x, a.y, to.x, to.y);
        if (isEnd) ctx.lineTo(b.x, b.y);
      }
      flush();
      ctx.globalAlpha = 1;

      frame = points.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      let start = now - lastMove > BREAK_MS;
      lastMove = now;
      // Fast moves can fire one event for several positions; use all of them.
      const moves = e.getCoalescedEvents?.() ?? [];
      for (const m of moves.length ? moves : [e]) {
        const prev = points[points.length - 1];
        if (!start && prev && Math.hypot(m.clientX - prev.x, m.clientY - prev.y) < 2) continue;
        points.push({ x: m.clientX, y: m.clientY, t: now, start });
        start = false;
      }
      if (!frame) frame = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Light mode: 15% darker than the background; dark mode needs a little more to show on the dark purple.
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 size-full opacity-15 dark:opacity-30" aria-hidden="true" />;
}
