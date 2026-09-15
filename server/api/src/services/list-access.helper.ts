import { ListDAL } from '../dal';
import { NotFoundError, ForbiddenError } from '../errors';
import type { IList } from '../models';

/**
 * האם userId הוא הבעלים של הרשימה - בדיקה חוזרת שהייתה משוכפלת ב-6+
 * מקומות (השוואת ObjectId.toString() ידנית); ריכוז כאן כדי ששינוי עתידי
 * (למשל מעבר ל-.equals()) יצטרך להתעדכן במקום אחד בלבד.
 */
export const isListOwner = (list: Pick<IList, 'owner'>, userId: string): boolean =>
  list.owner.toString() === userId;

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

  const isOwner = isListOwner(list, userId);
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

  const isOwner = isListOwner(list, userId);
  const isMember = list.members.some((m) => m.user.toString() === userId);

  if (!isOwner && !isMember) {
    throw ForbiddenError.noAccess();
  }

  return list;
};

/**
 * מזהי כל חברי הרשימה (כולל הבעלים) - לשימוש בניקוי cache שצריך לחול
 * על כל מי שרואה את הרשימה, לא רק על המשתמש שביצע את הפעולה.
 */
export const memberIdsOf = (list: Pick<IList, 'owner' | 'members'>): string[] => [
  list.owner.toString(),
  ...list.members.map((m) => m.user.toString()),
];

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

  if (!isListOwner(list, userId)) {
    throw ForbiddenError.notOwner();
  }

  return list;
};
