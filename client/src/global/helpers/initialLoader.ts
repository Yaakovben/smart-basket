// הסתרת מסך הטעינה הראשוני. fade-out קצר (לא הסרה מיידית) - קריטי בדיוק
// כשהטעינה מהירה (פחות משנייה): בלי fade, ה-loader נתפס בדיוק באמצע
// אנימציית "הפריטים נופלים/הוו מצטייר" ונעלם בבת אחת - נראה כמו גליץ' של
// פריים קפוא. fade קצר (180ms) מטשטש כל פריים-ביניים שנתפסנו בו, בלי קשר
// לאיפה בדיוק בלולאה זה קרה - ונשאר קצר מספיק שלא מרגיש כמו המתנה נוספת.
const FADE_MS = 180;

export const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (!loader) return;

  document.body.classList.add('app-loaded');

  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    loader.remove();
    return;
  }

  loader.style.transition = `opacity ${FADE_MS}ms ease`;
  // reflow כפוי בין קביעת transition לשינוי opacity - בלעדיו הדפדפן עלול
  // לאחד את שני שינויי הסגנון לפריים אחד ולדלג על האנימציה לגמרי.
  void loader.offsetHeight;
  loader.style.opacity = '0';
  window.setTimeout(() => loader.remove(), FADE_MS);
};
