import type { Product } from '../../../global/types';
import type { NewProductForm } from '../types/list-types';

// סדר מיון קטגוריות כברירת מחדל - לפי זרימה טבעית של קניות בסופר:
// ירקות → פירות → מחלבה → בשר → מאפים → שאר. סדר הקטגוריות כאן קובע
// איך המוצרים מוצגים ברשימה (ראה getCategoryOrder ב-useMemo של items).
const CATEGORY_SORT_ORDER: Record<string, number> = {
  'ירקות': 1,
  'פירות': 2,
  'מוצרי חלב': 3,
  'בשר': 4,
  'קפואים': 5,
  'מאפים': 6,
  'שימורים ויבשים': 7,
  'תבלינים ורטבים': 8,
  'משקאות': 9,
  'פיצוחים': 10,
  'ממתקים': 11,
  'ניקיון': 12,
  'אחר': 99,
};

export const getCategoryOrder = (cat: string): number => CATEGORY_SORT_ORDER[cat] ?? 99;

// מזהה זמני למוצרים שעדיין לא אושרו מהשרת
export const isTempId = (id: string) => id.startsWith('temp-');

export const getDefaultNewProduct = (): NewProductForm => ({
  name: '',
  quantity: 1,
  unit: 'יח׳' as Product['unit'],
  category: 'אחר' as Product['category'],
  note: '',
});

// ===== Pull to Refresh =====
// משיכה למטה כשהגלילה בראש הדף מפעילה רענון. סף 70px מהנקודה ההתחלתית.
export const PULL_THRESHOLD = 70;
export const PULL_MAX = 100;
