import { pushApi } from '../../services/api/push.api';
import { detectAppPlatform, isNativeShell } from '../helpers/appPlatform';

// ===== התראות באפליקציה מהחנות =====
// באפליקציה מהחנות אין Web Push (אין Service Worker של הדפדפן), ולכן
// ההתראות עוברות דרך מערכת ההתראות של המכשיר: FCM באנדרואיד ו-APNs ב-iOS.
// המכשיר מקבל טוקן, השרת שומר אותו ושולח אליו. הפלאגין נטען רק באפליקציה,
// כדי שלא ייכנס לחבילה של האתר.

const TOKEN_KEY = 'sb_native_push_token';
const REGISTRATION_TIMEOUT_MS = 15000;
// ערוץ ההתראות באנדרואיד (חייב להתאים ל-ANDROID_CHANNEL_ID בשרת)
const ANDROID_CHANNEL_ID = 'default';

const loadPlugin = async () => (await import('@capacitor/push-notifications')).PushNotifications;

const readToken = (): string | null => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const writeToken = (t: string | null) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* לא קריטי */ }
};

const platform = (): 'ios' | 'android' => (detectAppPlatform() === 'ios' ? 'ios' : 'android');

export const isNativePushAvailable = (): boolean => isNativeShell();

/** מצב ההרשאה במונחים של הדפדפן, כדי שהממשק הקיים יעבוד בלי שינוי. */
export async function getNativePermission(): Promise<NotificationPermission> {
  const PushNotifications = await loadPlugin();
  const { receive } = await PushNotifications.checkPermissions();
  return receive === 'granted' ? 'granted' : receive === 'denied' ? 'denied' : 'default';
}

/** האם ההתראות פעילות במכשיר הזה: יש הרשאה ויש טוקן שנשמר בשרת. */
export async function isNativePushEnabled(): Promise<boolean> {
  return !!readToken() && (await getNativePermission()) === 'granted';
}

// בקשת טוקן מהמכשיר. הטוקן מגיע באירוע נפרד, אז מחכים לו עם תקרת זמן.
async function obtainToken(): Promise<string> {
  const PushNotifications = await loadPlugin();
  return new Promise<string>((resolve, reject) => {
    let done = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      handles.forEach(h => { void h.remove(); });
      fn();
    };
    // הרישום של מאזין מסתיים אחרי שהוא כבר פעיל, ולכן finish יכול לרוץ לפני
    // שהגיע ה-handle. מאזין שמגיע אחרי הסיום מוסר מיד, אחרת הוא נשאר לתמיד.
    const keep = (h: { remove: () => Promise<void> }) => { if (done) void h.remove(); else handles.push(h); };
    const timer = setTimeout(() => finish(() => reject(new Error('REGISTRATION_TIMEOUT'))), REGISTRATION_TIMEOUT_MS);
    void PushNotifications.addListener('registration', (t) => finish(() => resolve(t.value))).then(keep);
    void PushNotifications.addListener('registrationError', (e) => finish(() => reject(new Error(e.error)))).then(keep);
    void PushNotifications.register().catch((err) => finish(() => reject(err)));
  });
}

export type EnableResult = 'enabled' | 'denied' | 'failed';

/** הפעלת התראות: הרשאה, טוקן מהמכשיר, ושמירה בשרת. */
export async function enableNativePush(): Promise<EnableResult> {
  const PushNotifications = await loadPlugin();
  let { receive } = await PushNotifications.checkPermissions();
  if (receive !== 'granted') ({ receive } = await PushNotifications.requestPermissions());
  if (receive !== 'granted') return 'denied';
  try {
    const token = await obtainToken();
    await pushApi.registerNativeDevice(token, platform());
    writeToken(token);
    return 'enabled';
  } catch {
    return 'failed';
  }
}

/** כיבוי התראות במכשיר הזה (גם ביציאה מהחשבון). */
export async function disableNativePush(): Promise<void> {
  const token = readToken();
  writeToken(null);
  if (token) await pushApi.unregisterNativeDevice(token).catch(() => { /* השרת ימחק טוקן מת לבד */ });
  try { await (await loadPlugin()).unregister(); } catch { /* לא קריטי */ }
}

/**
 * בכל פתיחה של משתמש מחובר: אם ההתראות פעילות, מרעננים את הטוקן מול השרת.
 * המכשיר יכול להחליף טוקן (עדכון מערכת, שחזור גיבוי), וטוקן ישן כבר לא מקבל.
 */
export async function resyncNativePush(): Promise<void> {
  if (!isNativePushAvailable() || !readToken()) return;
  if ((await getNativePermission()) !== 'granted') return;
  try {
    const token = await obtainToken();
    if (token !== readToken()) {
      const old = readToken();
      if (old) await pushApi.unregisterNativeDevice(old).catch(() => {});
    }
    await pushApi.registerNativeDevice(token, platform());
    writeToken(token);
  } catch { /* ננסה בפתיחה הבאה */ }
}

let handlersInstalled = false;

/**
 * פעם אחת בעליית האפליקציה: ערוץ ההתראות של אנדרואיד, והצגת התראה שהגיעה
 * כשהאפליקציה פתוחה. לחיצה על התראה פותחת את המסך שלה (url מהשרת).
 */
export async function installNativePushHandlers(openUrl: (url: string) => void): Promise<void> {
  if (!isNativePushAvailable() || handlersInstalled) return;
  handlersInstalled = true;
  const PushNotifications = await loadPlugin();
  if (platform() === 'android') {
    await PushNotifications.createChannel({
      id: ANDROID_CHANNEL_ID,
      name: 'Smart Basket',
      description: 'עדכונים ברשימות, בקבוצות ובמנוי',
      importance: 4,
      visibility: 1,
      vibration: true,
    }).catch(() => { /* ערוץ כבר קיים */ });
  }
  await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const url = (action.notification.data as { url?: unknown } | undefined)?.url;
    // רק נתיב פנימי באפליקציה, לא כתובת חיצונית
    if (typeof url === 'string' && url.startsWith('/')) openUrl(url);
  });
}
