import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Brush, Circle, Eraser, ImageIcon, Lock, Minus, PaintBucket, Palette, Square, SquareDashed, Trash2, Undo2 } from 'lucide-react';
import { BACKGROUNDS, type BackgroundId } from '../../../shared/types';
import { useT } from '../../i18n';
import { BACKGROUND_STYLES } from './backgrounds';
import ColorPicker from './ColorPicker';

export type Tool = 'brush' | 'eraser' | 'fill' | 'line' | 'rect' | 'ellipse';

export const PALETTE = [
  '#000000', '#4b5563', '#9ca3af', '#ffffff', '#7f1d1d', '#ef4444', '#f97316', '#fbbf24', '#fde047', '#a3e635', '#16a34a', '#14532d',
  '#67e8f9', '#06b6d4', '#3b82f6', '#1e3a8a', '#a78bfa', '#7c3aed', '#ec4899', '#fbcfe8', '#fed7aa', '#d6a77a', '#92400e', '#451a03',
];

export const SIZES = [
  { key: 'tool.small', value: 4, dot: 6 },
  { key: 'tool.medium', value: 12, dot: 12 },
  { key: 'tool.large', value: 28, dot: 20 },
] as const;

function ToolButton({ active, onClick, label, children, disabled }: { active?: boolean; onClick: () => void; label: string; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      className={`grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl transition disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-indigo-500 text-white shadow-[0_3px_0_#3730a3]' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
      }`}
    >
      {children}
    </button>
  );
}

/** Small popover anchored above its trigger; closes on outside click or Escape. */
function Popover({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.parentElement?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div ref={ref} className="panel absolute bottom-full left-1/2 z-30 mb-2 -translate-x-1/2 animate-pop p-3">
      {children}
    </div>
  );
}

interface Props {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: string;
  setColor: (c: string) => void;
  size: number;
  setSize: (s: number) => void;
  filled: boolean;
  setFilled: (f: boolean) => void;
  lockedColor: string | null;
  background: BackgroundId;
  onBackground: (bg: BackgroundId) => void;
  onUndo: () => void;
  onClear: () => void;
  enabled: boolean;
}

export default function Toolbar(p: Props) {
  const t = useT();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bgOpen, setBgOpen] = useState(false);
  const isShape = p.tool === 'line' || p.tool === 'rect' || p.tool === 'ellipse';

  const chooseColor = (c: string) => {
    p.setColor(c);
    if (p.tool === 'eraser') p.setTool('brush');
  };

  return (
    <div className={`panel flex flex-col gap-2.5 p-3 transition ${p.enabled ? '' : 'pointer-events-none opacity-60'}`}>
      {/* colors */}
      <div className="flex flex-wrap items-center gap-2">
        {p.lockedColor ? (
          <div className="flex items-center gap-2 rounded-xl bg-indigo-50 px-3 py-1.5 font-bold text-indigo-700">
            <Lock className="size-4" />
            <span className="size-7 rounded-lg border-2 border-indigo-100" style={{ backgroundColor: p.lockedColor }} />
            {t('tool.lockedColor')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-1" role="radiogroup" aria-label={t('tool.color')}>
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={p.color === c}
                  aria-label={c}
                  onClick={() => chooseColor(c)}
                  style={{ backgroundColor: c }}
                  className={`size-6 cursor-pointer rounded-md border-2 transition hover:scale-110 sm:size-7 ${
                    p.color === c && p.tool !== 'eraser' ? 'scale-110 border-indigo-950 shadow-lg' : 'border-indigo-100'
                  }`}
                />
              ))}
            </div>
            <div className="relative">
              <button
                type="button"
                onClick={() => setPickerOpen((o) => !o)}
                title={t('tool.moreColors')}
                aria-label={t('tool.moreColors')}
                className="grid size-10 cursor-pointer place-items-center rounded-xl border-[3px] border-indigo-100"
                style={{ background: 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}
              >
                <span className="grid size-6 place-items-center rounded-full border-2 border-white" style={{ backgroundColor: p.color }}>
                  <Palette className="size-3.5 text-white mix-blend-difference" />
                </span>
              </button>
              <Popover open={pickerOpen} onClose={() => setPickerOpen(false)}>
                <ColorPicker color={p.color} onChange={chooseColor} />
              </Popover>
            </div>
          </>
        )}
      </div>

      {/* tools */}
      <div className="flex flex-wrap items-center gap-1.5">
        <ToolButton active={p.tool === 'brush'} onClick={() => p.setTool('brush')} label={`${t('tool.brush')} (B)`}>
          <Brush className="size-5" />
        </ToolButton>
        <ToolButton active={p.tool === 'eraser'} onClick={() => p.setTool('eraser')} label={`${t('tool.eraser')} (E)`}>
          <Eraser className="size-5" />
        </ToolButton>
        <ToolButton active={p.tool === 'fill'} onClick={() => p.setTool('fill')} label={`${t('tool.fill')} (F)`}>
          <PaintBucket className="size-5" />
        </ToolButton>
        <span className="mx-0.5 h-8 w-1 rounded bg-indigo-50" />
        <ToolButton active={p.tool === 'line'} onClick={() => p.setTool('line')} label={`${t('tool.line')} (L)`}>
          <Minus className="size-5 -rotate-45" strokeWidth={3} />
        </ToolButton>
        <ToolButton active={p.tool === 'rect'} onClick={() => p.setTool('rect')} label={`${t('tool.rect')} (R)`}>
          <Square className="size-5" />
        </ToolButton>
        <ToolButton active={p.tool === 'ellipse'} onClick={() => p.setTool('ellipse')} label={`${t('tool.ellipse')} (O)`}>
          <Circle className="size-5" />
        </ToolButton>
        <ToolButton active={p.filled} onClick={() => p.setFilled(!p.filled)} label={t('tool.filled')} disabled={!isShape || p.tool === 'line'}>
          {p.filled ? <Square className="size-5 fill-current" /> : <SquareDashed className="size-5" />}
        </ToolButton>
        <span className="mx-0.5 h-8 w-1 rounded bg-indigo-50" />
        {SIZES.map((s, i) => (
          <ToolButton key={s.value} active={p.size === s.value} onClick={() => p.setSize(s.value)} label={`${t(s.key)} (${i + 1})`}>
            <span className="rounded-full bg-current" style={{ width: s.dot, height: s.dot }} />
          </ToolButton>
        ))}
        <span className="mx-0.5 h-8 w-1 rounded bg-indigo-50" />
        <ToolButton onClick={p.onUndo} label={`${t('tool.undo')} (Ctrl+Z)`}>
          <Undo2 className="size-5" />
        </ToolButton>
        <div className="relative">
          <ToolButton active={bgOpen} onClick={() => setBgOpen((o) => !o)} label={t('tool.background')}>
            <ImageIcon className="size-5" />
          </ToolButton>
          <Popover open={bgOpen} onClose={() => setBgOpen(false)}>
            <div className="grid w-60 grid-cols-4 gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => {
                    p.onBackground(bg);
                    setBgOpen(false);
                  }}
                  className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl p-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 ${
                    p.background === bg ? 'ring-4 ring-indigo-400' : ''
                  }`}
                >
                  <span className="h-9 w-full rounded-lg border-2 border-indigo-100" style={BACKGROUND_STYLES[bg]} />
                  {t(`bg.${bg}`)}
                </button>
              ))}
            </div>
          </Popover>
        </div>
        <button type="button" onClick={p.onClear} className="btn btn-pink ml-auto px-3.5 py-2 text-base" title={t('tool.clear')}>
          <Trash2 className="size-5" /> <span className="max-sm:hidden">{t('tool.clear')}</span>
        </button>
      </div>
    </div>
  );
}
