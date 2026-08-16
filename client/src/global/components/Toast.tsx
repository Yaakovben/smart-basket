import { useRef, useCallback } from 'react';
import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';
import { useSettings } from '../context/SettingsContext';
import { ToastUndoBar } from './ToastUndoBar';
import {
  toastSnackbarSx, toastBoxSx, toastIconCircleSx, toastTextSx,
} from '../styles/Toast.styles';

interface ToastProps {
  msg: string;
  type?: ToastType;
  onDismiss?: () => void;
  onUndo?: () => void;
}

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
    if (diff < 0 && boxRef.current) {
      boxRef.current.style.transform = `translateY(${diff}px)`;
      boxRef.current.style.opacity = `${Math.max(0, 1 + diff / 150)}`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const diff = currentY.current - startY.current;
    if (diff < -SWIPE_THRESHOLD && onDismiss) {
      if (boxRef.current) {
        boxRef.current.style.transform = 'translateY(-100px)';
        boxRef.current.style.opacity = '0';
      }
      setTimeout(onDismiss, 150);
    } else if (boxRef.current) {
      boxRef.current.style.transform = '';
      boxRef.current.style.opacity = '';
    }
  }, [onDismiss]);

  if (!msg) return null;

  // undo bar בתחתית - רק למחיקה
  if (onUndo) return <ToastUndoBar msg={msg} onUndo={onUndo} onDismiss={onDismiss} />;

  const entry = TOAST_CONFIG[type];
  const isDark = settings.theme === 'dark';
  const config = isDark ? entry.dark : entry.light;
  const isLongText = msg.length > 35;

  return (
    <Snackbar
      open={!!msg}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      sx={toastSnackbarSx}
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
        sx={toastBoxSx(config, isDark, isLongText, !!onDismiss)}
      >
        <Box sx={toastIconCircleSx(config, isLongText, type === 'info')}>
          {entry.icon}
        </Box>
        <Typography sx={toastTextSx(config, isLongText)}>
          {msg}
        </Typography>
      </Box>
    </Snackbar>
  );
};
