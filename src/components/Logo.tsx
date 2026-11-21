const LETTER_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];

/**
 * The doodlz.io logo. The big one's letters bob in a slow wave; hovering a letter makes it hop.
 * Animations only move and rotate letters (cheap for the browser) and stop for reduced motion.
 */
export default function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const text = size === 'lg' ? 'text-6xl sm:text-7xl' : 'text-2xl sm:text-3xl';
  const stroke = size === 'lg' ? '[-webkit-text-stroke:3px_#1e1b4b]' : '[-webkit-text-stroke:1.5px_#1e1b4b]';
  const motion = size === 'lg' ? 'logo-letter logo-wave' : 'logo-letter';
  return (
    <h1 className={`select-none font-display font-bold tracking-tight ${text} ${stroke} [paint-order:stroke_fill]`} aria-label="doodlz.io">
      {'doodlz'.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden
          style={{ color: LETTER_COLORS[i % LETTER_COLORS.length], '--r': `${i % 2 ? 4 : -4}deg`, '--i': i } as React.CSSProperties}
          className={`${motion} drop-shadow-[0_3px_0_rgba(30,27,75,0.6)]`}
        >
          {ch}
        </span>
      ))}
      <span aria-hidden style={{ '--r': '0deg', '--i': 6 } as React.CSSProperties} className={`${motion} text-white drop-shadow-[0_3px_0_rgba(30,27,75,0.6)]`}>
        .io
      </span>
    </h1>
  );
}
