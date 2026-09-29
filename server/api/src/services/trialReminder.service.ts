import cron from 'node-cron';
import { logger } from '../config';
import { User } from '../models';
import { sendToUsers } from './push.service';
import { daysLeft, reminderTitle } from './trialReminderText';

// ===== תזכורות לסיום תקופת ה-Pro במתנה =====
// משתמש חדש מקבל חודשי Pro במתנה (TRIAL_MONTHS). בלי תזכורת הוא היה מגלה
// ביום אחד שיש לו פתאום מגבלות. המקובל: הודעה כמה ימים לפני הסוף, והודעה
// ביום הסיום עם שתי האפשרויות (להמשיך בחינם או לשדרג).
// כל משתמש מקבל כל הודעה פעם אחת: שדה תאריך מסמן שכבר נשלחה.

const PUSH_ICON = '/icon-192x192.png';
const DAY_MS = 24 * 60 * 60 * 1000;
export const REMIND_DAYS_BEFORE = 3;
// הודעת "הסתיים" רק למי שהמתנה שלו הסתיימה לאחרונה, לא לחשבונות ישנים
const ENDED_LOOKBACK_DAYS = 7;
// כל יום ב-10:00 שעון ישראל, שעה סבירה להודעה
const CRON_EXPRESSION = '0 10 * * *';
const TIMEZONE = 'Asia/Jerusalem';

const REMINDER_BODY = 'אחרי זה ממשיכים בחינם עם מגבלות יומיות, או משדרגים ושומרים על הכל פתוח.';
const ENDED_TITLE = 'תקופת ה-Pro במתנה הסתיימה';
const ENDED_BODY = 'אפשר להמשיך להשתמש בחינם עם מגבלות יומיות, ולשדרג בכל רגע.';

export interface TrialReminderResult { reminded: number; ended: number }

export async function runTrialReminders(now = new Date()): Promise<TrialReminderResult> {
  // 1. מתקרבים לסוף: עוד מעט ימים, ועוד לא קיבלו תזכורת
  const soonFilter = {
    plan: 'pro',
    planSource: 'trial',
    planExpiresAt: { $gt: now, $lte: new Date(now.getTime() + REMIND_DAYS_BEFORE * DAY_MS) },
    trialReminderSentAt: { $exists: false },
  };
  const soon = await User.find(soonFilter).select('_id planExpiresAt').lean();
  if (soon.length > 0) {
    await User.updateMany({ _id: { $in: soon.map(u => u._id) } }, { $set: { trialReminderSentAt: now } });
    // קיבוץ לפי מספר הימים, כדי שכל אחד יקבל את הניסוח הנכון
    const byDays = new Map<number, string[]>();
    for (const u of soon) {
      const d = daysLeft(u.planExpiresAt as Date, now);
      byDays.set(d, [...(byDays.get(d) ?? []), String(u._id)]);
    }
    for (const [days, ids] of byDays) {
      await sendToUsers(ids, {
        title: reminderTitle(days),
        body: REMINDER_BODY,
        icon: PUSH_ICON,
        badge: PUSH_ICON,
        data: { url: '/subscription', type: 'subscription' },
      }).catch(e => logger.warn('[trial-reminder] reminder push failed: %s', (e as Error).message));
    }
  }

  // 2. הסתיים: עדיין מסומן כ-Pro במתנה אבל התאריך עבר (לא קנו בחנות בינתיים)
  const endedFilter = {
    plan: 'pro',
    planSource: 'trial',
    planExpiresAt: { $lte: now, $gt: new Date(now.getTime() - ENDED_LOOKBACK_DAYS * DAY_MS) },
    trialEndNotifiedAt: { $exists: false },
  };
  const ended = await User.find(endedFilter).select('_id').lean();
  if (ended.length > 0) {
    const ids = ended.map(u => String(u._id));
    await User.updateMany({ _id: { $in: ended.map(u => u._id) } }, { $set: { trialEndNotifiedAt: now } });
    await sendToUsers(ids, {
      title: ENDED_TITLE,
      body: ENDED_BODY,
      icon: PUSH_ICON,
      badge: PUSH_ICON,
      data: { url: '/subscription', type: 'subscription' },
    }).catch(e => logger.warn('[trial-reminder] ended push failed: %s', (e as Error).message));
  }

  return { reminded: soon.length, ended: ended.length };
}

let scheduled = false;

export function startTrialReminderJob(): void {
  if (scheduled) return;
  cron.schedule(
    CRON_EXPRESSION,
    async () => {
      try {
        const { reminded, ended } = await runTrialReminders();
        logger.info(`[trial-reminder] reminded=${reminded} ended=${ended}`);
      } catch (err) {
        logger.error('[trial-reminder] failed: %s', (err as Error).message);
      }
    },
    { timezone: TIMEZONE },
  );
  scheduled = true;
  logger.info(`[trial-reminder] Scheduled: ${CRON_EXPRESSION} (${TIMEZONE})`);
}
