import nodemailer, { type Transporter } from 'nodemailer';
import { User } from '../models';
import { PushSubscriptionDAL } from '../dal';
import { env } from '../config/environment';
import { logger } from '../config';

// שליחת מייל דרך Gmail SMTP ישירות (nodemailer), לא דרך ספק צד-שלישי.
//
// למה: קודם שלחנו דרך Brevo עם "From: ...@gmail.com" - כתובת בדומיין
// שאנחנו לא הבעלים שלו. SPF/DKIM/DMARC של gmail.com לא יכולים לאמת שרת
// שאינו של גוגל, אז Gmail/Outlook סימנו את המיילים כלא-מאומתים והעיפו
// אותם לספאם (ומאז 2024 גוגל דורש אימות מפורש משולחים בכמות).
//
// עם Gmail SMTP המייל נשלח *על ידי* גוגל, עבור תיבת Gmail אמיתית:
//   - SPF עובר   (השרת השולח הוא של google.com)
//   - DKIM עובר  (גוגל חותם עם המפתח של gmail.com)
//   - DMARC עובר (יש alignment מלא)
// => מגיע ל-Inbox, בלי דומיין משלנו ובלי תשלום.
//
// דרישות הגדרה (חד-פעמי):
//   1. חשבון הגוגל של GMAIL_USER חייב אימות דו-שלבי פעיל.
//   2. ליצור "סיסמת אפליקציה": Google Account → Security → App passwords.
//      זו הסיסמה שנכנסת ל-GMAIL_APP_PASSWORD (16 תווים, בלי רווחים).
//   3. אין להשתמש בסיסמת החשבון הרגילה - היא לא תעבוד ל-SMTP.
//
// מגבלות Gmail רגיל: ~500 נמענים ליום (Workspace: ~2,000). מספיק לבסיס
// המשתמשים הנוכחי; אם נגדל - עוברים ל-Workspace או לספק ייעודי עם דומיין.

const FROM_NAME = 'Smart Basket';

// מגבלת בטיחות - לא שולחים יותר מזה בקריאה אחת, כדי לא לשרוף את מכסת
// היום של Gmail בטעות. אם צריך יותר - שולחים בכמה סבבים.
const MAX_RECIPIENTS_PER_RUN = 450;

export function isEmailEnabled(): boolean {
  return !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD);
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

// טרנספורטר יחיד ברמת המודול, עם pool - נדרש כדי לא לפתוח חיבור SMTP
// חדש לכל מייל (Gmail חוסם ריבוי חיבורים) ולקצב את השליחה.
let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      // host/port מפורשים (לא service:'gmail') כדי לשלוט ב-IPv4 ובטיימאאוט.
      // port 587 + STARTTLS: פורט ה-submission, לרוב פתוח יותר מ-465.
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      // כופה IPv4 - שרתי אירוח מסוימים (Render וכו') חוסמים IPv6 יוצא ל-SMTP.
      family: 4,
      auth: {
        user: env.GMAIL_USER,
        pass: env.GMAIL_APP_PASSWORD,
      },
      // טיימאאוטים קצרים - שכשל חיבור (SMTP חסום) ייכשל תוך ~15ש' במקום
      // להיתקע 2 דקות על ברירת המחדל של nodemailer.
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      // קצב: עד 8 מיילים לכל 1000ms - הרבה מתחת למגבלות Gmail, מונע
      // חסימה זמנית על "שליחה מהירה מדי".
      rateDelta: 1000,
      rateLimit: 8,
    } as nodemailer.TransportOptions);
  }
  return transporter;
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

async function sendSingle(to: string, subject: string, body: string): Promise<void> {
  const from = env.GMAIL_USER!;
  await getTransporter().sendMail({
    from: { name: FROM_NAME, address: from },
    to,
    subject,
    text: body,
    html: renderHtml(body),
    // List-Unsubscribe (RFC 8058) - נדרש מגוגל לשולחים בכמות, ומשפר אמון
    // של פילטרים. הכתובת היא תיבת ה-Gmail עצמה (הסרה ידנית - אין לנו רשימת
    // תפוצה מנוהלת נפרדת).
    list: {
      unsubscribe: {
        url: `mailto:${from}?subject=Unsubscribe`,
        comment: 'Unsubscribe',
      },
    },
    headers: {
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

export async function broadcastEmail(payload: EmailPayload, onlyWithoutPush = false): Promise<EmailBroadcastResult> {
  if (!isEmailEnabled()) return { totalUsers: 0, sent: 0, failed: 0, skipped: 0, perUser: [] };

  const users = await User.find({}, 'name email').lean();

  let userIdsWithPush = new Set<string>();
  if (onlyWithoutPush) {
    const subs = await PushSubscriptionDAL.find({});
    userIdsWithPush = new Set(subs.map(s => s.userId.toString()));
  }

  const targets = users.filter(u => !(onlyWithoutPush && userIdsWithPush.has(u._id.toString())));
  if (targets.length > MAX_RECIPIENTS_PER_RUN) {
    throw new Error(
      `${targets.length} נמענים - מעל מגבלת ${MAX_RECIPIENTS_PER_RUN} לשליחה אחת (מכסת Gmail היומית). שלח בכמה סבבים.`,
    );
  }

  const skipped: EmailUserStatus[] = users
    .filter(u => onlyWithoutPush && userIdsWithPush.has(u._id.toString()))
    .map(u => ({ userId: u._id.toString(), name: u.name, email: u.email, status: 'skipped' as const }));

  // שליחה סדרתית - ה-pool מקצב ממילא, וסדרתי נותן שגיאות ברורות (למשל
  // אימות שגוי נכשל על הראשון ולא מייצר 400 כשלים זהים).
  const results: EmailUserStatus[] = [];
  for (const u of targets) {
    const userId = u._id.toString();
    try {
      await sendSingle(u.email, payload.subject, payload.body);
      results.push({ userId, name: u.name, email: u.email, status: 'sent' });
    } catch (err) {
      logger.warn('Gmail send failed to %s: %s', u.email, (err as Error).message);
      results.push({ userId, name: u.name, email: u.email, status: 'failed' });
    }
  }

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
