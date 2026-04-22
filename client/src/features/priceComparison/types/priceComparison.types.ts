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

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;
  totalPrices: number;
  lists: PriceListGroup[];
  grandTotal: number | null;
  totalMatched: number;
  totalUnmatched: number;
  totalPending: number;
  disclaimer: string;
  lastUpdatedISO: string | null;
  sourceName: string;
  sourceUrl: string;
}
