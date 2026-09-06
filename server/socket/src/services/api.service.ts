import { env, logger } from '../config';

type NotificationType =
  | 'join'
  | 'leave'
  | 'removed'
  | 'product_add'
  | 'product_update'
  | 'product_photo_add'
  | 'product_photo_remove'
  | 'product_delete'
  | 'product_purchase'
  | 'product_unpurchase'
  | 'list_update'
  | 'list_clear';

interface BroadcastNotificationData {
  listId: string;
  type: NotificationType;
  actorId: string;
  productId?: string;
  productName?: string;
}

export type UserRole = 'owner' | 'admin' | 'member' | null;

const baseUrl = env.API_URL;

/** אימות שמשתמש חבר ברשימה. מחזיר true אם יש לו גישה. */
async function verifyMembership(
  listId: string,
  accessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/lists/${listId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch (error) {
    logger.error('verifyMembership failed:', error);
    return false;
  }
}

/** בדיקת תפקיד המשתמש ברשימה (owner/admin/member). מחזיר null אם אין גישה. */
async function checkRole(
  listId: string,
  userId: string,
  accessToken: string
): Promise<UserRole> {
  try {
    const response = await fetch(`${baseUrl}/lists/${listId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { data?: { owner?: { id?: string } | string; members?: Array<{ user?: { id?: string } | string; isAdmin?: boolean }> } };
    const list = body.data;
    if (!list) return null;

    // בדיקת בעלים (אובייקט populated או מחרוזת)
    const owner = list.owner;
    const ownerId = typeof owner === 'object' ? owner?.id : owner;
    if (ownerId?.toString() === userId) return 'owner';

    // בדיקת חברים
    const member = list.members?.find((m) => {
      const memberUser = m.user;
      const memberId = typeof memberUser === 'object' ? memberUser?.id : memberUser;
      return memberId?.toString() === userId;
    });
    if (member?.isAdmin) return 'admin';
    if (member) return 'member';

    return null;
  } catch (error) {
    logger.error('checkRole failed:', error);
    return null;
  }
}

/** יצירת התראות לכל חברי הרשימה (חוץ מהפועל). משמש לאירועי מוצרים. */
async function broadcastNotification(
  data: BroadcastNotificationData,
  accessToken: string
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/notifications/broadcast`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('Failed to broadcast notification:', error);
    }
  } catch (error) {
    logger.error('Error broadcasting notification:', error);
    // לא לזרוק - כשל בשמירת התראה לא צריך לשבור אירועים בזמן אמת
  }
}

export type VerifyUserResult =
  | { ok: true; user: { id: string; name: string; email: string; isAdmin: boolean } }
  // ה-API ענה במפורש שהטוקן לא תקף/בוטל - יש לדחות את החיבור
  | { ok: false; reason: 'unauthorized' }
  // לא הצלחנו להשלים את הבדיקה בכלל (timeout/רשת/5xx, למשל Render cold
  // start) - לא ידוע אם הטוקן תקף או לא, לכן לא נכשיל את המשתמש על בסיס
  // תקלת תשתית חולפת.
  | { ok: false; reason: 'unreachable' };

/**
 * אימות טוקן + שליפת פרטי משתמש עדכניים מה-API (לא סומכים על claims של
 * ה-JWT בלבד). סוגר שני פערים: (1) שם/isAdmin שהשתנו אחרי שהטוקן הונפק,
 * (2) טוקן שבוטל ע"י שינוי סיסמה/מחיקת חשבון - authenticate middleware
 * של ה-API בודק tokenVersion ומחזיר 401 אם לא תואם.
 *
 * מבחין בין "השרת אמר בפירוש לא מורשה" (unauthorized - דוחים) לבין
 * "לא הצלחנו להגיע לשרת בכלל" (unreachable - לא דוחים, נופלים חזרה
 * לאימות JWT מקומי בקריאה - ראו auth.middleware.ts). בלי ההבחנה הזו,
 * תקלת רשת/cold-start חולפת הייתה מנתקת משתמשים לגיטימיים.
 */
async function verifyUser(accessToken: string): Promise<VerifyUserResult> {
  try {
    const response = await fetch(`${baseUrl}/users/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(10000),
    });
    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'unauthorized' };
    }
    if (!response.ok) {
      return { ok: false, reason: 'unreachable' };
    }

    const body = (await response.json()) as { data?: { id?: string; name?: string; email?: string; isAdmin?: boolean } };
    if (!body.data?.id) return { ok: false, reason: 'unreachable' };
    return {
      ok: true,
      user: {
        id: body.data.id,
        name: body.data.name || '',
        email: body.data.email || '',
        isAdmin: !!body.data.isAdmin,
      },
    };
  } catch (error) {
    logger.error('verifyUser failed:', error);
    return { ok: false, reason: 'unreachable' };
  }
}

/**
 * שירות לקריאות API מול שרת ה-API הראשי.
 * משמש בעיקר לשמירת התראות ובדיקות הרשאה.
 */
export const ApiService = {
  verifyMembership,
  checkRole,
  broadcastNotification,
  verifyUser,
};
