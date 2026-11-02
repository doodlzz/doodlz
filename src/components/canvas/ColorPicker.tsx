import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { useT } from '../../i18n';

// ---------- color math ----------

export function hsvToHex(h: number, s: number, v: number): string {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return '#' + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('');
}

export function hexToHsv(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return [h, max ? d / max : 0, max];
}

// ---------- component ----------

const SIZE = 168;

interface Props {
  color: string;
  onChange: (hex: string) => void;
}

/** Continuous hue/saturation wheel with a brightness slider and hex input. */
export default function ColorPicker({ color, onChange }: Props) {
  const t = useT();
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [hexText, setHexText] = useState(color);
  const wheel = useRef<HTMLDivElement>(null);

  // Follow outside changes (e.g. picking a palette swatch) without fighting the user's drag.
  useEffect(() => {
    if (hsvToHex(...hsv) !== color) setHsv(hexToHsv(color));
    setHexText(color);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  const apply = (next: [number, number, number]) => {
    setHsv(next);
    onChange(hsvToHex(...next));
  };

  const pickAt = (e: PointerEvent<HTMLDivElement>) => {
    const rect = wheel.current!.getBoundingClientRect();
    const dx = e.clientX - rect.left - rect.width / 2;
    const dy = e.clientY - rect.top - rect.height / 2;
    const r = rect.width / 2;
    const hue = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    const sat = Math.min(1, Math.hypot(dx, dy) / r);
    apply([hue, sat, hsv[2] || 1]);
  };

  const [h, s, v] = hsv;
  const angle = (h * Math.PI) / 180;
  const mx = SIZE / 2 + Math.sin(angle) * s * (SIZE / 2);
  const my = SIZE / 2 - Math.cos(angle) * s * (SIZE / 2);

  return (
    <div className="flex w-[200px] flex-col items-center gap-3">
      <div
        ref={wheel}
        role="slider"
        aria-label={t('tool.color')}
        aria-valuetext={color}
        className="relative cursor-crosshair touch-none rounded-full shadow-inner"
        style={{
          width: SIZE,
          height: SIZE,
          background: 'radial-gradient(closest-side, #fff, rgba(255,255,255,0)), conic-gradient(red, yellow, lime, cyan, blue, magenta, red)',
        }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          pickAt(e);
        }}
        onPointerMove={(e) => e.buttons && pickAt(e)}
      >
        <div className="pointer-events-none absolute inset-0 rounded-full bg-black" style={{ opacity: 1 - v }} />
        <span
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_2px_rgba(0,0,0,0.5)]"
          style={{ left: mx, top: my, backgroundColor: color }}
        />
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(v * 100)}
        onChange={(e) => apply([h, s, Number(e.target.value) / 100])}
        aria-label="Brightness"
        className="h-3 w-full cursor-pointer appearance-none rounded-full"
        style={{ background: `linear-gradient(to right, #000, ${hsvToHex(h, s, 1)})` }}
      />
      <div className="flex w-full items-center gap-2">
        <span className="size-8 shrink-0 rounded-lg border-2 border-indigo-100" style={{ backgroundColor: color }} />
        <input
          className="input px-2 py-1 font-mono text-sm uppercase"
          value={hexText}
          maxLength={7}
          aria-label="Hex color"
          onChange={(e) => {
            const val = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
            setHexText(val);
            if (/^#[0-9a-f]{6}$/i.test(val)) onChange(val.toLowerCase());
          }}
        />
      </div>
    </div>
  );
}
