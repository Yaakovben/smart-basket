/**
 * controllers/index.ts
 *
 * Barrel ישן לקוד שעדיין בסגנון class. מייצוא ה-Controllers
 * כ-classes זמני עד שכל קובץ יומר לפונקציות נקודתיות.
 *
 * תבנית חדשה: import { fn } from '../controllers/x.controller';
 * בלי נקודה, בלי class. ה-barrel הזה יוסר לחלוטין כשהרפקטור יושלם.
 */

export { AuthController } from './auth.controller';
export { UserController } from './user.controller';
export { ListController } from './list.controller';
export { AdminController } from './admin.controller';
export { NotificationController } from './notification.controller';
