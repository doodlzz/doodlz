// Sends email through Resend (https://resend.com). Needs RESEND_API_KEY and a verified sending domain.
import { config } from '../config.js';

export const mailEnabled = () => Boolean(config.resendApiKey);

/** Send one email. Returns false (and logs) on any failure; never throws. */
export async function sendMail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  if (!mailEnabled()) return false;
  try {
    const res = await fetch(config.resendApiUrl, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: config.mailFrom, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      console.error(`mail: Resend rejected the email (${res.status}): ${(await res.text()).slice(0, 300)}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('mail: could not reach Resend:', err);
    return false;
  }
}

export function verificationEmail(username: string, code: string) {
  const subject = `${code} is your Doodlz code`;
  const text = `Hi ${username},\n\nYour Doodlz verification code is ${code}. It expires in 15 minutes.\n\nIf you didn't sign up, you can ignore this email.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:24px;color:#1e1b4b">
  <h2 style="margin:0 0 12px">Welcome to Doodlz, ${username.replace(/[<>&"]/g, '')}!</h2>
  <p>Enter this code to verify your email:</p>
  <p style="font-size:34px;font-weight:800;letter-spacing:8px;background:#eef2ff;border-radius:12px;padding:14px 0;text-align:center;margin:16px 0">${code}</p>
  <p style="color:#6366f1;font-size:14px">It expires in 15 minutes. If you didn't sign up, you can ignore this email.</p></div>`;
  return { subject, html, text };
}
