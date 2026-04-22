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
import { NotFoundError, ForbiddenError, ConflictError, AuthError } from '../errors';
import { logger } from '../config';
import {
  createNotification,
  createNotificationsForListMembers,
} from './notification.service';
import { transformList } from './list-transform.helper';
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

  if (list.owner.toString() === userId) throw ConflictError.isOwner();
  if (list.members.some(m => m.user.toString() === userId)) throw ConflictError.alreadyMember();

  if (list.password) {
    const isValidPassword = await list.comparePassword(data.password || '');
    if (!isValidPassword) throw AuthError.invalidGroupPassword();
  }

  const user = await UserDAL.findById(userId);
  if (!user) throw NotFoundError.user();

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
  if (!updated) throw ConflictError.alreadyMember();

  // התראה לחברי הקבוצה ברקע
  createNotificationsForListMembers(updated._id.toString(), 'join', userId, {})
    .catch((err: unknown) => logger.warn('Failed to create join notifications:', err));

  return transformList(updated);
}

/**
 * עזיבת קבוצה. הבעלים לא יכול לעזוב (ForbiddenError.ownerCannotLeave).
 * התראה לשאר החברים נשלחת, אבל אם נכשלה - היציאה עדיין מצליחה.
 */
export async function leaveGroup(listId: string, userId: string): Promise<void> {
  const list = await ListDAL.findById(listId);
  if (!list) throw NotFoundError.list();

  if (list.owner.toString() === userId) throw ForbiddenError.ownerCannotLeave();

  const isMember = list.members.some(m => m.user.toString() === userId);
  if (!isMember) throw ForbiddenError.noAccess();

  await ListDAL.removeMember(listId, userId);

  // התראה - לא מכשילה את פעולת העזיבה
  try {
    await createNotificationsForListMembers(listId, 'leave', userId, {});
  } catch (err: unknown) {
    logger.warn('Failed to create leave notification:', { listId, userId, error: err });
  }
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

  const isOwner = list.owner.toString() === userId;
  const isAdmin = list.members.some(m => m.user.toString() === userId && m.isAdmin);
  if (!isOwner && !isAdmin) throw ForbiddenError.notAdmin();

  // אי אפשר להסיר את הבעלים
  if (list.owner.toString() === memberId) throw ForbiddenError.cannotRemoveOwner();

  // רק הבעלים יכול להסיר אדמינים אחרים
  const targetMember = list.members.find(m => m.user.toString() === memberId);
  if (targetMember?.isAdmin && !isOwner) throw ForbiddenError.onlyOwnerCanRemoveAdmins();

  const memberExists = list.members.some(m => m.user.toString() === memberId);
  if (!memberExists) throw NotFoundError.member();

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
    createNotificationsForListMembers(listId, 'removed', memberId, { excludeUserId: userId })
      .catch((err: unknown) => logger.warn('Failed to create removed notifications:', err));
  }

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

  if (list.owner.toString() !== userId) throw ForbiddenError.notOwner();

  const member = list.members.find(m => m.user.toString() === memberId);
  if (!member) throw NotFoundError.member();

  const updatedList = await ListDAL.setMemberAdmin(listId, memberId, !member.isAdmin);
  if (!updatedList) throw NotFoundError.list();

  return transformList(updatedList);
}
