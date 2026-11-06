import { useEffect, useRef, useState } from 'react';
import { Brush, Eraser, Loader2, PaintBucket, Paintbrush, RotateCcw, Trash2, X } from 'lucide-react';
import { useT } from '../i18n';
import { AVATAR_COLORS } from '../lib/avatar';
import Avatar from './Avatar';
import { floodFill, SCALE } from './canvas/render';

// The canvas is drawn at SIZE x SIZE backing pixels (SCALE x the logical size, like the game canvas, so the
// shared flood fill works) and saved at OUT x OUT, which is plenty for an avatar.
const SIZE = 512;
const OUT = 256;
const MAX_DATA_URL = 260_000; // the server takes pictures up to 200 KB
const COLORS = ['#1e1b4b', '#ffffff', '#64748b', '#7c2d12', '#b91c1c', '#15803d', '#1d4ed8', '#6d28d9', ...AVATAR_COLORS];
const SIZES = [6, 16, 36];
type Tool = 'brush' | 'fill' | 'eraser';

interface Props {
  /** Starting background (the player's avatar color). */
  background: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => Promise<void>;
}

/** Paint your own round avatar picture. The circle shows what will be visible. */
export default function PictureDrawer({ background, onCancel, onSave }: Props) {
  const t = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>('brush');
  const [color, setColor] = useState('#1e1b4b');
  const [size, setSize] = useState(SIZES[1]);
  const [preview, setPreview] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const undo = useRef<ImageData[]>([]);
  const last = useRef<{ x: number; y: number } | null>(null);

  const ctx = () => canvas.current!.getContext('2d', { willReadFrequently: true })!;
  const snapshot = () => {
    undo.current.push(ctx().getImageData(0, 0, SIZE, SIZE));
    if (undo.current.length > 25) undo.current.shift();
  };
  const exportImage = (type = 'image/png', quality?: number) => {
    const out = document.createElement('canvas');
    out.width = out.height = OUT;
    out.getContext('2d')!.drawImage(canvas.current!, 0, 0, OUT, OUT);
    return out.toDataURL(type, quality);
  };
  const refreshPreview = () => setPreview(exportImage());

  useEffect(() => {
    const c = ctx();
    c.fillStyle = background;
    c.fillRect(0, 0, SIZE, SIZE);
    refreshPreview();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * SIZE, y: ((e.clientY - r.top) / r.height) * SIZE };
  };

  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const c = ctx();
    c.strokeStyle = tool === 'eraser' ? background : color;
    c.lineWidth = size;
    c.lineCap = c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(from.x, from.y);
    c.lineTo(to.x, to.y);
    c.stroke();
  };

  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    const p = point(e);
    snapshot();
    if (tool === 'fill') {
      floodFill(ctx(), p.x / SCALE, p.y / SCALE, color);
      refreshPreview();
      return;
    }
    canvas.current!.setPointerCapture(e.pointerId);
    last.current = p;
    stroke(p, p);
  };
  const move = (e: React.PointerEvent) => {
    if (!last.current) return;
    const p = point(e);
    stroke(last.current, p);
    last.current = p;
  };
  const up = () => {
    if (!last.current) return;
    last.current = null;
    refreshPreview();
  };

  const save = async () => {
    setSaving(true);
    let url = exportImage();
    if (url.length > MAX_DATA_URL) url = exportImage('image/webp', 0.9);
    await onSave(url);
    setSaving(false);
  };

  const toolBtn = (id: Tool, icon: React.ReactNode, label: string) => (
    <button type="button" onClick={() => setTool(id)} className={`chip flex items-center gap-1 ${tool === id ? 'chip-on' : 'bg-indigo-50'}`} aria-pressed={tool === id} title={label}>
      {icon} <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div
      data-avatar-cropper
      data-picture-drawer
      className="fixed inset-0 z-[90] flex overflow-y-auto bg-indigo-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="drawer-title"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="panel m-auto w-full max-w-md animate-pop p-4">
        <div className="mb-3 flex items-center gap-3">
          <Avatar avatar={{ color: background, eyes: 0, mouth: 0, accessory: 0, image: preview }} size={44} />
          <h2 id="drawer-title" className="flex flex-1 items-center gap-2 font-display text-xl font-bold text-indigo-950">
            <Paintbrush className="size-5 text-pink-500" /> {t('draw.title')}
          </h2>
          <button type="button" onClick={onCancel} className="btn btn-ghost size-10 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>

        {/* The dimmed corners are cut off: avatars are round. */}
        <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-2xl border-4 border-indigo-100">
          <canvas
            ref={canvas}
            width={SIZE}
            height={SIZE}
            className={`size-full touch-none ${tool === 'fill' ? 'cursor-cell' : 'cursor-crosshair'}`}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            aria-label={t('draw.canvas')}
          />
          <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgba(30,27,75,0.45)] ring-2 ring-white/70 ring-inset" />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
          {toolBtn('brush', <Brush className="size-4" />, t('draw.brush'))}
          {toolBtn('fill', <PaintBucket className="size-4" />, t('draw.fill'))}
          {toolBtn('eraser', <Eraser className="size-4" />, t('draw.eraser'))}
          <span className="mx-1 h-6 w-px bg-indigo-100" />
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`grid size-9 cursor-pointer place-items-center rounded-xl ${size === s ? 'bg-indigo-500' : 'bg-indigo-50'}`}
              aria-label={`${t('draw.size')} ${s}`}
              aria-pressed={size === s}
            >
              <span className={`rounded-full ${size === s ? 'bg-white' : 'bg-indigo-400'}`} style={{ width: 4 + s / 3, height: 4 + s / 3 }} />
            </button>
          ))}
          <span className="mx-1 h-6 w-px bg-indigo-100" />
          <button
            type="button"
            className="grid size-9 cursor-pointer place-items-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
            onClick={() => {
              const prev = undo.current.pop();
              if (prev) ctx().putImageData(prev, 0, 0);
              refreshPreview();
            }}
            aria-label={t('draw.undo')}
            title={t('draw.undo')}
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            className="grid size-9 cursor-pointer place-items-center rounded-xl bg-indigo-50 text-rose-500 hover:bg-rose-50"
            onClick={() => {
              snapshot();
              const c = ctx();
              c.fillStyle = background;
              c.fillRect(0, 0, SIZE, SIZE);
              refreshPreview();
            }}
            aria-label={t('draw.clear')}
            title={t('draw.clear')}
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="mx-auto mt-3 grid max-w-[320px] grid-cols-7 gap-1.5" role="radiogroup" aria-label={t('draw.color')}>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={color === c}
              aria-label={c}
              onClick={() => {
                setColor(c);
                if (tool === 'eraser') setTool('brush');
              }}
              style={{ backgroundColor: c }}
              className={`aspect-square cursor-pointer rounded-full border-[3px] transition hover:scale-110 ${color === c ? 'scale-110 border-pink-500' : 'border-white shadow'}`}
            />
          ))}
          <label className="relative aspect-square cursor-pointer overflow-hidden rounded-full border-[3px] border-white bg-[conic-gradient(#ef4444,#eab308,#22c55e,#06b6d4,#6366f1,#d946ef,#ef4444)] shadow" title={t('draw.custom')}>
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 size-full cursor-pointer opacity-0" aria-label={t('draw.custom')} />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn btn-ghost text-base" onClick={onCancel}>
            {t('draw.cancel')}
          </button>
          <button type="button" className="btn btn-green text-base" onClick={save} disabled={saving}>
            {saving && <Loader2 className="size-5 animate-spin" />} {t('draw.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
