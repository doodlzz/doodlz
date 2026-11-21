// Addresses of the policy pages, kept apart from their (long) text so the game doesn't download it up front.
export type LegalPath = '/privacy' | '/terms' | '/refunds' | '/cookies' | '/contact' | '/delete-account';
export const LEGAL_PATHS: { path: LegalPath; label: string }[] = [
  { path: '/privacy', label: 'Privacy Policy' },
  { path: '/terms', label: 'Terms of Service' },
  { path: '/refunds', label: 'Refund Policy' },
  { path: '/cookies', label: 'Cookie Policy' },
  { path: '/delete-account', label: 'Delete my data' },
  { path: '/contact', label: 'Contact' },
];
export const isLegalPath = (p: string): p is LegalPath => LEGAL_PATHS.some((l) => l.path === p);
