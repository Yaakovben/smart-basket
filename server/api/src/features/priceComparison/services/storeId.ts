// מזהה סניף בפורטל המחירים ובקובץ הסניפים עלול להיכתב אחרת (למשל "012" מול
// "12"). מנרמלים אפסים מובילים כדי שההתאמה בין הסניף לבין מחירי הסניף תעבוד,
// ומחזירים את המזהה כפי שהוא שמור בטבלת המחירים - זה המזהה לשאילתות מחיר.
export const normStoreId = (id: string): string => String(id).trim().replace(/^0+(?=.)/, '');

export function makeStoreIdResolver(pricedStoreIds?: Set<string>) {
  const byNorm = new Map<string, string>();
  if (pricedStoreIds) for (const id of pricedStoreIds) byNorm.set(normStoreId(id), id);
  return {
    isPriced: (storeId: string) => byNorm.has(normStoreId(storeId)),
    resolve: (storeId: string) => byNorm.get(normStoreId(storeId)) ?? storeId,
  };
}
