import { useState, type FormEvent } from 'react';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { BUSINESS } from '../config/business';
import { useAuth } from './AuthContext';
import { ErrorNote, PasswordInput } from './fields';

/** Delete the account and its data. Also linked from the footer and the privacy policy. */
export default function DeleteAccountPage() {
  const { account, deleteAccount, open } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Delete your account permanently? This cannot be undone.')) return;
    setBusy(true);
    const err = await deleteAccount(password);
    setBusy(false);
    setError(err);
    setDone(!err);
  };

  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <a href="/" className="mb-4 inline-flex items-center gap-2 font-display text-lg font-semibold text-white underline underline-offset-4">
        <ArrowLeft className="size-5" aria-hidden /> Back to the game
      </a>
      <article className="panel legal p-6 sm:p-8">
        <h1>Delete my data</h1>
        <p>
          You can delete your {BUSINESS.siteName} account yourself. This removes your username, email, password hash, avatar and picture, points, cosmetics, quest progress and purchase records from our servers, and signs you out everywhere. <b>It can’t be undone, and unspent points are lost.</b> Payment records held by Stripe are kept by Stripe as the law requires.
        </p>
        {done ? (
          <p role="status" className="rounded-2xl bg-emerald-100 p-3 font-bold text-emerald-700">
            Your account has been deleted. Guests’ names and drawings are never stored, so there is nothing else to remove.
          </p>
        ) : account ? (
          <form onSubmit={submit} className="max-w-sm">
            <p className="meta">Signed in as {account.username}#{account.tag}</p>
            <label className="label" htmlFor="del-pw">
              Confirm with your password
            </label>
            <PasswordInput id="del-pw" className="mb-3" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" maxLength={128} required />
            <ErrorNote error={error} />
            <button type="submit" className="btn bg-rose-600 hover:brightness-110" disabled={busy}>
              {busy ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <Trash2 className="size-5" aria-hidden />} Delete my account
            </button>
          </form>
        ) : (
          <p>
            <button type="button" className="btn btn-violet" onClick={() => open('login')}>
              Sign in to delete your account
            </button>
          </p>
        )}
        <p>
          Can’t sign in, or want a copy of your data first? Email <a href={`mailto:${BUSINESS.email}?subject=Data%20request`}>{BUSINESS.email}</a> from the address on the account and we will handle it.
        </p>
      </article>
    </main>
  );
}
