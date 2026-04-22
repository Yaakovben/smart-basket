/**
 * services/index.ts
 *
 * Barrel של ה-services. במהלך הרפקטור מ-class ל-functions,
 * השירותים שכבר הומרו מיוצאים כ-namespace (export * as X) כדי
 * שהקוד הישן שמשתמש ב-`X.method()` ימשיך לעבוד.
 *
 * ההעדפה החדשה: import ישיר של הפונקציה.
 */

// הומרו לפונקציות - נשארים כ-namespace למעברים:
export * as TokenService from './token.service';
export * as UserService from './user.service';
// ProductService הוסר לחלוטין - שימוש בנתיב ישיר

// עדיין class-based - בהמשך יומרו:
export { AuthService } from './auth.service';
export { ListService } from './list.service';
export { ListMembershipService } from './list-membership.service';
export { NotificationService } from './notification.service';
export { PushService, type PushPayload } from './push.service';
