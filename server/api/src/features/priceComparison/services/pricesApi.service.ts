/**
 * שכבת השירות של ה-API הכללי למחירים: רשתות, סניפים, מחיר מוצר בסניף, השוואת
 * מוצר בין רשתות והשוואת סל לפי ברקודים.
 *
 * מחיר בסניף מחושב כמו בשאר הפיצ'ר (services/branchPricing.ts): חריגה שמורה
 * לסניף, אחרת המחיר הנפוץ ברשת כשהסניף סונכרן והמוצר נפוץ, אחרת מחיר רשת
 * שמסומן "לא מאומת". על זה מופעלים מבצעים שתקפים בסניף.
 */

import { Types } from 'mongoose';
import { Price, type IPriceDoc, type ChainId } from '../models/Price.model';
import { Branch, type IBranchDoc } from '../models/Branch.model';
import { BranchPriceDAL } from '../dal/branchPrice.dal';
import { PromotionDAL } from '../dal/promotion.dal';
import { PriceSyncLogDAL } from '../dal/priceSyncLog.dal';
import { parseStorePrices, resolveBranchPrice } from './branchPricing';
import { promoItemAppliesToStore, promoStoreIndex, promoUnitPrice, bitmapCount } from './promoAggregation';
import { priceLine, compareBaskets, type PromoOffer, type LineResult } from './basketMath';
import { normStoreId } from './storeId';
import { getRegisteredChains } from './priceSync.service';
import { PRICE_SOURCES } from '../data/price-sources.data';
import { NotFoundError } from '../../../errors';
import type { IPromotionDoc } from '../models/Promotion.model';

type LeanPrice = Pick<IPriceDoc, 'barcode' | 'itemName' | 'chainId' | 'chainName' | 'price' | 'modalPrice' | 'storeCoverage' | 'priceMin' | 'priceMax' | 'storesWithPrice' | 'storePrices' | 'updatedAt' | 'manufacturerName' | 'unitQty' | 'quantity'>;
type LeanBranch = Pick<IBranchDoc, '_id' | 'chainId' | 'chainName' | 'storeId' | 'storeName' | 'address' | 'city' | 'lat' | 'lng' | 'subChainName'>;

const BRANCH_FIELDS = { chainId: 1, chainName: 1, storeId: 1, storeName: 1, address: 1, city: 1, lat: 1, lng: 1, subChainName: 1 };

function branchDto(b: LeanBranch) {
  return {
    branchId: b._id.toString(),
    chainId: b.chainId,
    chainName: b.chainName,
    externalBranchId: b.storeId,
    name: b.storeName,
    subChainName: b.subChainName,
    address: b.address,
    city: b.city,
    latitude: b.lat,
    longitude: b.lng,
  };
}

interface PromoForProduct {
  promotionId: string;
  description: string;
  minQty: number;
  promoPrice: number;
  promoUnitPrice: number;
  startDate?: Date;
  endDate?: Date;
  clubOnly: boolean;
  minPurchaseAmount?: number;
  // בכמה סניפים הפריט תקף (בהשוואה בין רשתות)
  branches?: number;
}

// פריטי המבצעים של ברקוד. storeIdx = לסניף מסוים (רק פריטים שתקפים בו); בלי = כל פריט,
// עם מספר הסניפים שבהם הוא תקף (totalStores = כמה סניפים סונכרנו)
function promosForBarcode(promos: IPromotionDoc[], barcode: string, where: { storeIdx: number | undefined } | { totalStores: number }): PromoForProduct[] {
  const out: PromoForProduct[] = [];
  for (const p of promos) {
    for (const item of p.items) {
      if (item.barcode !== barcode) continue;
      if ('storeIdx' in where && !promoItemAppliesToStore(item, where.storeIdx)) continue;
      out.push({
        promotionId: p.promotionId,
        description: p.description,
        minQty: item.minQty,
        promoPrice: item.price,
        promoUnitPrice: promoUnitPrice(item),
        startDate: p.startDate,
        endDate: p.endDate,
        clubOnly: p.clubOnly,
        minPurchaseAmount: p.minPurchaseAmount,
        branches: 'totalStores' in where ? (item.stores ? bitmapCount(item.stores) : where.totalStores) : undefined,
      });
    }
  }
  return out;
}

// מבצעים שאפשר להפעיל בחישוב: לא למועדון (אלא אם ביקשו), בלי סכום קנייה מינימלי
function toOffers(promos: PromoForProduct[], includeClub: boolean): PromoOffer[] {
  return promos
    .filter(p => !p.minPurchaseAmount && (!p.clubOnly || includeClub))
    .map(p => ({ promotionId: p.promotionId, description: p.description, minQty: p.minQty, price: p.promoPrice }));
}

// מחיר מוצר בסניף מתוך מסמך ה-Price ונתוני הכיסוי
function priceAtBranch(doc: LeanPrice, storeId: string, pricedStores: Set<string>) {
  const id = normStoreId(storeId);
  const explicit = parseStorePrices(doc.storePrices).get(id);
  return resolveBranchPrice({
    explicit,
    modalPrice: doc.modalPrice,
    coverage: doc.storeCoverage,
    storeHasPrices: pricedStores.has(id),
    chainMin: doc.price,
  });
}

// ===== רשתות וסניפים =====

export async function listChains() {
  const [branchCounts, logs] = await Promise.all([
    Branch.aggregate<{ _id: { chainId: string; subChainName?: string }; count: number }>([
      { $group: { _id: { chainId: '$chainId', subChainName: '$subChainName' }, count: { $sum: 1 } } },
    ]),
    PriceSyncLogDAL.latestPerChain(),
  ]);
  return getRegisteredChains().map(c => {
    const subChains = branchCounts
      .filter(b => b._id.chainId === c.chainId && b._id.subChainName)
      .map(b => ({ name: b._id.subChainName as string, branches: b.count }))
      .sort((a, b) => b.branches - a.branches);
    const branches = branchCounts.filter(b => b._id.chainId === c.chainId).reduce((s, b) => s + b.count, 0);
    const lastSync = Object.fromEntries(
      logs.filter(l => l.chainId === c.chainId).map(l => [l.type, { status: l.status, at: l.finishedAt ?? l.startedAt, error: l.error }])
    );
    return {
      chainId: c.chainId,
      chainName: c.chainName,
      branches,
      subChains,
      // מותגים שמפורסמים בתוך הרשת הזו (יש חסד, נטו חיסכון)
      brands: PRICE_SOURCES.filter(s => s.chainId === c.chainId && s.subChainName).map(s => ({ key: s.key, name: s.displayName, subChainName: s.subChainName })),
      source: PRICE_SOURCES.find(s => s.chainId === c.chainId && !s.subChainName)?.officialSource,
      lastSync,
    };
  });
}

export async function listChainBranchesApi(chainId: string, subChain?: string) {
  const filter: Record<string, unknown> = { chainId };
  if (subChain) filter.subChainName = subChain;
  const branches = await Branch.find(filter, BRANCH_FIELDS).sort({ city: 1, storeName: 1 }).lean<LeanBranch[]>();
  return branches.map(branchDto);
}

// ===== מחיר מוצר בסניף =====

export async function getBranchProduct(branchId: string, barcode: string, includeClub: boolean) {
  const branch = await Branch.findById(branchId, BRANCH_FIELDS).lean<LeanBranch>();
  if (!branch) throw NotFoundError.branch();
  const chainId = branch.chainId as ChainId;
  const [doc, pricedStores, promoCov, promos] = await Promise.all([
    Price.findOne({ barcode, chainId }).select('+storePrices').lean<LeanPrice>(),
    BranchPriceDAL.storeIdsWithPrices(chainId),
    BranchPriceDAL.promoCoverage(chainId),
    PromotionDAL.findActiveForBarcodes([barcode], new Date(), [chainId]),
  ]);
  if (!doc) throw NotFoundError.product();
  const resolved = priceAtBranch(doc, branch.storeId, pricedStores);
  const storeIdx = promoStoreIndex(branch.storeId, promoCov.storeIds);
  const branchPromos = promosForBarcode(promos, barcode, { storeIdx });
  const best = priceLine(1, resolved.price, toOffers(branchPromos, includeClub));
  return {
    branch: branchDto(branch),
    product: { barcode, name: doc.itemName, manufacturer: doc.manufacturerName, quantity: doc.quantity, unit: doc.unitQty },
    price: resolved.price,
    currency: 'ILS' as const,
    priceVerifiedForBranch: resolved.verified,
    priceInferredFromChain: resolved.inferred,
    // האם יש בכלל מידע מבצעים לסניף הזה (אחרת "אין מבצעים" לא אומר כלום)
    promotionsKnownForBranch: storeIdx !== undefined,
    promotions: branchPromos,
    bestSingleUnitPrice: best.total,
    priceUpdatedAt: doc.updatedAt,
  };
}

// ===== השוואת מוצר בין רשתות =====

export async function compareProduct(barcode: string) {
  const docs = await Price.find({ barcode }).lean<LeanPrice[]>();
  if (docs.length === 0) throw NotFoundError.product();
  const chainIds = docs.map(d => d.chainId);
  const [promos, coverage] = await Promise.all([
    PromotionDAL.findActiveForBarcodes([barcode], new Date(), chainIds),
    Promise.all(chainIds.map(async c => [c, await BranchPriceDAL.promoCoverage(c)] as const)),
  ]);
  const covByChain = new Map(coverage);
  const chains = docs.map(d => ({
    chainId: d.chainId,
    chainName: d.chainName,
    name: d.itemName,
    // המחיר הנפוץ ברשת = מה שמשלמים בסניף רגיל
    typicalPrice: d.modalPrice ?? d.price,
    minPrice: d.priceMin ?? d.price,
    maxPrice: d.priceMax ?? d.price,
    branchesWithProduct: d.storesWithPrice,
    promotions: promosForBarcode(promos.filter(p => p.chainId === d.chainId), barcode, { totalStores: covByChain.get(d.chainId)?.storeIds.length ?? 0 }),
    priceUpdatedAt: d.updatedAt,
  })).sort((a, b) => a.typicalPrice - b.typicalPrice);
  return { barcode, name: chains[0].name, chains };
}

// ===== השוואת סל =====

export interface BasketItemInput {
  barcode: string;
  quantity: number;
}

export async function compareBasket(items: BasketItemInput[], branchIds: string[], includeClub: boolean) {
  // אותו ברקוד פעמיים = כמות מצטברת
  const qtyByBarcode = new Map<string, number>();
  for (const it of items) qtyByBarcode.set(it.barcode, (qtyByBarcode.get(it.barcode) ?? 0) + it.quantity);
  const barcodes = [...qtyByBarcode.keys()];

  const branches = await Branch.find({ _id: { $in: branchIds.map(id => new Types.ObjectId(id)) } }, BRANCH_FIELDS).lean<LeanBranch[]>();
  const chainIds = [...new Set(branches.map(b => b.chainId as ChainId))];
  const [docs, promos, coverage] = await Promise.all([
    Price.find({ chainId: { $in: chainIds }, barcode: { $in: barcodes } }).select('+storePrices').lean<LeanPrice[]>(),
    PromotionDAL.findActiveForBarcodes(barcodes, new Date(), chainIds),
    Promise.all(chainIds.map(async c => [c, {
      priced: await BranchPriceDAL.storeIdsWithPrices(c),
      promo: await BranchPriceDAL.promoCoverage(c),
    }] as const)),
  ]);
  const coverageByChain = new Map<string, { priced: Set<string>; promo: { storeIds: string[] } }>(coverage);
  const docByKey = new Map(docs.map(d => [`${d.chainId}|${d.barcode}`, d]));

  const results = branches.map(branch => {
    const cov = coverageByChain.get(branch.chainId)!;
    const chainPromos = promos.filter(p => p.chainId === branch.chainId);
    const storeIdx = promoStoreIndex(branch.storeId, cov.promo.storeIds);
    const lines: Array<LineResult & { barcode: string; name: string; priceVerified: boolean }> = [];
    const missing: string[] = [];
    for (const [barcode, quantity] of qtyByBarcode) {
      const doc = docByKey.get(`${branch.chainId}|${barcode}`);
      if (!doc) { missing.push(barcode); continue; }
      const resolved = priceAtBranch(doc, branch.storeId, cov.priced);
      const offers = toOffers(promosForBarcode(chainPromos, barcode, { storeIdx }), includeClub);
      lines.push({ ...priceLine(quantity, resolved.price, offers), barcode, name: doc.itemName, priceVerified: resolved.verified });
    }
    const basketTotal = Math.round(lines.reduce((s, l) => s + l.total, 0) * 100) / 100;
    const regularTotal = Math.round(lines.reduce((s, l) => s + l.regularTotal, 0) * 100) / 100;
    return {
      ...branchDto(branch),
      basketTotal,
      regularTotal,
      promoSavings: Math.round((regularTotal - basketTotal) * 100) / 100,
      itemsFound: lines.length,
      itemsMissing: missing,
      allPricesVerified: lines.every(l => l.priceVerified),
      promotionsKnownForBranch: storeIdx !== undefined,
      lines,
    };
  });

  results.sort(compareBaskets);
  const foundIds = new Set(branches.map(b => b._id.toString()));
  return {
    itemsRequested: barcodes.length,
    currency: 'ILS' as const,
    results,
    unknownBranchIds: branchIds.filter(id => !foundIds.has(id)),
  };
}
