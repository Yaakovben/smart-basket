import { Feedback } from '../models';
import { UserDAL } from '../dal';
import { logger } from '../config';
import { sendToUsers } from './push.service';
import { getAdminSettings } from './adminAlerts.service';

const PUSH_ICON = '/icon-192x192.png';

/** יצירת משוב משתמש - נקרא פעם אחת לכל משתמש (הפופאפ בקליינט חד-פעמי). */
export async function submitFeedback(userId: string, rating: number, message?: string) {
  const feedback = await Feedback.create({ userId, rating, message: message?.trim() || undefined });

  // פוש לאדמינים על משוב חדש, רק אם האדמין השאיר אותו פעיל בדף המנהל
  void (async () => {
    const settings = await getAdminSettings();
    if (!settings.pushOnFeedback) return;
    const [user, adminIds] = await Promise.all([UserDAL.findById(userId), UserDAL.findAdminIds()]);
    const text = feedback.message ? ` · ${feedback.message.slice(0, 80)}` : '';
    await sendToUsers(adminIds, {
      title: `💬 משוב חדש ${'⭐'.repeat(rating)}`,
      body: `${user?.name ?? 'משתמש'}${text}`,
      icon: PUSH_ICON,
      badge: PUSH_ICON,
      data: { url: '/admin/feedback', type: 'feedback' },
    });
  })().catch((e) => logger.warn('feedback admin push failed: %s', (e as Error).message));

  return feedback;
}

/** רשימת המשובים החדשים ביותר, לפאנל האדמין. */
export async function listFeedback(limit = 200) {
  return Feedback.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');
}
