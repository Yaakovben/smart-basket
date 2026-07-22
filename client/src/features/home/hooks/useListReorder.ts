import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import type { List, User, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { authApi } from '../../../services/api';

// לוגיקת גרירה-לסידור-מחדש של כרטיסי רשימה במסך הבית: מצב גרירה, חישוב
// אינדקס יעד, גלילה אוטומטית בקצוות, ושמירת הסדר החדש לשרת.
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
      const midY = rect.top + rect.height / 2;
      if (clientY < midY) return i;
    }
    return cardRefs.current.length - 1;
  }, []);

  // גרירה: התחלת גרירה (clientY מגיע מה-listener אך לא נדרש כאן)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragStart = useCallback((index: number, _clientY: number) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
    haptic('medium');
  }, []);

  // גרירה: תנועה - throttle למניעת עומס ברשימות ארוכות
  const handleDragMove = useCallback((clientY: number) => {
    const currentIdx = dragIndexRef.current;
    if (currentIdx < 0) return;

    // גלילה אוטומטית כשגוררים לקצוות המסך (תמיד, ללא throttle)
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
  }, [contentRef, getTargetIndex]);

  // גרירה: סיום
  const handleDragEnd = useCallback(() => {
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    dragIndexRef.current = -1;
    setDragIndex(-1);
    setDragOverIndex(-1);
  }, []);

  // touch/mouse event handlers
  useEffect(() => {
    if (dragIndex < 0) return;
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onTouchEnd = () => handleDragEnd();
    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
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
  }, [dragIndex, handleDragMove, handleDragEnd]);

  const handleSaveOrder = useCallback(async () => {
    if (reorderedIds) {
      try {
        await authApi.updateListOrder(reorderedIds);
        // עדכון מקומי מיידי כדי שהסדר החדש ישתקף בלי לחכות לרענון user מהשרת
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

  // בדיקה אם הסדר השתנה
  const hasOrderChanges = useMemo(() => {
    if (!reorderedIds) return false;
    const original = originalOrderRef.current;
    if (reorderedIds.length !== original.length) return true;
    return reorderedIds.some((id, i) => id !== original[i]);
  }, [reorderedIds]);

  // ביטול מצב סידור
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
