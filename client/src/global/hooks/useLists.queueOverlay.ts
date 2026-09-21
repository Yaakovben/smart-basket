import type { List, Product } from "../types";
import { getAllQueued } from "../../services/offlineQueue";

// מציג מעל רשימות מהשרת/קאש גם פעולות שעדיין ממתינות בתור האופליין (IndexedDB),
// כדי שמוצר שנוסף בלי קליטה לא ייעלם אחרי רענון/פתיחה מחדש/משיכת רשימות, עד
// שהסנכרון באמת מסתיים. הוספה שכבר קיימת ברשימה (לפי מזהה זמני) לא מתווספת שוב.
export async function overlayQueuedMutations(lists: List[], userName: string): Promise<List[]> {
  let queued;
  try {
    queued = await getAllQueued();
  } catch {
    return lists;
  }
  if (queued.length === 0) return lists;

  let changed = false;
  const next = lists.map(list => {
    let products = list.products;
    for (const m of queued) {
      if (m.listId !== list.id) continue;
      if (m.type === 'add') {
        if (products.some(p => p.id === m.tempId)) continue;
        const temp: Product = {
          id: m.tempId,
          name: m.productData.name,
          quantity: m.productData.quantity,
          unit: m.productData.unit as Product['unit'],
          category: m.productData.category as Product['category'],
          isPurchased: !!m.pendingIsPurchased,
          purchasedBy: m.pendingIsPurchased ? userName : null,
          addedBy: userName,
          createdAt: new Date(m.timestamp).toISOString(),
          note: m.productData.note,
          image: m.productData.image,
        };
        products = [...products, temp];
      } else if (m.type === 'toggle') {
        products = products.map(p => p.id === m.productId && p.isPurchased !== m.isPurchased
          ? { ...p, isPurchased: m.isPurchased, purchasedBy: m.isPurchased ? userName : null }
          : p);
      } else if (m.type === 'update') {
        products = products.map(p => p.id === m.productId ? { ...p, ...(m.changes as Partial<Product>) } : p);
      } else if (m.type === 'delete') {
        products = products.filter(p => p.id !== m.productId);
      }
    }
    if (products === list.products) return list;
    changed = true;
    return { ...list, products };
  });
  return changed ? next : lists;
}
