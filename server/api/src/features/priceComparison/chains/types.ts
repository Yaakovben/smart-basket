import type { ChainId } from '../models/Price.model';

export interface ChainPriceItem {
  barcode: string;
  itemName: string;
  price: number;
  unitOfMeasure?: string;
  manufacturerName?: string;
  quantity?: number;
  storeId?: string;
  // שדות עשירים נוספים מקובץ XML של הפורטל - מאפשרים תצוגה מפורטת ללקוח
  manufactureCountry?: string;       // ארץ ייצור (למשל "ישראל")
  manufacturerItemDescription?: string; // תיאור היצרן הנקי - בד"כ ארוך וברור יותר
  qtyInPackage?: number;             // כמות יחידות בתוך אריזה
  isWeighted?: boolean;              // מוצר במשקל (kg) - חשוב לחישוב מחיר
  unitQty?: string;                  // יחידת בסיס: "100 גרם", "100 מ"ל"
  itemPriceUpdateDate?: string;      // מתי הרשת עדכנה את המחיר (ISO)
}

export interface ChainFetchResult {
  chainId: ChainId;
  chainName: string;
  items: ChainPriceItem[];
  fetchedFiles: number;
  error?: string;
}

// פריט מקובץ Stores*.xml של רשת - המקור הרשמי לסניפים של הרשת
export interface ChainStoreItem {
  storeId: string;
  storeName: string;
  address?: string;
  city?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  // מטא-דאטה נוספת על הסניף - מאפשרת בידול בתת-מותגים
  subChainName?: string;             // למשל "AM:PM", "רמי לוי שיווק השקמה"
  storeType?: string;                // סוג סניף (1=פיזי, 2=אונליין וכו')
}

export interface ChainStoresFetchResult {
  chainId: ChainId;
  chainName: string;
  stores: ChainStoreItem[];
  fetchedFiles: number;
  error?: string;
}

export interface ChainAdapter {
  readonly chainId: ChainId;
  readonly chainName: string;
  fetchLatestPrices(): Promise<ChainFetchResult>;
  // אופציונלי: מביא את רשימת הסניפים הרשמית של הרשת מהפורטל.
  // רשתות שלא מפרסמות Stores*.xml - לא יממשו או יחזירו ריק.
  fetchLatestStores?(): Promise<ChainStoresFetchResult>;
}
