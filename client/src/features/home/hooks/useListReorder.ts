import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import type { List, User, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { authApi } from '../../../services/api';

// כמה ms צריך להחזיק על handle לפני שמתחילה גרירה.
// מאפשר גלילה טבעית ולא מפעיל drag בטעות בתנועה מהירה.
const DRAG_ACTIVATION_DELAY_MS = 180;
// טולרנס תנועה (px) - גלילה אנכית מעל סף זה מבטלת את ה-drag
const DRAG_CANCEL_VERTICAL_PX = 8;
// תנועה אופקית גדולה מזה = בוודאי גלילה אופקית (בפחות זמן)
const DRAG_CANCEL_HORIZONTAL_PX = 12;

// לוגיקת גרירה-לסידור-מחדש של כרטיסי רשימה במסך הבית.
// גרסה משופרת: long-press (180ms) לפני הפעלת drag - מאפשר גלילה טבעית.
export function useListReorder(
  contentRef: RefObject<HTMLDivElement | null>,
  display: List[],
  user: User,
  showToast: (message: string, type?: ToastType) => void,
  t: (key: TranslationKeys) => string,
) {
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedIds, setReorderedIds] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState(-1);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  const dragIndexRef = useRef(-1);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollRef = useRef<number | null>(null);
  const originalOrderRef = useRef<string[]>([]);
  const lastMoveTimeRef = useRef(0);

  // long-press pending state - מאחסן את ה-timer ונקודת ההתחלה
  const pendingDragRef = useRef<{
    index: number;
    startY: number;
    startX: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cancelPending = useCallback(() => {
    if (pendingDragRef.current) {
      clearTimeout(pendingDragRef.current.timer);
      pendingDragRef.current = null;
    }
  }, []);

  // חישוב סדר תצוגה עם סדר מותאם אישית
  const orderedDisplay = useMemo(() => {
    const order = reorderedIds || user.listOrder;
    if (!order || order.length === 0) return display;
    const orderMap = new Map(order.map((id, idx) => [id, idx]));
    return [...display].sort((a, b) => {
      const aIdx = orderMap.get(a.id);
      const bIdx = orderMap.get(b.id);
      if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
      if (aIdx !== undefined) return -1;
      if (bIdx !== undefined) return 1;
      return 0;
    });
  }, [display, reorderedIds, user.listOrder]);

  // גרירה: חישוב אינדקס יעד לפי מיקום Y
  const getTargetIndex = useCallback((clientY: number): number => {
    for (let i = 0; i < cardRefs.current.length; i++) {
      const el = cardRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return cardRefs.current.length - 1;
  }, []);

  // מפעיל את הגרירה בפועל (אחרי ה-delay)
  const activateDrag = useCallback((index: number) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
    haptic('medium');
  }, []);

  // handleDragStart - מתחיל pending, מפעיל גרירה רק אחרי long-press
  const handleDragStart = useCallback((index: number, clientY: number, clientX = 0) => {
    cancelPending();
    const timer = setTimeout(() => {
      pendingDragRef.current = null;
      activateDrag(index);
    }, DRAG_ACTIVATION_DELAY_MS);
    pendingDragRef.current = { index, startY: clientY, startX: clientX, timer };
  }, [cancelPending, activateDrag]);

  // handleDragMove - מטפל בתנועה בשני שלבים: pending או גרירה פעילה
  const handleDragMove = useCallback((clientY: number, clientX = 0) => {
    // שלב pending: בדוק אם מדובר בגלילה ולא בגרירה
    if (pendingDragRef.current) {
      const { startY, startX } = pendingDragRef.current;
      const dy = Math.abs(clientY - startY);
      const dx = Math.abs(clientX - startX);
      // אם המשתמש זז אופקית בצורה ברורה - זוהי גלילה אופקית, בטל מיד
      if (dx > DRAG_CANCEL_HORIZONTAL_PX) { cancelPending(); return; }
      // אם המשתמש זז אנכית מעל הסף - זוהי גלילה אנכית, בטל מיד
      if (dy > DRAG_CANCEL_VERTICAL_PX) { cancelPending(); return; }
      // תנועה קטנה מאוד - ממשיכים לחכות לטיימר
      return;
    }

    // שלב גרירה פעילה
    const currentIdx = dragIndexRef.current;
    if (currentIdx < 0) return;

    // גלילה אוטומטית כשגוררים לקצוות המסך
    const SCROLL_ZONE = 100;
    const SCROLL_SPEED = 5;
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

    // throttle: מקסימום עדכון סדר כל 50ms
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 50) return;
    lastMoveTimeRef.current = now;

    const targetIdx = getTargetIndex(clientY);
    if (targetIdx !== currentIdx) {
      setReorderedIds(prev => {
        if (!prev) return prev;
        const newIds = [...prev];
        const [moved] = newIds.splice(currentIdx, 1);
        newIds.splice(targetIdx, 0, moved);
        return newIds;
      });
      dragIndexRef.current = targetIdx;
      setDragIndex(targetIdx);
      setDragOverIndex(targetIdx);
      haptic('light');
    }
  }, [contentRef, getTargetIndex, cancelPending]);

  // סיום גרירה
  const handleDragEnd = useCallback(() => {
    cancelPending();
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    dragIndexRef.current = -1;
    setDragIndex(-1);
    setDragOverIndex(-1);
  }, [cancelPending]);

  // touch/mouse event listeners
  const isActive = dragIndex >= 0 || pendingDragRef.current !== null;
  useEffect(() => {
    if (!isActive) return;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (dragIndex >= 0) {
        // גרירה פעילה - מנע גלילה
        e.preventDefault();
      }
      handleDragMove(touch.clientY, touch.clientX);
    };
    const onTouchEnd = () => handleDragEnd();
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY, e.clientX);
    const onMouseUp = () => handleDragEnd();

    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragIndex, isActive, handleDragMove, handleDragEnd]);

  const handleSaveOrder = useCallback(async () => {
    if (reorderedIds) {
      try {
        await authApi.updateListOrder(reorderedIds);
        // eslint-disable-next-line react-hooks/immutability
        user.listOrder = reorderedIds;
        showToast(t('orderSaved'));
      } catch {
        showToast(t('errorOccurred'), 'error');
      }
    }
    setReorderMode(false);
    setReorderedIds(null);
  }, [reorderedIds, user, showToast, t]);

  const handleEnterReorder = useCallback(() => {
    const ids = orderedDisplay.map(l => l.id);
    originalOrderRef.current = ids;
    setReorderMode(true);
    setReorderedIds(ids);
    haptic('medium');
  }, [orderedDisplay]);

  const hasOrderChanges = useMemo(() => {
    if (!reorderedIds) return false;
    const original = originalOrderRef.current;
    if (reorderedIds.length !== original.length) return true;
    return reorderedIds.some((id, i) => id !== original[i]);
  }, [reorderedIds]);

  const handleCancelReorder = useCallback(() => {
    setReorderMode(false);
    setReorderedIds(null);
  }, []);

  return {
    orderedDisplay,
    reorderMode,
    dragIndex,
    dragOverIndex,
    cardRefs,
    hasOrderChanges,
    handleDragStart,
    handleSaveOrder,
    handleEnterReorder,
    handleCancelReorder,
  };
}
