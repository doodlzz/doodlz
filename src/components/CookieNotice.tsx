import { useState } from 'react';
import { ADS_LIVE } from '../config/ads';
import { useT } from '../i18n';
import { readJson, writeJson } from '../lib/storage';

const KEY = 'doodlz:noticeSeen';
// Bumped when ads go live, so people who dismissed the old "no ads" notice see the new one.
const VERSION = ADS_LIVE ? 2 : 1;

/**
 * Tells people what is stored (see the Cookie Policy). With ads on, the consent choice for ad cookies
 * (EU/UK/Switzerland) is Google's own certified consent message, turned on in AdSense under
 * Privacy & messaging; this notice only says that ads are shown.
 */
export default function CookieNotice() {
  const t = useT();
  const [seen, setSeen] = useState(() => readJson<{ v?: number }>(KEY, {}).v === VERSION);
  if (seen) return null;
  return (
    <div role="region" aria-label="Storage notice" className="fixed inset-x-0 bottom-0 z-[90] flex flex-wrap items-center justify-center gap-3 bg-[#1e1b4b] px-4 py-3 text-sm font-semibold text-white shadow-[0_-4px_0_rgba(0,0,0,0.25)]">
      <p className="max-w-2xl">
        {t(ADS_LIVE ? 'consent.textAds' : 'consent.text')}{' '}
        <a href="/cookies" className="underline underline-offset-2">
          {t('consent.more')}
        </a>
      </p>
      <button
        type="button"
        className="btn btn-pink px-5 py-1.5 text-base"
        onClick={() => {
          writeJson(KEY, { v: VERSION });
          setSeen(true);
        }}
      >
        {t('consent.ok')}
      </button>
    </div>
  );
}
