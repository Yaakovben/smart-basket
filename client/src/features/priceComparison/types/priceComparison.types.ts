// טיפוסים של מודול השוואת המחירים — מועתקים מהשרת דרך ה-API.

export interface PriceMatch {
  productId: string;
  userProductName: string;
  userQuantity: number;
  normalizedName: string;
  matched: boolean;
  chainId: string;
  chainName: string;
  itemName: string;
  itemNameNormalized?: string;
  price: number;
  barcode: string;
  matchConfidence: number;
  matchedTokens: string[];
  userTokens: string[];
  manufacturerName?: string;
}

// קבוצת פריטים לפי רשימה - unit מרכזי של UI
export interface PriceListGroup {
  listId: string;
  listName: string;
  listIcon: string;
  listColor: string;
  isGroup: boolean;
  pendingCount: number;
  matchedCount: number;
  unmatchedCount: number;
  estimatedTotal: number;
  matches: PriceMatch[];
}

// סניף קרוב ביותר לרשת - מוחזר רק כשהמשתמש שיתף מיקום
export interface NearestBranch {
  branchName: string;
  city: string;
  address: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

// סיכום השוואתי לרשת - משמש לתצוגת רנק של כל הרשתות ב-UI
export interface PriceChainTotal {
  chainId: string;
  chainName: string;
  total: number;
  matchedCount: number;
  unmatchedCount: number;
  isCheapest: boolean;
  isComplete: boolean;   // יש לה את מלוא הסל? (מספר התאמות = מקסימום)
  savings: number;
  matches: PriceMatch[]; // כל המוצרים של המשתמש עם מחיר ברשת הזו
  hasData: boolean;      // האם הרשת פרסמה מחירים היום (false = הפורטל לא פרסם)
  nearestBranch?: NearestBranch; // הסניף הקרוב - רק כשהמשתמש שיתף מיקום
}

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;
  totalPrices: number;
  lists: PriceListGroup[];
  grandTotal: number | null;
  totalMatched: number;
  totalUnmatched: number;
  totalPending: number;
  chainTotals: PriceChainTotal[];
  disclaimer: string;
  lastUpdatedISO: string | null;
  sourceName: string;
  sourceUrl: string;
}
