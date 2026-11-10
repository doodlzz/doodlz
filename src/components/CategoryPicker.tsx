import { ArrowLeft, Check, Dices, Timer, X } from 'lucide-react';
import { CATEGORIES, type Category } from '../../shared/types';
import { useCountdown } from '../hooks/useCountdown';
import { useT } from '../i18n';
import { CATEGORY_LOOK } from '../lib/categories';

/** One category tile: emoji, name and a few keywords. Also used (small) in the lobby. */
export function CategoryTile({ category, selected, small, onClick }: { category: Category; selected?: boolean; small?: boolean; onClick?: () => void }) {
  const t = useT();
  const look = CATEGORY_LOOK[category];
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={`relative flex flex-col items-center justify-center overflow-hidden rounded-3xl text-center text-white transition ${
        small ? 'gap-0.5 p-3' : 'aspect-square gap-1 p-3 sm:p-4'
      } ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:brightness-110 active:translate-y-1 active:shadow-none' : ''} ${
        selected ? 'ring-4 ring-white ring-offset-4 ring-offset-indigo-600' : ''
      }`}
      style={{ backgroundColor: look.color, boxShadow: `0 6px 0 ${look.shadow}` }}
    >
      {/* soft decorative shapes */}
      <span className="pointer-events-none absolute -top-6 -right-6 size-20 rounded-full bg-white/15" />
      <span className="pointer-events-none absolute -bottom-5 -left-5 size-14 rotate-12 rounded-2xl bg-black/10" />
      {selected && (
        <span className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-white text-emerald-600 shadow">
          <Check className="size-5" strokeWidth={3} />
        </span>
      )}
      <span className={`relative drop-shadow-[0_3px_0_rgba(0,0,0,0.2)] ${small ? 'text-4xl' : 'text-5xl sm:text-6xl'}`} aria-hidden>
        {look.emoji}
      </span>
      <span className={`relative font-display leading-tight font-bold drop-shadow-[0_2px_0_rgba(0,0,0,0.2)] ${small ? 'text-lg' : 'text-base sm:text-lg'}`}>
        {t(`cat.${category}`)}
      </span>
      <span className={`relative leading-snug font-bold text-white/85 ${small ? 'text-xs' : 'text-[11px] sm:text-xs'}`}>{t(`catk.${category}`)}</span>
    </Tag>
  );
}

interface Props {
  onPick: (c: Category) => void;
  /** Back / close button; omitted when picking is required. */
  onClose?: () => void;
  closeKind?: 'back' | 'close';
  selected?: Category;
  /** Local timestamp when a random category gets picked instead. */
  endsAt?: number | null;
  subtitle?: string;
}

/** Full-screen grid of categories, shown before a lobby opens (and when the host wants to switch). */
export default function CategoryPicker({ onPick, onClose, closeKind = 'back', selected, endsAt = null, subtitle }: Props) {
  const t = useT();
  const left = useCountdown(endsAt);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-indigo-950/50 backdrop-blur-sm dark:bg-black/60" role="dialog" aria-modal aria-labelledby="pick-title">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-6 sm:py-10">
        <div className="mb-6 flex items-start gap-3">
          {/* an empty slot on the other side keeps the title centered */}
          {onClose &&
            (closeKind === 'back' ? (
              <button type="button" className="btn btn-ghost size-12 shrink-0 p-0" onClick={onClose} aria-label={t('pick.back')} title={t('pick.back')}>
                <ArrowLeft className="size-6" />
              </button>
            ) : (
              <span className="size-12 shrink-0" />
            ))}
          <div className="flex-1 text-center text-white">
            <h2 id="pick-title" className="font-display text-3xl font-bold drop-shadow-[0_3px_0_rgba(30,27,75,0.6)] sm:text-4xl">
              {t('pick.title')}
            </h2>
            <p className="mt-1 font-bold text-white/85">{subtitle ?? t('pick.subtitle')}</p>
            {endsAt !== null && (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-extrabold">
                <Timer className="size-4" /> {t('pick.autoPick', { s: left })}
              </p>
            )}
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onPick(CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)])}
              >
                <Dices className="size-5" /> {t('pick.random')}
              </button>
            </div>
          </div>
          {onClose &&
            (closeKind === 'close' ? (
              <button type="button" className="btn btn-ghost size-12 shrink-0 p-0" onClick={onClose} aria-label={t('set.close')} title={t('set.close')}>
                <X className="size-6" />
              </button>
            ) : (
              <span className="size-12 shrink-0" />
            ))}
        </div>

        <div className="grid animate-pop grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {CATEGORIES.map((c) => (
            <CategoryTile key={c} category={c} selected={c === selected} onClick={() => onPick(c)} />
          ))}
        </div>
      </div>
    </div>
  );
}
