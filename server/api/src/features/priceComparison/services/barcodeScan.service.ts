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
const MAX_NEARBY_RESULTS = 8;

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
}

export async function scanBarcodePrices(barcode: string, user: UserLocation | null): Promise<BarcodeScanResult | null> {
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

  if (!user) return { barcode, productName, chains, cheapest, nearby: null, nearbyRadiusKm: null };

  const docByChain = new Map(docs.map(d => [d.chainId, d]));
  const synced = new Map<ChainId, Set<string>>();
  await Promise.all([...docByChain.keys()].map(async c => { synced.set(c, await BranchPriceDAL.storeIdsWithPrices(c)); }));
  const exceptionsByChain = new Map([...docByChain].map(([c, d]) => [c, parseStorePrices(d.storePrices)]));

  let nearby: ScanNearbyBranch[] = [];
  let radiusUsed = NEARBY_RADII_KM[0];
  for (const radius of NEARBY_RADII_KM) {
    radiusUsed = radius;
    nearby = [];
    for (const b of await getBranchesWithin(user, radius)) {
      const doc = docByChain.get(b.chainId);
      if (!doc) continue;
      const storeId = normStoreId(b.storeId);
      const syncedStores = synced.get(b.chainId) ?? new Set<string>();
      // רשת שסונכרנה ברמת סניף אבל הסניף הזה לא הופיע בפיד: לא ידוע שהוא מוכר את המוצר
      if (syncedStores.size > 0 && !syncedStores.has(storeId)) continue;
      const resolved = resolveBranchPrice({
        explicit: exceptionsByChain.get(b.chainId)?.get(storeId),
        modalPrice: doc.modalPrice,
        coverage: doc.storeCoverage,
        storeHasPrices: syncedStores.has(storeId),
        chainMin: doc.price,
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
  return { barcode, productName, chains, cheapest, nearby: nearby.slice(0, MAX_NEARBY_RESULTS), nearbyRadiusKm: radiusUsed };
}
