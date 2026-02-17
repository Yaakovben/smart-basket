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
 * Transform a single list document into the API response format.
 * Populates owner/members and fetches products from the Product collection.
 * Password is included for all members (any member can invite others).
 */
export const transformList = async (list: IList): Promise<IListResponse> => {
  await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
  ]);

  const products = await ProductDAL.findByListId(list._id.toString());
  const json = list.toJSON() as Record<string, unknown>;
  json.products = products.map(transformProduct);

  // Include password for all members (any member can invite others)
  json.password = list.password || null;

  return json as unknown as IListResponse;
};

/**
 * Transform multiple lists into API response format.
 * Uses a single batch query for all products (fixes N+1).
 */
export const transformListsWithProducts = async (lists: IList[]): Promise<IListResponse[]> => {
  if (lists.length === 0) return [];

  const listIds = lists.map(l => l._id.toString());
  const productsMap = await ProductDAL.findByListIds(listIds);

  return lists.map((list) => {
    const products = productsMap.get(list._id.toString()) || [];
    const json = list.toJSON() as Record<string, unknown>;
    json.products = products.map(transformProduct);

    // Include password for all members (any member can invite others)
    json.password = list.password || null;

    return json as unknown as IListResponse;
  });
};
