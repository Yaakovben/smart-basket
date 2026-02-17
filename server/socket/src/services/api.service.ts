import { env, logger } from '../config';

type NotificationType =
  | 'join'
  | 'leave'
  | 'removed'
  | 'product_add'
  | 'product_update'
  | 'product_delete'
  | 'product_purchase'
  | 'product_unpurchase'
  | 'list_update';

interface BroadcastNotificationData {
  listId: string;
  type: NotificationType;
  actorId: string;
  productId?: string;
  productName?: string;
}

export type UserRole = 'owner' | 'admin' | 'member' | null;

/**
 * שירות לקריאות API מול שרת ה-API הראשי.
 * משמש בעיקר לשמירת התראות ובדיקות הרשאה.
 */
export class ApiService {
  private static baseUrl = env.API_URL;

  /** אימות שמשתמש חבר ברשימה. מחזיר true אם יש לו גישה. */
  static async verifyMembership(
    listId: string,
    accessToken: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/lists/${listId}`, {
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
  static async checkRole(
    listId: string,
    userId: string,
    accessToken: string
  ): Promise<UserRole> {
    try {
      const response = await fetch(`${this.baseUrl}/lists/${listId}`, {
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
  static async broadcastNotification(
    data: BroadcastNotificationData,
    accessToken: string
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/notifications/broadcast`, {
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
}
