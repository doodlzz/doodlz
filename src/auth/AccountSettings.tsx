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

export default function AccountSettings() {
  const t = useT();
  const { account, updateAccount } = useAuth();
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
      <Section icon={<User className="size-5 text-pink-500" />} title={t('auth.username')} onSave={() => save({ username })}>
        <div className="relative mb-2">
          <input className="input pr-20" aria-label={t('auth.username')} value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} autoComplete="username" required />
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 font-display font-semibold text-indigo-300">#{account.tag}</span>
        </div>
        <p className="mb-3 px-1 text-xs font-bold text-indigo-400">{t('auth.tagNote')}</p>
      </Section>

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

      <Section
        icon={<KeyRound className="size-5 text-amber-500" />}
        title={t('auth.changePassword')}
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
        <label className="label" htmlFor="acc-cur-pw">
          {t('auth.currentPassword')}
        </label>
        <PasswordInput id="acc-cur-pw" className="mb-3" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" maxLength={128} required />
        <label className="label" htmlFor="acc-new-pw">
          {t('auth.newPassword')}
        </label>
        <PasswordInput id="acc-new-pw" className="mb-3" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" minLength={6} maxLength={128} required />
        <label className="label" htmlFor="acc-new-pw2">
          {t('auth.confirmNewPassword')}
        </label>
        <PasswordInput id="acc-new-pw2" className="mb-3" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} autoComplete="new-password" maxLength={128} required />
      </Section>
    </div>
  );
}
