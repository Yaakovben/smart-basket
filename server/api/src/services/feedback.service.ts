import { Feedback } from '../models';

/** יצירת משוב משתמש - נקרא פעם אחת לכל משתמש (הפופאפ בקליינט חד-פעמי). */
export async function submitFeedback(userId: string, rating: number, message?: string) {
  return Feedback.create({ userId, rating, message: message?.trim() || undefined });
}

/** רשימת המשובים החדשים ביותר, לפאנל האדמין. */
export async function listFeedback(limit = 200) {
  return Feedback.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'name email');
}
