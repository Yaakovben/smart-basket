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

export async function listLatestPriceFullFile(client: AxiosInstance, csrftoken: string, chainId: string): Promise<string | null> {
  // 1) נסיון ראשון: PriceFull ברוט
  const rootFiles = await listDir(client, csrftoken, '/', 'PriceFull');
  const rootPriceFull = rootFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
    .filter(f => /PriceFull.*\.(gz|xml)/i.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  if (rootPriceFull.length > 0) return rootPriceFull[0].name;

  // 2) Fallback: חלק מהרשתות מפרסמות בתת-תיקיות (למשל /2025-04-24).
  // נאתר תיקיות שנראות כמו תאריך ונחפש בהן את ה-PriceFull החדש ביותר.
  const allFiles = await listDir(client, csrftoken, '/', '');
  const subDirs = allFiles
    .map(f => ({ name: f.fname || f.name || f.DT_RowId || '', type: f.type }))
    .filter(f => f.type === 'd' && /^\d{4}-\d{2}-\d{2}|^\d{8}/.test(f.name))
    .sort((a, b) => b.name.localeCompare(a.name));

  for (const dir of subDirs.slice(0, 7)) { // הוגדל מ-3 ל-7 - ראה הסבר ב-listLatestMatchingFile
    const subFiles = await listDir(client, csrftoken, `/${dir.name}`, 'PriceFull');
    const matches = subFiles
      .map(f => ({ name: f.fname || f.name || f.DT_RowId || '' }))
      .filter(f => /PriceFull.*\.(gz|xml)/i.test(f.name))
      .sort((a, b) => b.name.localeCompare(a.name));
    if (matches.length > 0) return `${dir.name}/${matches[0].name}`;
  }

  // אבחון: אם לא מצאנו, מציגים בלוג מה כן הופיע - חוסך זמן בחקירה.
  const sampleFiles = allFiles.slice(0, 5).map(f => f.fname || f.name || '?').join(', ');
  const sampleDirs = subDirs.slice(0, 5).map(d => d.name).join(', ');
  logger.warn(`[chain:${chainId}] no PriceFull found. root sample=[${sampleFiles}] dirs=[${sampleDirs}]`);
  return null;
}

export async function downloadFile(client: AxiosInstance, filename: string): Promise<Buffer> {
  const res = await client.get(`/file/d/${filename}`, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}
