import { ProductDAL, ListDAL } from '../dal';
import { NotFoundError, AppError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateProductInput, UpdateProductInput } from '../validators';
import type { IProductDoc, IProductEditChange, IProductEditEntry } from '../models';
import { checkListAccessLean } from './list-access.helper';
import { invalidateUser as invalidatePriceCacheForUser } from '../features/priceComparison';

// המרת מוצר Mongoose לאובייקט תגובת API - משטח refs מאוכלסים לשם בלבד
const flattenPopulatedName = (json: Record<string, unknown>, field: string): void => {
  const value = json[field];
  if (value && typeof value === 'object') {
    json[field] = (value as { name?: string }).name || 'Unknown';
  }
};

const toProductResponse = (product: IProductDoc) => {
  const json = product.toJSON() as Record<string, unknown>;
  flattenPopulatedName(json, 'addedBy');
  flattenPopulatedName(json, 'updatedBy');
  flattenPopulatedName(json, 'purchasedBy');
  return json;
};

// שגיאת מפתח כפול של Mongo (E11000) - אותו בדיקה בדיוק כמו error.middleware.ts
const isDuplicateKeyError = (err: unknown): boolean =>
  err instanceof Error && err.name === 'MongoServerError' && (err as { code?: number }).code === 11000;

export async function addProduct(
  listId: string,
  userId: string,
  data: CreateProductInput
) {
  await checkListAccessLean(listId, userId);

  // idempotency: אם זו הוספה חוזרת עם אותו clientId (למשל תשובת השרת
  // אבדה ברשת בניסיון קודם, offlineQueue שולח שוב) - מחזירים את המוצר
  // שכבר נוצר במקום ליצור כפילות.
  if (data.clientId) {
    const existing = await ProductDAL.findByClientId(listId, data.clientId);
    if (existing) return toProductResponse(existing);
  }

  let product: IProductDoc;
  try {
    product = await ProductDAL.createProduct({
      listId,
      name: sanitizeText(data.name),
      quantity: data.quantity ?? 1,
      unit: data.unit ?? 'יח׳',
      category: data.category ?? 'אחר',
      addedBy: userId,
      ...(data.note !== undefined ? { note: sanitizeText(data.note) } : {}),
      // image לא עובר sanitizeText - הוא לא טקסט חופשי אלא URL/data-URL שכבר
      // אומת ב-productValidator (https בלבד או data:image/...). sanitizeText
      // היה שובר את ה-base64.
      ...(data.image ? { image: data.image } : {}),
      ...(data.clientId ? { clientId: data.clientId } : {}),
    });
  } catch (err) {
    // race אמיתי: בקשה מקבילה עם אותו clientId כבר יצרה את המוצר בין
    // בדיקת ה-findByClientId למעלה לבין ה-create הזה (למשל שני טאבים
    // מסנכרנים את אותה רשומת תור בו-זמנית) - האינדקס הייחודי תפס את זה.
    // מחזירים את הרשומה הקיימת במקום שגיאת 500 ללקוח.
    if (data.clientId && isDuplicateKeyError(err)) {
      const existing = await ProductDAL.findByClientId(listId, data.clientId);
      if (existing) return toProductResponse(existing);
    }
    throw err;
  }

  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);

  return toProductResponse(product);
}

export async function updateProduct(
  listId: string,
  productId: string,
  userId: string,
  data: UpdateProductInput
): Promise<void> {
  await checkListAccessLean(listId, userId);

  const hasContentEdit = data.name !== undefined || data.quantity !== undefined || data.unit !== undefined ||
    data.category !== undefined || data.note !== undefined || data.image !== undefined;

  const updates: Record<string, unknown> = {};
  if (data.name !== undefined) updates.name = sanitizeText(data.name);
  if (data.quantity !== undefined) updates.quantity = data.quantity;
  if (data.unit !== undefined) updates.unit = data.unit;
  if (data.category !== undefined) updates.category = data.category;
  if (data.note !== undefined) updates.note = sanitizeText(data.note);
  // image: לא עובר sanitizeText (ראה addProduct). לא נכנס ל-editHistory
  // diff למטה - שמירת base64 שלם פעמיים בכל רשומת עריכה מנפחת את המסמך;
  // מספיק ש-updatedBy מתעדכן (hasContentEdit above).
  if (data.image !== undefined) updates.image = data.image;
  // עריכת תוכן (לא סימון קנייה) - מי ערך לאחרונה
  if (hasContentEdit) {
    updates.updatedBy = userId;
  }
  // סימון קנייה - ייחוס נפרד מעריכת תוכן. מתאפס ל-null כשמסמנים "לא נקנה",
  // כי "מי קנה" לא רלוונטי למוצר שכרגע לא מסומן כנקנה.
  if (data.isPurchased !== undefined) {
    updates.isPurchased = data.isPurchased;
    updates.purchasedBy = data.isPurchased ? userId : null;
  }

  let product: IProductDoc | null;

  if (hasContentEdit) {
    // צריך את הערכים הישנים לפני העדכון כדי לבנות diff אמיתי (oldValue/
    // newValue) - round-trip נוסף, אבל רק בעריכת תוכן בפועל (לא בכל toggle
    // קנייה, שהוא הפעולה השכיחה בהרבה).
    const current = await ProductDAL.findById(productId);
    if (!current) {
      throw NotFoundError.product();
    }

    const changes: IProductEditChange[] = [];
    const fieldsToCheck: Array<{ field: IProductEditChange['field']; oldValue: unknown; newValue: unknown }> = [
      { field: 'name', oldValue: current.name, newValue: updates.name },
      { field: 'quantity', oldValue: current.quantity, newValue: updates.quantity },
      { field: 'unit', oldValue: current.unit, newValue: updates.unit },
      { field: 'category', oldValue: current.category, newValue: updates.category },
      { field: 'note', oldValue: current.note ?? '', newValue: updates.note },
    ];
    for (const { field, oldValue, newValue } of fieldsToCheck) {
      if (newValue === undefined) continue;
      if (newValue === oldValue) continue;
      changes.push({ field, oldValue, newValue });
    }

    if (changes.length > 0) {
      const historyEntry: IProductEditEntry = {
        editedBy: userId as unknown as IProductEditEntry['editedBy'],
        editedAt: new Date(),
        changes,
      };
      product = await ProductDAL.updateProductInListWithHistory(productId, listId, updates, historyEntry);
    } else {
      // כל השדות ששלחו זהים לערכים הקיימים (למשל שמירה בלי שינוי אמיתי) -
      // אין טעם ברשומת היסטוריה ריקה, מעדכנים כרגיל.
      product = await ProductDAL.updateProductInList(productId, listId, updates);
    }
  } else {
    product = await ProductDAL.updateProductInList(productId, listId, updates);
  }

  if (!product) {
    throw NotFoundError.product();
  }
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
}

export async function deleteProduct(
  listId: string,
  productId: string,
  userId: string
): Promise<void> {
  await checkListAccessLean(listId, userId);

  const product = await ProductDAL.deleteProductInList(productId, listId);
  if (!product) {
    throw NotFoundError.product();
  }

  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
}

export async function clearProducts(
  listId: string,
  userId: string,
  filter: 'all' | 'purchased' | 'pending'
): Promise<number> {
  await checkListAccessLean(listId, userId);

  let deletedCount: number;
  if (filter === 'purchased') {
    deletedCount = await ProductDAL.clearPurchased(listId);
  } else if (filter === 'pending') {
    deletedCount = await ProductDAL.clearPending(listId);
  } else {
    deletedCount = await ProductDAL.clearAll(listId);
  }
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
  return deletedCount;
}

// איפוס כל המוצרים ל"לא נקנה" (רשימה קבועה)
export async function resetProducts(
  listId: string,
  userId: string
): Promise<number> {
  await checkListAccessLean(listId, userId);
  const count = await ProductDAL.resetAll(listId);
  await ListDAL.touchUpdatedAt(listId);
  invalidatePriceCacheForUser(userId);
  return count;
}

export async function reorderProducts(
  listId: string,
  userId: string,
  productIds: string[]
): Promise<void> {
  await checkListAccessLean(listId, userId);
  await ProductDAL.reorderProducts(listId, productIds);
}

export async function moveProducts(
  sourceListId: string,
  targetListId: string,
  productIds: string[],
  userId: string
): Promise<number> {
  if (sourceListId === targetListId) {
    throw new AppError('Cannot move products to the same list', 400, 'SAME_LIST');
  }
  // גישה לשתי הרשימות - לא רק למקור. בלי זה משתמש יכול "להעביר" מוצר
  // לרשימה שהוא לא חבר בה.
  await checkListAccessLean(sourceListId, userId);
  await checkListAccessLean(targetListId, userId);

  const movedCount = await ProductDAL.moveToList(productIds, sourceListId, targetListId);

  await ListDAL.touchUpdatedAt(sourceListId);
  await ListDAL.touchUpdatedAt(targetListId);
  invalidatePriceCacheForUser(userId);

  return movedCount;
}
