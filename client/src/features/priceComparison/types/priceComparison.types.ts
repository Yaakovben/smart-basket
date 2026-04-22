// טיפוסים של מודול השוואת המחירים — מועתקים מהשרת דרך ה-API.

export interface PriceMatch {
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

export interface PriceComparisonData {
  enabled: boolean;
  chainName: string;
  totalPrices: number;
  matchedCount: number;
  topMatches: PriceMatch[];
  estimatedBasketTotal: number | null;
  disclaimer: string;
  lastUpdatedISO: string | null;
  sourceName: string;
  sourceUrl: string;
}
