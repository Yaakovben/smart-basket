import { useRef, useCallback, useState, useEffect } from 'react';
import { Snackbar, Box, Typography, LinearProgress } from '@mui/material';
import { useSettings } from '../context/SettingsContext';
import {
  undoSnackbarSx, undoBarSx, dragHandleSx, undoContentRowSx, undoIconCircleSx, undoMsgSx, undoButtonSx, undoProgressSx,
} from '../styles/Toast.styles';

interface ToastUndoBarProps {
  msg: string;
  onUndo: () => void;
  onDismiss?: () => void;
}

const UNDO_DURATION = 4000;

/** בועת "בטל" בתחתית המסך - עם ספירה לאחור וגרירה לסגירה (X או Y). */
export const ToastUndoBar = ({ msg, onUndo, onDismiss }: ToastUndoBarProps) => {
  const { settings, t } = useSettings();
  const isDark = settings.theme === 'dark';
  const [progress, setProgress] = useState(100);
  const startRef = useRef(0);

  // מצב גרירה - X (הצדדים) + Y (למטה). כיוון נקבע לפי הציר הדומיננטי בתחילת התנועה.
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchRef = useRef<{ startX: number; startY: number; lastX: number; lastY: number; lastT: number; velocityX: number; velocityY: number; axis: 'x' | 'y' | null }>({
    startX: 0, startY: 0, lastX: 0, lastY: 0, lastT: 0, velocityX: 0, velocityY: 0, axis: null,
  });
  // דגל: האם הנגיעה התחילה על כפתור ה"ביטול" - כדי לא לחטוף לחיצה ל"גרירה"
  const startedOnUndoRef = useRef(false);

  // סרגל התקדמות שנספר לאחור
  useEffect(() => {
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / UNDO_DURATION) * 100);
      setProgress(remaining);
      if (remaining > 0) requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const target = e.target as HTMLElement | null;
    startedOnUndoRef.current = !!target?.closest('[data-undo-button="true"]');
    if (startedOnUndoRef.current) return;
    const { clientX: x, clientY: y } = e.touches[0];
    touchRef.current = { startX: x, startY: y, lastX: x, lastY: y, lastT: Date.now(), velocityX: 0, velocityY: 0, axis: null };
    setIsDragging(true);
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startedOnUndoRef.current) return;
    const { clientX: x, clientY: y } = e.touches[0];
    const now = Date.now();
    const r = touchRef.current;
    const dt = Math.max(1, now - r.lastT);
    r.velocityX = ((x - r.lastX) / dt) * 1000;
    r.velocityY = ((y - r.lastY) / dt) * 1000;
    r.lastX = x;
    r.lastY = y;
    r.lastT = now;
    const diffX = x - r.startX;
    const diffY = y - r.startY;
    // קובעים את הציר הדומיננטי פעם אחת, ברגע שעברו סף מינימלי
    if (!r.axis && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
      r.axis = Math.abs(diffX) > Math.abs(diffY) ? 'x' : 'y';
    }
    if (r.axis === 'x') {
      setDragX(diffX);
      setDragY(0);
    } else if (r.axis === 'y') {
      setDragY(Math.max(0, diffY));
      setDragX(0);
    }
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (startedOnUndoRef.current) {
      startedOnUndoRef.current = false;
      return;
    }
    const r = touchRef.current;
    const finalX = r.lastX - r.startX;
    const finalY = r.lastY - r.startY;
    const shouldDismissY = r.axis === 'y' && (finalY > 30 || (finalY > 15 && r.velocityY > 400));
    const shouldDismissX = r.axis === 'x' && (Math.abs(finalX) > 60 || (Math.abs(finalX) > 30 && Math.abs(r.velocityX) > 400));
    if (shouldDismissY) {
      setDragY(Math.max(finalY, 120));
      setIsDragging(false);
      window.setTimeout(() => onDismiss?.(), 150);
    } else if (shouldDismissX) {
      const direction = finalX > 0 ? 1 : -1;
      setDragX(direction * Math.max(Math.abs(finalX), 260));
      setIsDragging(false);
      window.setTimeout(() => onDismiss?.(), 150);
    } else {
      setIsDragging(false);
      setDragX(0);
      setDragY(0);
    }
  }, [onDismiss]);

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={undoSnackbarSx}
    >
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={undoBarSx(isDark, dragX, dragY, isDragging)}
      >
        {/* רמז גרירה - פס אפור דק בראש הטוסט, מרמז שאפשר להחליק כדי לסגור */}
        <Box aria-hidden="true" sx={dragHandleSx} />
        <Box sx={undoContentRowSx}>
          <Box sx={undoIconCircleSx}>
            🗑️
          </Box>
          <Typography sx={undoMsgSx}>
            {msg}
          </Typography>
          <Box
            data-undo-button="true"
            onClick={(e) => { e.stopPropagation(); onUndo(); onDismiss?.(); }}
            sx={undoButtonSx}
          >
            {t('cancel')}
          </Box>
        </Box>
        <LinearProgress variant="determinate" value={progress} sx={undoProgressSx} />
      </Box>
    </Snackbar>
  );
};
