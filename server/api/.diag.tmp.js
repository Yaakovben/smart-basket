process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const c = require('./dist/features/priceComparison/chains');
const which = { victory: c.victoryAdapter, maayan: c.maayan2000Adapter, shefa: c.shefaBirkatHashemAdapter, sapir: c.superSapirAdapter, shufersal: c.shufersalAdapter, carrefour: c.carrefourAdapter };
(async () => {
  await Promise.all(Object.entries(which).map(async ([k, a]) => {
    try {
      const r = await a.fetchLatestPrices();
      const stores = new Set(r.items.map(i => i.storeId)).size;
      console.log(`${k}: items=${r.items.length} stores=${stores} files=${r.fetchedFiles} error=${r.error}`);
    } catch (e) { console.log(`${k}: THROW ${e.message}`); }
  }));
})();
