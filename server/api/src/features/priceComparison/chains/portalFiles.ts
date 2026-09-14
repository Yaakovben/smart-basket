/**
 * portalFiles.ts
 *
 * חיפוש והורדת קבצים מפורטל url.publishedprices.co.il — רשימת תיקיות,
 * איתור הקובץ העדכני ביותר לפי pattern (PriceFull / Stores), והורדה.
 */

import type { AxiosInstance } from 'axios';
import { logger } from '../../../config/logger';
import { PORTAL_BASE } from './portalAuth';

interface FileEntry {
  name?: string;
  fname?: string;
  DT_RowId?: string;
  size?: number;
  time?: string;
  type?: string;
}

interface DirListResponse {
  aaData?: FileEntry[];
}

// בקשת list של קבצים/תיקיות מנתיב נתון בפורטל
async function listDir(client: AxiosInstance, csrftoken: string, cd: string, search: string): Promise<FileEntry[]> {
  const form = new URLSearchParams({
    sEcho: '1',
    iDisplayStart: '0',
    iDisplayLength: '1000',
    sSearch: search,
    cd,
    csrftoken,
  });

  const res = await client.post<DirListResponse>('/file/json/dir', form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-CSRFToken': csrftoken,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${PORTAL_BASE}/file`,
    },
  });

  return res.data?.aaData || [];
}

// מאתר את הקובץ החדש ביותר שמתאים ל-pattern מסוים (PriceFull / StoresFull).
// מנסה גם בשורש וגם בתת-תיקיות תאריכים (חלק מהרשתות).
export async function listLatestMatchingFile(
  client: AxiosInstance,
  csrftoken: string,
  searchTerm: string,
  pattern: RegExp
): Promise<string | null> {
  const rootFiles = await listDir(client, csrftoken, '/', searchTerm);
  const rootMatches = rootFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
    .filter(f => pattern.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  if (rootMatches.length > 0) return rootMatches[0].name;

  const allFiles = await listDir(client, csrftoken, '/', '');
  const subDirs = allFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '', type: f.type }))
    .filter(f => f.type === 'd' && /^\d{4}-\d{2}-\d{2}|^\d{8}/.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  // הוגדל מ-3 ל-7: רשת שלא פרסמה ב-3 הימים האחרונים אבל יש לה קובץ
  // לפני 4-6 ימים - עדיף להחזיר נתון ישן מאשר 0.
  for (const dir of subDirs.slice(0, 7)) {
    const subFiles = await listDir(client, csrftoken, `/${dir.name}`, searchTerm);
    const matches = subFiles
      .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
      .filter(f => pattern.test(f.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (matches.length > 0) return `${dir.name}/${matches[0].name}`;
  }

  return null;
}

// תבנית שם קובץ אחיד בפורטל: PriceFull<ChainID>-<SubChainID>-<StoreID>-<YYYYMMDD>-<HHMMSS>.(gz|xml)
// הפורטל מפרסם קובץ PriceFull נפרד לכל סניף (לא קובץ מאוחד אחד לכל הרשת) -
// גם ברשתות גדולות כמו רמי לוי (מאות קבצים). לכן לא מספיק לקחת את הקובץ
// "האחרון" לפי מיון lexicographic (זה נותן סניף אחד בלבד, אקראי למעשה) -
// צריך את הקובץ העדכני ביותר *לכל סניף בנפרד*, ולהוריד את כולם.
const PRICE_FULL_PATTERN = /^PriceFull(\d+)-(\d+)-(\d+)-(\d{8})-(\d{6})\.(gz|xml)$/i;

// ממפה רשימת קבצים לקובץ העדכני ביותר של כל סניף (מפתח: chainId-subChainId-storeId).
function pickLatestPriceFullPerStore(files: FileEntry[], pathPrefix = ''): string[] {
  const byStore = new Map<string, { name: string; stamp: string }>();
  for (const f of files) {
    const name = f.fname || f.name || f.DT_RowId || '';
    const m = name.match(PRICE_FULL_PATTERN);
    if (!m) continue;
    const storeKey = `${m[1]}-${m[2]}-${m[3]}`;
    const stamp = `${m[4]}${m[5]}`;
    const existing = byStore.get(storeKey);
    if (!existing || stamp > existing.stamp) byStore.set(storeKey, { name: `${pathPrefix}${name}`, stamp });
  }
  return [...byStore.values()].map(v => v.name);
}

// מאתר את קבצי ה-PriceFull העדכניים ביותר - אחד לכל סניף - כדי שהמחירים
// ישקפו את כל הרשת ולא רק סניף אחד שנבחר כמעט באקראי.
export async function listAllLatestPriceFullFiles(client: AxiosInstance, csrftoken: string, chainId: string): Promise<string[]> {
  // 1) נסיון ראשון: PriceFull ברוט
  const rootFiles = await listDir(client, csrftoken, '/', 'PriceFull');
  const rootMatches = pickLatestPriceFullPerStore(rootFiles);
  if (rootMatches.length > 0) return rootMatches;

  // 2) Fallback: חלק מהרשתות מפרסמות בתת-תיקיות (למשל /2025-04-24).
  const allFiles = await listDir(client, csrftoken, '/', '');
  const subDirs = allFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '', type: f.type }))
    .filter(f => f.type === 'd' && /^\d{4}-\d{2}-\d{2}|^\d{8}/.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const dir of subDirs.slice(0, 7)) { // הוגדל מ-3 ל-7 - ראה הסבר ב-listLatestMatchingFile
    const subFiles = await listDir(client, csrftoken, `/${dir.name}`, 'PriceFull');
    const matches = pickLatestPriceFullPerStore(subFiles, `${dir.name}/`);
    if (matches.length > 0) return matches;
  }

  // אבחון: אם לא מצאנו, מציגים בלוג מה כן הופיע - חוסך זמן בחקירה.
  const sampleFiles = allFiles.slice(0, 5).map(f => f.fname || f.name || '?').join(', ');
  const sampleDirs = subDirs.slice(0, 5).map(d => d.name).join(', ');
  logger.warn(`[chain:${chainId}] no PriceFull found. root sample=[${sampleFiles}] dirs=[${sampleDirs}]`);
  return [];
}

// תקרת 150MB לקובץ דחוס בודד - הגנה נוספת לפני decompression (ראו MAX_DECOMPRESSED_BYTES
// ב-portalXmlParser.ts). קבצים דחוסים אמיתיים הם עד כמה עשרות MB.
const MAX_COMPRESSED_BYTES = 150 * 1024 * 1024;

export async function downloadFile(client: AxiosInstance, filename: string): Promise<Buffer> {
  const res = await client.get(`/file/d/${filename}`, {
    responseType: 'arraybuffer',
    maxContentLength: MAX_COMPRESSED_BYTES,
    maxBodyLength: MAX_COMPRESSED_BYTES,
  });
  return Buffer.from(res.data);
}
