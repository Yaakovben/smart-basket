/**
 * בדיקת קצה לקצה מול הפורטל הרשמי, בלי מסד נתונים.
 *
 * רשת אחת → סניף אחד → מוצר אחד → מחיר אחד → מבצע אחד. עובר באותו מסלול כמו
 * הסנכרון: הורדה, פענוח, בדיקת תקינות, צבירה, וחישוב מחיר בסניף עם מבצע.
 * לא כותב למונגו, כדי שאפשר להריץ מכל מקום בלי לגעת בנתוני הייצור.
 *
 * הרצה:
 *   npx ts-node --transpile-only src/features/priceComparison/scripts/e2e-price-check.ts [chainId]
 * ברירת מחדל: shufersal
 */

import * as chains from '../chains';
import { parsePromoBuffer } from '../chains/promoXmlParser';
import { collectPriceFeedStats, validatePriceFeed, validateStoresFeed } from '../services/syncValidation';
import { buildBarcodeStats, resolveBranchPrice, isPriceException } from '../services/branchPricing';
import { PromoAccumulator, promoItemAppliesToStore, promoStoreIndex, promoUnitPrice } from '../services/promoAggregation';
import { priceLine } from '../services/basketMath';
import { normStoreId } from '../services/storeId';
import type { ChainAdapter } from '../chains/types';

const adapters = Object.values(chains).filter((v): v is ChainAdapter =>
  typeof v === 'object' && v !== null && 'chainId' in v && 'fetchLatestPrices' in v);

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const chainId = process.argv[2] ?? 'shufersal';
  const adapter = adapters.find(a => a.chainId === chainId) ?? fail(`unknown chain ${chainId}`);
  console.log(`== ${adapter.chainName} (${chainId})`);

  // 1. סניפים
  if (!adapter.fetchLatestStores) fail('adapter has no stores support');
  const stores = await adapter.fetchLatestStores();
  if (stores.error) fail(`stores: ${stores.error}`);
  const storesOk = validateStoresFeed(stores.stores.length);
  console.log(`✓ Stores: ${stores.stores.length} branches, validation=${storesOk.ok ? 'ok' : storesOk.reason}`);

  // 2. מחירים מלאים
  const t0 = Date.now();
  const prices = await adapter.fetchLatestPrices();
  if (prices.error) fail(`prices: ${prices.error}`);
  const stats = collectPriceFeedStats(prices.items);
  const priceOk = validatePriceFeed(stats);
  if (!priceOk.ok) fail(`price validation: ${priceOk.reason}`);
  // סקריפט בדיקה: עותק של כל השורות מותר כאן
  const valid = [...prices.items].filter(it => it.storeId && it.price > 0 && it.price <= 10_000 && it.blockedItem !== true);
  const feedStores = new Set(valid.map(it => normStoreId(it.storeId!)));
  const barcodeStats = buildBarcodeStats(valid.map(it => ({ storeId: normStoreId(it.storeId!), barcode: it.barcode, price: it.price })), feedStores.size);
  console.log(`✓ PriceFull: ${prices.fetchedFiles} files, ${stats.total} rows, ${stats.distinctBarcodes} barcodes, ${feedStores.size} branches, ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // 3. מבצעים מלאים, לסניפים שיש להם מחירים (כמה קבצים, לא כל הרשת)
  if (!adapter.listPromoFullFiles) fail('adapter has no promo support');
  const promoFiles = (await adapter.listPromoFullFiles()).filter(f => f.storeId && feedStores.has(normStoreId(f.storeId)));
  if (promoFiles.length === 0) fail('no PromoFull file for a branch with prices');
  const acc = new PromoAccumulator();
  let filesOk = 0;
  for (const f of promoFiles.slice(0, 3)) {
    try {
      acc.addFile(parsePromoBuffer(await f.download()), f.storeId);
      filesOk++;
    } catch (e) {
      console.warn(`  promo file ${f.fileName} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  const knownBarcodes = new Set(valid.map(it => it.barcode));
  const { promotions } = acc.finish(knownBarcodes);
  console.log(`✓ PromoFull: ${filesOk}/${Math.min(3, promoFiles.length)} files (of ${promoFiles.length} listed), ${acc.stats.promotionsSeen} promotions seen, ${promotions.length} kept, skipped=${JSON.stringify(acc.stats.skipped)}`);

  // 4. סניף אחד, מוצר אחד עם מבצע תקף לכלל הלקוחות בסניף
  for (const storeId of acc.storeIds) {
    const branch = stores.stores.find(s => normStoreId(s.storeId) === storeId);
    const storeIdx = promoStoreIndex(storeId, acc.storeIds);
    for (const p of promotions) {
      if (p.clubOnly || p.minPurchaseAmount) continue;
      for (const item of p.items) {
        if (!promoItemAppliesToStore(item, storeIdx)) continue;
        const row = valid.find(it => it.barcode === item.barcode && normStoreId(it.storeId!) === storeId);
        const st = barcodeStats.get(item.barcode);
        if (!row || !st) continue;
        const explicit = isPriceException(row.price, st) ? row.price : undefined;
        const resolved = resolveBranchPrice({ explicit, modalPrice: st.modalPrice, coverage: st.coverage, storeHasPrices: true, chainMin: row.price });
        const offer = { promotionId: p.promotionId, description: p.description, minQty: item.minQty, price: item.price };
        const line = priceLine(Math.ceil(item.minQty), resolved.price, [offer]);
        if (!line.promotion) continue;
        console.log('✓ End-to-end:');
        console.log(`  branch:    ${storeId} ${branch?.storeName ?? '(not in stores file)'}${branch?.city ? `, ${branch.city}` : ''}`);
        console.log(`  product:   ${item.barcode} ${row.itemName}`);
        console.log(`  price:     ₪${resolved.price} (${resolved.inferred ? 'chain typical, inferred' : 'explicit for branch'}; feed row ₪${row.price})`);
        console.log(`  promotion: ${p.promotionId} "${p.description}" = ${item.minQty} for ₪${item.price} (₪${promoUnitPrice(item)}/unit), until ${p.endDate?.toISOString().slice(0, 10) ?? '-'}`);
        console.log(`  basket:    ${line.quantity} units regular ₪${line.regularTotal} → with promo ₪${line.total}`);
        if (resolved.price !== row.price) fail('resolved branch price differs from the feed row');
        return;
      }
    }
  }
  fail('no product with an active promotion that lowers the price was found');
}

main().then(() => process.exit(0), err => fail(err instanceof Error ? err.stack ?? err.message : String(err)));
