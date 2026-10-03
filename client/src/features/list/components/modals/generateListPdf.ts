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
// תקרת פיקסלים לצילום. Safari ב-iOS מגביל גודל canvas (כ-16 מיליון פיקסלים),
// ומעליו הצילום נתקע ארוכות ובסוף יוצא ריק. רשימה ארוכה מצולמת ברזולוציה נמוכה
// מעט יותר במקום להיכשל.
const MAX_CANVAS_PIXELS = 10_000_000;
const MAX_SCALE = 2;
const MIN_SCALE = 0.8;
// יחס עמוד A4: רשימה ארוכה מתחלקת לכמה עמודים, ולא עמוד אחד ענק (ל-PDF יש
// גם מגבלת גובה עמוד)
const PAGE_RATIO = 1.414;
// אחרי הזמן הזה מוותרים ומציגים שגיאה, במקום מסך המתנה שלא נגמר
const TIMEOUT_MS = 30_000;
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
  // רקע אטום לגמרי: מתחתיו גרסת ההדפסה נחשפת לרגע לצילום, ורקע שקוף-למחצה
  // הראה אותה דרכו כפסים וקווים על כל המסך
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 999999;
    background: ${isDark ? '#0B1220' : '#0F172A'};
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('pdf_timeout')), ms);
    promise.then(
      (v) => { window.clearTimeout(timer); resolve(v); },
      (e) => { window.clearTimeout(timer); reject(e); },
    );
  });
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

    // נותנים למסך ההמתנה להצטייר לפני העבודה הכבדה
    await new Promise<void>(r => requestAnimationFrame(() => r()));
    if (cancelled) return null;

    // רזולוציה לפי אורך הרשימה, מתחת לתקרת הפיקסלים
    const contentHeight = Math.max(1, sourceEl.scrollHeight);
    const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Math.sqrt(MAX_CANVAS_PIXELS / (CAPTURE_WIDTH * contentHeight))));

    // נקודות חיתוך אפשריות בין עמודים: סוף כל שורה וכל כותרת קטגוריה, כדי
    // שעמוד לא ייחתך באמצע מוצר
    const baseTop = sourceEl.getBoundingClientRect().top;
    const breaks = Array.from(sourceEl.querySelectorAll<HTMLElement>('tr, [data-pdf-break]'))
      .map(el => Math.round((el.getBoundingClientRect().bottom - baseTop) * scale))
      .sort((a, b) => a - b);

    const canvas = await withTimeout(html2canvas(sourceEl, {
      backgroundColor: '#ffffff', scale, useCORS: true, logging: false,
      // html2canvas משכפל את כל המסמך לפני הצילום. מדלגים על כל מה שלא
      // שייך לרשימה (כל שאר האפליקציה), וזה הרבה יותר מהיר
      ignoreElements: (el) => {
        const tag = el.tagName;
        if (tag === 'HEAD' || tag === 'STYLE' || tag === 'LINK' || tag === 'META' || tag === 'TITLE') return false;
        return !(el.contains(sourceEl) || sourceEl.contains(el));
      },
    }), TIMEOUT_MS);
    if (cancelled) return null;

    // חלוקה לעמודים: כל עמוד ביחס A4, חיתוך בנקודת השבירה האחרונה שנכנסת בו
    const pageHeight = Math.round(canvas.width * PAGE_RATIO);
    const cuts: number[] = [];
    let y = 0;
    while (canvas.height - y > pageHeight) {
      const limit = y + pageHeight;
      const fit = breaks.filter(b => b > y + pageHeight * 0.5 && b <= limit);
      const cut = fit.length ? fit[fit.length - 1] : limit;
      cuts.push(cut);
      y = cut;
    }
    cuts.push(canvas.height);

    // JPEG ולא PNG - הרקע לבן אחיד והתוכן הוא בעיקר טקסט/אייקונים, כך שאיכות
    // JPEG גבוהה (0.85) נראית זהה כמעט לעין אבל במשקל קטן משמעותית (חשוב
    // לשיתוף בוואטסאפ/הודעות).
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, pageHeight], orientation: 'p' });
    const page = document.createElement('canvas');
    page.width = canvas.width;
    page.height = pageHeight;
    const ctx = page.getContext('2d');
    if (!ctx) throw new Error('canvas_unavailable');
    let from = 0;
    cuts.forEach((to, i) => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, page.width, page.height);
      ctx.drawImage(canvas, 0, from, canvas.width, to - from, 0, 0, canvas.width, to - from);
      if (i > 0) pdf.addPage([canvas.width, pageHeight], 'p');
      pdf.addImage(page.toDataURL('image/jpeg', 0.85), 'JPEG', 0, 0, canvas.width, pageHeight);
      from = to;
    });
    if (cancelled) return null;
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
