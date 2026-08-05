import { ProductDAL, ListDAL } from '../dal';
import type { IListResponse } from '../types';
import type { IList, IProductDoc } from '../models';

// המרת יוזר לא-populated (lean) לפורמט תגובה - שכפול ידני של User.toJSON
// (_id -> id) שלא קורה אוטומטית על אובייקט lean.
const toLeanUserResponse = <T extends { _id: { toString(): string } }>(
  user: T,
): Record<string, unknown> => {
  const { _id, ...rest } = user;
  return { ...rest, id: _id.toString() };
};

const transformProduct = (p: IProductDoc | Record<string, unknown>): Record<string, unknown> => {
  // תמיכה גם ב-Mongoose docs וגם ב-lean POJOs
  const pJson = (typeof (p as IProductDoc).toJSON === 'function')
    ? (p as IProductDoc).toJSON() as Record<string, unknown>
    : { ...(p as Record<string, unknown>) };

  // lean POJOs מגיעים עם _id במקום id, צריך להמיר
  if (!pJson.id && pJson._id) {
    pJson.id = pJson._id.toString();
  }
  // ניקוי שדות פנימיים שלא אמורים להישלח ללקוח
  delete pJson._id;
  delete pJson.__v;
  delete pJson.listId;

  for (const field of ['addedBy', 'updatedBy', 'purchasedBy'] as const) {
    if (pJson[field] && typeof pJson[field] === 'object') {
      pJson[field] = (pJson[field] as { name?: string }).name || 'Unknown';
    }
  }
  return pJson;
};

/**
 * המרת רשימה לפורמט תגובת API.
 * כולל populate של owner/members ושליפת מוצרים.
 * סיסמה נכללת לכל החברים (כל חבר יכול להזמין).
 */
export const transformList = async (
  list: IList,
  existingProducts?: IProductDoc[],
): Promise<IListResponse> => {
  // populate ושליפת מוצרים במקביל
  const [, , products] = await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
    existingProducts ?? ProductDAL.findByListId(list._id.toString()),
  ]);

  const json = list.toJSON() as Record<string, unknown>;
  json.products = (products as (IProductDoc | Record<string, unknown>)[]).map(transformProduct);
  json.password = list.password || null;

  return json as unknown as IListResponse;
};

/**
 * המרת מספר רשימות לפורמט API.
 * שאילתה אחת לכל המוצרים (פותר N+1).
 * מקבל רשימות lean מ-findUserListsPopulated (כבר populated ב-query עצמה,
 * ר' list.dal.ts) - בונה ידנית את אותה צורת JSON שהייתה מתקבלת מ-
 * Document.toJSON() (id במקום _id, ברמת הרשימה וגם ברמת owner/members.user).
 */
export const transformListsWithProducts = async (
  lists: Awaited<ReturnType<typeof ListDAL.findUserListsPopulated>>,
): Promise<IListResponse[]> => {
  if (lists.length === 0) return [];

  const listIds = lists.map(l => l._id.toString());
  const productsMap = await ProductDAL.findByListIds(listIds);

  return lists.map((list) => {
    const products = productsMap.get(list._id.toString()) || [];
    const { _id, __v, password, owner, members, ...rest } = list;

    const json: Record<string, unknown> = {
      ...rest,
      id: _id.toString(),
      hasPassword: !!password,
      password: password || null,
      owner: toLeanUserResponse(owner),
      members: members.map((m) => ({
        user: toLeanUserResponse(m.user),
        isAdmin: m.isAdmin,
        joinedAt: m.joinedAt,
      })),
      products: products.map(transformProduct),
    };

    return json as unknown as IListResponse;
  });
};
