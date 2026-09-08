import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import type { Product, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { productsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { getCategoryOrder } from '../helpers/list-helpers';

// כמה ms להחזיק לפני שגרירה מתחילה - מאפשר גלילה אנכית טבעית ולא מפעיל
// drag בטעות. קצר יחסית (140) כי הגרירה מתחילה מכל מקום בשורה, לא רק
// מהידית - צריך להרגיש מיידי.
const DRAG_ACTIVATION_DELAY_MS = 140;
// כמה אפשר לזוז לפני שהטיימר נגמר בלי לבטל - קצת סובלנות לרעד אצבע.
const DRAG_CANCEL_VERTICAL_PX = 10;
const DRAG_CANCEL_HORIZONTAL_PX = 14;
// גובה שורה + מרווח (ProductReorderRow: height:64 + mb:'6px'). משמש רק
// כ-fallback - הגובה האמיתי נמדד מה-DOM בתחילת הגרירה (rowPitchRef).
const ROW_HEIGHT_PX = 70;

interface Params {
  listId: string;
  // המוצרים המוצגים כרגע (טאב "לקנות", ללא סינון קטגוריה/חיפוש), כבר
  // ממוינים לפי הסדר הנוכחי.
  items: Product[];
  userName: string;
  contentRef: RefObject<HTMLDivElement | null>;
  // עדכון אופטימי מקומי: מקבע positions לפי הסדר + דגל הרשימה.
  applyLocalOrder: (orderedIds: string[], manual: boolean) => void;
  showToast: (message: string, type?: ToastType) => void;
  t: (key: TranslationKeys) => string;
}

// גרירה-לסידור-מחדש של מוצרים בתוך רשימה - חופשית לגמרי, כולל בין
// קטגוריות. סדר ה-DOM (reorderedIds) נשאר יציב לאורך כל הגרירה - הסידור
// המחודש עצמו לא נשלף שוב עד ה-drop; מה שנראה זז זה רק transform:
//   - השורה הנגררת: translateY רציף (בלי throttle) שעוקב אחרי האצבע 1:1.
//   - שורות אחרות: מוזזות בדיוק גובה-שורה אחד (עם transition) כדי "לפנות
//     מקום" ליעד הנוכחי (targetIndex, מתעדכן ב-throttle קל לפי מיקום
//     האצבע האמיתי - ראו getTargetIndex).
// זה מה שנותן תחושת גרירה חלקה בלי "קפיצות" - בניגוד לגישה הקודמת שסיפרה
// מחדש את המערך (ורינדרה הכל מחדש) בכל מעבר בין שורות.
export function useProductReorder({ listId, items, userName, contentRef, applyLocalOrder, showToast, t }: Params) {
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedIds, setReorderedIds] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState(-1);
  const [targetIndex, setTargetIndex] = useState(-1);
  const [dragOffsetY, setDragOffsetY] = useState(0);
  // pending = long-press ממתין (עוד לא drag). state (לא ref) כדי שה-effect
  // שמחבר את מאזיני ה-touch של ה-document ירוץ *מיד* עם הלחיצה - אחרת אין
  // מעקב אחרי האצבע במהלך חלון ה-140ms, והגרירה "קופצת" כשהיא נכנסת לתוקף.
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const dragIndexRef = useRef(-1);
  const targetIndexRef = useRef(-1);
  const dragStartYRef = useRef(0);
  // מיקום האצבע האחרון - מתעדכן גם בשלב ה-pending, כדי שההפעלה תשתמש
  // במיקום הנוכחי ולא במיקום הלחיצה המקורי (מונע קפיצה).
  const lastPointerYRef = useRef(0);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollRef = useRef<number | null>(null);
  const originalOrderRef = useRef<string[]>([]);
  const lastMoveTimeRef = useRef(0);
  // מיקומי ה-top של כל השורות (viewport coords) + gap בין שורות, נמדדים
  // *פעם אחת* בתחילת הגרירה. חישוב targetIndex מהם (ולא מ-
  // getBoundingClientRect חי) - כי בזמן גרירה השורות עצמן מוזזות ב-
  // transform, ומדידה חיה שלהן גרמה ל-targetIndex לקפוץ הלוך-ושוב
  // ("לא מגיב טוב"). scrollTop ההתחלתי מפצה על גלילה אוטומטית תוך כדי.
  const rowTopsRef = useRef<number[]>([]);
  const rowPitchRef = useRef(ROW_HEIGHT_PX);
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

  // הסדר להצגה במצב סידור - lookup לפי id כדי לשרוד עדכוני מוצר תוך כדי.
  // נשאר יציב לאורך כל הגרירה הפעילה - ראו הסבר למעלה.
  const orderedItems = useMemo(() => {
    if (!reorderMode || !reorderedIds) return items;
    const byId = new Map(items.map((p) => [p.id, p]));
    const result: Product[] = [];
    for (const id of reorderedIds) {
      const p = byId.get(id);
      if (p) result.push(p);
    }
    // מוצר שנוסף/הופיע אחרי הכניסה למצב סידור - נספח לסוף.
    for (const p of items) if (!reorderedIds.includes(p.id)) result.push(p);
    return result;
  }, [reorderMode, reorderedIds, items]);

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
    const validPitch = tops.length >= 2 && tops[0] > 0 && tops[1] > tops[0] ? tops[1] - tops[0] : ROW_HEIGHT_PX;
    rowPitchRef.current = validPitch;
    startScrollTopRef.current = contentRef.current?.scrollTop ?? 0;
    dragIndexRef.current = index;
    targetIndexRef.current = index;
    dragStartYRef.current = startY;
    setDragIndex(index);
    setTargetIndex(index);
    setDragOffsetY(0);
    haptic('medium');
  }, [contentRef]);

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

    const SCROLL_ZONE = 100;
    const SCROLL_SPEED = 6;
    const container = contentRef.current;
    if (autoScrollRef.current) cancelAnimationFrame(autoScrollRef.current);
    if (container) {
      const rect = container.getBoundingClientRect();
      if (clientY < rect.top + SCROLL_ZONE) {
        const tick = () => { container.scrollBy(0, -SCROLL_SPEED); autoScrollRef.current = requestAnimationFrame(tick); };
        autoScrollRef.current = requestAnimationFrame(tick);
      } else if (clientY > rect.bottom - SCROLL_ZONE) {
        const tick = () => { container.scrollBy(0, SCROLL_SPEED); autoScrollRef.current = requestAnimationFrame(tick); };
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
      // כדי שגלילה אנכית תעבוד רגיל ורק תבטל את ה-pending (ראו handleDragMove).
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
    const original = originalOrderRef.current;
    if (reorderedIds.length !== original.length) return true;
    return reorderedIds.some((id, i) => id !== original[i]);
  }, [reorderedIds]);

  const handleEnter = useCallback(() => {
    const ids = items.map((p) => p.id);
    originalOrderRef.current = ids;
    rowRefs.current = [];
    setReorderedIds(ids);
    setReorderMode(true);
    haptic('medium');
  }, [items]);

  const handleCancel = useCallback(() => {
    // איפוס ישיר של ה-refs (לא דרך handleDragEnd) - הוא מבצע את ה-splice
    // הסופי של הגרירה הפעילה, וסדר-הביצוע מול setReorderedIds(null) כאן
    // לא שווה לסמוך עליו. ביטול אמיתי חייב להישאר בלי שום commit.
    cancelPending();
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    dragIndexRef.current = -1;
    targetIndexRef.current = -1;
    setReorderMode(false);
    setReorderedIds(null);
    setDragIndex(-1);
    setTargetIndex(-1);
    setDragOffsetY(0);
  }, [cancelPending]);

  const persist = useCallback(async (ids: string[], manual: boolean) => {
    setSaving(true);
    applyLocalOrder(ids, manual);
    try {
      await productsApi.reorderProducts(listId, ids, manual);
      socketService.emitProductsReordered(listId, userName);
      showToast(t(manual ? 'orderSaved' : 'productOrderAuto'));
    } catch {
      showToast(t('errorOccurred'), 'error');
    } finally {
      setSaving(false);
      setReorderMode(false);
      setReorderedIds(null);
    }
  }, [listId, userName, applyLocalOrder, showToast, t]);

  const handleSave = useCallback(() => {
    if (!reorderedIds) { setReorderMode(false); return; }
    void persist(reorderedIds, true);
  }, [reorderedIds, persist]);

  // חזרה למיון אוטומטי לפי קטגוריה→א"ב - שולח לשרת את הסדר הזה עם manual=false.
  const handleSortByCategory = useCallback(() => {
    const ids = [...items]
      .sort((a, b) => {
        const diff = getCategoryOrder(a.category) - getCategoryOrder(b.category);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name, 'he');
      })
      .map((p) => p.id);
    void persist(ids, false);
  }, [items, persist]);

  return {
    orderedItems,
    reorderMode,
    dragIndex,
    dragOffsetY,
    getRowShift,
    rowRefs,
    hasChanges,
    saving,
    handleDragStart,
    handleSave,
    handleEnter,
    handleCancel,
    handleSortByCategory,
  };
}
