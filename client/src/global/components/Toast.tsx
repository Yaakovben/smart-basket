import { useRef, useCallback, useState, useEffect } from 'react';
import { Snackbar, Box, Typography, LinearProgress } from '@mui/material';
import type { ToastType } from '../types';
import { useSettings } from '../context/SettingsContext';

interface ToastProps {
  msg: string;
  type?: ToastType;
  onDismiss?: () => void;
  onUndo?: () => void;
}

const UNDO_DURATION = 4000;

const UndoBar = ({ msg, onUndo, onDismiss }: { msg: string; onUndo: () => void; onDismiss?: () => void }) => {
  const { settings, t } = useSettings();
  const isDark = settings.theme === 'dark';
  const [progress, setProgress] = useState(100);
  const startRef = useRef(0);

  // מצב גרירה - פוזיציה Y ומהירות (WhatsApp-style swipe down)
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchRef = useRef<{ startY: number; lastY: number; lastT: number; velocity: number }>({
    startY: 0, lastY: 0, lastT: 0, velocity: 0,
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
    // אם הנגיעה מתחילה על כפתור הביטול - לא מפעילים גרירה בכלל
    const target = e.target as HTMLElement | null;
    startedOnUndoRef.current = !!target?.closest('[data-undo-button="true"]');
    if (startedOnUndoRef.current) return;
    const y = e.touches[0].clientY;
    touchRef.current = { startY: y, lastY: y, lastT: Date.now(), velocity: 0 };
    setIsDragging(true);
  }, []);
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (startedOnUndoRef.current) return;
    const y = e.touches[0].clientY;
    const now = Date.now();
    const r = touchRef.current;
    const dt = Math.max(1, now - r.lastT);
    r.velocity = ((y - r.lastY) / dt) * 1000;
    r.lastY = y;
    r.lastT = now;
    const diff = y - r.startY;
    setDragY(Math.max(0, diff));
  }, []);
  const handleTouchEnd = useCallback(() => {
    if (startedOnUndoRef.current) {
      startedOnUndoRef.current = false;
      return;
    }
    const r = touchRef.current;
    const finalY = r.lastY - r.startY;
    // סף גרירה של 30px או flick מהיר למטה - גבוה מספיק כדי לא לחטוף tap רגיל
    const shouldDismiss = finalY > 30 || (finalY > 15 && r.velocity > 400);
    if (shouldDismiss) {
      setDragY(Math.max(finalY, 120));
      setIsDragging(false);
      window.setTimeout(() => onDismiss?.(), 150);
    } else {
      setIsDragging(false);
      setDragY(0);
    }
  }, [onDismiss]);

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        left: '50%', right: 'auto',
        transform: 'translateX(-50%)',
        width: 'auto', maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <Box
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))'
            : 'linear-gradient(135deg, rgba(30,41,59,0.96), rgba(51,65,85,0.96))',
          borderRadius: '14px',
          boxShadow: '0 8px 28px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          overflow: 'hidden',
          // אנימציית כניסה רק אם אנחנו לא באמצע גרירה (אחרת הן מתנגשות)
          animation: dragY === 0 && !isDragging ? 'undoIn 0.3s ease-out' : 'none',
          '@keyframes undoIn': {
            from: { transform: 'translateY(20px)', opacity: 0 },
            to: { transform: 'translateY(0)', opacity: 1 },
          },
          minWidth: 220, maxWidth: 300,
          // בזמן גרירה - בלי transition (התנועה עוקבת את האצבע 1:1).
          // ברגע שהאצבע משתחררת - transition מחזיר snap-back חלק.
          transform: `translateY(${dragY}px)`,
          opacity: Math.max(0, 1 - dragY / 140),
          transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s',
          touchAction: 'pan-y',
          userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          cursor: 'grab',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1 }}>
          <Box sx={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.18))',
            border: '1px solid rgba(252,165,165,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, flexShrink: 0
          }}>
            🗑️
          </Box>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.92)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>
            {msg}
          </Typography>
          <Box
            data-undo-button="true"
            onClick={(e) => { e.stopPropagation(); onUndo(); onDismiss?.(); }}
            sx={{
              px: 1.5, py: 0.6,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(20,184,166,0.3), rgba(13,148,136,0.25))',
              border: '1px solid rgba(94,234,212,0.35)',
              color: '#5EEAD4',
              fontSize: 12.5, fontWeight: 700,
              letterSpacing: '0.02em',
              cursor: 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s, opacity 0.1s',
              '&:active': { opacity: 0.75 },
            }}
          >
            {t('cancel')}
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            bgcolor: 'rgba(255,255,255,0.06)',
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(90deg, #5EEAD4, #14B8A6)',
              transition: 'none',
            },
          }}
        />
      </Box>
    </Snackbar>
  );
};

const TOAST_CONFIG: Record<ToastType, { icon: string; light: { color: string; bg: string; border: string }; dark: { color: string; bg: string; border: string } }> = {
  success: { icon: '✓', light: { color: '#059669', bg: '#ECFDF5', border: '#05966930' }, dark: { color: '#6EE7B7', bg: 'rgba(16, 185, 129, 0.22)', border: 'rgba(110, 231, 183, 0.3)' } },
  error: { icon: '✕', light: { color: '#DC2626', bg: '#FEF2F2', border: '#DC262630' }, dark: { color: '#FCA5A5', bg: 'rgba(239, 68, 68, 0.22)', border: 'rgba(252, 165, 165, 0.3)' } },
  info: { icon: '🔔', light: { color: '#0891B2', bg: '#ECFEFF', border: '#0891B230' }, dark: { color: '#67E8F9', bg: 'rgba(8, 145, 178, 0.22)', border: 'rgba(103, 232, 249, 0.3)' } },
  warning: { icon: '⚠', light: { color: '#D97706', bg: '#FFFBEB', border: '#D9770630' }, dark: { color: '#FCD34D', bg: 'rgba(217, 119, 6, 0.22)', border: 'rgba(252, 211, 77, 0.3)' } }
};

const SWIPE_THRESHOLD = 60;

export const Toast = ({ msg, type = 'success', onDismiss, onUndo }: ToastProps) => {
  const { settings } = useSettings();
  const startY = useRef(0);
  const currentY = useRef(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    currentY.current = e.touches[0].clientY;
    const diff = currentY.current - startY.current;
    // רק החלקה למעלה
    if (diff < 0 && boxRef.current) {
      boxRef.current.style.transform = `translateY(${diff}px)`;
      boxRef.current.style.opacity = `${Math.max(0, 1 + diff / 150)}`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = currentY.current - startY.current;
    if (diff < -SWIPE_THRESHOLD && onDismiss) {
      // החלקה מספיקה = סגירה
      if (boxRef.current) {
        boxRef.current.style.transform = 'translateY(-100px)';
        boxRef.current.style.opacity = '0';
      }
      setTimeout(onDismiss, 150);
    } else if (boxRef.current) {
      // החזרה למקום
      boxRef.current.style.transform = '';
      boxRef.current.style.opacity = '';
    }
  }, [onDismiss]);

  if (!msg) return null;

  // undo bar בתחתית - רק למחיקה
  if (onUndo) return <UndoBar msg={msg} onUndo={onUndo} onDismiss={onDismiss} />;

  const entry = TOAST_CONFIG[type];
  const isDark = settings.theme === 'dark';
  const config = isDark ? entry.dark : entry.light;
  const isLongText = msg.length > 35;

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={{
        top: 'max(20px, calc(env(safe-area-inset-top) + 8px))',
        left: '50%',
        right: 'auto',
        transform: 'translateX(-50%)',
        width: 'auto',
        maxWidth: 'calc(100vw - 32px)'
      }}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <Box
        ref={boxRef}
        onClick={onDismiss}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        sx={{
          display: 'flex',
          alignItems: isLongText ? 'flex-start' : 'center',
          gap: 1.25,
          px: 2.5,
          py: 1.25,
          bgcolor: config.bg,
          borderRadius: '16px',
          border: `1.5px solid ${config.border}`,
          boxShadow: isDark
            ? `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)`
            : `0 4px 20px ${config.color}20`,
          backdropFilter: isDark ? 'blur(12px)' : 'none',
          animation: 'toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          '@keyframes toastIn': {
            '0%': { transform: 'translateY(-50px) scale(0.85)', opacity: 0 },
            '70%': { transform: 'translateY(4px) scale(1.02)', opacity: 1 },
            '100%': { transform: 'translateY(0) scale(1)', opacity: 1 }
          },
          maxWidth: 'calc(100vw - 48px)',
          minWidth: isLongText ? 280 : 'auto',
          cursor: onDismiss ? 'pointer' : 'default',
          transition: 'transform 0.15s ease, opacity 0.15s ease',
          '&:active': onDismiss ? { transform: 'scale(0.97)', opacity: 0.9 } : {},
          touchAction: 'pan-x',
        }}
      >
        <Box sx={{
          width: 26,
          height: 26,
          borderRadius: '50%',
          bgcolor: `${config.color}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: config.color,
          fontSize: type === 'info' ? 14 : 13,
          fontWeight: 700,
          flexShrink: 0,
          mt: isLongText ? 0.25 : 0
        }}>
          {entry.icon}
        </Box>
        <Typography sx={{
          fontSize: isLongText ? 13 : 14,
          fontWeight: 600,
          color: config.color,
          wordBreak: 'break-word',
          whiteSpace: 'normal',
          letterSpacing: '-0.01em',
          lineHeight: 1.4,
          flex: 1
        }}>
          {msg}
        </Typography>
      </Box>
    </Snackbar>
  );
};
