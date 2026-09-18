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
const OVERLAY_KEYFRAMES_ID = 'pdf-generating-overlay-keyframes';
// אותו font stack בדיוק כמו ה-theme של האפליקציה (client/src/global/theme/theme.ts) -
// כדי שה-overlay לא יראה כמו מסך זר/דיבאג שהודבק על האפליקציה.
const APP_FONT_STACK = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
// אותה שפת "פתק נייר" בדיוק כמו PAPER_NOTE (paperNote.ts) - תכלת המותג,
// גרדיאנט נייר, מסגרת דקה. קובץ זה מכוון להיות עצמאי (בלי תלות בקומפוננטות
// React) אז מוגדר כאן ישירות, לא מיובא.
const BRAND_INK_LIGHT = '#0F766E';
const BRAND_INK_DARK = '#5EEAD4';
const BRAND_EDGE_LIGHT = 'rgba(20,184,166,0.32)';
const BRAND_EDGE_DARK = 'rgba(45,212,191,0.4)';

// overlay מלא-מסך — נבנה ב-DOM גולמי (לא React) כי חייב להישאר קיים
// בזמן שה-DOM האמיתי של PrintListView נחשף ומצולם. מוצג לפני טעינת
// html2canvas/jsPDF כדי שלא יהיה רגע ריק ברשת סלולרית.
// העיצוב: כרטיס גדול (180×220px) עם "דפים" מוצללים + קו סריקה —
// אותו שפת עיצוב בדיוק כמו מסך הסריקה (ScanListPhoto), כדי שהחיווי
// ירגיש שייך לאפליקציה ולא גנרי. ה-overlay מבוטל ע"י לחיצה עליו.
function showOverlay(preparingText: string, isDark: boolean, onCancel: () => void): HTMLElement {
  if (!document.getElementById(OVERLAY_KEYFRAMES_ID)) {
    const style = document.createElement('style');
    style.id = OVERLAY_KEYFRAMES_ID;
    style.textContent = `
      @keyframes pdf-scan-sweep {
        0%   { top: 8px; opacity: 0; }
        8%   { opacity: 1; }
        92%  { opacity: 1; }
        100% { top: calc(100% - 10px); opacity: 0; }
      }
      @keyframes pdf-line-reveal {
        0%, 15%  { transform: scaleX(0); opacity: 0.3; }
        35%, 65% { transform: scaleX(1); opacity: 1; }
        90%, 100%{ transform: scaleX(1); opacity: 0.5; }
      }
      @keyframes pdf-card-in {
        from { opacity: 0; transform: scale(0.9) translateY(16px); }
        to   { opacity: 1; transform: scale(1) translateY(0); }
      }
    `;
    document.head.appendChild(style);
  }

  const ink = isDark ? BRAND_INK_DARK : BRAND_INK_LIGHT;
  const edge = isDark ? BRAND_EDGE_DARK : BRAND_EDGE_LIGHT;
  const isRtl = document.documentElement.dir === 'rtl';

  const overlay = document.createElement('div');
  overlay.id = OVERLAY_ID;
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: ${isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.55)'};
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 20px;
  `;
  overlay.addEventListener('click', onCancel);

  // כרטיס מרכזי גדול — גודל דומה לכרטיס הסריקה, עם מחסנית דפים + קו סורק
  const card = document.createElement('div');
  card.style.cssText = `
    position: relative; width: 148px; height: 190px; border-radius: 18px; overflow: hidden;
    background: ${isDark ? 'rgba(15,118,110,0.18)' : 'rgba(209,250,242,0.95)'};
    border: 1.5px solid ${edge};
    box-shadow: 0 16px 48px rgba(20,184,166,0.28);
    animation: pdf-card-in 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
  `;
  // עצירת פרופגציה — לחיצה על הכרטיס עצמו לא מבטלת
  card.addEventListener('click', e => e.stopPropagation());

  // "שורות טקסט" מדומות — נחשפות בתזמון מדורג
  ['72%', '92%', '58%', '82%', '66%'].forEach((w, i) => {
    const row = document.createElement('div');
    row.style.cssText = `
      position: absolute; height: 7px; border-radius: 4px;
      background: ${ink}; opacity: 0;
      top: ${20 + i * 30}px;
      ${isRtl ? `right: 16px; width: ${w};` : `left: 16px; width: ${w};`}
      transform-origin: ${isRtl ? 'right' : 'left'};
      animation: pdf-line-reveal 2.4s ease-in-out infinite;
      animation-delay: ${i * 0.35}s;
    `;
    card.appendChild(row);
  });

  // קו סריקה זוהר (אותו סגנון כמו ScanListPhoto)
  const scanLine = document.createElement('div');
  scanLine.style.cssText = `
    position: absolute; left: 0; right: 0; height: 3px; border-radius: 2px;
    background: ${isDark ? '#5EEAD4' : '#14B8A6'};
    box-shadow: 0 0 10px 2px rgba(20,184,166,0.65);
    animation: pdf-scan-sweep 2.4s ease-in-out infinite;
  `;
  card.appendChild(scanLine);

  // טקסט + כפתור ביטול מתחת לכרטיס
  const label = document.createElement('div');
  label.style.cssText = `
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  `;

  const labelText = document.createElement('span');
  labelText.textContent = preparingText;
  labelText.style.cssText = `
    font-family: ${APP_FONT_STACK}; font-size: 15px; font-weight: 600; color: white;
    text-align: center;
  `;

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'ביטול';
  cancelBtn.style.cssText = `
    font-family: ${APP_FONT_STACK}; font-size: 13px; font-weight: 500;
    color: rgba(255,255,255,0.65); background: transparent; border: none;
    padding: 4px 12px; cursor: pointer; border-radius: 8px;
  `;
  cancelBtn.addEventListener('click', onCancel);

  label.appendChild(labelText);
  label.appendChild(cancelBtn);

  overlay.appendChild(card);
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

  let cancelled = false;
  const onCancel = () => { cancelled = true; overlay.remove(); };

  // ה-overlay מוצג לפני ה-import הדינמי — כדי שלא יהיה רגע ריק ברשת סלולרית.
  const overlay = showOverlay(preparingText, isDark, onCancel);

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

    if (cancelled) return null;

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

    if (cancelled) return null;

    const canvas = await html2canvas(sourceEl, { backgroundColor: '#ffffff', scale: 2, useCORS: true, logging: false });
    // JPEG ולא PNG - הרקע לבן אחיד והתוכן הוא בעיקר טקסט/אייקונים, כך שאיכות
    // JPEG גבוהה (0.85) נראית זהה כמעט לעין אבל במשקל קטן משמעותית (חשוב
    // לשיתוף בוואטסאפ/הודעות - PNG ברזולוציה כפולה יצא מגה-בייטים בודדים).
    const imgData = canvas.toDataURL('image/jpeg', 0.85);

    // עמוד PDF ביחידות px, בדיוק בגודל התמונה - עמוד יחיד, בלי חישובי scale מיותרים.
    // orientation חובה במפורש: jsPDF מניח 'portrait' כברירת מחדל ומחליף בשקט
    // width/height כש-format מקבל מידות "landscape" (רחב מגבוה) בלי לציין
    // orientation - בדיוק המקרה של רשימה קצרה (רחבה מגבוהה). בלי זה התמונה
    // הייתה נדחסת ליחס-רוחב הפוך, מה שנראה כאילו חלק מהטקסט "נעלם" מהעמוד.
    if (cancelled) return null;

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
