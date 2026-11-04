import { LogIn, LogOut, UserCircle2, UserPlus } from 'lucide-react';
import TaggedName from '../components/TaggedName';
import { useT } from '../i18n';
import { useAuth } from './AuthContext';

/** Register / Sign in buttons for the top bar, or the signed-in username with a sign-out button. */
export default function AuthButtons() {
  const t = useT();
  const { account, open } = useAuth();

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => open('account')}
          className="flex cursor-pointer items-center gap-1.5 rounded-2xl bg-white/15 px-3 py-2 font-display text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25"
          title={t('auth.accountTitle')}
        >
          <UserCircle2 className="size-5 shrink-0" /> <TaggedName name={account.username} tag={account.tag} className="max-w-[8rem] truncate sm:max-w-[14rem]" />
        </button>
        <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => open('logout')} title={t('auth.signOut')} aria-label={t('auth.signOut')}>
          <LogOut className="size-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button type="button" className="btn btn-ghost px-3 py-2 text-sm" onClick={() => open('login')} title={t('auth.signIn')} aria-label={t('auth.signIn')}>
        <LogIn className="size-4" /> <span className="hidden sm:inline">{t('auth.signIn')}</span>
      </button>
      <button type="button" className="btn btn-pink px-3 py-2 text-sm" onClick={() => open('register')}>
        <UserPlus className="size-4" /> {t('auth.register')}
      </button>
    </div>
  );
}
