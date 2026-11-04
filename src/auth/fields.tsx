import { useState, type InputHTMLAttributes } from 'react';
import { Check, Eye, EyeOff } from 'lucide-react';
import { useT } from '../i18n';

/** Password box with an eye button that shows/hides what's typed. */
export function PasswordInput({ className = '', ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input {...props} type={shown ? 'text' : 'password'} className="input pr-12" />
      <button
        type="button"
        onClick={() => setShown((s) => !s)}
        className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-indigo-400 transition hover:bg-indigo-100 hover:text-indigo-600"
        aria-label={shown ? t('auth.hidePassword') : t('auth.showPassword')}
        title={shown ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={shown}
      >
        {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}

export function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex w-fit cursor-pointer items-center gap-2 font-bold text-indigo-900 select-none">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="grid size-6 place-items-center rounded-lg border-4 border-indigo-100 bg-indigo-50/60 text-white transition peer-checked:border-pink-500 peer-checked:bg-pink-500 peer-focus-visible:ring-4 peer-focus-visible:ring-pink-200">
        {checked && <Check className="size-4" strokeWidth={4} />}
      </span>
      {label}
    </label>
  );
}

export function ErrorNote({ error }: { error: string | null }) {
  const t = useT();
  if (!error) return null;
  return (
    <p className="mb-3 rounded-xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-600" role="alert">
      {t(error)}
    </p>
  );
}
