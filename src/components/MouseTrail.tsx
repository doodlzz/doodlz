import { useEffect, useRef } from 'react';

// How long a point of the trail stays visible before it fully fades out.
const LIFETIME_MS = 700;
// A pause longer than this starts a new stroke instead of joining to the old one.
const BREAK_MS = 120;

type Point = { x: number; y: number; t: number; start: boolean };

/**
 * Full-screen canvas behind the page that draws a gray line following the mouse
 * and fades it out. It sits under all content, so it only shows in empty space.
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
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1];
        const b = points[i];
        if (b.start) continue;
        const life = 1 - (now - b.t) / LIFETIME_MS; // 1 = fresh, 0 = gone
        // Near-white with a soft glow so it reads on every part of the gradient.
        ctx.strokeStyle = `rgba(241, 245, 249, ${0.95 * life})`;
        ctx.shadowColor = `rgba(255, 255, 255, ${0.6 * life})`;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3 + 5 * life;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      frame = points.length ? requestAnimationFrame(draw) : 0;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const now = performance.now();
      points.push({ x: e.clientX, y: e.clientY, t: now, start: now - last > BREAK_MS });
      last = now;
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

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 size-full" aria-hidden="true" />;
}
