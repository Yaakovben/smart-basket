// נירמול שמות מוצרים לצורך השוואה.
// מסיר ניקוד, רווחים כפולים, סימני פיסוק, מלות רעש לא-אינפורמטיביות,
// וקורס וריאציות כתיב עבריות (יוד כפולה, וו כפולה, סיומות).

// מלות רעש שמופיעות במוצרים אבל לא עוזרות להתאמה - מסירים אותן לפני השוואה.
// נוספו תכונות שיווקיות (טבעי, ביו, אורגני) שמופיעות בכמעט כל מוצר וגורמות
// לרעש בהתאמה.
const NOISE_WORDS = new Set([
  // יחידות
  'גרם', 'גר', 'מל', 'ליטר', 'ק"ג', 'קילו', 'קג', 'מ"ל', 'ק״ג', 'מ״ל', 'יחידה', 'יח',
  // אריזה
  'מארז', 'במארז', 'ארוז', 'בקבוק', 'פחית', 'קופסה', 'שקית', 'בשקית', 'בקופסה',
  // טריות / מצב
  'טרי', 'מוכן', 'חדש', 'חם', 'קר', 'מצונן', 'קפוא', 'חי', 'מבושל', 'אפוי', 'מטוגן',
  // איכות / שיווק
  'איכות', 'פרמיום', 'דה-לוקס', 'מובחר', 'מהדורה', 'מיוחד', 'מבצע', 'אקסטרה',
  // תכונות נפוצות שמופיעות בלי הקשר
  'טבעי', 'ביו', 'אורגני', 'דיאט', 'לייט', 'קל', 'מועשר', 'דל', 'עשיר',
  // אלרגנים / כשרות (לא חלק מהשם)
  'בללא', 'ללא', 'גלוטן', 'לקטוז', 'סוכר', 'פרבה', 'בד״ץ', 'מהדרין',
  // מילות חיבור
  'של', 'עם', 'בתוספת', 'סוג', 'את', 'או', 'ל-', 'ב-',
  'א', 'ב',
]);

// קריסת וריאציות עבריות נפוצות שמכשילות התאמה:
// יוד כפולה/בודדת ("עגבנייה" ↔ "עגבניה"), וו כפולה ("ווידאו" ↔ "וידאו").
function collapseHebrewVariants(s: string): string {
  s = s.replace(/יי+/g, 'י');
  s = s.replace(/וו+/g, 'ו');
  return s;
}

// נירמול אנגלית: lowercase + הסרת רוב סימני הפיסוק. שומר על מספרים שעוזרים
// להבדיל בין גודלים ("2 ליטר" ≠ "1 ליטר").
function normalizeEnglish(s: string): string {
  return s.toLowerCase();
}

export function normalizeProductName(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = normalizeEnglish(raw);
  // הסרת ניקוד עברי
  s = s.replace(/[֑-ׇ]/g, '');
  // סימני פיסוק (כולל גרשיים, מקפים, נקודות, סוגריים, פלוסים)
  s = s.replace(/[״'"`\-_.,+()\[\]/\\:;!?*&%]/g, ' ');
  s = collapseHebrewVariants(s);
  s = s.replace(/\s+/g, ' ').trim();
  const tokens = s.split(' ').filter(t => t && !NOISE_WORDS.has(t));
  return tokens.join(' ');
}

// "שורש" עברי פשוט - מסיר סיומות נקבה/רבים/סמיכות נפוצות.
// מאפשר התאמה בין "גבינה"↔"גבינת", "עגבניות"↔"עגבניה" וכד׳.
export function stemHebrew(word: string): string {
  if (word.length <= 3) return word;
  if (word.length > 4) {
    const last2 = word.slice(-2);
    if (last2 === 'ים' || last2 === 'ות' || last2 === 'יה') return word.slice(0, -2);
  }
  const last = word[word.length - 1];
  if (last === 'ה' || last === 'ת' || last === 'ן') return word.slice(0, -1);
  return word;
}

export function tokensSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  // התאמה לפי תחילית: מילה אחת מתחילה במילה השנייה ובהפרש קל בלבד.
  // למשל "חלב" מול "חלבי" - אותו מוצר ביסודו.
  if (a.length >= 4 && b.length >= 4) {
    if (a.startsWith(b) && a.length - b.length <= 2) return true;
    if (b.startsWith(a) && b.length - a.length <= 2) return true;
  }
  const sa = stemHebrew(a);
  const sb = stemHebrew(b);
  return sa === sb && (sa !== a || sb !== b);
}

// התאמת שם מוצר של המשתמש לשם של רשת.
// משתמש ב-tokensSimilar לטובת זיהוי וריאציות כתיב/סיומות, לא רק התאמה מדויקת.
// רף ההתאמה: 60% מהטוקנים של המשתמש חייבים להופיע.
// לחיפושים קצרים (טוקן יחיד) הרף יורד ל-100% (חייב להיות שם).
export function isLikelyMatch(userName: string, chainName: string): boolean {
  const userTokens = normalizeProductName(userName).split(' ').filter(Boolean);
  const chainTokens = normalizeProductName(chainName).split(' ').filter(Boolean);
  if (userTokens.length === 0) return false;
  let hits = 0;
  for (const ut of userTokens) {
    // התאמה מדויקת או לפי שורש/תחילית
    if (chainTokens.some(ct => tokensSimilar(ut, ct))) hits++;
  }
  // טוקן יחיד = חייב התאמה. שניים+ = 60% מספיק.
  const threshold = userTokens.length === 1 ? 1 : 0.6;
  return hits / userTokens.length >= threshold;
}
