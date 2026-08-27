import type { Product, SavedListItem } from '../../../global/types';
import { detectCategory } from '../../../global/helpers/categoryDetector';

// אמוג׳ים מוצעים לבחירה מהירה בעת יצירת/עריכת רשימה קבועה.
export const SAVED_LIST_EMOJIS = ['📋', '🛒', '🧺', '🥦', '🍞', '🥛', '🧊', '🧻', '🎉', '🍗', '🐟', '☕'];

// תואם ל-MAX_SAVED_LIST_ITEMS בשרת (user.service.ts) - כדי לא לבנות
// רשימה שתיחתך בשקט בשמירה.
export const MAX_SAVED_LIST_ITEMS = 80;

export const newSavedListId = (): string =>
  `sl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// המרת מוצרי רשימה חיים לפריטי רשימה קבועה (שם/כמות/יחידה/קטגוריה),
// עם דה-דופ לפי שם (case-insensitive) - שומרים על ההופעה הראשונה.
export const productsToSavedItems = (products: Product[]): SavedListItem[] => {
  const seen = new Set<string>();
  const items: SavedListItem[] = [];
  for (const p of products) {
    const key = p.name.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push({ name: p.name.trim(), quantity: p.quantity || 1, unit: p.unit, category: p.category });
    if (items.length >= MAX_SAVED_LIST_ITEMS) break;
  }
  return items;
};

// פריט חדש מתוך שם חופשי (משמש בעורך הרשימה הקבועה) - קטגוריה מזוהה
// אוטומטית, כמות 1, יחידה ברירת מחדל.
export const nameToSavedItem = (rawName: string): SavedListItem | null => {
  const name = rawName.trim();
  if (name.length < 2) return null;
  return {
    name,
    quantity: 1,
    unit: 'יח׳',
    category: detectCategory(name) as SavedListItem['category'],
  };
};
