import type { SxProps, Theme } from '@mui/material';

// ===== UndoBar (טוסט "בוטל"/מחיקה עם כפתור ביטול וסרגל התקדמות) =====
export const undoSnackbarSx: SxProps<Theme> = {
  bottom: 'max(16px, env(safe-area-inset-bottom))',
  left: '50%', right: 'auto',
  transform: 'translateX(-50%)',
  width: 'auto', maxWidth: 'calc(100vw - 32px)',
};

export const undoBarSx = (isDark: boolean, dragX: number, dragY: number, isDragging: boolean): SxProps<Theme> => ({
  background: isDark
    ? 'linear-gradient(135deg, rgba(30,41,59,0.97), rgba(15,23,42,0.97))'
    : 'linear-gradient(135deg, rgba(30,41,59,0.96), rgba(51,65,85,0.96))',
  borderRadius: '14px',
  boxShadow: '0 8px 28px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.05)',
  backdropFilter: 'blur(16px)',
  overflow: 'hidden',
  animation: dragX === 0 && dragY === 0 && !isDragging ? 'undoIn 0.3s ease-out' : 'none',
  '@keyframes undoIn': {
    from: { transform: 'translateY(20px)', opacity: 0 },
    to: { transform: 'translateY(0)', opacity: 1 },
  },
  minWidth: 220, maxWidth: 300,
  transform: `translate(${dragX}px, ${dragY}px)`,
  opacity: Math.max(0, 1 - Math.max(dragY / 140, Math.abs(dragX) / 200)),
  transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s',
  // touchAction: none - מונע מהדפדפן לגלול את הדף כשהמשתמש גורר את הטוסט
  touchAction: 'none',
  userSelect: 'none',
  WebkitTapHighlightColor: 'transparent',
  cursor: 'grab',
});

// רמז גרירה - פס אפור דק בראש הטוסט
export const dragHandleSx: SxProps<Theme> = {
  width: 32, height: 3, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.35)', mx: 'auto', mt: 0.75, mb: 0.25,
};

export const undoContentRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, py: 1, pt: 0.5 };
export const undoIconCircleSx: SxProps<Theme> = {
  width: 26, height: 26, borderRadius: '50%',
  background: 'linear-gradient(135deg, rgba(239,68,68,0.25), rgba(220,38,38,0.18))',
  border: '1px solid rgba(252,165,165,0.25)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, flexShrink: 0,
};
export const undoMsgSx: SxProps<Theme> = {
  fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.92)', flex: 1,
  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em',
};
export const undoButtonSx: SxProps<Theme> = {
  px: 1.5, py: 0.6, borderRadius: '10px',
  background: 'linear-gradient(135deg, rgba(20,184,166,0.3), rgba(13,148,136,0.25))',
  border: '1px solid rgba(94,234,212,0.35)',
  color: '#5EEAD4', fontSize: 12.5, fontWeight: 700, letterSpacing: '0.02em',
  cursor: 'pointer', flexShrink: 0,
  transition: 'background 0.15s, opacity 0.1s',
  '&:active': { opacity: 0.75 },
};
export const undoProgressSx: SxProps<Theme> = {
  height: 3,
  bgcolor: 'rgba(255,255,255,0.06)',
  '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #5EEAD4, #14B8A6)', transition: 'none' },
};

// ===== Toast רגיל (success/error/info/warning) =====
export const toastSnackbarSx: SxProps<Theme> = {
  top: 'max(20px, calc(env(safe-area-inset-top) + 8px))',
  left: '50%', right: 'auto',
  transform: 'translateX(-50%)',
  width: 'auto', maxWidth: 'calc(100vw - 32px)',
};

interface ToastColorConfig { color: string; bg: string; border: string }

export const toastBoxSx = (
  config: ToastColorConfig, isDark: boolean, isLongText: boolean, dismissible: boolean
): SxProps<Theme> => ({
  display: 'flex',
  alignItems: isLongText ? 'flex-start' : 'center',
  gap: 1.25, px: 2.5, py: 1.25,
  bgcolor: config.bg,
  borderRadius: '16px',
  border: `1.5px solid ${config.border}`,
  boxShadow: isDark
    ? '0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
    : `0 4px 20px ${config.color}20`,
  backdropFilter: isDark ? 'blur(12px)' : 'none',
  animation: 'toastIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  '@keyframes toastIn': {
    '0%': { transform: 'translateY(-50px) scale(0.85)', opacity: 0 },
    '70%': { transform: 'translateY(4px) scale(1.02)', opacity: 1 },
    '100%': { transform: 'translateY(0) scale(1)', opacity: 1 },
  },
  maxWidth: 'calc(100vw - 48px)',
  minWidth: isLongText ? 280 : 'auto',
  cursor: dismissible ? 'pointer' : 'default',
  transition: 'transform 0.15s ease, opacity 0.15s ease',
  '&:active': dismissible ? { transform: 'scale(0.97)', opacity: 0.9 } : {},
  touchAction: 'pan-x',
});

export const toastIconCircleSx = (config: ToastColorConfig, isLongText: boolean, isInfo: boolean): SxProps<Theme> => ({
  width: 26, height: 26, borderRadius: '50%',
  bgcolor: `${config.color}18`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: config.color,
  fontSize: isInfo ? 14 : 13,
  fontWeight: 700, flexShrink: 0,
  mt: isLongText ? 0.25 : 0,
});

export const toastTextSx = (config: ToastColorConfig, isLongText: boolean): SxProps<Theme> => ({
  fontSize: isLongText ? 13 : 14,
  fontWeight: 600,
  color: config.color,
  wordBreak: 'break-word',
  whiteSpace: 'normal',
  letterSpacing: '-0.01em',
  lineHeight: 1.4,
  flex: 1,
});
