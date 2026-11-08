import { useT } from '../i18n';

const LINKS = [
  ['/privacy', 'footer.privacy'],
  ['/terms', 'footer.terms'],
  ['/refunds', 'footer.refunds'],
  ['/cookies', 'footer.cookies'],
  ['/delete-account', 'footer.delete'],
  ['/contact', 'footer.contact'],
] as const;

/** Legal links, shown on the home screen. */
export default function Footer({ className = '' }: { className?: string }) {
  const t = useT();
  return (
    <footer className={className}>
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm font-bold text-white">
        {LINKS.map(([href, key]) => (
          <a key={href} href={href} className="underline underline-offset-2 hover:text-pink-100">
            {t(key)}
          </a>
        ))}
      </nav>
    </footer>
  );
}
