import { useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { ADS, type AdPlacement } from '../config/ads';
import { useT } from '../i18n';

// Placeholder modules. Set VITE_SUPPORT_URL at build time to point the button at a real donation page.
const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL as string | undefined;

export function SupportCard({ className = '' }: { className?: string }) {
  const t = useT();
  // No donation page configured yet: show nothing rather than a button that does nothing.
  if (!SUPPORT_URL) return null;
  return (
    <div className={`flex items-center gap-3 rounded-3xl bg-white/15 p-4 text-white backdrop-blur-sm ${className}`}>
      <Heart className="size-8 shrink-0 fill-pink-400 text-pink-300" />
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-semibold">{t('support.title')}</div>
        <div className="text-sm font-semibold text-white/95">{t('support.text')}</div>
      </div>
      <a
        href={SUPPORT_URL}
        target="_blank"
        rel="noreferrer"
        className="btn btn-pink shrink-0 px-4 py-2 text-base"
      >
        {t('support.button')}
      </a>
    </div>
  );
}

/** Loads Google's ad script once, the first time an ad slot appears (so pages without ads never fetch it). */
let adScript: HTMLScriptElement | null = null;
function loadAdSense() {
  if (adScript) return;
  adScript = document.createElement('script');
  adScript.async = true;
  adScript.crossOrigin = 'anonymous';
  adScript.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADS.client)}`;
  document.head.appendChild(adScript);
}

type Shape = 'banner' | 'tall' | 'square';
// query: the screen size an ad needs; below it the ad isn't rendered at all.
const SHAPES: Record<Shape, { height: string; format: string; query: string | null }> = {
  banner: { height: 'min-h-[100px]', format: 'horizontal', query: null },
  // Needs the gap beside the centre column and room for 600px between the buttons at the top and "Follow us" at the bottom.
  tall: { height: 'h-[600px]', format: 'vertical', query: '(min-width: 1152px) and (min-height: 820px)' },
  // In the 250px scores column of the game, which only exists from 1024px; tall enough that the scores keep room.
  square: { height: 'h-[250px]', format: 'rectangle', query: '(min-width: 1024px) and (min-height: 760px)' },
};
const PLACEMENTS: Record<AdPlacement, { shape: Shape; preview: string }> = {
  home: { shape: 'banner', preview: 'Responsive banner · about 576×100 on desktop, 320×100 on phones' },
  side: { shape: 'tall', preview: 'Tall ad · 160 to 300 wide × 600 high, wide screens only' },
  room: { shape: 'banner', preview: 'Responsive banner under the players' },
  game: { shape: 'square', preview: '250×250 square, wide screens only' },
  gameover: { shape: 'banner', preview: 'Responsive banner · about 448×100 on desktop, 320×100 on phones' },
  gameoverSide: { shape: 'tall', preview: 'Tall ad · 160 to 300 wide × 600 high, wide screens only' },
  gameoverLeft: { shape: 'tall', preview: 'Tall ad · 160 to 300 wide × 600 high, wide screens only' },
};
function useFits(query: string | null) {
  const [fits, setFits] = useState(() => !query || matchMedia(query).matches);
  useEffect(() => {
    if (!query) return;
    const mq = matchMedia(query);
    const on = () => setFits(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return fits;
}

/**
 * One ad space. Shows nothing unless ads are turned on (see config/ads.ts), and collapses if Google has
 * no ad to fill it with, so players never see an empty box.
 */
export function AdSlot({ placement, className = '' }: { placement: AdPlacement; className?: string }) {
  const t = useT();
  const ref = useRef<HTMLModElement>(null);
  const slot = ADS.slots[placement];
  const shape = SHAPES[PLACEMENTS[placement].shape];
  // Not rendered at all when it doesn't fit, so Google is never asked to fill a hidden box.
  const fits = useFits(shape.query);

  useEffect(() => {
    if (ADS.mode !== 'adsense' || !slot || !ref.current) return;
    loadAdSense();
    // Each <ins> may be filled once; React's dev double-run would otherwise ask twice.
    if (ref.current.dataset.adsbygoogleStatus) return;
    try {
      ((window as unknown as { adsbygoogle?: unknown[] }).adsbygoogle ??= []).push({});
    } catch {
      /* blocked by an ad blocker, or no ad: the space just stays collapsed */
    }
  }, [slot, fits]);

  if (!fits) return null;

  if (ADS.mode === 'preview') {
    return (
      <div className={`ad-slot ${className}`} aria-label={t('ad.label')}>
        <div className="ad-label">{t('ad.label')}</div>
        <div className={`grid place-items-center gap-1 rounded-2xl border-4 border-dashed border-white/40 bg-white/10 p-3 text-center text-white ${shape.height}`}>
          <div className="font-display text-lg font-semibold">Ad preview: {placement}</div>
          <div className="text-xs font-bold text-white/80">{PLACEMENTS[placement].preview}</div>
        </div>
      </div>
    );
  }
  if (ADS.mode !== 'adsense' || !slot) return null;
  return (
    <div className={`ad-slot ${className}`}>
      <div className="ad-label">{t('ad.label')}</div>
      <ins
        ref={ref}
        className={`adsbygoogle block overflow-hidden rounded-2xl ${shape.height}`}
        data-ad-client={ADS.client}
        data-ad-slot={slot}
        data-ad-format={shape.format}
        data-full-width-responsive={shape.query ? 'false' : 'true'}
      />
    </div>
  );
}
