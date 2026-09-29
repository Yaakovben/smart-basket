// בניית הודעות להתראות נייטיב, בלי תלות בהגדרות או ברשת (נבדק בבדיקות יחידה).

export interface NativePushMessage {
  title: string;
  body: string;
  // נתיב בתוך האפליקציה שנפתח בלחיצה, למשל /list/abc
  url?: string;
  data?: Record<string, string | undefined>;
}

// צבע ואייקון ההתראה באנדרואיד. האייקון הוא drawable לבן-שקוף באפליקציה
// (res/drawable/ic_stat_notification.xml), והערוץ נוצר באפליקציה בעלייה.
export const ANDROID_CHANNEL_ID = 'default';
export const ANDROID_ICON = 'ic_stat_notification';
export const ANDROID_COLOR = '#14B8A6';

// FCM מקבל ב-data רק מחרוזות. undefined לא נשלח בכלל.
function stringData(msg: NativePushMessage): Record<string, string> {
  const out: Record<string, string> = {};
  if (msg.url) out.url = msg.url;
  for (const [k, v] of Object.entries(msg.data ?? {})) {
    if (v !== undefined && v !== null) out[k] = String(v);
  }
  return out;
}

/** גוף בקשה ל-FCM HTTP v1 (messages:send) עבור טוקן אחד. */
export function buildFcmMessage(token: string, msg: NativePushMessage) {
  return {
    message: {
      token,
      notification: { title: msg.title, body: msg.body },
      data: stringData(msg),
      android: {
        priority: 'HIGH',
        ttl: '3600s',
        notification: {
          channel_id: ANDROID_CHANNEL_ID,
          icon: ANDROID_ICON,
          color: ANDROID_COLOR,
          sound: 'default',
        },
      },
    },
  };
}

/** גוף ההודעה ל-APNs. הנתונים הנוספים לצד aps, כדי שהאפליקציה תקבל אותם בלחיצה. */
export function buildApnsPayload(msg: NativePushMessage) {
  return {
    aps: {
      alert: { title: msg.title, body: msg.body },
      sound: 'default',
    },
    ...stringData(msg),
  };
}

/**
 * סוד שנשמר במשתנה סביבה יכול להגיע בכמה צורות: כמו שהוא, בקידוד base64,
 * או עם "\n" מילולי במקום שורות חדשות (כך פאנלי אירוח שומרים מפתח PEM).
 */
export function decodeSecret(raw: string): string {
  const value = raw.trim();
  if (!value) return '';
  if (value.startsWith('{') || value.includes('-----BEGIN')) return value.replace(/\\n/g, '\n');
  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8').trim();
    if (decoded.startsWith('{') || decoded.includes('-----BEGIN')) return decoded.replace(/\\n/g, '\n');
  } catch { /* לא base64 */ }
  return value.replace(/\\n/g, '\n');
}

/** האם השגיאה מ-FCM אומרת שהטוקן כבר לא תקף (האפליקציה הוסרה או שהטוקן הוחלף). */
export function isDeadFcmToken(status: number, body: string): boolean {
  if (status === 404) return true;
  return /UNREGISTERED|registration-token-not-registered|Requested entity was not found/i.test(body)
    || (status === 400 && /INVALID_ARGUMENT/.test(body) && /token/i.test(body));
}

/** האם התגובה מ-APNs אומרת שהטוקן כבר לא תקף. */
export function isDeadApnsToken(status: number, reason: string | undefined): boolean {
  return status === 410 || reason === 'BadDeviceToken' || reason === 'Unregistered' || reason === 'DeviceTokenNotForTopic';
}
