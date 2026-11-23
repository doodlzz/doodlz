import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, PencilLine } from 'lucide-react';
import { useT } from '../i18n';

// "About" and "How to play" cards for first-time visitors on the home screen. The step pictures are simple
// doodles drawn here in the ink colour, so they follow the light / dark theme. (No crayon filter: it would
// eat into the words inside the pictures.)

const ink = { fill: 'none', stroke: 'currentColor', strokeWidth: 4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Doodle({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 240 150" className="h-28 w-full text-indigo-950" aria-hidden>
      {children}
    </svg>
  );
}

/** 1. Pick a word: three cards, one picked. */
function StepPick() {
  return (
    <Doodle>
      {[30, 95, 160].map((x, i) => (
        <rect key={x} x={x} y="40" width="52" height="34" rx="7" {...ink} fill={i === 1 ? '#f9a8d4' : 'none'} />
      ))}
      <path d="M40 57 q6 -6 12 0 t12 0 t12 0" {...ink} strokeWidth={3} />
      <path d="M170 57 q6 -6 12 0 t12 0 t12 0" {...ink} strokeWidth={3} />
      <text x="121" y="63" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="17" fill="#1e1b4b">
        CAT
      </text>
      {/* A finger tapping the middle card. */}
      <path d="M118 120 v-34 a5 5 0 0 1 10 0 v18 l14 3 a6 6 0 0 1 4 7 l-4 18 h-22 l-10 -12 a5 5 0 0 1 8 -6z" {...ink} fill="#fde68a" />
      <path d="M108 92 l-8 -6 M138 92 l8 -6 M123 80 v-6" {...ink} strokeWidth={3} />
    </Doodle>
  );
}

/** 2. Draw it, no letters. */
function StepDraw() {
  return (
    <Doodle>
      <path d="M80 62 L74 30 L94 48 Q110 42 126 48 L146 30 L140 62 Q152 84 138 104 Q110 122 82 104 Q68 84 80 62 Z" {...ink} fill="#fde68a" />
      <circle cx="98" cy="74" r="4" fill="#1e1b4b" />
      <circle cx="122" cy="74" r="4" fill="#1e1b4b" />
      <path d="M106 86 l4 4 l4 -4 M84 84 l-22 -3 M84 92 l-21 4 M136 84 l22 -3 M136 92 l21 4" {...ink} strokeWidth={3} />
      {/* Pencil drawing it. */}
      <path d="M168 112 l34 -46 l12 9 l-34 46 l-15 5z" {...ink} fill="#93c5fd" />
      <path d="M197 73 l12 9" {...ink} strokeWidth={3} />
      {/* No letters. */}
      <text x="18" y="134" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="18" fill="#f87171">
        ABC
      </text>
      <path d="M14 128 l50 -10" stroke="#ef4444" strokeWidth={5} strokeLinecap="round" />
    </Doodle>
  );
}

/** 3. Everyone else guesses in the chat. */
function StepGuess() {
  const people = [28, 64, 100];
  return (
    <Doodle>
      {people.map((y, i) => (
        <g key={y}>
          <circle cx="36" cy={y} r="13" {...ink} />
          <circle cx="32" cy={y - 2} r="1.8" fill="currentColor" />
          <circle cx="40" cy={y - 2} r="1.8" fill="currentColor" />
          <path d={`M31 ${y + 5} q5 4 10 0`} {...ink} strokeWidth={2.5} />
          <rect x="62" y={y - 14} width={i === 2 ? 96 : 78} height="28" rx="12" {...ink} fill={i === 2 ? '#a7f3d0' : 'none'} />
          <path d={`M62 ${y + 2} l-10 6 l10 -1`} {...ink} strokeWidth={3} />
          <text x="76" y={y + 6} fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="16" fill={i === 2 ? '#1e1b4b' : 'currentColor'}>
            {['dog?', 'fox?', 'CAT!'][i]}
          </text>
        </g>
      ))}
      <path d="M178 108 l10 10 l22 -26" stroke="#16a34a" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Doodle>
  );
}

/** 4. Faster guesses score more. */
function StepFast() {
  return (
    <Doodle>
      <circle cx="78" cy="82" r="44" {...ink} fill="#fecaca" />
      <path d="M70 32 h16 M78 32 v6 M114 46 l8 -8" {...ink} />
      <path d="M78 82 V56 M78 82 L98 94" {...ink} strokeWidth={5} />
      <path d="M134 60 l10 -4 M134 82 h12 M134 104 l10 4" {...ink} strokeWidth={3} />
      <text x="158" y="78" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="34" fill="#db2777">
        +62
      </text>
      <text x="168" y="112" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="18" fill="currentColor" opacity="0.5">
        +27
      </text>
    </Doodle>
  );
}

/** 5. Most points wins. */
function StepWin() {
  return (
    <Doodle>
      <rect x="40" y="88" width="52" height="46" {...ink} fill="#e2e8f0" />
      <rect x="94" y="64" width="52" height="70" {...ink} fill="#fde68a" />
      <rect x="148" y="104" width="52" height="30" {...ink} fill="#fdba74" />
      <text x="120" y="108" textAnchor="middle" fontFamily="Fredoka, sans-serif" fontWeight="700" fontSize="26" fill="#1e1b4b">
        1
      </text>
      <circle cx="120" cy="40" r="13" {...ink} />
      <path d="M115 41 h0 M125 41 h0" {...ink} strokeWidth={5} />
      <path d="M114 46 q6 5 12 0" {...ink} strokeWidth={2.5} />
      <path d="M104 22 l6 -14 l10 10 l10 -10 l6 14 z" {...ink} fill="#facc15" />
      <path d="M60 80 l4 -6 M166 96 l4 -6 M40 40 l6 6 M200 34 l-6 6" {...ink} strokeWidth={3} />
    </Doodle>
  );
}

const STEPS = [StepPick, StepDraw, StepGuess, StepFast, StepWin];

function HowToPlay() {
  const t = useT();
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const Picture = STEPS[step];

  // Moves on every 5 seconds, except while hovered or focused, or for reduced motion.
  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), 5000);
    return () => clearTimeout(id);
  }, [step, paused]);

  const go = (d: number) => setStep((s) => (s + d + STEPS.length) % STEPS.length);

  return (
    <section
      className="panel crayon-edge flex flex-col p-4"
      aria-roledescription="carousel"
      aria-labelledby="how-title"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <h2 id="how-title" className="flex items-center gap-2 font-display text-xl font-bold text-indigo-950">
        <PencilLine className="size-5 text-pink-500" /> {t('how.title')}
      </h2>
      <div className="relative mt-1 flex flex-1 flex-col items-center" aria-live="polite">
        <div key={step} className="w-full animate-modal">
          <Picture />
          <p className="mt-1 min-h-10 px-6 text-center text-sm font-bold text-indigo-700">
            <span className="mr-1 text-pink-500">{step + 1}.</span>
            {t(`how.step${step + 1}`)}
          </p>
        </div>
        <button type="button" onClick={() => go(-1)} className="absolute top-10 left-0 grid size-8 cursor-pointer place-items-center rounded-full text-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" aria-label={t('how.prev')}>
          <ChevronLeft className="size-5" />
        </button>
        <button type="button" onClick={() => go(1)} className="absolute top-10 right-0 grid size-8 cursor-pointer place-items-center rounded-full text-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" aria-label={t('how.next')}>
          <ChevronRight className="size-5" />
        </button>
      </div>
      <div className="mt-1.5 flex justify-center gap-1.5">
        {STEPS.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setStep(i)}
            className={`size-2.5 cursor-pointer rounded-full transition ${i === step ? 'scale-125 bg-pink-500' : 'bg-indigo-200 hover:bg-indigo-300'}`}
            aria-label={t('how.goTo', { n: i + 1 })}
            aria-current={i === step}
          />
        ))}
      </div>
    </section>
  );
}

function About() {
  const t = useT();
  return (
    <section className="panel crayon-edge p-4" aria-labelledby="about-title">
      <h2 id="about-title" className="flex items-center gap-2 font-display text-xl font-bold text-indigo-950">
        <HelpCircle className="size-5 text-sky-500" /> {t('about.title')}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-snug font-semibold text-indigo-700">
        <p>{t('about.p1')}</p>
        <p>{t('about.p2')}</p>
        <p>{t('about.p3')}</p>
      </div>
    </section>
  );
}

/**
 * About and How to play: two square-ish cards side by side under the main panel (stacked on phones). They stay
 * inside the home column, because on wide screens the daily quests are pinned in the space beside it.
 */
export default function HomeInfo({ className = '' }: { className?: string }) {
  return (
    <div className={`grid w-full gap-4 sm:grid-cols-2 ${className}`}>
      <About />
      <HowToPlay />
    </div>
  );
}
