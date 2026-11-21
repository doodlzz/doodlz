import { useState, type FormEvent, type ReactNode } from 'react';
import { AtSign, CheckCircle2, KeyRound, Loader2, User } from 'lucide-react';
import { useT } from '../i18n';
import { useAuth, type AccountChanges } from './AuthContext';
import { ErrorNote, PasswordInput } from './fields';

/** One form in the account screen with its own save button, error and "saved" note. */
function Section({ icon, title, onSave, children }: { icon: ReactNode; title: string; onSave: () => Promise<string | null>; children: ReactNode }) {
  const t = useT();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    const err = await onSave();
    setBusy(false);
    setError(err);
    setSaved(!err);
  };

  return (
    <form className="rounded-2xl bg-indigo-50/70 p-4" onSubmit={submit} onChange={() => setSaved(false)}>
      <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-indigo-900">
        {icon} {title}
      </h3>
      {children}
      <ErrorNote error={error} />
      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-violet px-4 py-2 text-base" disabled={busy}>
          {busy && <Loader2 className="size-4 animate-spin" />} {t('auth.save')}
        </button>
        {saved && (
          <span className="flex items-center gap-1 text-sm font-bold text-emerald-600" role="status">
            <CheckCircle2 className="size-4" /> {t('auth.saved')}
          </span>
        )}
      </div>
    </form>
  );
}

/** Google's multicolour "G". */
export function GoogleG({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={`shrink-0 ${className}`} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 38.2 44 33 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}

export default function AccountSettings() {
  const t = useT();
  const { account, updateAccount, open } = useAuth();
  const [username, setUsername] = useState(account?.username ?? '');
  const [email, setEmail] = useState(account?.email ?? '');
  const [emailPw, setEmailPw] = useState('');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPw2, setNewPw2] = useState('');

  if (!account) return null;

  const save = (changes: AccountChanges) => updateAccount(changes);

  return (
    <div className="flex flex-col gap-3">
      {!account.emailVerified && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-amber-100 p-3 text-sm font-bold text-amber-800">
          <span>{t('auth.unverifiedNote')}</span>
          <button type="button" className="btn btn-violet shrink-0 px-3 py-1.5 text-sm" onClick={() => open('verify')}>
            {t('auth.verify')}
          </button>
        </div>
      )}
      <Section icon={<User className="size-5 text-pink-500" />} title={t('auth.username')} onSave={() => save({ username })}>
        <div className="relative mb-2">
          <input className="input pr-20" aria-label={t('auth.username')} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} autoComplete="username" required />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-display font-semibold text-indigo-300">#{account.tag}</span>
        </div>
        <p className="mb-3 px-1 text-xs font-bold text-indigo-400">{t('auth.tagNote')}</p>
      </Section>

      {account.google && (
        <p className="flex items-center gap-2 rounded-2xl bg-indigo-50/70 px-4 py-3 text-sm font-bold text-indigo-500">
          <GoogleG /> {t('auth.googleLinked', { email: account.email })}
        </p>
      )}

      {account.hasPassword === false ? (
        <p className="rounded-2xl bg-indigo-50/70 px-4 py-3 text-sm font-bold text-indigo-500">
          <AtSign className="mr-1 inline size-4 text-sky-500" /> {account.email} · {t('auth.emailNeedsPassword')}
        </p>
      ) : (
      <Section
        icon={<AtSign className="size-5 text-sky-500" />}
        title={t('auth.email')}
        onSave={async () => {
          const err = await save({ email, currentPassword: emailPw });
          if (!err) setEmailPw('');
          return err;
        }}
      >
        <input type="email" className="input mb-3" aria-label={t('auth.email')} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required />
        <label className="label" htmlFor="acc-email-pw">
          {t('auth.currentPassword')}
        </label>
        <PasswordInput id="acc-email-pw" className="mb-3" value={emailPw} onChange={(e) => setEmailPw(e.target.value)} autoComplete="current-password" maxLength={128} required />
      </Section>
      )}

      <Section
        icon={<KeyRound className="size-5 text-amber-500" />}
        title={account.hasPassword === false ? t('auth.setPassword') : t('auth.changePassword')}
        onSave={async () => {
          if (newPw !== newPw2) return 'auth.err.mismatch';
          const err = await save({ newPassword: newPw, currentPassword: currentPw });
          if (!err) {
            setCurrentPw('');
            setNewPw('');
            setNewPw2('');
          }
          return err;
        }}
      >
        {account.hasPassword === false ? (
          <p className="mb-3 px-1 text-xs font-bold text-indigo-400">{t('auth.setPasswordNote')}</p>
        ) : (
          <>
            <label className="label" htmlFor="acc-cur-pw">
              {t('auth.currentPassword')}
            </label>
            <PasswordInput id="acc-cur-pw" className="mb-3" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" maxLength={128} required />
          </>
        )}
        <label className="label" htmlFor="acc-new-pw">
          {t('auth.newPassword')}
        </label>
        <PasswordInput id="acc-new-pw" className="mb-3" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={6} maxLength={128} required />
        <label className="label" htmlFor="acc-new-pw2">
          {t('auth.confirmNewPassword')}
        </label>
        <PasswordInput id="acc-new-pw2" className="mb-3" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" maxLength={128} required />
      </Section>

      <p className="px-1 text-sm font-bold text-indigo-400">
        <a href="/delete-account" className="text-rose-600 underline underline-offset-2">
          {t('auth.deleteLink')}
        </a>
      </p>
    </div>
  );
}
