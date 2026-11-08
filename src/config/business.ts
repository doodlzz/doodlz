// Who runs the site. These show up in the footer, Contact page and legal pages.
// Set them at build time (Render env vars) before you launch. Nothing here is guessed:
// a value you haven't set is shown as a visible placeholder so it can't be missed.
const env = import.meta.env;
const val = (v: unknown, placeholder: string) => (typeof v === 'string' && v.trim() ? v.trim() : placeholder);

export const BUSINESS = {
  siteName: 'doodlz.io',
  /** Legal name of the person or company that operates the site. */
  legalName: val(env.VITE_BUSINESS_NAME, '[Set VITE_BUSINESS_NAME]'),
  /** Postal address (required for paid services in many countries). */
  address: val(env.VITE_BUSINESS_ADDRESS, '[Set VITE_BUSINESS_ADDRESS]'),
  /** Where people send privacy, refund and deletion requests. */
  email: val(env.VITE_CONTACT_EMAIL, '[Set VITE_CONTACT_EMAIL]'),
  /** Business registration / tax number, if you have one. Hidden when empty. */
  registration: typeof env.VITE_BUSINESS_REG === 'string' ? env.VITE_BUSINESS_REG.trim() : '',
  /** Update when you change the policies. */
  policiesUpdated: '2026-11-08',
};

export const CONFIGURED = !Object.values({ a: BUSINESS.legalName, b: BUSINESS.address, c: BUSINESS.email }).some((v) => v.startsWith('[Set '));
