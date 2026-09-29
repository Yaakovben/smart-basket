// פתיחת מקלדת על שדה שעוד לא מוצג (למשל שדה בתוך קטע שנפתח עכשיו באנימציה).
// ב-iOS המקלדת נפתחת רק כשהפוקוס קורה בתוך הלחיצה עצמה, ואז השדה עוד לא קיים.
// הפתרון המקובל: פוקוס מיידי על שדה זמני בלתי נראה (המקלדת נפתחת), ומעבר
// לשדה האמיתי ברגע שהוא מוכן. מעבר פוקוס בין שדות לא סוגר את המקלדת.
// השדה הזמני נוסף בתוך container (בתוך המודאל), כי מלכודת הפוקוס של
// המודאל מחזירה אליו כל פוקוס שיוצא ממנו.
export function focusWithKeyboard(
  container: HTMLElement | null,
  getTarget: () => HTMLInputElement | null,
  inputMode: 'numeric' | 'text' = 'numeric',
): void {
  if (!container) return;
  const proxy = document.createElement('input');
  proxy.setAttribute('inputmode', inputMode);
  proxy.setAttribute('aria-hidden', 'true');
  proxy.tabIndex = -1;
  // גודל גופן 16 מונע זום אוטומטי ב-iOS בזמן הפוקוס
  Object.assign(proxy.style, {
    position: 'absolute', top: '0', left: '0', width: '1px', height: '1px',
    opacity: '0', fontSize: '16px', border: '0', padding: '0', pointerEvents: 'none',
  });
  container.appendChild(proxy);
  proxy.focus({ preventScroll: true });

  let tries = 0;
  const moveFocus = () => {
    const target = getTarget();
    if (target && target.getClientRects().length > 0) {
      target.focus({ preventScroll: true });
      proxy.remove();
      revealAboveKeyboard(target);
      return;
    }
    if (++tries < 25) window.setTimeout(moveFocus, 30);
    else proxy.remove();
  };
  window.setTimeout(moveFocus, 30);
}

// גלילה שמביאה את השדה לאמצע האזור הגלוי, אחרי שהמקלדת סיימה להיפתח
export function revealAboveKeyboard(el: HTMLElement): void {
  for (const delay of [320, 650]) {
    window.setTimeout(() => {
      if (document.activeElement === el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, delay);
  }
}
