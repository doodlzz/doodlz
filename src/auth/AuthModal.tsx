import { useEffect, useState, type FormEvent } from 'react';
import { Gamepad2, Loader2, LogIn, LogOut, MailCheck, UserPlus, X } from 'lucide-react';
import { useT } from '../i18n';
import AccountSettings from './AccountSettings';
import { useAuth } from './AuthContext';
import { Checkbox, ErrorNote, PasswordInput } from './fields';

export type AuthMode = 'gate' | 'register' | 'login' | 'logout' | 'account' | 'verify';

interface Props {
  mode: AuthMode;
  setMode: (m: AuthMode) => void;
  onClose: () => void;
  onGuest: () => void;
}

const linkCls = 'cursor-pointer text-pink-500 underline underline-offset-2 hover:text-pink-400';

export default function AuthModal({ mode, setMode, onClose, onGuest }: Props) {
  const t = useT();
  const { account, register, login, logout, verifyEmail, resendCode } = useAuth();
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [remember, setRemember] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => setError(null), [mode]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === 'register' && password !== password2) return setError('auth.err.mismatch');
    setBusy(true);
    const err = mode === 'register' ? await register(username, email, password, remember, agreed) : await login(username, password, remember);
    setBusy(false);
    setError(err);
  };

  const submitCode = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const err = await verifyEmail(code);
    setBusy(false);
    setError(err);
    if (!err) onClose();
  };

  const sendAgain = async () => {
    setBusy(true);
    setSent(false);
    const err = await resendCode();
    setBusy(false);
    setError(err);
    setSent(!err);
  };

  const title = {
    gate: t('auth.gateTitle'),
    register: t('auth.register'),
    login: t('auth.signIn'),
    logout: t('auth.signOut'),
    account: t('auth.accountTitle'),
    verify: t('auth.verifyTitle'),
  }[mode];

  return (
    <div className="fixed inset-0 z-[75] flex overflow-y-auto bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="auth-title" onClick={onClose}>
      <div className={`panel m-auto w-full animate-pop p-5 ${mode === 'account' ? 'max-w-md' : 'max-w-sm'}`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 id="auth-title" className="font-display text-2xl font-bold text-indigo-950">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost size-10 shrink-0 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>

        {mode === 'verify' && account ? (
          <form className="flex flex-col" onSubmit={submitCode}>
            <p className="-mt-2 mb-3 text-sm font-bold text-indigo-400">{t('auth.verifyText', { email: account.email })}</p>
            <label className="label" htmlFor="auth-code">
              {t('auth.code')}
            </label>
            <input
              id="auth-code"
              className="input mb-3 text-center font-display text-3xl tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              autoFocus
              required
            />
            <ErrorNote error={error} />
            {sent && (
              <p className="mb-3 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-700" role="status">
                {t('auth.codeSent')}
              </p>
            )}
            <button type="submit" className="btn btn-pink py-3" disabled={busy || code.length !== 6}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : <MailCheck className="size-5" />} {t('auth.verify')}
            </button>
            <p className="mt-3 flex justify-between gap-2 text-sm font-bold text-indigo-400">
              <button type="button" className={linkCls} onClick={sendAgain} disabled={busy}>
                {t('auth.resend')}
              </button>
              <button type="button" className={linkCls} onClick={onClose}>
                {t('auth.verifyLater')}
              </button>
            </p>
          </form>
        ) : mode === 'account' ? (
          <AccountSettings />
        ) : mode === 'logout' ? (
          <div className="flex flex-col gap-3">
            <p className="-mt-2 mb-1 font-bold text-indigo-400">{t('auth.logoutConfirm')}</p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="btn btn-ghost" onClick={onClose} autoFocus>
                {t('auth.cancel')}
              </button>
              <button type="button" className="btn bg-rose-500 hover:bg-rose-400" onClick={logout}>
                <LogOut className="size-5" /> {t('auth.signOut')}
              </button>
            </div>
          </div>
        ) : mode === 'gate' ? (
          <div className="flex flex-col gap-3">
            <p className="-mt-2 mb-1 text-sm font-bold text-indigo-400">{t('auth.gateText')}</p>
            <button type="button" className="btn btn-pink py-4" onClick={() => setMode('register')} autoFocus>
              <UserPlus className="size-5" /> {t('auth.register')}
            </button>
            <button type="button" className="btn btn-ghost py-4" onClick={onGuest}>
              <Gamepad2 className="size-5" /> {t('auth.guest')}
            </button>
            <p className="mt-1 text-center text-sm font-bold text-indigo-400">
              {t('auth.already')}{' '}
              <button type="button" className={linkCls} onClick={() => setMode('login')}>
                {t('auth.logIn')}
              </button>
            </p>
          </div>
        ) : (
          <form className="flex flex-col" onSubmit={submit}>
            <label className="label" htmlFor="auth-user">
              {mode === 'register' ? t('auth.username') : t('auth.usernameOrEmail')}
            </label>
            <input
              id="auth-user"
              className="input mb-3"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              maxLength={mode === 'register' ? 20 : 254}
              autoFocus
              required
            />
            {mode === 'register' && (
              <>
                <label className="label" htmlFor="auth-email">
                  {t('auth.email')}
                </label>
                <input
                  id="auth-email"
                  type="email"
                  className="input mb-3"
                  placeholder="you@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </>
            )}
            <label className="label" htmlFor="auth-pass">
              {t('auth.password')}
            </label>
            <PasswordInput
              id="auth-pass"
              className="mb-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              minLength={mode === 'register' ? 6 : undefined}
              maxLength={128}
              required
            />
            {mode === 'register' && (
              <>
                <label className="label" htmlFor="auth-pass2">
                  {t('auth.confirmPassword')}
                </label>
                <PasswordInput
                  id="auth-pass2"
                  className="mb-3"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  autoComplete="new-password"
                  maxLength={128}
                  required
                />
              </>
            )}
            <div className="mb-4 flex flex-col gap-2">
              <Checkbox checked={remember} onChange={setRemember} label={t('auth.remember')} />
              {mode === 'register' && (
                <>
                  {/* Not pre-ticked, and required: consent has to be an active choice. */}
                  <Checkbox
                    checked={agreed}
                    onChange={setAgreed}
                    required
                    label={
                      <span className="text-sm font-semibold">
                        {t('auth.agreePre')} <a href="/terms" target="_blank" rel="noreferrer" className={linkCls}>{t('auth.terms')}</a> {t('auth.agreeAnd')}{' '}
                        <a href="/privacy" target="_blank" rel="noreferrer" className={linkCls}>{t('auth.privacy')}</a>
                        {t('auth.agreeAge')}
                      </span>
                    }
                  />
                </>
              )}
            </div>
            <ErrorNote error={error} />
            <button type="submit" className={`btn ${mode === 'register' ? 'btn-pink' : 'btn-violet'} py-3`} disabled={busy || (mode === 'register' && !agreed)}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : mode === 'register' ? <UserPlus className="size-5" /> : <LogIn className="size-5" />}
              {mode === 'register' ? t('auth.createAccount') : t('auth.signIn')}
            </button>
            <p className="mt-3 text-center text-sm font-bold text-indigo-400">
              {mode === 'register' ? t('auth.already') : t('auth.noAccount')}{' '}
              <button type="button" className={linkCls} onClick={() => setMode(mode === 'register' ? 'login' : 'register')}>
                {mode === 'register' ? t('auth.logIn') : t('auth.register')}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
