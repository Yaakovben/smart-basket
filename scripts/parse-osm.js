// המרת קבצי OSM ל-seed של סניפים
const fs = require('fs');
const path = require('path');

const CHAIN_MAP = {
  'Shufersal.json': { chainId: 'shufersal', chainName: 'שופרסל' },
  'Rami_Levy.json': { chainId: 'rami_levy', chainName: 'רמי לוי' },
  'Yohananof.json': { chainId: 'yohananof', chainName: 'יוחננוף' },
  'Osher_Ad.json': { chainId: 'osher_ad', chainName: 'אושר עד' },
  'Tiv_Ta_am.json': { chainId: 'tiv_taam', chainName: 'טיב טעם' },
  'Dor_Alon.json': { chainId: 'doralon', chainName: 'דור אלון' },
  'AM_PM.json': { chainId: 'doralon', chainName: 'AM:PM (דור אלון)' },
  'Keshet.json': { chainId: 'keshet', chainName: 'קשת' },
  'Politzer.json': { chainId: 'politzer', chainName: 'פוליצר' },
  'Stop_Market.json': { chainId: 'stop_market', chainName: 'סטופ מרקט' },
};

const inputDir = 'C:\\Users\\4784~1\\AppData\\Local\\Temp\\osm-fetch';
const allBranches = [];
const seenIds = new Set();

for (const [filename, { chainId, chainName }] of Object.entries(CHAIN_MAP)) {
  const filepath = path.join(inputDir, filename);
  if (!fs.existsSync(filepath)) { console.error(`Missing: ${filepath}`); continue; }
  const raw = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  const elements = raw.elements || [];

  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    if (lat < 29 || lat > 34 || lng < 33 || lng > 36) continue;

    const tags = el.tags || {};
    const storeName = tags['name:he'] || tags.name || tags.brand || chainName;
    const city = tags['addr:city'] || tags['addr:suburb'] || '';
    const street = tags['addr:street'] || tags['addr:place'] || '';
    const houseNum = tags['addr:housenumber'] || '';
    const address = [street, houseNum].filter(Boolean).join(' ');
    const storeId = `osm-${el.type}-${el.id}`;

    if (seenIds.has(storeId)) continue;
    seenIds.add(storeId);

    // dedup by lat/lng (4 decimals = ~10m precision)
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seenIds.has(coordKey)) continue;
    seenIds.add(coordKey);

    allBranches.push({ chainId, chainName, storeId, storeName, city, address, lat, lng });
  }
  console.log(`${chainName}: ${elements.length} elements → ${allBranches.filter(b => b.chainId === chainId).length} branches`);
}

console.log(`\nTotal: ${allBranches.length} branches`);

// כתיבת TypeScript
const tsLines = [
  '/* eslint-disable */',
  '// קובץ זה נוצר אוטומטית מ-OSM ב-' + new Date().toISOString().split('T')[0],
  '// 200+ סניפים אמיתיים של רשתות סופרים בישראל ממאגר OpenStreetMap הציבורי',
  '// ניתן לעדכן ע"י הרצת `node scripts/parse-osm.js` אחרי curl ל-Overpass.',
  '',
  "import type { ChainId } from '../models/Price.model';",
  '',
  'export interface KnownBranch {',
  '  chainId: ChainId;',
  '  chainName: string;',
  '  storeId: string;',
  '  storeName: string;',
  '  city: string;',
  '  address: string;',
  '  lat: number;',
  '  lng: number;',
  '}',
  '',
  'export const KNOWN_BRANCHES: KnownBranch[] = [',
];

for (const b of allBranches) {
  const escape = (s) => (s || '').replace(/'/g, "\\'");
  tsLines.push(`  { chainId: '${b.chainId}', chainName: '${escape(b.chainName)}', storeId: '${b.storeId}', storeName: '${escape(b.storeName)}', city: '${escape(b.city)}', address: '${escape(b.address)}', lat: ${b.lat}, lng: ${b.lng} },`);
}
tsLines.push('];', '');

const outPath = path.join(__dirname, '..', 'server', 'api', 'src', 'features', 'priceComparison', 'data', 'known-branches.data.ts');
fs.writeFileSync(outPath, tsLines.join('\n'));
console.log(`\nWritten to ${outPath}`);
