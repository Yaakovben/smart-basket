import { Resend } from 'resend';
import { User } from '../models';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

const resend = () => env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export function isEmailEnabled(): boolean {
  return !!env.RESEND_API_KEY;
}

const fromAddress = () => `Smart Basket <onboarding@resend.dev>`;

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

async function sendSingle(client: Resend, to: string, subject: string, body: string): Promise<void> {
  const { error } = await client.emails.send({
    from: fromAddress(),
    to,
    subject,
    text: body,
    html: `
<div dir="rtl" style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px;margin:0 auto;padding:24px;">
  <div style="white-space:pre-wrap;margin-bottom:32px;">${body.replace(/\n/g, '<br/>')}</div>
  <div style="text-align:center;">
    <a href="https://prod-smart-basket.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#0F766E,#14B8A6);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:12px;">
      פתח את Smart Basket
    </a>
  </div>
</div>`,
  });
  if (error) {
    logger.warn('Resend failed to %s: %s', to, error.message);
    throw new Error(error.message);
  }
}

export async function broadcastEmail(payload: EmailPayload, onlyWithoutPush = false): Promise<EmailBroadcastResult> {
  const client = resend();
  if (!client) return { totalUsers: 0, sent: 0, failed: 0, skipped: 0, perUser: [] };

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
      await sendSingle(client, u.email, payload.subject, payload.body);
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
  const client = resend();
  const user = await User.findById(userId, 'name email').lean();
  if (!user) return { sent: false, email: '' };
  if (!client) return { sent: false, email: user.email };
  await sendSingle(client, user.email, payload.subject, payload.body);
  return { sent: true, email: user.email };
}
