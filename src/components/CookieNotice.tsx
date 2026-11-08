import { useState } from 'react';
import { useT } from '../i18n';
import { readJson, writeJson } from '../lib/storage';

const KEY = 'doodlz:noticeSeen';

/**
 * We set no advertising or analytics cookies, so there is nothing to opt in to. This tells people what
 * is stored (see the Cookie Policy). If an optional tracker is ever added, replace this with a real
 * choice (accept / reject with equal prominence) and load the tracker only after "accept".
 */
export default function CookieNotice() {
  const t = useT();
  const [seen, setSeen] = useState(() => readJson<{ v?: number }>(KEY, {}).v === 1);
  if (seen) return null;
  return (
    <div role="region" aria-label="Storage notice" className="fixed inset-x-0 bottom-0 z-[90] flex flex-wrap items-center justify-center gap-3 bg-indigo-950 px-4 py-3 text-sm font-semibold text-white shadow-[0_-4px_0_rgba(0,0,0,0.25)]">
      <p className="max-w-2xl">
        {t('consent.text')}{' '}
        <a href="/cookies" className="underline underline-offset-2">
          {t('consent.more')}
        </a>
      </p>
      <button
        type="button"
        className="btn btn-pink px-5 py-1.5 text-base"
        onClick={() => {
          writeJson(KEY, { v: 1 });
          setSeen(true);
        }}
      >
        {t('consent.ok')}
      </button>
    </div>
  );
}
