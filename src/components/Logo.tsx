const LETTER_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];

/**
 * Start a letter's hop and let it finish. It runs on an inner layer, so the outer layer's wave never stops, and
 * it isn't tied to :hover, so sweeping the mouse across quickly doesn't cut hops off halfway.
 */
function hop(e: React.MouseEvent<HTMLSpanElement>) {
  const el = e.currentTarget;
  if (el.classList.contains('logo-hopping')) return;
  el.classList.add('logo-hopping');
  el.addEventListener('animationend', () => el.classList.remove('logo-hopping'), { once: true });
}

/**
 * The doodlz.io logo. The big one's letters bob in a slow wave; hovering a letter makes it hop.
 * Animations only move and rotate letters (cheap for the browser) and stop for reduced motion.
 */
export default function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const text = size === 'lg' ? 'text-6xl sm:text-7xl' : 'text-2xl sm:text-3xl';
  const stroke = size === 'lg' ? '[-webkit-text-stroke:3px_#1e1b4b]' : '[-webkit-text-stroke:1.5px_#1e1b4b]';
  const letters: { ch: string; color: string; r: string }[] = [
    ...'doodlz'.split('').map((ch, i) => ({ ch, color: LETTER_COLORS[i % LETTER_COLORS.length], r: `${i % 2 ? 4 : -4}deg` })),
    { ch: '.io', color: '#ffffff', r: '0deg' },
  ];
  return (
    <h1 className={`select-none font-display font-bold tracking-tight ${text} ${stroke} [paint-order:stroke_fill]`} aria-label="doodlz.io">
      {letters.map((l, i) => (
        // Outer layer: tilt and (big logo) the wave. Inner layer: the hover hop.
        <span key={i} aria-hidden className={`logo-letter ${size === 'lg' ? 'logo-wave' : ''}`} style={{ '--r': l.r, '--i': i } as React.CSSProperties}>
          <span className="logo-hop drop-shadow-[0_3px_0_rgba(30,27,75,0.6)]" style={{ color: l.color }} onMouseEnter={hop}>
            {l.ch}
          </span>
        </span>
      ))}
    </h1>
  );
}
