/**
 * controllers/index.ts
 *
 * Barrel ישן לקוד שעדיין בסגנון class. מייצוא ה-Controllers
 * כ-classes זמני עד שכל קובץ יומר לפונקציות נקודתיות.
 *
 * תבנית חדשה: import { fn } from '../controllers/x.controller';
 * בלי נקודה, בלי class. ה-barrel הזה יוסר לחלוטין כשהרפקטור יושלם.
 */

export * as AuthController from './auth.controller';
export * as UserController from './user.controller';
export { ListController } from './list.controller';
export * as AdminController from './admin.controller';
export * as NotificationController from './notification.controller';
