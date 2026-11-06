import { useState } from 'react';
import { LogIn, LogOut, Plus, Star, UserCircle2, UserPlus } from 'lucide-react';
import type { Avatar } from '../../shared/types';
import AvatarMenu from '../components/AvatarMenu';
import PointsShop from '../components/PointsShop';
import TaggedName from '../components/TaggedName';
import { useT } from '../i18n';
import { useAuth } from './AuthContext';

interface Props {
  /** Pass these to show the avatar (with its picker dropdown) next to the username. */
  avatar?: Avatar;
  onAvatarChange?: (a: Avatar) => void;
  parts?: number;
}

/** Register / Sign in buttons for the top bar, or the signed-in avatar, username and sign-out button. */
export default function AuthButtons({ avatar, onAvatarChange, parts = 12 }: Props) {
  const t = useT();
  const { account, open } = useAuth();
  const [shopOpen, setShopOpen] = useState(false);

  if (account) {
    return (
      <div className="flex items-center gap-2">
        {/* Points balance; clicking it opens the shop. */}
        <button
          type="button"
          onClick={() => setShopOpen(true)}
          className="flex cursor-pointer items-center gap-1 rounded-2xl bg-amber-400 py-2 pr-1.5 pl-3 font-display text-sm font-semibold text-amber-950 shadow-[0_3px_0_#b45309] transition hover:bg-amber-300 active:translate-y-[2px] active:shadow-[0_1px_0_#b45309]"
          title={t('shop.title')}
          aria-label={`${t('points.title')}: ${account.points}. ${t('shop.title')}`}
        >
          <Star className="size-4 fill-current" /> {account.points.toLocaleString()}
          <span className="ml-0.5 grid size-5 place-items-center rounded-lg bg-amber-950/15">
            <Plus className="size-3.5" strokeWidth={3} />
          </span>
        </button>
        {shopOpen && <PointsShop onClose={() => setShopOpen(false)} />}
        {avatar && onAvatarChange && <AvatarMenu avatar={avatar} onChange={onAvatarChange} parts={parts} />}
        <button
          type="button"
          onClick={() => open('account')}
          className={`${avatar ? 'hidden sm:flex' : 'flex'} cursor-pointer items-center gap-1.5 rounded-2xl bg-white/15 px-3 py-2 font-display text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/25`}
          title={t('auth.accountTitle')}
        >
          {!avatar && <UserCircle2 className="size-5 shrink-0" />} <TaggedName name={account.username} tag={account.tag} className="max-w-[8rem] truncate sm:max-w-[14rem]" />
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
