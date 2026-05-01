// scripts/refresh-osm.mjs
// מוריד נתונים טריים מ-OpenStreetMap (Overpass API) ויוצר known-branches.data.ts.
// כל רשת מאופיינת ע"י תגיות brand/operator. מצרף גם תגי name כשאין brand מוגדר.
//
// הרצה: node scripts/refresh-osm.mjs
//
// מקור הנתונים: OpenStreetMap (CC-BY-SA, שימוש חופשי).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// כל רשת: chainId + chainName + רגקס ל-brand/operator/name. הרגקס מאוחד כך שמתפוס
// וריאציות באנגלית ובעברית. שמרנו רק רשתות שיש להן adapter רשום במערכת או שיש
// תוכנית ברורה להוסיף.
const CHAINS = [
  { chainId: 'shufersal',           chainName: 'שופרסל',         pattern: 'Shufersal|שופרסל' },
  { chainId: 'rami_levy',           chainName: 'רמי לוי',         pattern: "Rami Levy|Rami Lev|רמי לוי" },
  { chainId: 'yohananof',           chainName: 'יוחננוף',         pattern: 'Yohananof|Yochananof|יוחננוף' },
  { chainId: 'osher_ad',            chainName: 'אושר עד',         pattern: 'Osher Ad|אושר עד' },
  { chainId: 'tiv_taam',            chainName: 'טיב טעם',         pattern: 'Tiv Ta|TivTaam|טיב טעם' },
  { chainId: 'doralon',             chainName: 'דור אלון',        pattern: 'Dor Alon|דור אלון|AM:PM|AM-PM|AMPM' },
  { chainId: 'keshet',              chainName: 'קשת',             pattern: 'Keshet|קשת' },
  { chainId: 'politzer',            chainName: 'פוליצר',          pattern: 'Politzer|פוליצר' },
  { chainId: 'stop_market',         chainName: 'סטופ מרקט',       pattern: 'Stopmarket|Stop Market|סטופ מרקט' },
  { chainId: 'victory',             chainName: 'ויקטורי',         pattern: 'Victory|ויקטורי' },
  { chainId: 'maayan_2000',         chainName: 'מעיין 2000',      pattern: 'Maayan|מעיין' },
  { chainId: 'shefa_birkat_hashem', chainName: 'שפע ברכת השם',    pattern: 'Shefa|שפע' },
  { chainId: 'super_sapir',         chainName: 'סופר ספיר',       pattern: 'Sapir|ספיר' },
];

// בונה Overpass query לרשת אחת. דרך case-insensitive regex על תגי brand+operator+name.
function buildQuery(pattern) {
  return `
[out:json][timeout:60];
area["ISO3166-1"="IL"]->.il;
(
  node["shop"~"supermarket|convenience"]["brand"~"${pattern}",i](area.il);
  way["shop"~"supermarket|convenience"]["brand"~"${pattern}",i](area.il);
  node["shop"~"supermarket|convenience"]["operator"~"${pattern}",i](area.il);
  way["shop"~"supermarket|convenience"]["operator"~"${pattern}",i](area.il);
  node["shop"~"supermarket|convenience"]["name"~"${pattern}",i](area.il);
  way["shop"~"supermarket|convenience"]["name"~"${pattern}",i](area.il);
  node["shop"~"supermarket|convenience"]["name:he"~"${pattern}"](area.il);
  way["shop"~"supermarket|convenience"]["name:he"~"${pattern}"](area.il);
);
out center tags;
`.trim();
}

async function fetchChain(chain) {
  const query = buildQuery(chain.pattern);
  const res = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'smart-basket-osm-refresh/1.0',
      'Accept': 'application/json',
    },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${chain.chainId}`);
  const json = await res.json();
  return json.elements || [];
}

const allBranches = [];
const seenIds = new Set();
const seenCoords = new Set();

for (const chain of CHAINS) {
  process.stdout.write(`fetching ${chain.chainName}... `);
  let elements;
  try {
    elements = await fetchChain(chain);
  } catch (e) {
    console.log(`FAILED: ${e.message}`);
    continue;
  }
  let added = 0;
  for (const el of elements) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    if (typeof lat !== 'number' || typeof lng !== 'number') continue;
    // גבולות גיאוגרפיים של ישראל
    if (lat < 29.4 || lat > 33.4 || lng < 34.2 || lng > 35.9) continue;

    const tags = el.tags || {};
    const storeName = tags['name:he'] || tags.name || tags.brand || tags.operator || chain.chainName;
    const city = tags['addr:city'] || tags['addr:suburb'] || '';
    const street = tags['addr:street'] || tags['addr:place'] || '';
    const houseNum = tags['addr:housenumber'] || '';
    const address = [street, houseNum].filter(Boolean).join(' ');
    const storeId = `osm-${el.type}-${el.id}`;

    if (seenIds.has(storeId)) continue;
    seenIds.add(storeId);

    // dedup לפי קואורדינטה (4 ספרות = ~10 מטר). שני סניפים באותה כתובת = כפילות.
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (seenCoords.has(coordKey)) continue;
    seenCoords.add(coordKey);

    allBranches.push({
      chainId: chain.chainId,
      chainName: chain.chainName,
      storeId, storeName, city, address, lat, lng,
    });
    added++;
  }
  console.log(`${elements.length} elements → ${added} new branches`);
  // נימוס ל-Overpass: השהיה קצרה בין רשתות
  await new Promise(r => setTimeout(r, 1500));
}

console.log(`\nTotal: ${allBranches.length} branches across ${CHAINS.length} chains`);

// בטיחות: לא לדרוס קובץ עובד עם תוצאה ריקה - מצביע על תקלה ב-Overpass
if (allBranches.length === 0) {
  console.error('ABORT: 0 branches fetched - not overwriting existing data file');
  process.exit(1);
}

// כתיבת הקובץ
const tsLines = [
  '/* eslint-disable */',
  '// קובץ זה נוצר אוטומטית מ-OSM ב-' + new Date().toISOString().split('T')[0],
  '// סניפים אמיתיים של רשתות סופרים בישראל ממאגר OpenStreetMap הציבורי',
  '// לעדכון: `node scripts/refresh-osm.mjs`',
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

const escape = (s) => (s || '').replace(/'/g, "\\'");
for (const b of allBranches) {
  tsLines.push(`  { chainId: '${b.chainId}', chainName: '${escape(b.chainName)}', storeId: '${b.storeId}', storeName: '${escape(b.storeName)}', city: '${escape(b.city)}', address: '${escape(b.address)}', lat: ${b.lat}, lng: ${b.lng} },`);
}
tsLines.push('];', '');

const outPath = path.join(__dirname, '..', 'server', 'api', 'src', 'features', 'priceComparison', 'data', 'known-branches.data.ts');
fs.writeFileSync(outPath, tsLines.join('\n'));
console.log(`Written to ${outPath}`);

// סיכום פר-רשת
const byChain = {};
for (const b of allBranches) byChain[b.chainId] = (byChain[b.chainId] || 0) + 1;
console.log('\nPer chain:');
for (const c of CHAINS) console.log(`  ${c.chainName.padEnd(20)} ${byChain[c.chainId] || 0}`);
