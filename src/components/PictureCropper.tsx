import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, Move, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useT } from '../i18n';
import { cropPicture } from '../lib/avatar';

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

interface Props {
  file: File;
  onCancel: () => void;
  /** Gets the cropped picture as a small data URL; resolves when saving is done. */
  onSave: (dataUrl: string) => Promise<void>;
}

/** Lets the player move and zoom their picture inside the round avatar frame before uploading it. */
export default function PictureCropper({ file, onCancel, onSave }: Props) {
  const t = useT();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [url, setUrl] = useState('');
  const [failed, setFailed] = useState(false);
  // zoom 1 = picture just fills the circle; x/y = how far it's moved from the middle, in screen pixels.
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const { zoom } = view;
  const pos = { x: view.x, y: view.y };
  const [saving, setSaving] = useState(false);
  const [size] = useState(() => Math.min(280, window.innerWidth - 80));
  const frame = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());

  // Load the picked file for showing and cropping.
  useEffect(() => {
    let live = true; // ignore a load that was cancelled (e.g. React running this twice in development)
    const u = URL.createObjectURL(file);
    setUrl(u);
    setImg(null);
    setFailed(false);
    const el = new Image();
    el.onload = () => live && setImg(el);
    el.onerror = () => live && setFailed(true);
    el.src = u;
    return () => {
      live = false;
      URL.revokeObjectURL(u);
    };
  }, [file]);

  // Picture size on screen: at zoom 1 its short side exactly fills the circle.
  const scale = img ? (size / Math.min(img.naturalWidth, img.naturalHeight)) * zoom : 1;
  const w = img ? img.naturalWidth * scale : size;
  const h = img ? img.naturalHeight * scale : size;

  /** Keep the picture covering the whole frame. */
  const clampPos = useCallback(
    (p: { x: number; y: number }, z: number) => {
      if (!img) return p;
      const s = (size / Math.min(img.naturalWidth, img.naturalHeight)) * z;
      const mx = Math.max(0, (img.naturalWidth * s - size) / 2);
      const my = Math.max(0, (img.naturalHeight * s - size) / 2);
      return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
    },
    [img, size],
  );

  /** Zoom (to a value, or by a factor of the current zoom) around the middle of the circle. */
  const zoomTo = useCallback(
    (next: number | ((z: number) => number)) =>
      setView((v) => {
        const z = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, typeof next === 'function' ? next(v.zoom) : next));
        return { zoom: z, ...clampPos({ x: (v.x * z) / v.zoom, y: (v.y * z) / v.zoom }, z) };
      }),
    [clampPos],
  );
  const moveBy = useCallback((dx: number, dy: number) => setView((v) => ({ zoom: v.zoom, ...clampPos({ x: v.x + dx, y: v.y + dy }, v.zoom) })), [clampPos]);

  // Mouse wheel / trackpad zoom (needs a non-passive listener to stop the page scrolling).
  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomTo((z) => z * Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomTo, img]);

  // Escape closes only this window, not the menu behind it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  // Drag with one finger/mouse; pinch with two fingers.
  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    const others = [...map.entries()].filter(([id]) => id !== e.pointerId).map(([, p]) => p);
    map.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (others.length === 0) {
      moveBy(e.clientX - prev.x, e.clientY - prev.y);
    } else {
      const o = others[0];
      const before = Math.hypot(prev.x - o.x, prev.y - o.y);
      const after = Math.hypot(e.clientX - o.x, e.clientY - o.y);
      if (before > 0) zoomTo((z) => z * (after / before));
    }
  };
  const onPointerUp = (e: React.PointerEvent) => pointers.current.delete(e.pointerId);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 12;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
      e.preventDefault();
      moveBy(moves[e.key][0], moves[e.key][1]);
    } else if (e.key === '+' || e.key === '=') zoomTo((z) => z * 1.15);
    else if (e.key === '-') zoomTo((z) => z / 1.15);
  };

  const save = async () => {
    if (!img) return;
    setSaving(true);
    // Which part of the picture is inside the frame, in the picture's own pixels.
    const left = size / 2 - w / 2 + pos.x;
    const top = size / 2 - h / 2 + pos.y;
    await onSave(cropPicture(img, -left / scale, -top / scale, size / scale));
    setSaving(false);
  };

  return createPortal(
    <div
      data-avatar-cropper
      className="fixed inset-0 z-[90] flex overflow-y-auto bg-indigo-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="crop-title"
      onClick={onCancel}
    >
      <div className="panel m-auto w-full max-w-sm animate-pop p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="crop-title" className="font-display text-2xl font-bold text-indigo-950">
            {t('crop.title')}
          </h2>
          <button type="button" onClick={onCancel} className="btn btn-ghost size-10 shrink-0 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>

        {failed ? (
          <p className="rounded-xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-600" role="alert">
            {t('auth.err.image')}
          </p>
        ) : (
          <>
            <div
              ref={frame}
              tabIndex={0}
              onKeyDown={onKeyDown}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              className="relative mx-auto cursor-grab touch-none overflow-hidden rounded-3xl bg-indigo-950 outline-none select-none focus-visible:ring-4 focus-visible:ring-pink-300 active:cursor-grabbing"
              style={{ width: size, height: size }}
              aria-label={t('crop.hint')}
            >
              {img ? (
                <img
                  src={url}
                  alt=""
                  draggable={false}
                  className="pointer-events-none absolute max-w-none"
                  style={{ width: w, height: h, left: size / 2 - w / 2 + pos.x, top: size / 2 - h / 2 + pos.y }}
                />
              ) : (
                <Loader2 className="absolute top-1/2 left-1/2 size-8 -translate-1/2 animate-spin text-white/60" />
              )}
              {/* Darken everything outside the round frame. */}
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(30,27,75,0.65)] ring-4 ring-white/90" />
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-400">
              <Move className="size-3.5" /> {t('crop.hint')}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button type="button" className="btn btn-ghost size-9 shrink-0 p-0" onClick={() => zoomTo((z) => z / 1.2)} disabled={zoom <= MIN_ZOOM} aria-label={t('crop.zoomOut')}>
                <ZoomOut className="size-5" />
              </button>
              <input
                type="range"
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={zoom}
                onChange={(e) => zoomTo(Number(e.target.value))}
                className="w-full cursor-pointer accent-pink-500"
                aria-label={t('crop.zoom')}
              />
              <button type="button" className="btn btn-ghost size-9 shrink-0 p-0" onClick={() => zoomTo((z) => z * 1.2)} disabled={zoom >= MAX_ZOOM} aria-label={t('crop.zoomIn')}>
                <ZoomIn className="size-5" />
              </button>
            </div>
          </>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            {t('auth.cancel')}
          </button>
          <button type="button" className="btn btn-pink" onClick={save} disabled={!img || saving}>
            {saving ? <Loader2 className="size-5 animate-spin" /> : <Check className="size-5" />} {t('crop.save')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
