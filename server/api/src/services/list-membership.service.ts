/**
 * list-membership.service.ts
 *
 * לוגיקת חברות בקבוצה: הצטרפות (עם/בלי סיסמה), עזיבה, הסרת חבר,
 * שינוי סטטוס אדמין של חבר.
 *
 * כל פעולה שמשנה חברות מייצרת התראות מתאימות לחברי הרשימה ברקע
 * (לא חוסמת את התגובה, כשלון פוש רק נרשם ללוג).
 */

import mongoose from 'mongoose';
import { ListDAL, UserDAL } from '../dal';
import { NotFoundError, ForbiddenError, ConflictError, AuthError, PlanLimitError } from '../errors';
import { PLAN_LIMITS } from '../constants';
import { logger } from '../config';
import {
  createNotification,
  createNotificationsForListMembers,
} from './notification.service';
import { transformList } from './list-transform.helper';
import { memberIdsOf, isListOwner } from './list-access.helper';
import { publishMemberKicked } from './redisPublisher.service';
import { invalidateInsightsCache } from './insights.service';
import type { JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';

/**
 * הצטרפות לקבוצה באמצעות inviteCode (+ סיסמה אם קיימת).
 * זורק NotFoundError אם אין קוד, ConflictError אם משתמש כבר חבר או בעלים,
 * AuthError אם הסיסמה שגויה.
 */
export async function joinGroup(
  userId: string,
  data: JoinGroupInput
): Promise<IListResponse> {
  const list = await ListDAL.findByInviteCode(data.inviteCode);
  if (!list) throw NotFoundError.inviteCode();

  if (isListOwner(list, userId)) throw ConflictError.isOwner();
  if (list.members.some(m => m.user.toString() === userId)) throw ConflictError.alreadyMember();

  if (list.password) {
    const isValidPassword = await list.comparePassword(data.password || '');
    if (!isValidPassword) throw AuthError.invalidGroupPassword();
  }

  const user = await UserDAL.findById(userId);
  if (!user) throw NotFoundError.user();

  // בדיקת מגבלת Freemium: בעלים חינמי מוגבל ל-3 חברים כולל עצמו
  const owner = await UserDAL.findById(list.owner.toString());
  if (owner && owner.plan !== 'pro') {
    const limit = PLAN_LIMITS.free.maxGroupMembers;
    const totalParticipants = 1 + list.members.length;
    if (totalParticipants >= limit) throw PlanLimitError.members(limit);
  }

  // הוספה אטומית ($ne מונעת כפילות מבקשות מקבילות)
  const updated = await ListDAL.updateOne(
    {
      _id: list._id,
      'members.user': { $ne: new mongoose.Types.ObjectId(userId) },
    },
    {
      $push: {
        members: {
          user: new mongoose.Types.ObjectId(userId),
          isAdmin: false,
          joinedAt: new Date(),
        },
      },
    }
  );
  if (!updated) {
    // ה-update האטומי לא תפס אף מסמך - או שהרשימה נמחקה בין ה-findByInviteCode
    // למעלה לבין כאן (race), או שהמשתמש כבר הצטרף בבקשה מקבילה. בודקים איזה
    // מהשניים קרה כדי להחזיר שגיאה נכונה במקום "כבר חבר" גורף.
    const stillExists = await ListDAL.findById(list._id.toString());
    if (!stillExists) throw NotFoundError.list();
    throw ConflictError.alreadyMember();
  }

  // התראה לחברי הקבוצה ברקע - preloadedList חוסך findById כפול על אותה רשימה
  createNotificationsForListMembers(updated._id.toString(), 'join', userId, { preloadedList: updated })
    .catch((err: unknown) => logger.warn('Failed to create join notifications:', err));

  // groupStats (מספר חברים, תורם מוביל) משתנה עבור כל חברי הרשימה, לא רק
  // המצטרף - מנקים cache לכולם.
  for (const id of memberIdsOf(updated)) invalidateInsightsCache(id);

  return transformList(updated);
}

/**
 * עזיבת קבוצה. הבעלים לא יכול לעזוב (ForbiddenError.ownerCannotLeave).
 * התראה לשאר החברים נשלחת, אבל אם נכשלה - היציאה עדיין מצליחה.
 */
export async function leaveGroup(listId: string, userId: string): Promise<void> {
  const list = await ListDAL.findById(listId);
  if (!list) throw NotFoundError.list();

  if (isListOwner(list, userId)) throw ForbiddenError.ownerCannotLeave();

  const isMember = list.members.some(m => m.user.toString() === userId);
  if (!isMember) throw ForbiddenError.noAccess();

  const memberIdsBeforeLeave = memberIdsOf(list);

  const updatedList = await ListDAL.removeMember(listId, userId);
  if (!updatedList) throw NotFoundError.list();

  // התראה - לא מכשילה את פעולת העזיבה
  try {
    await createNotificationsForListMembers(listId, 'leave', userId, { preloadedList: list });
  } catch (err: unknown) {
    logger.warn('Failed to create leave notification:', { listId, userId, error: err });
  }

  for (const id of memberIdsBeforeLeave) invalidateInsightsCache(id);
}

/**
 * הסרת חבר מקבוצה.
 * רשאים: בעלים או אדמין. רק בעלים יכול להסיר אדמינים אחרים.
 * אי אפשר להסיר את הבעלים עצמו.
 */
export async function removeMember(
  listId: string,
  userId: string,
  memberId: string
): Promise<IListResponse> {
  const list = await ListDAL.findById(listId);
  if (!list) throw NotFoundError.list();

  const isOwner = isListOwner(list, userId);
  const isAdmin = list.members.some(m => m.user.toString() === userId && m.isAdmin);
  if (!isOwner && !isAdmin) throw ForbiddenError.notAdmin();

  // אי אפשר להסיר את הבעלים
  if (isListOwner(list, memberId)) throw ForbiddenError.cannotRemoveOwner();

  // רק הבעלים יכול להסיר אדמינים אחרים
  const targetMember = list.members.find(m => m.user.toString() === memberId);
  if (targetMember?.isAdmin && !isOwner) throw ForbiddenError.onlyOwnerCanRemoveAdmins();

  const memberExists = list.members.some(m => m.user.toString() === memberId);
  if (!memberExists) throw NotFoundError.member();

  const memberIdsBeforeRemove = memberIdsOf(list);

  // שליפת פרטים להתראה לפני ההסרה
  const [member, actor] = await Promise.all([
    UserDAL.findById(memberId),
    UserDAL.findById(userId),
  ]);

  const updatedList = await ListDAL.removeMember(listId, memberId);
  if (!updatedList) throw NotFoundError.list();

  // התראות ברקע - לא חוסמות את התגובה
  if (member && actor) {
    createNotification({
      type: 'member_removed',
      listId,
      listName: list.name,
      actorId: userId,
      actorName: actor.name,
      targetUserId: memberId,
    }).catch((err: unknown) => logger.warn('Failed to create member_removed notification:', err));
  }

  if (member) {
    // preloadedList=updatedList (אחרי ההסרה בפועל) - לא הרשימה הישנה, כדי
    // שהחבר שהוסר לא ייכלל בעצמו ברשימת היעד של ההתראה.
    createNotificationsForListMembers(listId, 'removed', memberId, { excludeUserId: userId, preloadedList: updatedList })
      .catch((err: unknown) => logger.warn('Failed to create removed notifications:', err));
  }

  // מוציא את ה-sockets הפעילים של החבר שהוסר מחדר הרשימה, כדי שלא ימשיך
  // לקבל/לשדר אירועי מוצרים בזמן אמת לרשימה שהוא כבר לא חבר בה.
  // no-op אם Redis לא מוגדר (single-instance mode).
  publishMemberKicked(listId, memberId).catch((err: unknown) => logger.warn('Failed to publish member:kicked:', err));

  for (const id of memberIdsBeforeRemove) invalidateInsightsCache(id);

  return transformList(updatedList);
}

/**
 * הפיכת חבר לאדמין או ביטול אדמין.
 * רק הבעלים יכול לשנות סטטוס אדמין.
 */
export async function toggleMemberAdmin(
  listId: string,
  userId: string,
  memberId: string
): Promise<IListResponse> {
  const list = await ListDAL.findById(listId);
  if (!list) throw NotFoundError.list();

  if (!isListOwner(list, userId)) throw ForbiddenError.notOwner();

  const member = list.members.find(m => m.user.toString() === memberId);
  if (!member) throw NotFoundError.member();

  const updatedList = await ListDAL.setMemberAdmin(listId, memberId, !member.isAdmin);
  if (!updatedList) throw NotFoundError.list();

  return transformList(updatedList);
}
