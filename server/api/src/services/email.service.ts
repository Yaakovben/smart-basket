import MailComposer from 'nodemailer/lib/mail-composer';
import { User } from '../models';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

// שליחת מייל דרך Gmail API על HTTPS (לא SMTP).
//
// למה לא SMTP: Render (וספקי אירוח רבים) חוסמים/מגבילים חיבורים יוצאים
// לפורטי SMTP (25/465/587). ה-repo הזה כבר עבר את הלולאה - nodemailer/SMTP
// -> Resend -> Brevo -> חזרה. Gmail API עובד על פורט 443 שאף אחד לא חוסם,
// ובכל זאת שולח *מהחשבון האמיתי* של Google - אז SPF/DKIM/DMARC עוברים
// והמייל מגיע ל-Inbox, בלי דומיין משלנו ובלי תשלום.
//
// הגדרה (חד-פעמי, ראו EMAIL_SETUP למטה):
//   1. פרויקט ב-Google Cloud + הפעלת "Gmail API".
//   2. OAuth consent screen (External, מצב Testing) + הוספת GMAIL_USER
//      כ-test user.
//   3. OAuth client (Web/Desktop) -> GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET.
//   4. הרצה חד-פעמית של תהליך ה-consent עם scope
//      https://www.googleapis.com/auth/gmail.send -> מקבלים GMAIL_REFRESH_TOKEN.
//   5. env בשרת: GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN.
//
// מגבלת שליחה לחשבון Gmail רגיל: ~500 נמענים ליום (כמו SMTP).

const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FROM_NAME = 'Smart Basket';

// תקרת בטיחות לשליחה אחת. גם מגן על מכסת Gmail היומית, וגם שומר את משך
// בקשת ה-HTTP מתחת ל-timeout של Render (100ש') - בקצב+concurrency למטה
// 300 נמענים לוקחים ~40 שניות.
const MAX_RECIPIENTS_PER_RUN = 300;

// כמה מיילים לשלוח במקביל. Gmail API: 250 quota units/user/sec, שליחה = 100,
// אז ~2.5 בשנייה. 4 במקביל עם round-trip של ~350ms ≈ בול בטווח.
const SEND_CONCURRENCY = 4;

export function isEmailEnabled(): boolean {
  return !!(env.GMAIL_USER && env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN);
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

// ===== OAuth2 access token (נשמר במטמון עד סמוך לתפוגה) =====
let cachedToken: string | null = null;
let cachedTokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedTokenExpiry - 60_000) return cachedToken;

  let res: Response;
  try {
    res = await fetch(OAUTH_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID!,
        client_secret: env.GMAIL_CLIENT_SECRET!,
        refresh_token: env.GMAIL_REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    throw new Error(`לא ניתן להתחבר ל-Google OAuth: ${(err as Error).message}`);
  }

  const data = await res.json().catch(() => ({})) as { access_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) {
    const reason = data.error_description || data.error || `HTTP ${res.status}`;
    logger.error('Gmail OAuth token refresh failed: %s', reason);
    throw new Error(`רענון טוקן Gmail נכשל (${reason}). בדוק GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN.`);
  }

  cachedToken = data.access_token;
  cachedTokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedToken;
}

function renderHtml(body: string): string {
  const safeBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  return `
<div dir="rtl" style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;max-width:520px;margin:0 auto;padding:24px;">
  <div style="white-space:pre-wrap;margin-bottom:32px;">${safeBody}</div>
  <div style="text-align:center;">
    <a href="https://prod-smart-basket.vercel.app/" style="display:inline-block;background:linear-gradient(135deg,#0F766E,#14B8A6);color:white;text-decoration:none;font-weight:700;font-size:15px;padding:12px 28px;border-radius:12px;">
      פתח את Smart Basket
    </a>
  </div>
</div>`;
}

// בונה הודעת RFC822 מלאה (nodemailer מטפל ב-MIME + קידוד כותרות עברית)
// ומחזיר אותה מקודדת base64url כפי שה-Gmail API דורש בשדה raw.
async function buildRawMessage(to: string, subject: string, body: string): Promise<string> {
  const from = env.GMAIL_USER!;
  const composer = new MailComposer({
    from: { name: FROM_NAME, address: from },
    to,
    subject,
    text: body,
    html: renderHtml(body),
    list: {
      unsubscribe: { url: `mailto:${from}?subject=Unsubscribe`, comment: 'Unsubscribe' },
    },
    headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  const buf = await composer.compile().build();
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function sendSingle(to: string, subject: string, body: string): Promise<void> {
  const raw = await buildRawMessage(to, subject, body);
  const token = await getAccessToken();

  const res = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    // 401 = הטוקן התיישן; מנקים מטמון כדי שהניסיון הבא ירענן
    if (res.status === 401) cachedToken = null;
    throw new Error(`Gmail API ${res.status}: ${errText.slice(0, 300)}`);
  }
}

// שולח למערך נמענים בקבוצות מקבילות קטנות, מחזיר סטטוס לכל אחד.
async function sendBatch(
  targets: { _id: { toString(): string }; name: string; email: string }[],
  payload: EmailPayload,
): Promise<EmailUserStatus[]> {
  const out: EmailUserStatus[] = [];
  for (let i = 0; i < targets.length; i += SEND_CONCURRENCY) {
    const slice = targets.slice(i, i + SEND_CONCURRENCY);
    const settled = await Promise.allSettled(
      slice.map(u => sendSingle(u.email, payload.subject, payload.body)),
    );
    settled.forEach((r, idx) => {
      const u = slice[idx];
      if (r.status === 'fulfilled') {
        out.push({ userId: u._id.toString(), name: u.name, email: u.email, status: 'sent' });
      } else {
        logger.warn('Gmail send failed to %s: %s', u.email, (r.reason as Error)?.message);
        out.push({ userId: u._id.toString(), name: u.name, email: u.email, status: 'failed' });
      }
    });
  }
  return out;
}

export async function broadcastEmail(payload: EmailPayload, onlyWithoutPush = false): Promise<EmailBroadcastResult> {
  if (!isEmailEnabled()) return { totalUsers: 0, sent: 0, failed: 0, skipped: 0, perUser: [] };

  // fail-fast: אם ה-OAuth שבור, נעצור עכשיו עם סיבה ברורה במקום לנסות
  // לשלוח לכל הרשימה ולקבל N כשלונות זהים.
  await getAccessToken();

  const users = await User.find({}, 'name email').lean();

  let userIdsWithPush = new Set<string>();
  if (onlyWithoutPush) {
    const subs = await PushSubscriptionDAL.find({});
    userIdsWithPush = new Set(subs.map(s => s.userId.toString()));
  }

  const targets = users.filter(u => !(onlyWithoutPush && userIdsWithPush.has(u._id.toString())));
  if (targets.length > MAX_RECIPIENTS_PER_RUN) {
    throw new Error(
      `${targets.length} נמענים - מעל מגבלת ${MAX_RECIPIENTS_PER_RUN} לשליחה אחת. שלח בכמה סבבים או צמצם עם "ללא push".`,
    );
  }

  const skipped: EmailUserStatus[] = users
    .filter(u => onlyWithoutPush && userIdsWithPush.has(u._id.toString()))
    .map(u => ({ userId: u._id.toString(), name: u.name, email: u.email, status: 'skipped' as const }));

  const results = await sendBatch(targets, payload);
  const perUser = [...results, ...skipped];

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
  if (!isEmailEnabled()) return { sent: false, email: user.email };
  await sendSingle(user.email, payload.subject, payload.body);
  return { sent: true, email: user.email };
}
