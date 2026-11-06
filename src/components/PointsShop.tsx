import { useEffect, useState } from 'react';
import { Loader2, Lock, ShoppingBag, Star, X } from 'lucide-react';
import { savingsPercent, type PackId, type ShopInfo } from '../../shared/shop';
import { readToken } from '../auth/storage';
import { useT } from '../i18n';
import { useSettings } from '../settings/SettingsContext';

const POPULAR: PackId = 'p200';
const BEST: PackId = 'p1000';

/** "Buy points" window: five packs, bigger ones cheaper per point. Payment happens on Stripe's page. */
export default function PointsShop({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { settings } = useSettings();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [buying, setBuying] = useState<PackId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/shop')
      .then((r) => r.json())
      .then(setShop)
      .catch(() => setShop({ enabled: false, currency: 'usd', packs: [] }));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const price = (cents: number) =>
    new Intl.NumberFormat(settings.lang, { style: 'currency', currency: (shop?.currency ?? 'usd').toUpperCase() }).format(cents / 100);

  const buy = async (pack: PackId) => {
    setBuying(pack);
    setError(null);
    try {
      const res = await fetch('/api/shop/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${readToken() ?? ''}` },
        body: JSON.stringify({ pack }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) return void (window.location.href = data.url);
      setError(data.error ?? 'shop.error');
    } catch {
      setError('shop.error');
    }
    setBuying(null);
  };

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="shop-title" onClick={onClose}>
      <div className="panel w-full max-w-md animate-pop p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 id="shop-title" className="flex items-center gap-2 font-display text-2xl font-bold text-indigo-950">
            <ShoppingBag className="size-6 text-amber-500" /> {t('shop.title')}
          </h2>
          <button type="button" onClick={onClose} className="btn btn-ghost size-10 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>
        <p className="mb-4 text-sm font-bold text-indigo-400">{t('shop.subtitle')}</p>

        {!shop ? (
          <div className="grid place-items-center py-10">
            <Loader2 className="size-6 animate-spin text-indigo-400" />
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-3">
              {shop.packs.map((pack) => {
                const save = savingsPercent(pack);
                const tag = pack.id === BEST ? t('shop.best') : pack.id === POPULAR ? t('shop.popular') : null;
                return (
                  <li
                    key={pack.id}
                    className={`relative flex items-center gap-3 rounded-2xl p-3 ${pack.id === BEST ? 'bg-amber-50 ring-4 ring-amber-300 dark:bg-amber-400/10 dark:ring-amber-400/40' : 'bg-indigo-50/70'}`}
                  >
                    {tag && (
                      <span className="absolute -top-2.5 left-3 rounded-full bg-pink-500 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white uppercase">{tag}</span>
                    )}
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-400 shadow-[0_3px_0_#b45309]">
                      <Star className="size-6 fill-amber-100 text-amber-50" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xl leading-tight font-bold text-indigo-950">{t('shop.points', { n: pack.points.toLocaleString(settings.lang) })}</div>
                      {save > 0 ? (
                        <span className="text-xs font-extrabold text-emerald-600">{t('shop.save', { n: save })}</span>
                      ) : (
                        <span className="text-xs font-bold text-indigo-400">{t('shop.starter')}</span>
                      )}
                    </div>
                    <button type="button" className="btn btn-green shrink-0 px-4 py-2 text-base" disabled={!shop.enabled || buying !== null} onClick={() => buy(pack.id)}>
                      {buying === pack.id ? <Loader2 className="size-4 animate-spin" /> : price(pack.cents)}
                    </button>
                  </li>
                );
              })}
            </ul>
            {error && (
              <p className="mt-3 rounded-2xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-700" role="alert">
                {t(error)}
              </p>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs font-bold text-indigo-300">
              <Lock className="size-3.5 shrink-0" /> {shop.enabled ? t('shop.secure') : t('shop.off')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
