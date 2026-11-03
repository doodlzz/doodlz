import { Eye, EyeOff } from 'lucide-react';
import { useT } from '../i18n';
import { useSettings } from '../settings/SettingsContext';

/** The room code, which can be masked (handy when streaming). The choice is remembered. */
export function useCodeVisibility() {
  const { settings, update } = useSettings();
  return { hidden: settings.hideCode, toggle: () => update({ hideCode: !settings.hideCode }) };
}

export const maskCode = (code: string, hidden: boolean) => (hidden ? '•'.repeat(code.length) : code);

export function CodeEyeButton({ className = '' }: { className?: string }) {
  const t = useT();
  const { hidden, toggle } = useCodeVisibility();
  const label = hidden ? t('lobby.showCode') : t('lobby.hideCode');
  return (
    <button type="button" onClick={toggle} className={`grid shrink-0 cursor-pointer place-items-center rounded-xl transition ${className}`} aria-label={label} title={label} aria-pressed={hidden}>
      {hidden ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
    </button>
  );
}
