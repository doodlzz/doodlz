import { Check, ChevronLeft, ChevronRight, Dices, Sparkles } from 'lucide-react';
import type { Avatar as AvatarConfig } from '../../shared/types';
import { useT } from '../i18n';
import { useAuth } from '../auth/AuthContext';
import { AVATAR_COLORS, randomAvatar } from '../lib/avatar';
import Avatar from './Avatar';
import PictureButtons from './PictureButtons';

function PartPicker({ label, value, parts, disabled, onChange }: { label: string; value: number; parts: number; disabled: boolean; onChange: (v: number) => void }) {
  const step = (d: number) => onChange((value + d + parts) % parts);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => step(-1)} disabled={disabled} className="btn btn-ghost size-9 p-0" aria-label={`${label} −`}>
        <ChevronLeft className="size-5" />
      </button>
      <div className="w-24 text-center leading-tight">
        <div className="text-[11px] font-extrabold tracking-wider text-indigo-300 uppercase">{label}</div>
        <div className="font-display font-semibold text-indigo-900">
          {value + 1} / {parts}
        </div>
      </div>
      <button type="button" onClick={() => step(1)} disabled={disabled} className="btn btn-ghost size-9 p-0" aria-label={`${label} +`}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

interface Props {
  /** What the player looks like (may include their uploaded picture). */
  avatar: AvatarConfig;
  /** Called with the new face (never includes the picture). */
  onChange: (a: AvatarConfig) => void;
  /** How many eyes/mouths/extras this player can use. */
  parts: number;
}

export default function AvatarBuilder({ avatar, onChange, parts }: Props) {
  const t = useT();
  const { account, open } = useAuth();
  const face: AvatarConfig = { color: avatar.color, eyes: avatar.eyes, mouth: avatar.mouth, accessory: avatar.accessory };
  const hasImage = !!avatar.image;
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="relative">
          <div className="grid size-36 place-items-center rounded-full bg-indigo-50">
            <Avatar avatar={avatar} size={116} className="animate-float" />
          </div>
          <button
            type="button"
            onClick={() => onChange(randomAvatar(parts))}
            disabled={hasImage}
            className="btn btn-yellow absolute -right-1 -bottom-1 size-11 rounded-full p-0"
            aria-label={t('avatar.randomize')}
            title={t('avatar.randomize')}
          >
            <Dices className="size-5" />
          </button>
        </div>
        <div className="flex flex-col items-center gap-2">
          <PartPicker label={t('avatar.eyes')} value={face.eyes} parts={parts} disabled={hasImage} onChange={(eyes) => onChange({ ...face, eyes })} />
          <PartPicker label={t('avatar.mouth')} value={face.mouth} parts={parts} disabled={hasImage} onChange={(mouth) => onChange({ ...face, mouth })} />
          <PartPicker label={t('avatar.extra')} value={face.accessory} parts={parts} disabled={hasImage} onChange={(accessory) => onChange({ ...face, accessory })} />
          <div className="mt-1 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={t('avatar.color')}>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={avatar.color === c}
                aria-label={c}
                onClick={() => onChange({ ...face, color: c })}
                style={{ backgroundColor: c }}
                className={`grid size-7 cursor-pointer place-items-center rounded-full border-[3px] transition hover:scale-110 ${
                  avatar.color === c ? 'scale-110 border-indigo-950' : 'border-white shadow'
                }`}
              >
                {avatar.color === c && <Check className="size-4 text-indigo-950" strokeWidth={3} />}
              </button>
            ))}
          </div>
        </div>
      </div>
      {account ? (
        <>
          {hasImage && <p className="text-xs font-bold text-indigo-400">{t('avatar.pictureNote')}</p>}
          <PictureButtons />
        </>
      ) : (
        <button
          type="button"
          onClick={() => open('register')}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-pink-50 px-3 py-1.5 text-xs font-extrabold text-pink-600 transition hover:bg-pink-100"
        >
          <Sparkles className="size-4" /> {t('avatar.unlock')}
        </button>
      )}
    </div>
  );
}
