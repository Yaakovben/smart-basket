import nodemailer from 'nodemailer';
import { User } from '../models';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

const gmailUser = () => env.GMAIL_USER || env.ADMIN_EMAIL;

function createTransporter() {
  if (!env.GMAIL_APP_PASSWORD) return null;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    family: 4, // כופה IPv4 — Render חוסם חיבורי IPv6
    auth: { user: gmailUser(), pass: env.GMAIL_APP_PASSWORD },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  } as nodemailer.TransportOptions);
}

export function isEmailEnabled(): boolean {
  return !!env.GMAIL_APP_PASSWORD;
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

async function sendSingle(transporter: nodemailer.Transporter, to: string, subject: string, body: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"Smart Basket" <${gmailUser()}>`,
      to,
      subject,
      text: body,
      html: `<div dir="rtl" style="font-family:sans-serif;font-size:15px;line-height:1.6;white-space:pre-wrap;">${body.replace(/\n/g, '<br/>')}</div>`,
    });
    return true;
  } catch (err) {
    logger.warn('Email send failed to %s: %s', to, (err as Error).message);
    throw err;
  }
}

/** שליחת מייל לכל המשתמשים. אם onlyWithoutPush=true — רק למי שאין לו push. */
export async function broadcastEmail(payload: EmailPayload, onlyWithoutPush = false): Promise<EmailBroadcastResult> {
  const transporter = createTransporter();
  if (!transporter) {
    return { totalUsers: 0, sent: 0, failed: 0, skipped: 0, perUser: [] };
  }

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
    const ok = await sendSingle(transporter, u.email, payload.subject, payload.body);
    return { userId, name: u.name, email: u.email, status: ok ? 'sent' : 'failed' };
  }));

  return {
    totalUsers: users.length,
    sent: perUser.filter(p => p.status === 'sent').length,
    failed: perUser.filter(p => p.status === 'failed').length,
    skipped: perUser.filter(p => p.status === 'skipped').length,
    perUser,
  };
}

/** שליחת מייל למשתמש ספציפי. */
export async function sendEmailToUser(userId: string, payload: EmailPayload): Promise<{ sent: boolean; email: string }> {
  const transporter = createTransporter();
  const user = await User.findById(userId, 'name email').lean();
  if (!user) return { sent: false, email: '' };
  if (!transporter) return { sent: false, email: user.email };
  const ok = await sendSingle(transporter, user.email, payload.subject, payload.body);
  return { sent: ok, email: user.email };
}
