import { useRef, useCallback } from 'react';
import { Snackbar, Box, Typography } from '@mui/material';
import type { ToastType } from '../types';
import { useSettings } from '../context/SettingsContext';

interface ToastProps {
  msg: string;
  type?: ToastType;
  onDismiss?: () => void;
}

const TOAST_CONFIG: Record<ToastType, { icon: string; light: { color: string; bg: string }; dark: { color: string; bg: string } }> = {
  success: { icon: '✓', light: { color: '#059669', bg: '#ECFDF5' }, dark: { color: '#6EE7B7', bg: 'rgba(16, 185, 129, 0.18)' } },
  error: { icon: '✕', light: { color: '#DC2626', bg: '#FEF2F2' }, dark: { color: '#FCA5A5', bg: 'rgba(239, 68, 68, 0.18)' } },
  info: { icon: '🔔', light: { color: '#0891B2', bg: '#ECFEFF' }, dark: { color: '#67E8F9', bg: 'rgba(8, 145, 178, 0.18)' } },
  warning: { icon: '⚠', light: { color: '#D97706', bg: '#FFFBEB' }, dark: { color: '#FCD34D', bg: 'rgba(217, 119, 6, 0.18)' } }
};

const SWIPE_THRESHOLD = 60;

export const Toast = ({ msg, type = 'success', onDismiss }: ToastProps) => {
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
  const entry = TOAST_CONFIG[type];
  const config = settings.theme === 'dark' ? entry.dark : entry.light;
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
          border: `1.5px solid ${config.color}30`,
          boxShadow: `0 4px 20px ${config.color}20`,
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
