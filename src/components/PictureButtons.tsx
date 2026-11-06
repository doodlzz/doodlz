import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Loader2, Lock, Paintbrush, Trash2 } from 'lucide-react';
import { findCosmetic } from '../../shared/cosmetics';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../i18n';
import PictureCropper from './PictureCropper';
import PictureDrawer from './PictureDrawer';

interface Props {
  className?: string;
  /** Show just one of the two (used on the shop's cards). */
  only?: 'upload' | 'draw';
  /** Smaller buttons without the remove button. */
  compact?: boolean;
}

/**
 * Upload a picture or draw one as your avatar (signed-in players, after buying the unlock in the shop),
 * or remove it. Locked buttons open the shop.
 */
export default function PictureButtons({ className = '', only, compact = false }: Props) {
  const t = useT();
  const { account, setImage, openShop } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<File | null>(null); // picture being adjusted in the crop window
  const [drawing, setDrawing] = useState(false);
  if (!account) return null;
  const hasImage = !!account.avatar?.image;
  const canUpload = account.owned.includes('pic-upload');
  const canDraw = account.owned.includes('pic-draw');
  const size = compact ? 'px-2 py-1.5 text-sm' : 'px-3 py-1.5 text-sm';

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

  const locked = (id: 'pic-upload' | 'pic-draw', icon: React.ReactNode, label: string) => (
    <button type="button" className={`btn btn-ghost ${size}`} onClick={() => openShop('cosmetics')} title={t('shop.unlockIn', { n: findCosmetic(id)?.price ?? 0 })}>
      <Lock className="size-3.5" /> {icon} {label}
    </button>
  );

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
        {only !== 'draw' &&
          (canUpload ? (
            <button type="button" className={`btn btn-blue ${size}`} disabled={busy} onClick={() => input.current?.click()}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {t('avatar.upload')}
            </button>
          ) : (
            locked('pic-upload', <ImagePlus className="size-4" />, t('avatar.upload'))
          ))}
        {only !== 'upload' &&
          (canDraw ? (
            <button type="button" className={`btn btn-pink ${size}`} disabled={busy} onClick={() => setDrawing(true)}>
              <Paintbrush className="size-4" /> {t('avatar.draw')}
            </button>
          ) : (
            locked('pic-draw', <Paintbrush className="size-4" />, t('avatar.draw'))
          ))}
        {hasImage && !compact && (
          <button type="button" className="btn btn-ghost px-3 py-1.5 text-sm" disabled={busy} onClick={() => run(() => setImage(null))}>
            <Trash2 className="size-4" /> {t('avatar.removePicture')}
          </button>
        )}
      </div>
      {/* Portals: the shop window animates with a transform, which would trap full-screen pop-ups inside it. */}
      {picked &&
        createPortal(
          <PictureCropper
            file={picked}
            onCancel={() => setPicked(null)}
            onSave={async (dataUrl) => {
              await run(() => setImage(dataUrl));
              setPicked(null);
            }}
          />,
          document.body,
        )}
      {drawing &&
        createPortal(
          <PictureDrawer
            background={account.avatar?.color ?? '#ffffff'}
            onCancel={() => setDrawing(false)}
            onSave={async (dataUrl) => {
              await run(() => setImage(dataUrl));
              setDrawing(false);
            }}
          />,
          document.body,
        )}
      {error && (
        <p className="mt-1.5 text-center text-xs font-bold text-rose-500" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
