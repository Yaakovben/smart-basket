// זיהוי "קליטה חלשה": המכשיר חושב שהוא מחובר (navigator.onLine=true), אבל
// בקשות נתקעות או נופלות. במצב אופליין מלא הדפדפן יודע מיד ואנחנו עוברים
// לתור המקומי בלי לחכות, אבל בחצי קליטה כל בקשה הייתה מחכה עד דקה שלמה.
// כאן מסמנים את המצב, ובזמן שהוא פעיל בקשות קלות מקבלות זמן המתנה קצר,
// נכשלות מהר ועוברות לתור, כך שהאפליקציה מגיבה כמו באופליין.
// בקשה אחת שמצליחה מבטלת את המצב.

let weak = false;
const listeners = new Set<(weak: boolean) => void>();

function setWeak(next: boolean) {
  if (next === weak) return;
  weak = next;
  listeners.forEach(cb => cb(weak));
}

export const isNetworkWeak = () => weak;

// בקשה נכשלה בגלל רשת או נתקעה זמן רב, בזמן שהמכשיר חושב שהוא מחובר
export function reportNetworkStall(): void {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  setWeak(true);
}

// תשובה כלשהי הגיעה מהשרת (גם שגיאה עם סטטוס): הרשת עובדת
export function reportNetworkOk(): void {
  setWeak(false);
}

export function subscribeNetworkWeak(cb: (weak: boolean) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// אופליין מלא אינו "קליטה חלשה": שם כבר יש חיווי ותור משלו
if (typeof window !== 'undefined') {
  window.addEventListener('offline', () => setWeak(false));
}
