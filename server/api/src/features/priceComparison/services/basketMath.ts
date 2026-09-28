/**
 * חישוב מחיר שורה וסל עם מבצעים. לוגיקה טהורה (בלי DB) כדי שאפשר לבדוק אותה.
 */

export interface PromoOffer {
  promotionId: string;
  description: string;
  // כמות מינימלית ומחיר כולל עבורה ("3 ב-10": minQty=3, price=10)
  minQty: number;
  price: number;
}

export interface LineResult {
  quantity: number;
  unitPrice: number;
  regularTotal: number;
  total: number;
  // המבצע שהופעל, אם הוזיל
  promotion?: { promotionId: string; description: string; minQty: number; price: number };
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * מחיר שורה: הכמות במחיר רגיל, או הזול מבין המבצעים. מבצע "N ב-X" חל על כל N
 * יחידות שלמות, והיתרה במחיר רגיל. מבצע שלא מוזיל (מחיר המבצע גבוה מהרגיל,
 * או כמות קטנה מהמינימום) לא מופעל.
 */
export function priceLine(quantity: number, unitPrice: number, offers: PromoOffer[]): LineResult {
  const regularTotal = round2(quantity * unitPrice);
  let best: LineResult = { quantity, unitPrice, regularTotal, total: regularTotal };
  for (const o of offers) {
    if (!(o.minQty > 0) || !(o.price > 0) || quantity < o.minQty) continue;
    const bundles = Math.floor(quantity / o.minQty + 1e-9);
    const rest = quantity - bundles * o.minQty;
    const total = round2(bundles * o.price + rest * unitPrice);
    if (total < best.total) {
      best = {
        quantity, unitPrice, regularTotal, total,
        promotion: { promotionId: o.promotionId, description: o.description, minQty: o.minQty, price: o.price },
      };
    }
  }
  return best;
}

export interface BasketRanking {
  itemsFound: number;
  basketTotal: number;
}

// סדר תוצאות: סל שלם יותר קודם (סל שחסרים בו מוצרים נראה זול בטעות), ואז הזול
export function compareBaskets(a: BasketRanking, b: BasketRanking): number {
  return b.itemsFound - a.itemsFound || a.basketTotal - b.basketTotal;
}
