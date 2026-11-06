import { useEffect, useState } from 'react';
import { Check, Crown, Gem, ImagePlus, Loader2, Lock, Paintbrush, ShoppingBag, Sparkles, Star, X } from 'lucide-react';
import { COSMETICS, type Cosmetic, type FrameId, type NameFxId, type Rarity } from '../../shared/cosmetics';
import { savingsPercent, type PackId, type ShopInfo } from '../../shared/shop';
import { useAuth, type ShopTab } from '../auth/AuthContext';
import { readToken } from '../auth/storage';
import { useT } from '../i18n';
import { useSettings } from '../settings/SettingsContext';
import Avatar from './Avatar';
import PictureButtons from './PictureButtons';
import TaggedName from './TaggedName';


const DEFAULT_FACE = { color: '#f472b6', eyes: 0, mouth: 0, accessory: 0 };

const RARITY: Record<Rarity, { chip: string; card: string; icon: React.ReactNode }> = {
  rare: { chip: 'bg-sky-500 text-white', card: 'ring-sky-300/60', icon: <Gem className="size-3" /> },
  epic: { chip: 'bg-violet-500 text-white', card: 'ring-violet-400/70', icon: <Sparkles className="size-3" /> },
  legendary: {
    chip: 'bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 text-white',
    card: 'ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]',
    icon: <Crown className="size-3" />,
  },
};

// ---------------- cosmetics ----------------

function CosmeticsTab({ onNeedPoints }: { onNeedPoints: () => void }) {
  const t = useT();
  const { account, buyItem, equip } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [trying, setTrying] = useState<Cosmetic | null>(null);
  if (!account) return null;

  const me = { ...(account.avatar ?? DEFAULT_FACE) };
  const owns = (c: Cosmetic) => account.owned.includes(c.id);
  const wearing = (c: Cosmetic) => (c.slot === 'frame' || c.slot === 'nameFx') && account.equipped[c.slot] === c.value;

  // The showcase shows what you're trying on, on top of what you already wear.
  const showFrame = (trying?.slot === 'frame' ? trying.value : account.equipped.frame) as FrameId | undefined;
  const showFx = (trying?.slot === 'nameFx' ? trying.value : account.equipped.nameFx) as NameFxId | undefined;

  const run = async (id: string, fn: () => Promise<string | null>) => {
    setBusy(id);
    setError(await fn());
    setBusy(null);
  };

  const section = (slot: Cosmetic['slot'], title: string) => (
    <section className="mb-4">
      <h3 className="label">{title}</h3>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {COSMETICS.filter((c) => c.slot === slot).map((c) => {
          const owned = owns(c);
          const worn = wearing(c);
          const afford = account.points >= c.price;
          const look = RARITY[c.rarity];
          return (
            <div
              key={c.id}
              className={`flex flex-col overflow-hidden rounded-2xl bg-indigo-50/70 ring-2 ${look.card} ${trying?.id === c.id ? 'outline-4 outline-pink-400' : ''}`}
              onMouseEnter={() => c.slot !== 'picture' && setTrying(c)}
            >
              <button
                type="button"
                className="relative grid h-24 cursor-pointer place-items-center bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#312e81]"
                onClick={() => c.slot !== 'picture' && setTrying(c)}
                aria-label={`${t('shop.tryOn')}: ${t(`cos.${c.id}`)}`}
              >
                <span className={`absolute top-1.5 left-1.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${look.chip}`}>
                  {look.icon} {t(`rarity.${c.rarity}`)}
                </span>
                {c.slot === 'frame' && <Avatar avatar={{ ...me, frame: c.value as FrameId }} size={66} />}
                {c.slot === 'nameFx' && (
                  <TaggedName name={account.username} tag={account.tag} fx={c.value as NameFxId} className="max-w-[90%] truncate px-2 font-display text-lg text-white" />
                )}
                {c.slot === 'picture' &&
                  (c.value === 'draw' ? <Paintbrush className="size-10 text-pink-300" /> : <ImagePlus className="size-10 text-sky-300" />)}
              </button>
              <div className="flex flex-1 flex-col gap-1.5 p-2">
                <div className="text-sm leading-tight font-extrabold text-indigo-950">{t(`cos.${c.id}`)}</div>
                {!owned ? (
                  <button
                    type="button"
                    className={`btn mt-auto px-2 py-1.5 text-sm ${afford ? 'btn-green' : 'btn-ghost'}`}
                    disabled={busy !== null}
                    onClick={() => (afford ? run(c.id, () => buyItem(c.id)) : onNeedPoints())}
                    title={afford ? t('shop.buyFor', { n: c.price }) : t('shop.notEnough')}
                  >
                    {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : afford ? <Star className="size-4 fill-current" /> : <Lock className="size-4" />}
                    {c.price}
                  </button>
                ) : c.slot === 'picture' ? (
                  <PictureButtons only={c.value as 'upload' | 'draw'} compact className="mt-auto" />
                ) : (
                  <button
                    type="button"
                    className={`btn mt-auto px-2 py-1.5 text-sm ${worn ? 'btn-violet' : 'btn-blue'}`}
                    disabled={busy !== null}
                    onClick={() => run(c.id, () => equip(c.slot as 'frame' | 'nameFx', worn ? null : c.id))}
                  >
                    {busy === c.id ? <Loader2 className="size-4 animate-spin" /> : worn && <Check className="size-4" strokeWidth={3} />}
                    {worn ? t('shop.equipped') : t('shop.equip')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );

  return (
    <div onMouseLeave={() => setTrying(null)}>
      {/* Showcase: you, wearing what you're looking at. */}
      <div className="mb-4 flex items-center gap-4 rounded-3xl bg-gradient-to-br from-[#1e1b4b] via-[#2e1065] to-[#4a044e] p-4">
        <Avatar avatar={{ ...me, frame: showFrame }} size={96} className="animate-float" />
        <div className="min-w-0 flex-1">
          <TaggedName name={account.username} tag={account.tag} fx={showFx} className="block truncate font-display text-2xl text-white" />
          <p className="mt-1 text-xs font-bold text-white/60">{trying ? t('shop.tryingOn', { item: t(`cos.${trying.id}`) }) : t('shop.tryHint')}</p>
        </div>
      </div>
      {error && (
        <p className="mb-3 rounded-2xl bg-rose-100 px-3 py-2 text-sm font-bold text-rose-700" role="alert">
          {t(error)}
        </p>
      )}
      {section('frame', t('shop.frames'))}
      {section('nameFx', t('shop.nameFx'))}
      {section('picture', t('shop.pictures'))}
    </div>
  );
}

// ---------------- get points (real money) ----------------

const POPULAR: PackId = 'p200';
const BEST: PackId = 'p1000';

function PointsTab() {
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
  }, []);

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

  if (!shop) {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="size-6 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm font-bold text-indigo-400">{t('shop.subtitle')}</p>
      <ul className="flex flex-col gap-3">
        {shop.packs.map((pack) => {
          const save = savingsPercent(pack);
          const tag = pack.id === BEST ? t('shop.best') : pack.id === POPULAR ? t('shop.popular') : null;
          return (
            <li
              key={pack.id}
              className={`relative flex items-center gap-3 rounded-2xl p-3 ${pack.id === BEST ? 'bg-amber-50 ring-4 ring-amber-300 dark:bg-amber-400/10 dark:ring-amber-400/40' : 'bg-indigo-50/70'}`}
            >
              {tag && <span className="absolute -top-2.5 left-3 rounded-full bg-pink-500 px-2 py-0.5 text-[11px] font-extrabold tracking-wide text-white uppercase">{tag}</span>}
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
  );
}

// ---------------- window ----------------

/** The shop: cosmetics bought with points, and point packs bought with money. */
export default function Shop({ initialTab = 'cosmetics', onClose }: { initialTab?: ShopTab; onClose: () => void }) {
  const t = useT();
  const { account } = useAuth();
  const [tab, setTab] = useState<ShopTab>(initialTab);
  const [needPoints, setNeedPoints] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !document.querySelector('[data-picture-drawer]') && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-indigo-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal aria-labelledby="shop-title" onClick={onClose}>
      <div className="panel mx-auto my-4 w-full max-w-2xl animate-pop p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <h2 id="shop-title" className="flex flex-1 items-center gap-2 font-display text-2xl font-bold text-indigo-950">
            <ShoppingBag className="size-6 text-amber-500" /> {t('shop.shop')}
          </h2>
          <span className="flex items-center gap-1 rounded-2xl bg-amber-400 px-3 py-1.5 font-display text-sm font-semibold text-amber-950" title={t('points.title')}>
            <Star className="size-4 fill-current" /> {(account?.points ?? 0).toLocaleString()}
          </span>
          <button type="button" onClick={onClose} className="btn btn-ghost size-10 p-0" aria-label={t('set.close')}>
            <X className="size-5" />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1.5" role="tablist">
          {(['cosmetics', 'points'] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                setNeedPoints(false);
              }}
              className={`chip py-2 ${tab === id ? 'chip-on' : 'bg-indigo-50'}`}
            >
              {id === 'cosmetics' ? t('shop.tabCosmetics') : t('shop.tabPoints')}
            </button>
          ))}
        </div>

        {needPoints && tab === 'points' && <p className="mb-3 rounded-2xl bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800">{t('shop.notEnough')}</p>}
        {tab === 'cosmetics' ? (
          <CosmeticsTab
            onNeedPoints={() => {
              setTab('points');
              setNeedPoints(true);
            }}
          />
        ) : (
          <PointsTab />
        )}
      </div>
    </div>
  );
}
