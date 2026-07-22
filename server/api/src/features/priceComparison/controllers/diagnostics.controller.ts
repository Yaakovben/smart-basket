import type { Response } from 'express';
import { asyncHandler } from '../../../utils';
import type { AuthRequest } from '../../../types';

// GET /api/price-comparison/test-osm (admin only) - בדיקה דיאגנוסטית מהירה.
// בודק כל Overpass endpoint בנפרד עם שאילתה זעירה (5 שניות לכל אחד),
// ומחזיר תוך 25 שניות מקסימום - מתחת ל-30 של Render. מציג בדיוק איזה
// endpoint מגיב ואיזה לא.
export const testOsm = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const axios = (await import('axios')).default;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.osm.ch/api/interpreter',
  ];
  // שאילתה זעירה - חיפוש 1 supermarket בתוך תיבה קטנטנה. אמורה לחזור ב-1-2 שניות.
  const tinyQuery = '[out:json][timeout:5];node(31.7,34.7,32.1,34.9)["shop"="supermarket"];out 1;';

  const results = await Promise.all(endpoints.map(async (endpoint) => {
    const t0 = Date.now();
    try {
      const r = await axios.post(endpoint, `data=${encodeURIComponent(tinyQuery)}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'smart-basket-app/1.0',
        },
        timeout: 5_000,
      });
      const elements = (r.data as { elements?: unknown[] })?.elements || [];
      return { endpoint, ok: true, elapsedMs: Date.now() - t0, status: r.status, elements: elements.length };
    } catch (err) {
      const e = err as { message?: string; code?: string; response?: { status?: number } };
      return {
        endpoint, ok: false, elapsedMs: Date.now() - t0,
        error: e.message || 'unknown',
        code: e.code,
        httpStatus: e.response?.status,
      };
    }
  }));

  const working = results.filter(r => r.ok);
  res.json({
    success: working.length > 0,
    workingEndpoints: working.length,
    totalEndpoints: endpoints.length,
    summary: working.length === 0
      ? 'אף endpoint של Overpass לא מגיב מהשרת'
      : `${working.length}/${endpoints.length} endpoints עובדים`,
    results,
  });
});
