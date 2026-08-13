/**
 * template.service.ts
 *
 * שירות תבניות רשימות: שמירה כתבנית, שליפה, יצירת רשימה מתבנית ומחיקה.
 */

import mongoose from 'mongoose';
import { ListDAL, ProductDAL } from '../dal';
import { AppError, ForbiddenError, NotFoundError } from '../errors';
import { transformList } from './list-transform.helper';
import { Product } from '../models';
import type { IListResponse } from '../types';
import type { IList } from '../models';

/** שליפת כל התבניות של המשתמש (populate + מוצרים). */
export async function getTemplates(userId: string): Promise<IListResponse[]> {
  const templates = await ListDAL.findTemplates(userId);
  return Promise.all(templates.map(t => transformList(t)));
}

/** סימון/ביטול סימון רשימה כתבנית. רק הבעלים. */
export async function setTemplate(listId: string, userId: string, value: boolean): Promise<IListResponse> {
  const list = await ListDAL.findById(listId) as IList | null;
  if (!list) throw NotFoundError.list();
  if (list.owner.toString() !== userId) throw ForbiddenError.notOwner();

  const updated = await ListDAL.setIsTemplate(listId, value) as IList | null;
  if (!updated) throw NotFoundError.list();
  return transformList(updated);
}

/**
 * יצירת רשימה חדשה מתבנית.
 * מעתיק שם, אייקון, צבע ואת כל המוצרים.
 * הרשימה החדשה אינה תבנית בעצמה.
 */
export async function applyTemplate(templateId: string, userId: string): Promise<IListResponse> {
  const template = await ListDAL.findById(templateId) as IList | null;
  if (!template) throw NotFoundError.list();
  if (template.owner.toString() !== userId) throw ForbiddenError.notOwner();
  if (!template.isTemplate) {
    throw new AppError('הרשימה אינה תבנית', 400, 'NOT_A_TEMPLATE');
  }

  // מוצרי התבנית
  const templateProducts = await ProductDAL.findByListId(templateId);

  // יצירת רשימה חדשה
  const newList = await ListDAL.create({
    name: template.name,
    icon: template.icon,
    color: template.color,
    isGroup: false,
    isTemplate: false,
    owner: new mongoose.Types.ObjectId(userId),
    members: [],
  } as Partial<IList>);

  // העתקת מוצרים
  if (templateProducts.length > 0) {
    const productsToInsert = templateProducts.map((p, idx) => ({
      listId: new mongoose.Types.ObjectId(newList._id.toString()),
      name: p.name,
      quantity: p.quantity,
      unit: p.unit,
      category: p.category,
      isPurchased: false,
      addedBy: new mongoose.Types.ObjectId(userId),
      position: idx,
      note: p.note || '',
    }));

    await Product.insertMany(productsToInsert);
  }

  return transformList(newList);
}

/** מחיקת תבנית (כולל המוצרים שלה). רק הבעלים. */
export async function deleteTemplate(templateId: string, userId: string): Promise<void> {
  const template = await ListDAL.findById(templateId) as IList | null;
  if (!template) throw NotFoundError.list();
  if (template.owner.toString() !== userId) throw ForbiddenError.notOwner();

  await ProductDAL.deleteByListId(templateId);
  await ListDAL.deleteById(templateId);
}
