import { useState, useRef, useCallback } from 'react';
import type { FabPosition, DragState } from '../types/list-types';

// גבולות וברירות מחדל לגרירת ה-FAB
const FAB_BOUNDARY = { minX: 30, minY: 50, bottomOffset: 30 }; // גבולות גרירה בפיקסלים
const DEFAULT_FAB_BOTTOM_OFFSET = 90; // מיקום ברירת מחדל מתחתית המסך
// סף גרירה - רק תנועה של 10px+ מהנקודה ההתחלתית מפעילה ממש גרירה.
// בלי זה, כל נגיעה עם רעד זעיר הייתה מזיזה את הכפתור.
const DRAG_THRESHOLD_PX = 10;

// לוגיקת גרירה עצמאית של כפתור ה-FAB להוספת מוצר, כולל שמירת מיקום ב-localStorage
export const useFabDrag = () => {
  const [fabPosition, setFabPosition] = useState<FabPosition | null>(() => {
    try {
      const saved = localStorage.getItem('fab-position');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<DragState | null>(null);

  const handleDragStart = useCallback((clientX: number, clientY: number, currentCenterX?: number, currentCenterY?: number) => {
    // אם הקומפוננטה מדדה את המיקום הנוכחי בפועל - משתמשים בו (מונע קפיצה בחציית הסף).
    // אחרת נופלים חזרה לברירת מחדל.
    const currentX = currentCenterX ?? fabPosition?.x ?? window.innerWidth / 2;
    const currentY = currentCenterY ?? fabPosition?.y ?? window.innerHeight - DEFAULT_FAB_BOTTOM_OFFSET;
    dragRef.current = { startX: clientX, startY: clientY, startPosX: currentX, startPosY: currentY };
  }, [fabPosition]);

  const handleDragMove = useCallback((clientX: number, clientY: number) => {
    if (!dragRef.current) return;
    const deltaX = clientX - dragRef.current.startX;
    const deltaY = clientY - dragRef.current.startY;
    // מפעיל גרירה רק אם המרחק חוצה את הסף - מבטיח שקליקים רגילים לא יזיזו את ה-FAB
    if (!isDragging) {
      if (Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD_PX) return;
      setIsDragging(true);
    }
    const newX = Math.max(FAB_BOUNDARY.minX, Math.min(window.innerWidth - FAB_BOUNDARY.minX, dragRef.current.startPosX + deltaX));
    const newY = Math.max(FAB_BOUNDARY.minY, Math.min(window.innerHeight - FAB_BOUNDARY.bottomOffset, dragRef.current.startPosY + deltaY));
    setFabPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    dragRef.current = null;
    // שמירת מיקום FAB ב-localStorage
    if (fabPosition) {
      try { localStorage.setItem('fab-position', JSON.stringify(fabPosition)); } catch { /* storage חסום */ }
    }
  }, [fabPosition]);

  return { fabPosition, isDragging, handleDragStart, handleDragMove, handleDragEnd };
};
