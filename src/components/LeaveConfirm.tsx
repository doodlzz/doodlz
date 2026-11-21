import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DoorOpen, Gamepad2 } from 'lucide-react';
import { useT } from '../i18n';

/** "Leaving already?" before you leave a room, so a stray click doesn't throw you out of a game. */
export default function LeaveConfirm({ inGame, onStay, onLeave }: { inGame: boolean; onStay: () => void; onLeave: () => void }) {
  const t = useT();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onStay();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStay]);

  // Portal: some headers animate with transforms, which would trap a full-screen overlay inside them.
  return createPortal(
    <div className="fixed inset-0 z-[80] flex bg-indigo-950/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal aria-labelledby="leave-title" aria-describedby="leave-text" onClick={onStay}>
      <div className="panel crayon-edge m-auto w-full max-w-sm animate-modal p-6 text-center" onClick={(e) => e.stopPropagation()}>
        <div className="mx-auto mb-2 w-fit origin-[70%_70%] animate-[wave_1.6s_ease-in-out_infinite] text-6xl motion-reduce:animate-none" aria-hidden>
          👋
        </div>
        <h2 id="leave-title" className="font-display text-3xl font-bold text-indigo-950">
          {t('leave.title')}
        </h2>
        <p id="leave-text" className="mt-1.5 text-sm font-bold text-indigo-400">
          {inGame ? t('leave.inGame') : t('leave.inLobby')}
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" className="btn btn-green crayon-edge crayon-grain py-3 text-lg" onClick={onStay} autoFocus>
            <Gamepad2 className="size-5" /> {t('leave.stay')}
          </button>
          <button type="button" className="btn crayon-edge bg-rose-500 py-3 text-lg text-white shadow-[0_4px_0_#9f1239] hover:bg-rose-400" onClick={onLeave}>
            <DoorOpen className="size-5" /> {t('leave.leave')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
