import { ProductDAL } from '../dal';
import type { IListResponse } from '../types';
import type { IList, IProductDoc } from '../models';

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

  if (pJson.addedBy && typeof pJson.addedBy === 'object') {
    pJson.addedBy = (pJson.addedBy as { name?: string }).name || 'Unknown';
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
 * מדלג על populate אם הרשימות כבר מאוכלסות (מגיעות מ-findUserListsPopulated).
 */
export const transformListsWithProducts = async (lists: IList[]): Promise<IListResponse[]> => {
  if (lists.length === 0) return [];

  // populate רק אם לא כבר מאוכלס (בדיקה: owner הוא אובייקט עם name = כבר populated)
  const needsPopulate = lists.length > 0 && !lists[0].populated('owner');
  if (needsPopulate) {
    await Promise.all(
      lists.map((list) =>
        Promise.all([
          list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
          list.populate('members.user', 'name email avatarColor avatarEmoji'),
        ]),
      ),
    );
  }

  const listIds = lists.map(l => l._id.toString());
  const productsMap = await ProductDAL.findByListIds(listIds);

  return lists.map((list) => {
    const products = productsMap.get(list._id.toString()) || [];
    const json = list.toJSON() as Record<string, unknown>;
    json.products = products.map(transformProduct);
    json.password = list.password || null;

    return json as unknown as IListResponse;
  });
};
