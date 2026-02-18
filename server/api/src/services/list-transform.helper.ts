import { ProductDAL } from '../dal';
import type { IListResponse } from '../types';
import type { IList, IProductDoc } from '../models';

const transformProduct = (p: IProductDoc): Record<string, unknown> => {
  const pJson = p.toJSON() as Record<string, unknown>;
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
  await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
  ]);

  const products = existingProducts ?? await ProductDAL.findByListId(list._id.toString());
  const json = list.toJSON() as Record<string, unknown>;
  json.products = products.map(transformProduct);
  json.password = list.password || null;

  return json as unknown as IListResponse;
};

/**
 * המרת מספר רשימות לפורמט API.
 * שאילתה אחת לכל המוצרים (פותר N+1).
 */
export const transformListsWithProducts = async (lists: IList[]): Promise<IListResponse[]> => {
  if (lists.length === 0) return [];

  // populate אם לא כבר מאוכלס (Mongoose מדלג אם כבר populated)
  await Promise.all(
    lists.map((list) =>
      Promise.all([
        list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
        list.populate('members.user', 'name email avatarColor avatarEmoji'),
      ]),
    ),
  );

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
