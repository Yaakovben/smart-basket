/**
 * מותגים שהם תתי-רשתות (יש חסד בשופרסל, נטו חיסכון בסופר ספיר): הם לא מפרסמים
 * בנפרד, אבל הלקוח מכיר אותם בשמם. סניף מזוהה כמותג לפי תת-הרשת בקובץ הסניפים
 * הרשמי, ואם עוד לא נשמרה לו תת-רשת, לפי שם הסניף בקובץ (למשל "נטו חיסכון רמות").
 *
 * לוגיקה טהורה (בלי DB) כדי שאפשר לבדוק אותה.
 */

import { PRICE_SOURCES } from '../data/price-sources.data';

export interface SubBrand {
  chainId: string;
  name: string;
  subChainName: string;
}

export const SUB_BRANDS: SubBrand[] = PRICE_SOURCES
  .filter(s => s.subChainName)
  .map(s => ({ chainId: s.chainId, name: s.displayName, subChainName: s.subChainName as string }));

// המותג של סניף, או undefined אם הוא סניף רגיל של הרשת
export function brandOfBranch(chainId: string, branch: { subChainName?: string; storeName?: string }): SubBrand | undefined {
  for (const b of SUB_BRANDS) {
    if (b.chainId !== chainId) continue;
    if (branch.subChainName) {
      if (branch.subChainName.trim() === b.subChainName) return b;
      continue;
    }
    if (branch.storeName?.includes(b.name)) return b;
  }
  return undefined;
}
