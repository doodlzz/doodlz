import { Check, ChevronLeft, ChevronRight, Dices } from 'lucide-react';
import type { Avatar as AvatarConfig } from '../../shared/types';
import { useT } from '../i18n';
import { AVATAR_COLORS, AVATAR_PARTS, randomAvatar } from '../lib/avatar';
import Avatar from './Avatar';

function PartPicker({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const step = (d: number) => onChange((value + d + AVATAR_PARTS) % AVATAR_PARTS);
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => step(-1)} className="btn btn-ghost size-9 p-0" aria-label={`${label} −`}>
        <ChevronLeft className="size-5" />
      </button>
      <div className="w-24 text-center leading-tight">
        <div className="text-[11px] font-extrabold tracking-wider text-indigo-300 uppercase">{label}</div>
        <div className="font-display font-semibold text-indigo-900">
          {value + 1} / {AVATAR_PARTS}
        </div>
      </div>
      <button type="button" onClick={() => step(1)} className="btn btn-ghost size-9 p-0" aria-label={`${label} +`}>
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

export default function AvatarBuilder({ avatar, onChange }: { avatar: AvatarConfig; onChange: (a: AvatarConfig) => void }) {
  const t = useT();
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative">
        <div className="grid size-36 place-items-center rounded-full bg-indigo-50">
          <Avatar avatar={avatar} size={116} className="animate-float" />
        </div>
        <button
          type="button"
          onClick={() => onChange(randomAvatar())}
          className="btn btn-yellow absolute -right-1 -bottom-1 size-11 rounded-full p-0"
          aria-label={t('avatar.randomize')}
          title={t('avatar.randomize')}
        >
          <Dices className="size-5" />
        </button>
      </div>
      <div className="flex flex-col items-center gap-2">
        <PartPicker label={t('avatar.eyes')} value={avatar.eyes} onChange={(eyes) => onChange({ ...avatar, eyes })} />
        <PartPicker label={t('avatar.mouth')} value={avatar.mouth} onChange={(mouth) => onChange({ ...avatar, mouth })} />
        <PartPicker label={t('avatar.extra')} value={avatar.accessory} onChange={(accessory) => onChange({ ...avatar, accessory })} />
        <div className="mt-1 grid grid-cols-6 gap-1.5" role="radiogroup" aria-label={t('avatar.color')}>
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={avatar.color === c}
              aria-label={c}
              onClick={() => onChange({ ...avatar, color: c })}
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
  );
}
