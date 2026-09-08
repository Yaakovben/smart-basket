/**
 * generateListPdf.ts
 *
 * מייצר קובץ PDF אמיתי מתוך ה-DOM הקיים של PrintListView (לא מייצר PDF
 * וקטורי עם טקסט - מצלם אותו כתמונה ומטביע כתמונה בתוך PDF). זו הדרך
 * הפשוטה/אמינה ביותר לטקסט עברי/RTL: jsPDF לא כולל גופן עברי מובנה
 * (רק גופני Latin סטנדרטיים), אז טקסט וקטורי היה מוצג כריבועים ריקים.
 * צילום ה-DOM האמיתי (עם הפונט/RTL הנכונים כפי שהדפדפן כבר מרנדר) עוקף
 * את הבעיה לגמרי במחיר קובץ מעט כבד יותר (תמונה) - סביר לחלוטין לרשימת קניות.
 *
 * שתי הספריות (jspdf, html2canvas) נטענות דינמית - רק כשבאמת מייצאים PDF
 * ב-iOS (ראו ShareListModal.tsx), לא נכנסות לבאנדל הראשי.
 */

const SOURCE_SELECTOR = '.print-list-view';
const CAPTURE_WIDTH = 480; // רוחב קבוע לצילום - יחס דומה לעמוד צר, קריא במובייל
const OVERLAY_ID = 'pdf-generating-overlay';
const SPIN_KEYFRAMES_ID = 'pdf-generating-overlay-spin-keyframes';
// אותו font stack בדיוק כמו ה-theme של האפליקציה (client/src/global/theme/theme.ts) -
// כדי שה-overlay לא יראה כמו מסך זר/דיבאג שהודבק על האפליקציה.
const APP_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
// תכלת המותג - זהה ל-PAPER_NOTE.inkLight/inkDark (paperNote.ts). קובץ זה
// מכוון להיות עצמאי (בלי תלות בקומפוננטות React) אז מוגדר כאן ישירות.
const BRAND_INK_LIGHT = '#0F766E';
const BRAND_INK_DARK = '#5EEAD4';

// חושפים overlay מלא-מסך עם ספינר וטקסט - נבנה ב-DOM גולמי (לא React) כי
// הוא חייב להישאר קיים ומצויר בזמן שה-DOM האמיתי של PrintListView נחשף
// ומצולם ע"י html2canvas. מוצג *לפני* טעינת html2canvas/jsPDF (לא אחרי) -
// בפעם הראשונה בסשן, הורדה+פענוח של שתי הספריות האלה יכולה לקחת כמה
// שניות ברשת סלולרית, ובלי זה המשתמש רואה מסך ריק לגמרי באותו זמן.
function showOverlay(preparingText: string, isDark: boolean): HTMLElement {
  if (!document.getElementById(SPIN_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = SPIN_KEYFRAMES_ID;
    style.textContent = '@keyframes pdf-generating-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(style);
  }

  const ink = isDark ? BRAND_INK_DARK : BRAND_INK_LIGHT;
  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: ${isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)'};
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px;
    font-family: ${APP_FONT_STACK}; font-size: 15px; font-weight: 600; color: ${ink};
  `;

  const spinner = document.createElement('div');
  spinner.style.cssText = `
    width: 34px; height: 34px; border-radius: 50%;
    border: 3px solid ${isDark ? 'rgba(94,234,212,0.25)' : 'rgba(15,118,110,0.18)'};
    border-top-color: ${ink};
    animation: pdf-generating-spin 0.8s linear infinite;
  `;

  const label = document.createElement('div');
  label.textContent = preparingText;

  overlay.appendChild(spinner);
  overlay.appendChild(label);
  document.body.appendChild(overlay);
  return overlay;
}

export async function generateListPdf(
  fileNameBase: string,
  preparingText: string = 'מכין PDF...',
  isDark: boolean = false,
): Promise<File | null> {
  const sourceEl = document.querySelector<HTMLElement>(SOURCE_SELECTOR);
  if (!sourceEl) return null;

  // ה-overlay מוצג *לפני* ה-import הדינמי (לא אחריו) - ראה הערה ב-showOverlay.
  const overlay = showOverlay(preparingText, isDark);

  const prevStyle = {
    display: sourceEl.style.display,
    position: sourceEl.style.position,
    top: sourceEl.style.top,
    left: sourceEl.style.left,
    width: sourceEl.style.width,
    zIndex: sourceEl.style.zIndex,
  };

  try {
    const [html2canvasModule, jsPdfModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);
    const html2canvas = html2canvasModule.default;
    const { jsPDF } = jsPdfModule;

    // חושפים על-המסך (לא מחוץ למסך ב-left:-9999px!) - ב-Safari/iOS html2canvas
    // לא מצלם נכון אלמנטים שממוקמים הרחק מחוץ ל-viewport (הצילום יוצא ריק/
    // חתוך בחלק גדול מהתוכן - זו הייתה הסיבה האמיתית לשמות חסרים ב-PDF,
    // לא באג flexbox). כדי שהמשתמש לא יראה את תוכן ה-print הגולמי לרגע,
    // מכסים אותו ב-overlay אטום עם הודעת טעינה (שכבר על המסך משלב קודם).
    sourceEl.style.display = 'block';
    sourceEl.style.position = 'fixed';
    sourceEl.style.top = '0';
    sourceEl.style.left = '0';
    sourceEl.style.width = `${CAPTURE_WIDTH}px`;
    sourceEl.style.zIndex = '999998'; // מתחת ל-overlay, אבל עדיין ממוקם ומצויר כרגיל על המסך

    const canvas = await html2canvas(sourceEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true });
    // JPEG ולא PNG - הרקע לבן אחיד והתוכן הוא בעיקר טקסט/אייקונים, כך שאיכות
    // JPEG גבוהה (0.85) נראית זהה כמעט לעין אבל במשקל קטן משמעותית (חשוב
    // לשיתוף בוואטסאפ/הודעות - PNG ברזולוציה כפולה יצא מגה-בייטים בודדים).
    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    // עמוד PDF ביחידות px, בדיוק בגודל התמונה - עמוד יחיד, בלי חישובי scale מיותרים.
    // orientation חובה במפורש: jsPDF מניח 'portrait' כברירת מחדל ומחליף בשקט
    // width/height כש-format מקבל מידות "landscape" (רחב מגבוה) בלי לציין
    // orientation - בדיוק המקרה של רשימה קצרה (רחבה מגבוהה). בלי זה התמונה
    // הייתה נדחסת ליחס-רוחב הפוך, מה שנראה כאילו חלק מהטקסט "נעלם" מהעמוד.
    const orientation = canvas.width >= canvas.height ? 'l' : 'p';
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height], orientation });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    const blob = pdf.output('blob') as Blob;

    return new File([blob], `${fileNameBase}.pdf`, { type: 'application/pdf' });
  } finally {
    sourceEl.style.display = prevStyle.display;
    sourceEl.style.position = prevStyle.position;
    sourceEl.style.top = prevStyle.top;
    sourceEl.style.left = prevStyle.left;
    sourceEl.style.width = prevStyle.width;
    sourceEl.style.zIndex = prevStyle.zIndex;
    overlay.remove();
  }
}
