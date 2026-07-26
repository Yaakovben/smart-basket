/**
 * inactivityReminder.job.ts
 *
 * תזכורת "שבת בפתח" - push חד-פעמי (לכל תקופת העדרות) למשתמשים שלא היו
 * פעילים 21+ יום. רץ כל יום חמישי ב-12:00 שעון ישראל.
 */

import cron from 'node-cron';
import { UserDAL, PushSubscriptionDAL } from '../dal';
import { sendToUsers } from '../services/push.service';
import { logger } from '../config';

const INACTIVITY_DAYS = 21;
const CRON_EXPRESSION = '0 12 * * 4'; // חמישי, 12:00
const TIMEZONE = 'Asia/Jerusalem';
const RLM = '‏'; // סימן RTL לתצוגה תקינה בעברית ב-push notifications
const PUSH_ICON = '/icon-192x192.png';

let scheduled = false;
let checkInProgress = false;

/**
 * בדיקה + שליחה בפועל. Idempotent: משתמש שכבר סומן (inactivityReminderSentAt)
 * לא ייתפס שוב עד שיחזור לפעילות (ראו UserDAL.clearInactivityReminderFlag) -
 * לכן בטוח להריץ את זה יותר מפעם אחת באותו שבוע (cron + boot catch-up).
 */
export async function runInactivityCheck(
  trigger: 'cron' | 'startup' | 'manual'
): Promise<{ notified: number }> {
  if (checkInProgress) {
    logger.warn(`[inactivity-reminder] ${trigger}: already in progress, skipping`);
    return { notified: 0 };
  }
  checkInProgress = true;
  try {
    const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);
    const inactiveIds = await UserDAL.findInactiveUnnotified(cutoff);
    if (inactiveIds.length === 0) {
      logger.info(`[inactivity-reminder] ${trigger}: no inactive candidates`);
      return { notified: 0 };
    }

    // רק מי שיש לו מנוי push בפועל מסומן כ"נשלח" - מי שאין לו נשאר מועמד
    // לבדיקה הבאה (עלות זניחה), במקום להיחסם לצמיתות בלי שקיבל בפועל כלום.
    const subscriptions = await PushSubscriptionDAL.findByUserIds(inactiveIds);
    const subscribedIds = [...new Set(subscriptions.map(sub => sub.userId.toString()))];
    if (subscribedIds.length === 0) {
      logger.info(`[inactivity-reminder] ${trigger}: ${inactiveIds.length} inactive but none subscribed to push`);
      return { notified: 0 };
    }

    await sendToUsers(subscribedIds, {
      title: `🛒 ${RLM}שבת כבר בפתח!`,
      body: `${RLM}לא ראינו אותך כבר זמן - זה הזמן להכין רשימת קניות לשבת`,
      icon: PUSH_ICON,
      badge: PUSH_ICON,
    });
    await UserDAL.markInactivityReminderSent(subscribedIds);

    logger.info(`[inactivity-reminder] ${trigger}: notified ${subscribedIds.length}/${inactiveIds.length} inactive users`);
    return { notified: subscribedIds.length };
  } catch (err) {
    logger.error(`[inactivity-reminder] ${trigger}: failed:`, err);
    return { notified: 0 };
  } finally {
    checkInProgress = false;
  }
}

// בודק אם "עכשיו" (בזמן ישראל) הוא יום חמישי אחרי השעה 12:00 - עוזר ל-boot
// catch-up לדעת אם כדאי להריץ מיד (למקרה שה-cron "פספס" את הרגע המדויק כי
// שרת Render Free נרדם, בדיוק כמו הבעיה המוכרת ב-priceSync.job.ts).
function isPastThursdayNoonInIsrael(): boolean {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find(p => p.type === 'weekday')?.value;
  const hourStr = parts.find(p => p.type === 'hour')?.value;
  // % 24 מגן מפני קוואירק ידוע של Intl: hour12:false לפעמים מחזיר "24" בחצות
  // במקום "0", מה שהיה גורם ל->=12 שגוי מיד אחרי חצות ביום חמישי.
  const hour = hourStr ? parseInt(hourStr, 10) % 24 : -1;
  return weekday === 'Thu' && hour >= 12;
}

export function startInactivityReminderJob(): void {
  if (scheduled) {
    logger.warn('[inactivity-reminder] Already scheduled, skipping');
    return;
  }

  if (!cron.validate(CRON_EXPRESSION)) {
    logger.error(`[inactivity-reminder] Invalid cron expression: ${CRON_EXPRESSION}`);
    return;
  }

  cron.schedule(CRON_EXPRESSION, () => { void runInactivityCheck('cron'); }, { timezone: TIMEZONE });
  scheduled = true;
  logger.info(`[inactivity-reminder] Scheduled: ${CRON_EXPRESSION} (${TIMEZONE}) — Thursdays at 12:00`);

  // Boot catch-up: אם השרת עלה מחדש (למשל אחרי שנרדם) ועכשיו כבר חמישי אחה"צ,
  // מריצים מיד - בטוח לעשות זאת גם אם ה-cron האמיתי כבר רץ היום (אידמפוטנטי).
  if (isPastThursdayNoonInIsrael()) {
    logger.info('[inactivity-reminder] Startup: past Thursday noon (Israel time), running catch-up check');
    void runInactivityCheck('startup');
  }
}
