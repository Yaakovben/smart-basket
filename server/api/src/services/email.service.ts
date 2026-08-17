import { User } from '../models';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const FROM = { name: 'Smart Basket', email: 'smartbasket129@gmail.com' };

export function isEmailEnabled(): boolean {
  return !!env.BREVO_API_KEY;
}

export interface EmailPayload {
  subject: string;
  body: string;
}

export interface EmailUserStatus {
  userId: string;
  name: string;
  email: string;
  status: 'sent' | 'failed' | 'skipped';
}

export interface EmailBroadcastResult {
  totalUsers: number;
  sent: number;
  failed: number;
  skipped: number;
  perUser: EmailUserStatus[];
}

async function sendSingle(to: string, subject: string, body: string): Promise<void> {
  const res = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': env.BREVO_API_KEY!,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: FROM,
      to: [{ email: to }],
      subject,
      textContent: body,
      htmlContent: `
<div dir="rtl" style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px;margin:0 auto;padding:24px;">
  <div style="white-space:pre-wrap;margin-bottom:32px;">${body.replace(/\n/g, '<br/>')}</div>
  <div style="text-align:center;">
    <a href="https://prod-smart-basket.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#0F766E,#14B8A6);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:12px;">
      פתח את Smart Basket
    </a>
  </div>
</div>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    logger.warn('Brevo send failed to %s: %s', to, err);
    throw new Error(err);
  }
}

export async function broadcastEmail(payload: EmailPayload, onlyWithoutPush = false): Promise<EmailBroadcastResult> {
  if (!env.BREVO_API_KEY) return { totalUsers: 0, sent: 0, failed: 0, skipped: 0, perUser: [] };

  const users = await User.find({}, 'name email').lean();

  let userIdsWithPush = new Set<string>();
  if (onlyWithoutPush) {
    const subs = await PushSubscriptionDAL.find({});
    userIdsWithPush = new Set(subs.map(s => s.userId.toString()));
  }

  const perUser: EmailUserStatus[] = await Promise.all(users.map(async (u): Promise<EmailUserStatus> => {
    const userId = u._id.toString();
    if (onlyWithoutPush && userIdsWithPush.has(userId)) {
      return { userId, name: u.name, email: u.email, status: 'skipped' };
    }
    try {
      await sendSingle(u.email, payload.subject, payload.body);
      return { userId, name: u.name, email: u.email, status: 'sent' };
    } catch {
      return { userId, name: u.name, email: u.email, status: 'failed' };
    }
  }));

  return {
    totalUsers: users.length,
    sent: perUser.filter(p => p.status === 'sent').length,
    failed: perUser.filter(p => p.status === 'failed').length,
    skipped: perUser.filter(p => p.status === 'skipped').length,
    perUser,
  };
}

export async function sendEmailToUser(userId: string, payload: EmailPayload): Promise<{ sent: boolean; email: string }> {
  const user = await User.findById(userId, 'name email').lean();
  if (!user) return { sent: false, email: '' };
  if (!env.BREVO_API_KEY) return { sent: false, email: user.email };
  await sendSingle(user.email, payload.subject, payload.body);
  return { sent: true, email: user.email };
}
