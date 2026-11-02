const LETTER_COLORS = ['#f87171', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#c084fc'];

export default function Logo({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const text = size === 'lg' ? 'text-6xl sm:text-7xl' : 'text-2xl sm:text-3xl';
  const stroke = size === 'lg' ? '[-webkit-text-stroke:3px_#1e1b4b]' : '[-webkit-text-stroke:1.5px_#1e1b4b]';
  return (
    <h1 className={`select-none font-display font-bold tracking-tight ${text} ${stroke} [paint-order:stroke_fill]`}>
      {'doodlz'.split('').map((ch, i) => (
        <span
          key={i}
          style={{ color: LETTER_COLORS[i % LETTER_COLORS.length], transform: `rotate(${i % 2 ? 4 : -4}deg)` }}
          className="inline-block drop-shadow-[0_3px_0_rgba(30,27,75,0.6)]"
        >
          {ch}
        </span>
      ))}
      <span className="inline-block text-white drop-shadow-[0_3px_0_rgba(30,27,75,0.6)]">.gg</span>
    </h1>
  );
}
