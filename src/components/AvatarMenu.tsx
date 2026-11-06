import { useEffect, useRef, useState } from 'react';
import { Check, UserCog } from 'lucide-react';
import type { Avatar as AvatarConfig } from '../../shared/types';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import { AVATAR_COLORS } from '../lib/avatar';
import Avatar from './Avatar';
import PictureButtons from './PictureButtons';
import TaggedName from './TaggedName';

type Tab = 'eyes' | 'mouth' | 'accessory' | 'color';

interface Props {
  /** What the player looks like now (may include their uploaded picture). */
  avatar: AvatarConfig;
  /** Called with the new face (never includes the picture). */
  onChange: (a: AvatarConfig) => void;
  parts: number;
}

/** Small avatar button for the top bar; opens a dropdown with every eye, mouth, extra and color to pick from. */
export default function AvatarMenu({ avatar, onChange, parts }: Props) {
  const t = useT();
  const { account, open: openAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('eyes');
  const root = useRef<HTMLDivElement>(null);
  const face: AvatarConfig = { color: avatar.color, eyes: avatar.eyes, mouth: avatar.mouth, accessory: avatar.accessory };
  const hasImage = !!avatar.image;

  useEffect(() => {
    if (!open) return;
    // Clicks in the picture crop window (shown on top of the page) shouldn't close the menu.
    const onDown = (e: PointerEvent) => {
      const target = e.target as Element;
      if (!root.current?.contains(target) && !target.closest?.('[data-avatar-cropper]')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'eyes', label: t('avatar.eyes') },
    { id: 'mouth', label: t('avatar.mouth') },
    { id: 'accessory', label: t('avatar.extra') },
    { id: 'color', label: t('avatar.colorShort') },
  ];

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid size-10 cursor-pointer place-items-center rounded-full bg-white/15 backdrop-blur-sm transition hover:scale-105 hover:bg-white/25"
        aria-label={t('avatar.edit')}
        title={t('avatar.edit')}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Avatar avatar={avatar} size={34} />
      </button>

      {open && (
        <div
          className="panel fixed top-16 right-4 left-4 z-50 animate-pop p-3 sm:absolute sm:top-full sm:right-0 sm:left-auto sm:mt-2 sm:w-[21rem] sm:origin-top-right"
          role="dialog"
          aria-label={t('avatar.edit')}
        >
          <div className="mb-3 flex items-center gap-3">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-indigo-50">
              <Avatar avatar={avatar} size={54} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
              {account && (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    openAuth('account');
                  }}
                  className="flex max-w-full cursor-pointer items-center gap-1 truncate font-display font-semibold text-indigo-900 hover:text-pink-500"
                  title={t('auth.accountTitle')}
                >
                  <UserCog className="size-4 shrink-0" />
                  <TaggedName name={account.username} tag={account.tag} fx={account.equipped.nameFx} className="truncate" />
                </button>
              )}
              <PictureButtons />
            </div>
          </div>

          <div className="mb-2 grid grid-cols-4 gap-1" role="tablist">
            {tabs.map((tb) => (
              <button
                key={tb.id}
                type="button"
                role="tab"
                aria-selected={tab === tb.id}
                onClick={() => setTab(tb.id)}
                className={`chip px-1 py-1 text-xs ${tab === tb.id ? 'chip-on' : 'bg-indigo-50'}`}
              >
                {tb.label}
              </button>
            ))}
          </div>

          {hasImage && tab !== 'color' && <p className="mb-2 text-center text-xs font-bold text-indigo-400">{t('avatar.pictureNote')}</p>}

          {tab === 'color' ? (
            <div className="grid grid-cols-6 gap-2 p-1" role="radiogroup" aria-label={t('avatar.color')}>
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={face.color === c}
                  aria-label={c}
                  onClick={() => onChange({ ...face, color: c })}
                  style={{ backgroundColor: c }}
                  className={`grid aspect-square cursor-pointer place-items-center rounded-full border-[3px] transition hover:scale-110 ${
                    face.color === c ? 'scale-110 border-indigo-950' : 'border-white shadow'
                  }`}
                >
                  {face.color === c && <Check className="size-4 text-indigo-950" strokeWidth={3} />}
                </button>
              ))}
            </div>
          ) : (
            <div className={`grid grid-cols-4 gap-1.5 ${hasImage ? 'pointer-events-none opacity-40' : ''}`} role="radiogroup" aria-label={tabs.find((x) => x.id === tab)?.label}>
              {Array.from({ length: parts }, (_, i) => {
                const option = { ...face, [tab]: i };
                const on = face[tab] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={`${tabs.find((x) => x.id === tab)?.label} ${i + 1}`}
                    onClick={() => onChange(option)}
                    className={`relative grid aspect-square cursor-pointer place-items-center rounded-2xl transition hover:bg-indigo-100 ${
                      on ? 'bg-pink-50 ring-4 ring-pink-300' : 'bg-indigo-50/70'
                    }`}
                  >
                    <Avatar avatar={option} size={46} />
                    <span className="absolute bottom-0.5 left-1.5 text-[10px] font-extrabold text-indigo-300">{i + 1}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
