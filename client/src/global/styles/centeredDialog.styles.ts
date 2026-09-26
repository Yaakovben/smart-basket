import type { SxProps, Theme } from '@mui/material';

// ברירת המחדל של פופאפ באפליקציה היא גיליון שצמוד לתחתית (theme.ts). רק
// פופאפים מסוימים (Pro, משוב, הודעה על ניתוק) צפים כרטיס במרכז המסך, עם
// מרווח מכל הצדדים, פינות מעוגלות וקפיצת כניסה קלה. את ה-sx הזה פורסים
// ראשון ב-PaperProps, כך שרוחב ורדיוס ספציפיים של כל פופאפ עדיין גוברים.
export const centeredDialogPaperSx = {
  position: 'relative',
  bottom: 'auto',
  m: 2,
  borderRadius: '24px',
  width: 'calc(100% - 32px)',
  maxHeight: 'calc(100dvh - 48px)',
  animation: 'sbCenteredPop 0.42s cubic-bezier(0.34, 1.45, 0.64, 1) backwards',
  '@keyframes sbCenteredPop': {
    from: { opacity: 0, transform: 'translateY(28px) scale(0.9)' },
    to: { opacity: 1, transform: 'translateY(0) scale(1)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const satisfies SxProps<Theme>;
