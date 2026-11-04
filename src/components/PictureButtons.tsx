import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import PictureCropper from './PictureCropper';

/** Upload a picture from the computer as your avatar, or remove it (signed-in players only). */
export default function PictureButtons({ className = '' }: { className?: string }) {
  const t = useT();
  const { account, setImage } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null); // picture being adjusted in the crop window
  if (!account) return null;
  const hasImage = !!account.avatar?.image;

  const run = async (fn: () => Promise<string | null>) => {
    setBusy(true);
    setError(null);
    try {
      setError(await fn());
    } catch {
      setError('auth.err.image');
    }
    setBusy(false);
  };

  return (
    <div className={className}>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) {
            setError(null);
            setPicked(file);
          }
        }}
      />
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="btn btn-blue px-3 py-1.5 text-sm" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {t('avatar.upload')}
        </button>
        {hasImage && (
          <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" disabled={busy} onClick={() => run(() => setImage(null))}>
            <Trash2 className="size-4" /> {t('avatar.removePicture')}
          </button>
        )}
      </div>
      {picked && (
        <PictureCropper
          file={picked}
          onCancel={() => setPicked(null)}
          onSave={async (dataUrl) => {
            await run(() => setImage(dataUrl));
            setPicked(null);
          }}
        />
      )}
      {error && (
        <p className="mt-1.5 text-center text-xs font-bold text-rose-500" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
