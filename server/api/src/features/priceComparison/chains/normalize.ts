// נירמול שמות מוצרים לצורך השוואה
// מסיר ניקוד, רווחים כפולים, סימנים מיוחדים, ומלים נפוצות לא אינפורמטיביות

const NOISE_WORDS = new Set([
  'טרי', 'ארוז', 'במארז', 'מארז', 'יחידה', 'יח', 'גרם', 'גר', 'מל', 'ליטר', 'ק"ג',
  'קילו', 'קג', 'מ"ל', 'ק״ג', 'מ״ל', 'של', 'עם', 'ללא', 'בתוספת', 'סוג', 'א', 'ב',
  'איכות', 'פרמיום', 'מוכן', 'חדש', 'חם', 'קר', 'מצונן', 'קפוא', 'חי',
]);

// נירמול וריאנטים עבריים נפוצים שמכשילים התאמה:
// - יוד כפולה/בודדת: "עגבנייה" ↔ "עגבניה"
// - וו/ה סופיות
// החלפות פשוטות שמבטלות התנגשויות כתיב נפוצות.
function collapseHebrewVariants(s: string): string {
  // כפל יוד: "ייי" או "יי" → "י" כאשר מופיע באמצע מילה
  s = s.replace(/יי+/g, 'י');
  // כפל וו: "וו" → "ו"
  s = s.replace(/וו+/g, 'ו');
  return s;
}

export function normalizeProductName(raw: string | undefined | null): string {
  if (!raw) return '';
  let s = raw.toLowerCase();
  // הסרת ניקוד עברי
  s = s.replace(/[֑-ׇ]/g, '');
  // החלפת סימנים מיוחדים ברווח (כולל גרשיים, מקפים, נקודות, סוגריים)
  s = s.replace(/[״'"`\-_.,+()\[\]/\\]/g, ' ');
  // קריסת וריאנטים עבריים
  s = collapseHebrewVariants(s);
  // רווחים כפולים
  s = s.replace(/\s+/g, ' ').trim();
  // הסרת מילי רעש
  const tokens = s.split(' ').filter(t => t && !NOISE_WORDS.has(t));
  return tokens.join(' ');
}

// "שורש" של מילה עברית - מסיר סיומות נקבה/רבים/סמיכות נפוצות
// מאפשר התאמה בין "גבינה"↔"גבינת", "לבנה"↔"לבנת", "עגבניות"↔"עגבניה" וכד׳.
// היוריסטיקה פשוטה שעובדת מספיק טוב למוצרי מזון ישראליים.
export function stemHebrew(word: string): string {
  if (word.length <= 3) return word; // קצר מדי לגזעה בטוחה
  // סיומות רבים: ים / ות (מילים מעל 4 אותיות)
  if (word.length > 4) {
    const last2 = word.slice(-2);
    if (last2 === 'ים' || last2 === 'ות' || last2 === 'יה') {
      return word.slice(0, -2);
    }
  }
  // סיומות יחיד נקבה/סמיכות: ה / ת / ן
  const last = word[word.length - 1];
  if (last === 'ה' || last === 'ת' || last === 'ן') {
    return word.slice(0, -1);
  }
  return word;
}

// בודק אם שני טוקנים מתייחסים לאותה מילה, כולל התאמה לפי שורש
export function tokensSimilar(a: string, b: string): boolean {
  if (a === b) return true;
  const sa = stemHebrew(a);
  const sb = stemHebrew(b);
  // שני השורשים זהים, ולפחות אחד שונה מהמילה המלאה (כלומר באמת הייתה גזעה)
  return sa === sb && (sa !== a || sb !== b);
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
