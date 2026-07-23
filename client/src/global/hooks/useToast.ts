import { useState, useCallback, useEffect, useRef } from "react";
import type { ToastType } from '../types';

interface ToastState {
  message: string;
  type: ToastType;
  key: number;
  onUndo?: () => void;
}

// משך הצגה לפי סוג, התראות מידע מוצגות יותר זמן
const TOAST_DURATIONS: Record<ToastType, number> = {
  success: 2200,
  error: 3000,
  info: 5000,  // 5 שניות להודעות התראה, מספיק לקריאה
  warning: 5000 // 5 שניות לאזהרות חשובות
};

// זמן מינימלי שטוסט מוצג לפני החלפה
const MIN_DISPLAY_MS = 600;

export function useToast() {
  const [toast, setToast] = useState<ToastState>({ message: "", type: "success", key: 0 });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef = useRef(0);

  const showToast = useCallback(
    (msg: string, type: ToastType = "success", onUndo?: () => void) => {
      const now = Date.now();
      const elapsed = now - shownAtRef.current;

      const display = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        shownAtRef.current = Date.now();
        setToast((prev) => ({ message: msg, type, key: prev.key + 1, onUndo }));
        const duration = onUndo ? 4000 : TOAST_DURATIONS[type];
        timeoutRef.current = setTimeout(() => {
          setToast((prev) => ({ message: "", type: "success", key: prev.key }));
          timeoutRef.current = null;
        }, duration);
      };

      // אם טוסט קודם עדיין מוצג פחות מזמן מינימלי, דחייה קצרה
      if (shownAtRef.current > 0 && elapsed < MIN_DISPLAY_MS) {
        setTimeout(display, MIN_DISPLAY_MS - elapsed);
      } else {
        display();
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast((prev) => ({ message: "", type: "success", key: prev.key }));
  }, []);

  return { message: toast.message, toastType: toast.type, toastKey: toast.key, onUndo: toast.onUndo, showToast, hideToast };
}
