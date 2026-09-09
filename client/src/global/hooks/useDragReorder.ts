import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import { haptic } from '../helpers';

// כמה ms להחזיק לפני שגרירה מתחילה - מאפשר גלילה אנכית טבעית ולא מפעיל
// drag בטעות. קצר יחסית כי הגרירה מתחילה מכל מקום בשורה, לא רק מהידית.
const DRAG_ACTIVATION_DELAY_MS = 140;
// כמה אפשר לזוז לפני שהטיימר נגמר בלי לבטל - קצת סובלנות לרעד אצבע.
const DRAG_CANCEL_VERTICAL_PX = 10;
const DRAG_CANCEL_HORIZONTAL_PX = 14;
// גובה שורה + מרווח - fallback בלבד, הגובה האמיתי נמדד מה-DOM בתחילת הגרירה.
const ROW_HEIGHT_FALLBACK_PX = 70;

interface Params {
  // הסדר הקנוני הנוכחי (מזהים) - נקרא *ברגע* הכניסה למצב סידור. getter
  // (ולא מערך) כדי לא להיתקע על ערך ישן ולהימנע מתלות מעגלית מול הסדר
  // המוצג, שנגזר בעצמו ממצב הסידור.
  getIds: () => string[];
  contentRef: RefObject<HTMLDivElement | null>;
  // מוזמן ע"י handleSave עם הסדר הסופי. השמירה עצמה (אופטימית + API)
  // באחריות הצרכן - ההוק רק מנהל את מחוות הגרירה ואת מצב הסידור.
  onCommit: (orderedIds: string[]) => void;
  rowHeightFallback?: number;
}

// ===== מנוע גרירה-לסידור-מחדש משותף =====
// לב הלוגיקה של גרירת מוצרים בתוך רשימה *וגם* גרירת כרטיסי רשימה במסך
// הבית - אותה תחושה בדיוק. גרירה חופשית לגמרי (כולל בין קטגוריות).
// סדר ה-DOM (reorderedIds) נשאר יציב לאורך כל הגרירה - הסידור המחודש עצמו
// לא נשלף שוב עד ה-drop; מה שנראה זז זה רק transform:
//   - השורה הנגררת: translateY רציף (בלי throttle) שעוקב אחרי האצבע 1:1.
//   - שורות אחרות: מוזזות בדיוק גובה-שורה אחד (עם transition) כדי "לפנות
//     מקום" ליעד הנוכחי (targetIndex, מתעדכן ב-throttle קל).
// זה מה שנותן תחושת גרירה חלקה בלי "קפיצות".
export function useDragReorder({ getIds, contentRef, onCommit, rowHeightFallback = ROW_HEIGHT_FALLBACK_PX }: Params) {
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedIds, setReorderedIds] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState(-1);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  // pending = long-press ממתין (עוד לא drag). state (לא ref) כדי שה-effect
  // שמחבר את מאזיני ה-touch של ה-document ירוץ *מיד* עם הלחיצה.
  const [pending, setPending] = useState(false);
  // סדר הפריטים ברגע הכניסה למצב סידור - state (לא ref) כי hasChanges
  // נגזר ממנו בזמן render.
  const [originalOrder, setOriginalOrder] = useState<string[]>([]);
  const dragIndexRef = useRef(-1);
  const targetIndexRef = useRef(-1);
  const dragStartYRef = useRef(0);
  // מיקום האצבע האחרון - מתעדכן גם בשלב ה-pending, כדי שההפעלה תשתמש
  // במיקום הנוכחי ולא במיקום הלחיצה המקורי (מונע קפיצה).
  const lastPointerYRef = useRef(0);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollRef = useRef<number | null>(null);
  // כיוון הגלילה האוטומטית הפעילה כרגע (null = לא גוללים). קיים כדי
  // שה-rAF loop יתחיל/ייעצר *רק* כשהכיוון עצמו משתנה.
  const autoScrollDirRef = useRef<-1 | 0 | 1>(0);
  const lastMoveTimeRef = useRef(0);
  // מיקומי ה-top של כל השורות (viewport coords) + gap בין שורות, נמדדים
  // *פעם אחת* בתחילת הגרירה. חישוב targetIndex מהם (ולא מ-
  // getBoundingClientRect חי) - כי בזמן גרירה השורות עצמן מוזזות ב-
  // transform, ומדידה חיה שלהן גרמה ל-targetIndex לקפוץ הלוך-ושוב.
  const rowTopsRef = useRef<number[]>([]);
  const rowPitchRef = useRef(rowHeightFallback);
  const startScrollTopRef = useRef(0);

  const pendingDragRef = useRef<{
    index: number; startY: number; startX: number; timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cancelPending = useCallback(() => {
    if (pendingDragRef.current) {
      clearTimeout(pendingDragRef.current.timer);
      pendingDragRef.current = null;
    }
    setPending(false);
  }, []);

  // targetIndex מתוך המדידה הסטטית שנלקחה ב-activateDrag + פיצוי גלילה.
  const getTargetIndex = useCallback((clientY: number): number => {
    const tops = rowTopsRef.current;
    if (tops.length === 0) return -1;
    const container = contentRef.current;
    const scrollDelta = container ? container.scrollTop - startScrollTopRef.current : 0;
    const y = clientY + scrollDelta;
    const half = rowPitchRef.current / 2;
    for (let i = 0; i < tops.length; i++) {
      if (y < tops[i] + half) return i;
    }
    return tops.length - 1;
  }, [contentRef]);

  // ההזזה (px) שיש להחיל על שורה שאינה נגררת, כדי לפנות מקום ל-targetIndex
  // הנוכחי. שורות בין dragIndex ל-targetIndex זזות בדיוק גובה-שורה אחד
  // בכיוון ההפוך לתנועת הגרירה.
  const getRowShift = useCallback((index: number): number => {
    if (dragIndex < 0 || targetIndex < 0 || index === dragIndex) return 0;
    const pitch = rowPitchRef.current;
    if (dragIndex < targetIndex) {
      return index > dragIndex && index <= targetIndex ? -pitch : 0;
    }
    return index >= targetIndex && index < dragIndex ? pitch : 0;
  }, [dragIndex, targetIndex]);

  const activateDrag = useCallback((index: number, startY: number) => {
    // מדידה סטטית של כל השורות *לפני* ש-setDragIndex גורם ל-transform.
    const tops = rowRefs.current.map((el) => (el ? el.getBoundingClientRect().top : 0));
    rowTopsRef.current = tops;
    const validPitch = tops.length >= 2 && tops[0] > 0 && tops[1] > tops[0] ? tops[1] - tops[0] : rowHeightFallback;
    rowPitchRef.current = validPitch;
    startScrollTopRef.current = contentRef.current?.scrollTop ?? 0;
    dragIndexRef.current = index;
    targetIndexRef.current = index;
    dragStartYRef.current = startY;
    setDragIndex(index);
    setTargetIndex(index);
    setDragOffsetY(0);
    haptic('medium');
  }, [contentRef, rowHeightFallback]);

  const handleDragStart = useCallback((index: number, clientY: number, clientX = 0) => {
    cancelPending();
    lastPointerYRef.current = clientY;
    const timer = setTimeout(() => {
      const p = pendingDragRef.current;
      pendingDragRef.current = null;
      setPending(false);
      if (p) activateDrag(p.index, lastPointerYRef.current || p.startY);
    }, DRAG_ACTIVATION_DELAY_MS);
    pendingDragRef.current = { index, startY: clientY, startX: clientX, timer };
    setPending(true);
  }, [cancelPending, activateDrag]);

  const handleDragMove = useCallback((clientY: number, clientX = 0) => {
    lastPointerYRef.current = clientY;
    if (pendingDragRef.current) {
      const { startY, startX } = pendingDragRef.current;
      if (Math.abs(clientX - startX) > DRAG_CANCEL_HORIZONTAL_PX) { cancelPending(); return; }
      if (Math.abs(clientY - startY) > DRAG_CANCEL_VERTICAL_PX) { cancelPending(); return; }
      return;
    }

    const currentIdx = dragIndexRef.current;
    if (currentIdx < 0) return;

    // עוקב אחרי האצבע ברציפות, בלי throttle - זה מה שנותן תחושת גרירה
    // חלקה. שורות שכנות מגיבות לפי targetIndex, שמתעדכן בנפרד למטה.
    setDragOffsetY(clientY - dragStartYRef.current);

    // גלילה אוטומטית - הכיוון מחושב מחדש בכל תזוזה, אבל ה-rAF loop עצמו
    // מופעל/מבוטל *רק* כשהכיוון באמת משתנה. touchmove יכול לירות כמה
    // פעמים באותו frame - ביטול+התחלה מחדש של rAF בכל קריאה גרם ל-tick
    // אף פעם לא לרוץ בפועל, והגלילה יצאה stutter-y.
    const SCROLL_ZONE = 100;
    const SCROLL_SPEED = 6;
    const container = contentRef.current;
    let dir: -1 | 0 | 1 = 0;
    if (container) {
      const rect = container.getBoundingClientRect();
      if (clientY < rect.top + SCROLL_ZONE) dir = -1;
      else if (clientY > rect.bottom - SCROLL_ZONE) dir = 1;
    }
    if (dir !== autoScrollDirRef.current) {
      autoScrollDirRef.current = dir;
      if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
      if (dir !== 0 && container) {
        const speed = dir * SCROLL_SPEED;
        const tick = () => { container.scrollBy(0, speed); autoScrollRef.current = requestAnimationFrame(tick); };
        autoScrollRef.current = requestAnimationFrame(tick);
      }
    }

    const now = Date.now();
    if (now - lastMoveTimeRef.current < 16) return;
    lastMoveTimeRef.current = now;

    const targetIdx = getTargetIndex(clientY);
    if (targetIdx !== targetIndexRef.current && targetIdx >= 0) {
      targetIndexRef.current = targetIdx;
      setTargetIndex(targetIdx);
      haptic('light');
    }
  }, [contentRef, getTargetIndex, cancelPending]);

  const handleDragEnd = useCallback(() => {
    cancelPending();
    setPending(false);
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    autoScrollDirRef.current = 0;
    const from = dragIndexRef.current;
    const to = targetIndexRef.current;
    if (from >= 0 && to >= 0 && from !== to) {
      setReorderedIds((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved);
        return next;
      });
      haptic('medium'); // "נחיתה" מספקת של השורה במקום החדש
    }
    dragIndexRef.current = -1;
    targetIndexRef.current = -1;
    setDragIndex(-1);
    setTargetIndex(-1);
    setDragOffsetY(0);
  }, [cancelPending]);

  const isActive = dragIndex >= 0 || pending;
  useEffect(() => {
    if (!isActive) return;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      // בזמן גרירה פעילה - חוסמים גלילת דף. בשלב pending - *לא* חוסמים,
      // כדי שגלילה אנכית תעבוד רגיל ורק תבטל את ה-pending.
      if (dragIndex >= 0) e.preventDefault();
      handleDragMove(touch.clientY, touch.clientX);
    };
    const onTouchEnd = () => handleDragEnd();
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY, e.clientX);
    const onMouseUp = () => handleDragEnd();
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragIndex, pending, isActive, handleDragMove, handleDragEnd]);

  const hasChanges = useMemo(() => {
    if (!reorderedIds) return false;
    if (reorderedIds.length !== originalOrder.length) return true;
    return reorderedIds.some((id, i) => id !== originalOrder[i]);
  }, [reorderedIds, originalOrder]);

  // איפוס מלא של מצב הגרירה + יציאה ממצב סידור. משמש גם ל-save (אחרי
  // שהצרכן קרא ל-onCommit) וגם כבסיס ל-cancel.
  const resetEngine = useCallback(() => {
    cancelPending();
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    autoScrollDirRef.current = 0;
    dragIndexRef.current = -1;
    targetIndexRef.current = -1;
    setReorderMode(false);
    setReorderedIds(null);
    setDragIndex(-1);
    setTargetIndex(-1);
    setDragOffsetY(0);
  }, [cancelPending]);

  const handleEnter = useCallback(() => {
    const ids = getIds();
    setOriginalOrder(ids);
    rowRefs.current = [];
    setReorderedIds(ids);
    setReorderMode(true);
    haptic('medium');
  }, [getIds]);

  const handleCancel = useCallback(() => {
    // איפוס ישיר (לא דרך handleDragEnd) - הוא מבצע את ה-splice הסופי של
    // הגרירה הפעילה. ביטול אמיתי חייב להישאר בלי שום commit.
    resetEngine();
  }, [resetEngine]);

  const handleSave = useCallback(() => {
    if (!reorderedIds) { resetEngine(); return; }
    const finalIds = reorderedIds;
    resetEngine();
    haptic('medium');
    onCommit(finalIds);
  }, [reorderedIds, resetEngine, onCommit]);

  return {
    reorderMode,
    reorderedIds,
    dragIndex,
    dragOffsetY,
    getRowShift,
    rowRefs,
    hasChanges,
    handleDragStart,
    handleEnter,
    handleCancel,
    handleSave,
    // יציאה ממצב סידור בלי commit דרך handleSave - לצרכן שמבצע שמירה מיוחדת
    // משלו (למשל "חזרה למיון לפי קטגוריה" שלא עובר דרך כפתור "סיים").
    exitReorder: resetEngine,
  };
}
