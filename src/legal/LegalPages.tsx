import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import DeleteAccountPage from '../auth/DeleteAccountPage';
import { BUSINESS } from '../config/business';

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

const mail = (subject: string) => (
  <a href={`mailto:${BUSINESS.email}?subject=${encodeURIComponent(subject)}`}>{BUSINESS.email}</a>
);

function Page({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-8">
      <a href="/" className="mb-4 inline-flex items-center gap-2 font-display text-lg font-semibold text-white underline underline-offset-4">
        <ArrowLeft className="size-5" aria-hidden /> Back to the game
      </a>
      <article className="panel legal p-6 sm:p-8">
        <h1>{title}</h1>
        <p className="meta">Last updated {BUSINESS.policiesUpdated}</p>
        {children}
      </article>
    </main>
  );
}

const Privacy = () => (
  <Page title="Privacy Policy">
    <p>
      This policy explains what {BUSINESS.siteName} (“we”, “us”) collects, why, and the choices you have. The site is run by {BUSINESS.legalName}, {BUSINESS.address}. Contact: {mail('Privacy')}.
    </p>
    <h2>What we collect</h2>
    <ul>
      <li>
        <b>If you play as a guest:</b> a nickname you type. Your browser stores a random device ID and a #tag so you keep the same name and so one person can’t fill a room with tabs. We don’t ask for your email.
      </li>
      <li>
        <b>If you create an account:</b> username, email address, a salted hash of your password (we never store the password itself), the time you accepted these policies, your avatar or picture, points, purchased and equipped cosmetics, daily quest progress, and a record of point purchases (Stripe session ID, pack, amount, date).
      </li>
      <li>
        <b>While you play:</b> chat messages, drawings and guesses are shared with the other players in your room and are kept only while the room exists. They are not saved to your account. Your IP address is used by the server in memory to limit abuse (for example, how many players join from one address and ranked-game fairness) and to slow down password guessing; we don’t store it in your account.
      </li>
      <li>
        <b>Payments:</b> handled by Stripe on Stripe’s own page. We never see or store your card number.
      </li>
    </ul>
    <p>We don’t collect anything that isn’t needed to run the game, and we don’t ask for date of birth, address, or phone number.</p>
    <h2>Why we use it (legal bases)</h2>
    <ul>
      <li>To provide the game and your account (contract).</li>
      <li>To keep the game fair and secure, prevent abuse and fraud (legitimate interests).</li>
      <li>To process payments and keep purchase records for accounting (contract, legal obligation).</li>
    </ul>
    <p>We don’t sell your personal data, don’t use it for advertising profiles, and don’t send marketing emails.</p>
    <h2>Who receives it</h2>
    <ul>
      <li>Stripe (payment processing, only if you buy points).</li>
      <li>Our hosting provider, which runs the servers that store account data.</li>
      <li>Other players in your room see your name, avatar, chat and drawings.</li>
    </ul>
    <p>The site loads no analytics, advertising or tracking scripts, and its fonts are served from our own server, so visiting does not send your IP address to a font provider.</p>
    <h2>How long we keep it</h2>
    <p>Account data is kept until you delete your account. When you delete it, your profile, picture, sign-ins and purchase records on our servers are removed immediately. Stripe may keep payment records for as long as the law requires.</p>
    <h2>Your rights</h2>
    <p>
      Depending on where you live (for example under the GDPR or the CCPA) you can ask to access, correct, export or delete your data, object to processing, or complain to your data protection authority. You can change your username, email and password in Account settings, and delete your account yourself on the <a href="/delete-account">Delete my data</a> page. For anything else, write to {mail('Privacy request')}.
    </p>
    <h2>Children</h2>
    <p>
      Accounts are for people aged 13 or older, and registering requires confirming that. We don’t knowingly collect personal data from children under 13. If you believe a child under 13 has an account, tell us at {mail('Child account')} and we will delete it. Players under 18 should have a parent or guardian’s permission before buying points.
    </p>
    <h2>Security</h2>
    <p>Passwords are hashed with scrypt, connections use HTTPS, and sign-in attempts are rate-limited. No system is perfectly secure, so use a unique password.</p>
    <h2>Changes</h2>
    <p>If we change this policy we’ll update the date above and, for important changes, tell you in the game.</p>
  </Page>
);

const Terms = () => (
  <Page title="Terms of Service">
    <p>
      By using {BUSINESS.siteName} you agree to these terms. The service is operated by {BUSINESS.legalName}, {BUSINESS.address}.
    </p>
    <h2>Who can use it</h2>
    <p>You must be at least 13 to create an account. If you are under 18 you need a parent or guardian’s permission to buy anything. Guests can play without an account.</p>
    <h2>Your account</h2>
    <p>Keep your password private; you are responsible for what happens under your account. One person, one account. We may suspend accounts that break these terms.</p>
    <h2>Behaving in games</h2>
    <p>Don’t draw or write anything hateful, sexual, harassing or illegal, don’t cheat (for example by sharing the secret word or using multiple accounts to farm points), and don’t attack the service. Players can report others; we may remove content or accounts.</p>
    <h2>Your content</h2>
    <p>You keep ownership of your drawings, chat and pictures. You give us permission to display them to other players in the game as needed to run it. Only upload pictures you have the right to use.</p>
    <h2>Points and cosmetics</h2>
    <p>
      Points can be earned in ranked games and quests, or bought. They and the cosmetics bought with them are a licence to use features inside {BUSINESS.siteName}; they have no cash value, can’t be transferred or exchanged for money, and are lost if your account is deleted. Prices are shown in US dollars on the buy screen before you pay and the amount shown is the amount charged by Stripe; any tax Stripe adds for your location is shown on Stripe’s payment page before you confirm. See the <a href="/refunds">Refund Policy</a>.
    </p>
    <h2>Availability</h2>
    <p>The game is provided “as is”. We may change it, or take it offline for maintenance, and we don’t guarantee it will always be available or error-free. Nothing here limits rights you have under consumer-protection law that cannot be waived.</p>
    <h2>Liability</h2>
    <p>To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the 12 months before it.</p>
    <h2>Changes and contact</h2>
    <p>
      We may update these terms; the date above shows the latest version, and continued use means you accept it. Questions: {mail('Terms')}.
    </p>
  </Page>
);

const Refunds = () => (
  <Page title="Refund Policy">
    <p>Point packs are digital content delivered to your account as soon as Stripe confirms payment.</p>
    <h2>Right to withdraw (EU/UK)</h2>
    <p>
      If you live in the EU or UK you normally have 14 days to cancel a purchase. We don’t make you give that up: within 14 days of buying, ask us and we will refund any points you haven’t spent.
    </p>
    <h2>Everyone else</h2>
    <ul>
      <li>If you were charged but did not receive your points, we will fix it or refund you in full.</li>
      <li>If you were charged by mistake or without permission (for example by a child), contact us within 30 days and we will refund unspent points.</li>
      <li>Points already spent on cosmetics are not refundable unless the item was faulty.</li>
      <li>If your account is closed by us for no fault of yours, we will refund unspent bought points.</li>
    </ul>
    <h2>How to ask</h2>
    <p>
      Email {mail('Refund request')} with your username and the date of the purchase. Refunds go back to the original payment method through Stripe and usually take 5–10 business days to appear. If you started a payment and then cancelled, you weren’t charged.
    </p>
  </Page>
);

const Cookies = () => (
  <Page title="Cookie Policy">
    <p>We keep this simple: {BUSINESS.siteName} uses <b>no advertising, analytics or tracking cookies</b>. It only stores small items in your browser that the game needs to work.</p>
    <table>
      <thead>
        <tr><th>Item (browser storage)</th><th>What it does</th><th>How long</th></tr>
      </thead>
      <tbody>
        <tr><td>Sign-in token</td><td>Keeps you signed in (local storage if you tick “Remember me”, otherwise ends when you close the browser).</td><td>Up to 90 days</td></tr>
        <tr><td>Device ID and guest #tag</td><td>Lets you keep your name and stops one person filling a room with tabs.</td><td>Until you clear site data</td></tr>
        <tr><td>Settings and profile</td><td>Remembers language, sound, theme and your avatar.</td><td>Until you clear site data</td></tr>
        <tr><td>Notice acknowledged</td><td>Remembers that you saw the notice at the bottom of the page.</td><td>Until you clear site data</td></tr>
      </tbody>
    </table>
    <p>These are strictly necessary, so they are not subject to consent under the ePrivacy rules. If we ever add anything optional, such as analytics or ads, we will ask you first and update this page. You can delete all of the above at any time in your browser’s settings; the game will then treat you as a new visitor.</p>
    <p>If you buy points, you are sent to Stripe’s payment page, which sets its own cookies under <a href="https://stripe.com/privacy" rel="noreferrer">Stripe’s policy</a>.</p>
  </Page>
);

const Contact = () => (
  <Page title="Contact & business details">
    <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[10rem_1fr]">
      <dt>Service</dt>
      <dd>{BUSINESS.siteName}</dd>
      <dt>Operated by</dt>
      <dd>{BUSINESS.legalName}</dd>
      <dt>Address</dt>
      <dd>{BUSINESS.address}</dd>
      <dt>Email</dt>
      <dd>{mail('Hello')}</dd>
      {BUSINESS.registration && (
        <>
          <dt>Registration</dt>
          <dd>{BUSINESS.registration}</dd>
        </>
      )}
    </dl>
    <p>Write to us for support, refunds, privacy requests, or to report a player or a child account.</p>
  </Page>
);

export function LegalPage({ path }: { path: LegalPath }) {
  switch (path) {
    case '/privacy': return <Privacy />;
    case '/terms': return <Terms />;
    case '/refunds': return <Refunds />;
    case '/cookies': return <Cookies />;
    case '/contact': return <Contact />;
    case '/delete-account': return <DeleteAccountPage />;
  }
}
