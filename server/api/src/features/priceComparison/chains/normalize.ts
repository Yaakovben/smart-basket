// נירמול שמות מוצרים לצורך השוואה
// מסיר ניקוד, רווחים כפולים, סימנים מיוחדים, ומלים נפוצות לא אינפורמטיביות

const NOISE_WORDS = new Set([
  'טרי', 'ארוז', 'במארז', 'מארז', 'יחידה', 'יח', 'גרם', 'גר', 'מל', 'ליטר', 'ק"ג',
  'קילו', 'קג', 'מ"ל', 'ק״ג', 'מ״ל', 'של', 'עם', 'ללא', 'בתוספת', 'סוג', 'א', 'ב',
]);

export function normalizeProductName(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = raw.toLowerCase();
  // הסרת ניקוד עברי
  s = s.replace(/[֑-ׇ]/g, '');
  // החלפת סימנים מיוחדים ברווח
  s = s.replace(/[״'"`\-_.,+()\[\]/\\]/g, ' ');
  // רווחים כפולים
  s = s.replace(/\s+/g, ' ').trim();
  // הסרת מילי רעש
  const tokens = s.split(' ').filter(t => t && !NOISE_WORDS.has(t));
  return tokens.join(' ');
}

// בדיקה אם שם של מוצר מהמשתמש מתאים למוצר ברשת
export function isLikelyMatch(userName: string, chainName: string): boolean {
  const userTokens = normalizeProductName(userName).split(' ').filter(Boolean);
  const chainTokens = new Set(normalizeProductName(chainName).split(' ').filter(Boolean));
  if (userTokens.length === 0) return false;
  // לפחות 60% מהמלים של המשתמש חייבות להופיע
  const hits = userTokens.filter(t => chainTokens.has(t)).length;
  return hits / userTokens.length >= 0.6;
}
