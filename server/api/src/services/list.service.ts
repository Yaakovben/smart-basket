/**
 * list.service.ts
 *
 * CRUD של רשימות: יצירה, עדכון, מחיקה, שליפה.
 * פעולות חברות מועברות הלאה ל-list-membership.service.
 *
 * המרת רשימה פרטית לקבוצה מייצרת inviteCode ייחודי.
 * המרה הפוכה נדחית אם יש חברים נוספים.
 */

import mongoose from 'mongoose';
import { ListDAL, UserDAL, ProductDAL } from '../dal';
import { ForbiddenError } from '../errors';
import { logger } from '../config';
import { sanitizeText } from '../utils';
import {
  createNotification,
  createNotificationsForListMembers,
  deleteNotificationsForList,
} from './notification.service';
import {
  joinGroup as membershipJoinGroup,
  leaveGroup as membershipLeaveGroup,
  removeMember as membershipRemoveMember,
  toggleMemberAdmin as membershipToggleAdmin,
} from './list-membership.service';
import { transformList, transformListsWithProducts } from './list-transform.helper';
import { checkListAccess, checkListOwner } from './list-access.helper';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';

// ==================== CRUD ====================

/** שליפת כל הרשימות של המשתמש (כולל מוצרים לכל רשימה). */
export async function getUserLists(userId: string): Promise<IListResponse[]> {
  const lists = await ListDAL.findUserListsPopulated(userId);
  return transformListsWithProducts(lists);
}

/** שליפת רשימה יחידה. דורש שהמשתמש יהיה בעלים/חבר. */
export async function getList(listId: string, userId: string): Promise<IListResponse> {
  const list = await checkListAccess(listId, userId);
  return transformList(list);
}

/** יצירת רשימה חדשה. אם isGroup=true נוצר גם inviteCode ייחודי. */
export async function createList(
  userId: string,
  data: CreateListInput
): Promise<IListResponse> {
  let inviteCode: string | undefined;

  if (data.isGroup) inviteCode = await ListDAL.generateUniqueInviteCode();

  const list = await ListDAL.create({
    ...data,
    name: sanitizeText(data.name),
    owner: new mongoose.Types.ObjectId(userId),
    inviteCode,
    members: [],
  } as Partial<IList>);

  return transformList(list);
}

/**
 * עדכון רשימה. רק הבעלים.
 * כולל טיפול במעבר פרטית↔קבוצה ועדכון סיסמה.
 * שינוי שם/אייקון/צבע בקבוצה מייצר התראה לחברים (ברקע).
 */
export async function updateList(
  listId: string,
  userId: string,
  data: UpdateListInput
): Promise<IListResponse> {
  const list = await checkListOwner(listId, userId);

  // המרת רשימה פרטית לקבוצה
  if (data.isGroup && !list.isGroup) {
    const inviteCode = await ListDAL.generateUniqueInviteCode();
    list.isGroup = true;
    list.inviteCode = inviteCode;
    if (data.password) list.password = data.password;
  }

  // המרת קבוצה לרשימה פרטית (רק אם אין חברים)
  if (data.isGroup === false && list.isGroup) {
    if (list.members.length > 0) {
      throw new ForbiddenError('לא ניתן להמיר לפרטית כשיש חברים נוספים');
    }
    list.isGroup = false;
    list.inviteCode = undefined;
    list.password = undefined;
  }

  // עדכון סיסמה לקבוצה קיימת
  if (data.password !== undefined && list.isGroup) {
    list.password = data.password || undefined;
  }

  // שאר השדות (הסרנו isGroup/password שטופלו בנפרד)
  const { isGroup: _isGroup, password: _password, ...sanitizedData } = { ...data };
  if (sanitizedData.name) sanitizedData.name = sanitizeText(sanitizedData.name);
  if (sanitizedData.icon) sanitizedData.icon = sanitizeText(sanitizedData.icon);

  const nameChanged = sanitizedData.name && sanitizedData.name !== list.name;
  const iconChanged = sanitizedData.icon && sanitizedData.icon !== list.icon;
  const colorChanged = sanitizedData.color && sanitizedData.color !== list.color;
  const hasChanges = nameChanged || iconChanged || colorChanged;

  Object.assign(list, sanitizedData);
  await list.save();

  // התראה על שינוי עיצוב/שם - קידוד סוג השינוי ב-productName
  if (list.isGroup && hasChanges && list.members.length > 0) {
    const changeType = nameChanged && (iconChanged || colorChanged) ? 'both'
                     : nameChanged ? 'name'
                     : 'design';
    const productName = nameChanged ? `${changeType}:${list.name}` : changeType;

    createNotificationsForListMembers(listId, 'list_update', userId, { productName })
      .catch((err: unknown) => logger.error('List update notification failed:', err));
  }

  return transformList(list);
}

/**
 * מחיקת רשימה. רק הבעלים.
 * מוחק גם את המוצרים ואת ההתראות הישנות של הרשימה.
 * אם זו קבוצה - שולח התראת list_deleted לכל חבר.
 * מחזיר memberIds ו-listName לצורך Socket-based cleanup בצד הלקוח.
 */
export async function deleteList(listId: string, userId: string): Promise<{ memberIds: string[]; listName: string }> {
  const list = await checkListOwner(listId, userId);

  const memberIds = list.members.map(m => m.user.toString());
  const listName = list.name;

  // מחיקת מוצרים והתראות ישנות לפני מחיקת הרשימה עצמה
  await ProductDAL.deleteByListId(listId);
  await deleteNotificationsForList(listId);

  // התראות list_deleted לחברים - אחרי הניקוי כדי שלא יימחקו
  if (list.isGroup && memberIds.length > 0) {
    const owner = await UserDAL.findById(userId);
    if (owner) {
      await Promise.all(
        memberIds.map(memberId =>
          createNotification({
            type: 'list_deleted',
            listId,
            listName,
            actorId: userId,
            actorName: owner.name,
            targetUserId: memberId,
          })
        )
      );
    }
  }

  await ListDAL.deleteById(listId);
  return { memberIds, listName };
}

// ==================== חברות (delegation ל-membership service) ====================

export const joinGroup = (userId: string, data: JoinGroupInput): Promise<IListResponse> =>
  membershipJoinGroup(userId, data);

export const leaveGroup = (listId: string, userId: string): Promise<void> =>
  membershipLeaveGroup(listId, userId);

export const removeMember = (listId: string, userId: string, memberId: string): Promise<IListResponse> =>
  membershipRemoveMember(listId, userId, memberId);

export const toggleMemberAdmin = (listId: string, userId: string, memberId: string): Promise<IListResponse> =>
  membershipToggleAdmin(listId, userId, memberId);
