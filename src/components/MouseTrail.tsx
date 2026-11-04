import { useEffect, useRef } from 'react';

// How long a point of the trail stays visible before it fully fades out.
const LIFETIME_MS = 700;
// A pause longer than this starts a new stroke instead of joining to the old one.
const BREAK_MS = 120;

type Point = { x: number; y: number; t: number; start: boolean };

const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * Full-screen canvas behind the page that draws a light line following the mouse
 * and fades it out. It sits under all content, so it only shows in empty space.
 * The canvas is drawn at 20% opacity (see-through white), so the line takes on the
 * colour of the background under it; drawing solid then fading the whole canvas
 * keeps overlapping pieces from showing darker spots.
 */
export default function MouseTrail() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const points: Point[] = [];
    let frame = 0;
    let last = 0;

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
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Curve through the midpoints between mouse positions, using each position as the
      // bend, so fast moves come out round instead of as straight zigzags.
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (b.start) continue;
        const before = points[i - 2];
        const from = i >= 2 && !a.start ? mid(before, a) : a;
        const to = mid(a, b);
        const isEnd = i === points.length - 1 || points[i + 1].start;

        const life = 1 - (now - b.t) / LIFETIME_MS; // 1 = fresh, 0 = gone
        ctx.strokeStyle = `rgba(255, 255, 255, ${life})`;
        ctx.lineWidth = 3 + 5 * life;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(a.x, a.y, to.x, to.y);
        if (isEnd) ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      frame = points.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      let start = now - last > BREAK_MS;
      last = now;
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

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 size-full opacity-20" aria-hidden="true" />;
}
