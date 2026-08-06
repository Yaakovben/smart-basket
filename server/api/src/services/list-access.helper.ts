import { ListDAL } from '../dal';
import { NotFoundError, ForbiddenError } from '../errors';
import type { IList } from '../models';

/**
 * בדיקה שהרשימה קיימת והמשתמש בעל גישה (בעלים או חבר)
 */
export const checkListAccess = async (
  listId: string,
  userId: string
): Promise<IList> => {
  const list = await ListDAL.findById(listId);

  if (!list) {
    throw NotFoundError.list();
  }

  const isOwner = list.owner.toString() === userId;
  const isMember = list.members.some((m) => m.user.toString() === userId);

  if (!isOwner && !isMember) {
    throw ForbiddenError.noAccess();
  }

  return list;
};

/**
 * גרסת lean של checkListAccess - טוענת רק owner+members במקום מסמך
 * Mongoose מלא. לשימוש בנתיבי מוצרים (add/update/delete/clear/reset/reorder)
 * שרק בודקים הרשאה ולעולם לא שומרים (.save()) את מסמך הרשימה עצמו.
 */
export const checkListAccessLean = async (
  listId: string,
  userId: string
): Promise<Pick<IList, 'owner' | 'members'>> => {
  const list = await ListDAL.findAccessFields(listId);

  if (!list) {
    throw NotFoundError.list();
  }

  const isOwner = list.owner.toString() === userId;
  const isMember = list.members.some((m) => m.user.toString() === userId);

  if (!isOwner && !isMember) {
    throw ForbiddenError.noAccess();
  }

  return list;
};

/**
 * בדיקה שהרשימה קיימת והמשתמש הוא הבעלים
 */
export const checkListOwner = async (
  listId: string,
  userId: string
): Promise<IList> => {
  const list = await ListDAL.findById(listId);

  if (!list) {
    throw NotFoundError.list();
  }

  if (list.owner.toString() !== userId) {
    throw ForbiddenError.notOwner();
  }

  return list;
};
