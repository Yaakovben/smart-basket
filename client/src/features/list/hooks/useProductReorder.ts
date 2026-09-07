import { useState, useRef, useCallback, useMemo, useEffect, type RefObject } from 'react';
import type { Product, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { haptic } from '../../../global/helpers';
import { productsApi } from '../../../services/api';
import { socketService } from '../../../services/socket';
import { getCategoryOrder } from '../helpers/list-helpers';

// כמה ms להחזיק על שורה לפני שגרירה מתחילה - מאפשר גלילה טבעית ולא
// מפעיל drag בטעות בתנועה מהירה. (זהה ל-useListReorder במסך הבית.)
const DRAG_ACTIVATION_DELAY_MS = 180;
const DRAG_CANCEL_VERTICAL_PX = 8;
const DRAG_CANCEL_HORIZONTAL_PX = 12;

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

// גרירה-לסידור-מחדש של מוצרים בתוך רשימה. אותה מכניקה כמו useListReorder
// (long-press → drag, גלילה אוטומטית בקצוות, throttle) אבל על מוצרים.
export function useProductReorder({ listId, items, userName, contentRef, applyLocalOrder, showToast, t }: Params) {
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderedIds, setReorderedIds] = useState<string[] | null>(null);
  const [dragIndex, setDragIndex] = useState(-1);
  const [dragOverIndex, setDragOverIndex] = useState(-1);
  const [saving, setSaving] = useState(false);
  const dragIndexRef = useRef(-1);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const autoScrollRef = useRef<number | null>(null);
  const originalOrderRef = useRef<string[]>([]);
  const lastMoveTimeRef = useRef(0);
  // עותק חי של reorderedIds לשימוש בתוך handleDragMove בלי להפוך אותו
  // ל-dependency (היה יוצר closure מיושן/מפעיל re-subscribe מיותר של
  // event listeners בכל תזוזה - ראו useEffect למטה).
  const reorderedIdsRef = useRef<string[] | null>(null);
  // קטגוריה לכל מוצר, לפי id - לחישוב גבולות הקטגוריה שדרך useList כבר
  // קיבצה את הרשימה לפיה (ראו הבהרה למטה ב-getCategoryBounds).
  const categoryById = useMemo(
    () => new Map(items.map((p) => [p.id, getCategoryOrder(p.category)])),
    [items]
  );

  const pendingDragRef = useRef<{
    index: number; startY: number; startX: number; timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  const cancelPending = useCallback(() => {
    if (pendingDragRef.current) {
      clearTimeout(pendingDragRef.current.timer);
      pendingDragRef.current = null;
    }
  }, []);

  // הסדר להצגה במצב סידור - lookup לפי id כדי לשרוד עדכוני מוצר תוך כדי.
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

  useEffect(() => { reorderedIdsRef.current = reorderedIds; }, [reorderedIds]);

  const getTargetIndex = useCallback((clientY: number): number => {
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientY < rect.top + rect.height / 2) return i;
    }
    return rowRefs.current.length - 1;
  }, []);

  // גבולות בלוק הקטגוריה שהמוצר הנגרר שייך אליו, בתוך המערך הנוכחי (arr).
  // הרשימה שמגיעה מ-useList כבר מקובצת קטגוריה-קודם (ראו ההערה שם) - כל
  // עוד גוררים רק בתוך הבלוק, ההנחה הזו נשמרת אחרי כל תזוזה. כך אי אפשר
  // לגרור מוצר לתוך קטגוריה אחרת (שגם ככה יוחזר למקומו במיון הבא) - במקום
  // "לקפוץ בחזרה" מבלבל אחרי שמירה, הגרירה עצמה פשוט לא חוצה את הגבול.
  const getCategoryBounds = useCallback((idx: number, arr: string[]): [number, number] => {
    const cat = categoryById.get(arr[idx]);
    let lo = idx, hi = idx;
    while (lo > 0 && categoryById.get(arr[lo - 1]) === cat) lo--;
    while (hi < arr.length - 1 && categoryById.get(arr[hi + 1]) === cat) hi++;
    return [lo, hi];
  }, [categoryById]);

  const activateDrag = useCallback((index: number) => {
    dragIndexRef.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
    haptic('medium');
  }, []);

  const handleDragStart = useCallback((index: number, clientY: number, clientX = 0) => {
    cancelPending();
    const timer = setTimeout(() => {
      pendingDragRef.current = null;
      activateDrag(index);
    }, DRAG_ACTIVATION_DELAY_MS);
    pendingDragRef.current = { index, startY: clientY, startX: clientX, timer };
  }, [cancelPending, activateDrag]);

  const handleDragMove = useCallback((clientY: number, clientX = 0) => {
    if (pendingDragRef.current) {
      const { startY, startX } = pendingDragRef.current;
      if (Math.abs(clientX - startX) > DRAG_CANCEL_HORIZONTAL_PX) { cancelPending(); return; }
      if (Math.abs(clientY - startY) > DRAG_CANCEL_VERTICAL_PX) { cancelPending(); return; }
      return;
    }

    const currentIdx = dragIndexRef.current;
    if (currentIdx < 0) return;

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
    if (now - lastMoveTimeRef.current < 50) return;
    lastMoveTimeRef.current = now;

    const arr = reorderedIdsRef.current;
    const rawTargetIdx = getTargetIndex(clientY);
    const [lo, hi] = arr ? getCategoryBounds(currentIdx, arr) : [rawTargetIdx, rawTargetIdx];
    const targetIdx = Math.min(hi, Math.max(lo, rawTargetIdx));
    if (targetIdx !== currentIdx && targetIdx >= 0) {
      setReorderedIds((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        const [moved] = next.splice(currentIdx, 1);
        next.splice(targetIdx, 0, moved);
        return next;
      });
      dragIndexRef.current = targetIdx;
      setDragIndex(targetIdx);
      setDragOverIndex(targetIdx);
      haptic('light');
    }
  }, [contentRef, getTargetIndex, cancelPending]);

  const handleDragEnd = useCallback(() => {
    cancelPending();
    if (autoScrollRef.current) { cancelAnimationFrame(autoScrollRef.current); autoScrollRef.current = null; }
    dragIndexRef.current = -1;
    setDragIndex(-1);
    setDragOverIndex(-1);
  }, [cancelPending]);

  const isActive = dragIndex >= 0 || pendingDragRef.current !== null;
  useEffect(() => {
    if (!isActive) return;
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (dragIndex >= 0) e.preventDefault();
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
    setReorderMode(false);
    setReorderedIds(null);
    handleDragEnd();
  }, [handleDragEnd]);

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
    dragOverIndex,
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
