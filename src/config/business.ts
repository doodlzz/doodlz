// Who runs the site. These show up in the footer, Contact page and legal pages.
// Set them at build time (Render env vars). Only the contact email is required; the name and
// address are optional and simply left out of the pages when not set.
const env = import.meta.env;
const val = (v: unknown, placeholder: string) => (typeof v === 'string' && v.trim() ? v.trim() : placeholder);
/** Optional values stay empty (and are left out of the pages) when not set. */
const opt = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const BUSINESS = {
  siteName: 'doodlz.io',
  /** Legal name of the person or company that operates the site. */
  legalName: opt(env.VITE_BUSINESS_NAME),
  /** Postal address (required for paid services in many countries). */
  address: opt(env.VITE_BUSINESS_ADDRESS),
  /** Where people send privacy, refund and deletion requests. */
  email: val(env.VITE_CONTACT_EMAIL, 'support@doodlz.io'),
  /** Business registration / tax number, if you have one. Hidden when empty. */
  registration: typeof env.VITE_BUSINESS_REG === 'string' ? env.VITE_BUSINESS_REG.trim() : '',
  /** Update when you change the policies. */
  policiesUpdated: '2026-11-08',
};

/** Only the contact email is required; name and address are shown only when you choose to set them. */
export const CONFIGURED = !BUSINESS.email.startsWith('[Set ');
/** "run by Name, Address" – whatever was set, or just the site name. */
export const OPERATOR = [BUSINESS.legalName, BUSINESS.address].filter(Boolean).join(', ') || BUSINESS.siteName;
