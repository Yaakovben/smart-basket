/**
 * סריקת מוצר: איפה הכי זול. מקבל ברקוד ומיקום (אופציונלי, עם דיוק) ומחזיר:
 *  - here:     הסניף שהמשתמש נמצא בו כרגע (אם הוא בתוך סניף), והמחיר בו
 *  - nearby:   הסניפים בטווח מהמשתמש, עם מרחק, מחיר ומבצע
 *  - cheapest: המחיר הזול בכל הארץ, תמיד עם סניף מזוהה או "ברוב סניפי הרשת"
 *  - chains:   מחיר נפוץ לכל רשת ולכל מותג (יש חסד, נטו חיסכון), מהזול ליקר
 *
 * מחיר בסניף מחושב כמו בהשוואת הרשימות (resolveBranchPrice). מחיר שלא אומת
 * לסניף מסומן verified=false, והלקוח מציג אותו כ"מחיר ברשת" ולא כמחיר הסניף.
 */
import { Price, type ChainId, type IPriceDoc } from '../models/Price.model';
import type { IPromotionDoc } from '../models/Promotion.model';
import { BranchPriceDAL } from '../dal/branchPrice.dal';
import { PromotionDAL } from '../dal/promotion.dal';
import { parseStorePrices, resolveBranchPrice } from './branchPricing';
import { getBranchesWithin, getBranchLabel, getChainBranches, type UserLocation } from './branches.service';
import { promoItemAppliesToStore, promoStoreIndex, promoUnitPrice } from './promoAggregation';
import { brandOfBranch, SUB_BRANDS } from './scanBrands';
import { pickCheapest, isAtStore, modalPrice, isStale, type CheapestCandidate } from './scanPricing';
import { normStoreId } from './storeId';

// קודם מחפשים ממש קרוב; אם אין שם אף סניף עם המוצר, מרחיבים פעם אחת.
const NEARBY_RADII_KM = [10, 25];
const MAX_NEARBY_RESULTS = 10;
const CLOSEST_ALWAYS_INCLUDED = 3;
// כמה מחירי סניף זולים לכל רשת נבדקים כמועמדים ל"הכי זול בכל הארץ"
const CHEAPEST_EXCEPTIONS_PER_CHAIN = 5;

type BranchLabel = { storeId: string; branchName: string; city: string };

export interface ScanPromo {
  description: string;
  // "3 ב-10": minQty=3, price=10
  minQty: number;
  price: number;
  unitPrice: number;
  clubOnly: boolean;
}

export interface ScanChainPrice {
  // ייחודי לשורה: chainId, או chainId:מותג לשורת מותג
  key: string;
  chainId: ChainId;
  // שם לתצוגה: שם הרשת או המותג
  chainName: string;
  // שורת מותג שמפורסם בתוך רשת אחרת (יש חסד, נטו חיסכון)
  isBrand: boolean;
  // המחיר שרוב סניפי הרשת (או המותג) גובים
  typicalPrice: number;
  // המחיר הזול ברשת והסניף שלו (אם ידוע)
  minPrice: number;
  cheapestBranch: BranchLabel | null;
  // בכמה סניפים נמצא המוצר בפיד האחרון
  branchesWithProduct: number | null;
  // המבצע הזול ברשת (לכלל הלקוחות קודם), ואם הוא לא בכל הסניפים
  promo: ScanPromo | null;
  promoAllBranches: boolean;
  updatedAt: string;
  stale: boolean;
}

export interface ScanNearbyBranch {
  chainId: ChainId;
  // שם לתצוגה: המותג אם הסניף שייך למותג (נטו חיסכון), אחרת הרשת
  chainName: string;
  storeId: string;
  branchName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distanceKm: number;
  distanceM: number;
  price: number;
  verified: boolean;
  promo: ScanPromo | null;
}

export interface ScanHere extends Omit<ScanNearbyBranch, 'price' | 'verified'> {
  // null = לרשת של הסניף הזה אין מחיר למוצר
  price: number | null;
  verified: boolean;
}

export interface ScanCheapest {
  chainId: ChainId;
  chainName: string;
  price: number;
  // null = זה המחיר ברוב סניפי הרשת, ולא בסניף מסוים
  branch: BranchLabel | null;
  chainTypicalPrice: number;
  // מחיר נמוך במיוחד בסניף בודד של הרשת (לא מה שישלמו בסניף אחר שלה)
  singleBranchDeal: boolean;
}

export interface BarcodeScanResult {
  barcode: string;
  productName: string;
  chains: ScanChainPrice[];
  cheapest: ScanCheapest;
  here: ScanHere | null;
  nearby: ScanNearbyBranch[] | null; // null = לא נשלח מיקום
  nearbyRadiusKm: number | null;
  // המחיר היקר ביותר בין הסניפים בטווח (לחישוב "כמה חוסכים"). null בלי מיקום.
  nearbyMaxPrice: number | null;
  // מתי עודכנו המחירים (העדכון האחרון מבין הרשתות), והאם רוב הרשתות לא עודכנו מזמן
  pricesAsOf: string;
  stale: boolean;
}

// מטמון קצר לנתוני המוצר (מחירים, רשתות, חריגות סניף, מבצעים), שלא תלויים במיקום:
// המחירים משתנים רק בסנכרון, וסריקה חוזרת של אותו מוצר נפוצה. המרחקים
// מחושבים מחדש בכל בקשה מהמיקום המדויק, כך שהם תמיד נכונים.
const PRODUCT_CACHE_TTL_MS = 10 * 60_000;
const PRODUCT_CACHE_MAX = 500;

interface ChainData {
  chainName: string;
  modalPrice?: number;
  coverage?: number;
  chainMin: number;
  exceptions: Map<string, number>;
  synced: Set<string>;
  promos: IPromotionDoc[];
  promoStoreIds: string[];
}

interface PreparedProduct {
  barcode: string;
  productName: string;
  chains: ScanChainPrice[];
  cheapest: ScanCheapest;
  byChain: Map<ChainId, ChainData>;
  pricesAsOf: Date;
  stale: boolean;
}

const productCache = new Map<string, { at: number; value: PreparedProduct | null }>();

async function prepareProduct(barcode: string): Promise<PreparedProduct | null> {
  const hit = productCache.get(barcode);
  if (hit && Date.now() - hit.at < PRODUCT_CACHE_TTL_MS) return hit.value;
  const value = await loadProduct(barcode);
  if (productCache.size >= PRODUCT_CACHE_MAX) {
    const oldest = productCache.keys().next().value;
    if (oldest !== undefined) productCache.delete(oldest);
  }
  productCache.set(barcode, { at: Date.now(), value });
  return value;
}

const toScanPromo = (p: IPromotionDoc, item: IPromotionDoc['items'][number]): ScanPromo => ({
  description: p.description,
  minQty: item.minQty,
  price: item.price,
  unitPrice: promoUnitPrice(item),
  clubOnly: p.clubOnly,
});

// המבצע הטוב ביותר למוצר: לכלל הלקוחות קודם, ואז מחיר ליחידה נמוך. storeIdx =
// רק מבצעים שתקפים בסניף הזה; undefined בלי סניף = כל פריט מבצע ברשת.
function bestPromo(
  promos: IPromotionDoc[], barcode: string, storeIdx: number | undefined | 'any',
): { promo: ScanPromo; allBranches: boolean } | null {
  let best: { promo: ScanPromo; allBranches: boolean } | null = null;
  for (const p of promos) {
    // סכום קנייה מינימלי בחשבונית: לא מחיר של המוצר עצמו
    if (p.minPurchaseAmount) continue;
    for (const item of p.items) {
      if (item.barcode !== barcode) continue;
      if (storeIdx !== 'any' && !promoItemAppliesToStore(item, storeIdx)) continue;
      const cand = { promo: toScanPromo(p, item), allBranches: item.stores === undefined };
      if (!best
        || Number(cand.promo.clubOnly) < Number(best.promo.clubOnly)
        || (cand.promo.clubOnly === best.promo.clubOnly && cand.promo.unitPrice < best.promo.unitPrice)) {
        best = cand;
      }
    }
  }
  return best;
}

async function loadProduct(barcode: string): Promise<PreparedProduct | null> {
  const docs = (await Price.find({ barcode }).select('+storePrices').lean<IPriceDoc[]>())
    .filter(d => d.blockedItem !== true && d.price > 0);
  if (docs.length === 0) return null;

  // השם הנפוץ ביותר בין הרשתות (כל רשת מנסחת מעט אחרת)
  const nameCounts = new Map<string, number>();
  for (const d of docs) nameCounts.set(d.itemName, (nameCounts.get(d.itemName) || 0) + 1);
  const productName = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const chainIds = docs.map(d => d.chainId);
  const promos = await PromotionDAL.findActiveForBarcodes([barcode], new Date(), chainIds).catch(() => []);

  const byChain = new Map<ChainId, ChainData>();
  await Promise.all(docs.map(async d => {
    const [synced, promoCov] = await Promise.all([
      BranchPriceDAL.storeIdsWithPrices(d.chainId),
      BranchPriceDAL.promoCoverage(d.chainId).catch(() => ({ storeIds: [] as string[] })),
    ]);
    byChain.set(d.chainId, {
      chainName: d.chainName,
      modalPrice: d.modalPrice,
      coverage: d.storeCoverage,
      chainMin: d.price,
      exceptions: parseStorePrices(d.storePrices),
      synced,
      promos: promos.filter(p => p.chainId === d.chainId),
      promoStoreIds: promoCov.storeIds,
    });
  }));

  const now = new Date();
  const chains: ScanChainPrice[] = [];
  const candidates: CheapestCandidate[] = [];

  for (const d of docs) {
    const data = byChain.get(d.chainId)!;
    const typical = d.modalPrice ?? d.price;
    const label = d.cheapestStoreId ? await getBranchLabel(d.chainId, d.cheapestStoreId).catch(() => null) : null;
    const chainPromo = bestPromo(data.promos, barcode, 'any');
    chains.push({
      key: d.chainId,
      chainId: d.chainId,
      chainName: d.chainName,
      isBrand: false,
      typicalPrice: typical,
      minPrice: d.price,
      cheapestBranch: label && d.cheapestStoreId ? { storeId: d.cheapestStoreId, branchName: label.branchName, city: label.city } : null,
      branchesWithProduct: d.storesWithPrice ?? null,
      promo: chainPromo?.promo ?? null,
      promoAllBranches: chainPromo?.allBranches ?? false,
      updatedAt: new Date(d.updatedAt).toISOString(),
      stale: isStale(new Date(d.updatedAt), now),
    });

    // מועמדים ל"הכי זול בכל הארץ": המחיר ברוב הסניפים, וכמה מהסניפים הזולים ממנו
    // שאפשר לזהות. מחיר בלי סניף מזוהה לא נכנס, כי אי אפשר להגיד ללקוח איפה הוא.
    candidates.push({ chainId: d.chainId, chainName: d.chainName, price: typical, branch: null, chainTypicalPrice: typical, branchCount: d.storesWithPrice ?? 1 });
    const cheaper = [...data.exceptions.entries()].filter(([, p]) => p < typical).sort((a, b) => a[1] - b[1]);
    if (cheaper.length === 0 && d.price < typical && d.cheapestStoreId) cheaper.push([normStoreId(d.cheapestStoreId), d.price]);
    for (const [storeId, price] of cheaper.slice(0, CHEAPEST_EXCEPTIONS_PER_CHAIN)) {
      const l = await getBranchLabel(d.chainId, storeId).catch(() => null);
      if (!l) continue;
      const brand = brandOfBranch(d.chainId, { subChainName: l.subChainName, storeName: l.branchName });
      candidates.push({
        chainId: d.chainId, chainName: brand?.name ?? d.chainName, price,
        branch: { storeId, branchName: l.branchName, city: l.city }, chainTypicalPrice: typical, branchCount: 1,
      });
    }
  }

  // שורות מותג: מחיר נפוץ בסניפי המותג שסונכרנו. בלי סניף מסונכרן של המותג אין
  // שורה, כדי לא להציג לו מחיר שלא נבדק בסניפים שלו.
  for (const brand of SUB_BRANDS) {
    const data = byChain.get(brand.chainId as ChainId);
    if (!data) continue;
    const doc = docs.find(d => d.chainId === brand.chainId)!;
    const branchPrices: Array<{ storeId: string; price: number; name: string; city: string }> = [];
    for (const b of await getChainBranches(brand.chainId as ChainId)) {
      if (brandOfBranch(brand.chainId, b) !== brand) continue;
      const id = normStoreId(b.storeId);
      if (!data.synced.has(id)) continue;
      const r = resolveBranchPrice({ explicit: data.exceptions.get(id), modalPrice: data.modalPrice, coverage: data.coverage, storeHasPrices: true, chainMin: data.chainMin });
      if (r.verified) branchPrices.push({ storeId: b.storeId, price: r.price, name: b.storeName, city: b.city || '' });
    }
    const typical = modalPrice(branchPrices.map(p => p.price));
    if (typical === null) continue;
    const min = branchPrices.reduce((a, b) => (b.price < a.price ? b : a));
    chains.push({
      key: `${brand.chainId}:${brand.name}`,
      chainId: brand.chainId as ChainId,
      chainName: brand.name,
      isBrand: true,
      typicalPrice: typical,
      minPrice: min.price,
      cheapestBranch: { storeId: min.storeId, branchName: min.name, city: min.city },
      branchesWithProduct: branchPrices.length,
      promo: null,
      promoAllBranches: false,
      updatedAt: new Date(doc.updatedAt).toISOString(),
      stale: isStale(new Date(doc.updatedAt), now),
    });
  }
  chains.sort((a, b) => a.typicalPrice - b.typicalPrice || a.minPrice - b.minPrice);

  const pick = pickCheapest(candidates)!;
  const cheapest: ScanCheapest = {
    chainId: pick.chainId as ChainId,
    chainName: pick.chainName,
    price: pick.price,
    branch: pick.branch,
    chainTypicalPrice: pick.chainTypicalPrice,
    singleBranchDeal: pick.singleBranchDeal,
  };

  const updates = docs.map(d => new Date(d.updatedAt));
  const pricesAsOf = new Date(Math.max(...updates.map(u => u.getTime())));
  // רוב הרשתות לא עודכנו: הסנכרון לא רץ, וזה חייב להיות גלוי ללקוח
  const stale = updates.filter(u => isStale(u, now)).length * 2 > updates.length;

  return { barcode, productName, chains, cheapest, byChain, pricesAsOf, stale };
}

// סניף מ-OpenStreetMap (מזהה osm-*) שנמצא ליד סניף רשמי של אותה רשת הוא אותו
// סניף פעמיים. נשאר הרשמי, כי רק לו יש מחיר סניף מהפורטל.
const OSM_DUPLICATE_RADIUS_M = 400;
function dropOsmDuplicates<T extends { chainId: string; storeId: string; lat: number; lng: number }>(branches: T[]): T[] {
  const official = branches.filter(b => !b.storeId.startsWith('osm-'));
  const near = (a: T, b: T) => {
    const dLat = (a.lat - b.lat) * 111_000;
    const dLng = (a.lng - b.lng) * 111_000 * Math.cos((a.lat * Math.PI) / 180);
    return Math.hypot(dLat, dLng) <= OSM_DUPLICATE_RADIUS_M;
  };
  return branches.filter(b => !b.storeId.startsWith('osm-') || !official.some(o => o.chainId === b.chainId && near(o, b)));
}

export async function scanBarcodePrices(
  barcode: string, user: UserLocation | null, accuracyM?: number,
): Promise<BarcodeScanResult | null> {
  const product = await prepareProduct(barcode);
  if (!product) return null;
  const { productName, chains, cheapest, byChain } = product;
  const base = { barcode, productName, chains, cheapest, pricesAsOf: product.pricesAsOf.toISOString(), stale: product.stale };

  if (!user) return { ...base, here: null, nearby: null, nearbyRadiusKm: null, nearbyMaxPrice: null };

  // חישוב מרחקים פעם אחת לטווח הרחב, ואז סינון לכל טווח
  const inMaxRadius = dropOsmDuplicates(await getBranchesWithin(user, NEARBY_RADII_KM[NEARBY_RADII_KM.length - 1]));

  const priceBranch = (b: (typeof inMaxRadius)[number]): ScanNearbyBranch | null => {
    const chain = byChain.get(b.chainId);
    if (!chain) return null;
    const storeId = normStoreId(b.storeId);
    // סניף שלא הופיע בפיד (שופרסל, למשל, מפרסמת מחירים לחלק מהסניפים) לא נזרק:
    // הוא מקבל את המחיר ברשת, מסומן "לא מאומת לסניף", כדי שהסופר שהמשתמש
    // נמצא בו או ליד יופיע תמיד
    const resolved = resolveBranchPrice({
      explicit: chain.exceptions.get(storeId),
      modalPrice: chain.modalPrice,
      coverage: chain.coverage,
      storeHasPrices: chain.synced.has(storeId),
      chainMin: chain.chainMin,
    });
    const brand = brandOfBranch(b.chainId, { subChainName: b.subChainName, storeName: b.storeName });
    return {
      chainId: b.chainId, chainName: brand?.name ?? b.chainName, storeId: b.storeId, branchName: b.storeName,
      address: b.address, city: b.city, lat: b.lat, lng: b.lng, distanceKm: b.distanceKm, distanceM: b.distanceM,
      price: resolved.price, verified: resolved.verified,
      promo: bestPromo(chain.promos, barcode, promoStoreIndex(b.storeId, chain.promoStoreIds))?.promo ?? null,
    };
  };

  // "אתה נמצא בסניף": הסניף הקרוב ביותר, אם המיקום מדויק מספיק וקרוב מספיק.
  // גם כשלרשת שלו אין מחיר למוצר - אז אומרים את זה במפורש.
  const closest = inMaxRadius[0];
  let here: ScanHere | null = null;
  if (closest && isAtStore(closest.distanceM, accuracyM)) {
    const priced = priceBranch(closest);
    const brand = brandOfBranch(closest.chainId, { subChainName: closest.subChainName, storeName: closest.storeName });
    here = priced ?? {
      chainId: closest.chainId, chainName: brand?.name ?? closest.chainName, storeId: closest.storeId, branchName: closest.storeName,
      address: closest.address, city: closest.city, lat: closest.lat, lng: closest.lng,
      distanceKm: closest.distanceKm, distanceM: closest.distanceM, price: null, verified: false, promo: null,
    };
  }

  let nearby: ScanNearbyBranch[] = [];
  let radiusUsed = NEARBY_RADII_KM[0];
  for (const radius of NEARBY_RADII_KM) {
    radiusUsed = radius;
    nearby = inMaxRadius.filter(b => b.distanceKm <= radius).map(priceBranch).filter((b): b is ScanNearbyBranch => b !== null);
    if (nearby.length > 0) break;
  }

  // הזול קודם; במחיר זהה מחיר מאומת לסניף קודם, ואחריו הקרוב.
  nearby.sort((a, b) => a.price - b.price || Number(b.verified) - Number(a.verified) || a.distanceM - b.distanceM);
  // הזולים ביותר, ובנוסף הקרובים ביותר (גם אם יקרים יותר), כדי שמיון "לפי
  // מרחק" בלקוח יציג באמת את הסניפים הכי קרובים.
  const cheapestFirst = nearby.slice(0, MAX_NEARBY_RESULTS);
  const closestThree = [...nearby].sort((a, b) => a.distanceM - b.distanceM).slice(0, CLOSEST_ALWAYS_INCLUDED);
  const picked = [...cheapestFirst, ...closestThree.filter(c => !cheapestFirst.includes(c))];
  const nearbyMaxPrice = nearby.length > 0 ? Math.max(...nearby.map(n => n.price)) : null;
  return { ...base, here, nearby: picked, nearbyRadiusKm: radiusUsed, nearbyMaxPrice };
}
