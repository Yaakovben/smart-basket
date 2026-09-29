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
    let manualOrder = list.productsManuallyOrdered;
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
          purchasedAt: m.pendingIsPurchased ? new Date(m.timestamp).toISOString() : null,
          addedBy: userName,
          createdAt: new Date(m.timestamp).toISOString(),
          note: m.productData.note,
          image: m.productData.image,
        };
        products = [...products, temp];
      } else if (m.type === 'toggle') {
        products = products.map(p => p.id === m.productId && p.isPurchased !== m.isPurchased
          ? {
            ...p, isPurchased: m.isPurchased, purchasedBy: m.isPurchased ? userName : null,
            // זמן הפעולה עצמה (כשסומן באופליין), לא זמן הסנכרון
            purchasedAt: m.isPurchased ? new Date(m.timestamp).toISOString() : null,
          }
          : p);
      } else if (m.type === 'update') {
        products = products.map(p => p.id === m.productId ? { ...p, ...(m.changes as Partial<Product>) } : p);
      } else if (m.type === 'delete') {
        products = products.filter(p => p.id !== m.productId);
      } else if (m.type === 'clear') {
        // בלי זה ניקוי שנעשה באופליין "חוזר" על המסך בכל רענון עד הסנכרון
        products = products.filter(p =>
          m.filter === 'purchased' ? !p.isPurchased : m.filter === 'pending' ? p.isPurchased : false
        );
      } else if (m.type === 'reset') {
        products = products.map(p => p.isPurchased
          ? { ...p, isPurchased: false, purchasedBy: null, purchasedAt: null }
          : p);
      } else if (m.type === 'reorder') {
        // אותו חישוב מיקומים כמו בשרת, כדי שהסדר לא יקפוץ אחורה ברענון
        const rank = new Map(m.productIds.map((id, i) => [id, i]));
        const base = m.manual ? 0 : m.timestamp - m.productIds.length * 1000;
        products = products.map(p => rank.has(p.id)
          ? { ...p, position: base + rank.get(p.id)! * (m.manual ? 1 : 1000) }
          : p);
        manualOrder = m.manual;
      }
    }
    if (products === list.products && manualOrder === list.productsManuallyOrdered) return list;
    changed = true;
    return { ...list, products, productsManuallyOrdered: manualOrder };
  });
  return changed ? next : lists;
}
