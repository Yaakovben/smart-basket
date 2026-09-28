/**
 * סריקת מוצר: איפה הכי זול. מקבל ברקוד ומיקום (אופציונלי) ומחזיר:
 *  - nearby:   הסניפים הזולים בטווח מהמשתמש, עם מרחק
 *  - cheapest: המחיר הזול ביותר שנמצא בכל הארץ והסניף שבו הוא נמצא
 *  - chains:   מחיר נפוץ לכל רשת, מהזול ליקר
 *
 * מחיר בסניף מחושב כמו בהשוואת הרשימות (resolveBranchPrice). מחיר שלא אומת
 * לסניף מסומן verified=false, כדי שהלקוח יציג "מחיר ברשת" ולא יציג אותו
 * כמחיר מדויק לסניף.
 */
import { Price, type ChainId } from '../models/Price.model';
import { BranchPriceDAL } from '../dal/branchPrice.dal';
import { parseStorePrices, resolveBranchPrice } from './branchPricing';
import { getBranchesWithin, getBranchLabel, type UserLocation } from './branches.service';
import { normStoreId } from './storeId';

// קודם מחפשים ממש קרוב; אם אין שם אף סניף עם המוצר, מרחיבים פעם אחת.
const NEARBY_RADII_KM = [10, 25];
const MAX_NEARBY_RESULTS = 10;
const CLOSEST_ALWAYS_INCLUDED = 3;

type BranchLabel = { storeId: string; branchName: string; city: string };

export interface ScanChainPrice {
  chainId: ChainId;
  chainName: string;
  // המחיר שרוב סניפי הרשת גובים
  typicalPrice: number;
  // המחיר הזול ביותר ברשת והסניף שלו (אם ידוע)
  minPrice: number;
  cheapestBranch: BranchLabel | null;
}

export interface ScanNearbyBranch {
  chainId: ChainId;
  chainName: string;
  storeId: string;
  branchName: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  distanceKm: number;
  price: number;
  verified: boolean;
}

export interface BarcodeScanResult {
  barcode: string;
  productName: string;
  chains: ScanChainPrice[];
  cheapest: { chainId: ChainId; chainName: string; price: number; branch: BranchLabel | null };
  nearby: ScanNearbyBranch[] | null; // null = לא נשלח מיקום
  nearbyRadiusKm: number | null;
  // המחיר היקר ביותר בין הסניפים בטווח (לחישוב "כמה חוסכים"). null בלי מיקום.
  nearbyMaxPrice: number | null;
}

// מטמון קצר לנתוני המוצר (מחירים, רשתות, חריגות סניף), שלא תלויים במיקום:
// המחירים משתנים רק בסנכרון, וסריקה חוזרת של אותו מוצר נפוצה. המרחקים
// מחושבים מחדש בכל בקשה מהמיקום המדויק, כך שהם תמיד נכונים.
const PRODUCT_CACHE_TTL_MS = 10 * 60_000;
const PRODUCT_CACHE_MAX = 500;

interface PreparedProduct {
  productName: string;
  chains: ScanChainPrice[];
  cheapest: BarcodeScanResult['cheapest'];
  byChain: Map<ChainId, { modalPrice?: number; coverage?: number; chainMin: number; exceptions: Map<string, number>; synced: Set<string> }>;
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

async function loadProduct(barcode: string): Promise<PreparedProduct | null> {
  const docs = (await Price.find({ barcode }).select('+storePrices').lean())
    .filter(d => d.blockedItem !== true && d.price > 0);
  if (docs.length === 0) return null;

  // השם הנפוץ ביותר בין הרשתות (כל רשת מנסחת מעט אחרת)
  const nameCounts = new Map<string, number>();
  for (const d of docs) nameCounts.set(d.itemName, (nameCounts.get(d.itemName) || 0) + 1);
  const productName = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const chains: ScanChainPrice[] = await Promise.all(docs.map(async d => {
    const label = d.cheapestStoreId ? await getBranchLabel(d.chainId, d.cheapestStoreId).catch(() => null) : null;
    return {
      chainId: d.chainId,
      chainName: d.chainName,
      typicalPrice: d.modalPrice ?? d.price,
      minPrice: d.price,
      cheapestBranch: label && d.cheapestStoreId ? { storeId: d.cheapestStoreId, ...label } : null,
    };
  }));
  chains.sort((a, b) => a.typicalPrice - b.typicalPrice || a.minPrice - b.minPrice);

  const best = [...chains].sort((a, b) => a.minPrice - b.minPrice)[0];
  const cheapest = { chainId: best.chainId, chainName: best.chainName, price: best.minPrice, branch: best.cheapestBranch };

  const byChain: PreparedProduct['byChain'] = new Map();
  await Promise.all(docs.map(async d => {
    byChain.set(d.chainId, {
      modalPrice: d.modalPrice,
      coverage: d.storeCoverage,
      chainMin: d.price,
      exceptions: parseStorePrices(d.storePrices),
      synced: await BranchPriceDAL.storeIdsWithPrices(d.chainId),
    });
  }));

  return { productName, chains, cheapest, byChain };
}

export async function scanBarcodePrices(barcode: string, user: UserLocation | null): Promise<BarcodeScanResult | null> {
  const product = await prepareProduct(barcode);
  if (!product) return null;
  const { productName, chains, cheapest, byChain } = product;

  if (!user) return { barcode, productName, chains, cheapest, nearby: null, nearbyRadiusKm: null, nearbyMaxPrice: null };

  // חישוב מרחקים פעם אחת לטווח הרחב, ואז סינון לכל טווח
  const inMaxRadius = await getBranchesWithin(user, NEARBY_RADII_KM[NEARBY_RADII_KM.length - 1]);
  let nearby: ScanNearbyBranch[] = [];
  let radiusUsed = NEARBY_RADII_KM[0];
  for (const radius of NEARBY_RADII_KM) {
    radiusUsed = radius;
    nearby = [];
    for (const b of inMaxRadius) {
      if (b.distanceKm > radius) continue;
      const chain = byChain.get(b.chainId);
      if (!chain) continue;
      const storeId = normStoreId(b.storeId);
      // רשת שסונכרנה ברמת סניף אבל הסניף הזה לא הופיע בפיד: לא ידוע שהוא מוכר את המוצר
      if (chain.synced.size > 0 && !chain.synced.has(storeId)) continue;
      const resolved = resolveBranchPrice({
        explicit: chain.exceptions.get(storeId),
        modalPrice: chain.modalPrice,
        coverage: chain.coverage,
        storeHasPrices: chain.synced.has(storeId),
        chainMin: chain.chainMin,
      });
      nearby.push({
        chainId: b.chainId, chainName: b.chainName, storeId: b.storeId, branchName: b.storeName,
        address: b.address, city: b.city, lat: b.lat, lng: b.lng, distanceKm: b.distanceKm,
        price: resolved.price, verified: resolved.verified,
      });
    }
    if (nearby.length > 0) break;
  }

  // הזול קודם; במחיר זהה מחיר מאומת לסניף קודם, ואחריו הקרוב.
  nearby.sort((a, b) => a.price - b.price || Number(b.verified) - Number(a.verified) || a.distanceKm - b.distanceKm);
  // הזולים ביותר, ובנוסף הקרובים ביותר (גם אם יקרים יותר), כדי שמיון "לפי
  // מרחק" בלקוח יציג באמת את הסניפים הכי קרובים.
  const cheapestFirst = nearby.slice(0, MAX_NEARBY_RESULTS);
  const closest = [...nearby].sort((a, b) => a.distanceKm - b.distanceKm).slice(0, CLOSEST_ALWAYS_INCLUDED);
  const picked = [...cheapestFirst, ...closest.filter(c => !cheapestFirst.includes(c))];
  const nearbyMaxPrice = nearby.length > 0 ? Math.max(...nearby.map(n => n.price)) : null;
  return { barcode, productName, chains, cheapest, nearby: picked, nearbyRadiusKm: radiusUsed, nearbyMaxPrice };
}
