import type { SxProps, Theme } from '@mui/material';
import type { CSSProperties } from 'react';
import { keyframes } from '@mui/material';

// bottom-sheet מודאלי עם dvh - מותיר מרווח עליון משמעותי, dvh מכסה בדיוק את
// האזור הנראה במובייל בלי לכלול את סרגל הכתובת שמתקפל/נפתח.
// הגובה מוגבל ל-78dvh כדי שהדיאלוג לא ייראה כמו מסך מלא אלא כמו מודל.
export const dialogPaperSx: SxProps<Theme> = {
  bgcolor: '#000',
  borderRadius: { xs: '20px 20px 0 0', sm: '20px' },
  m: { xs: 0, sm: 2 },
  maxHeight: { xs: '78dvh', sm: '82dvh' },
  minHeight: { xs: '480px', sm: '480px' },
  height: { xs: '78dvh', sm: 'auto' },
  width: { xs: '100%', sm: 480 },
  overflow: 'hidden',
};

export const rootBoxSx: SxProps<Theme> = { position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' };

export const headerSx: SxProps<Theme> = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  px: 2, py: 1.5, bgcolor: 'rgba(0,0,0,0.6)', color: 'white', zIndex: 2,
};
export const headerTitleRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1 };

// drag handle למובייל
export const dragHandleSx: SxProps<Theme> = {
  display: { xs: 'flex', sm: 'none' },
  justifyContent: 'center',
  pt: 1, pb: 0.5, bgcolor: '#000',
};

export const videoAreaSx: SxProps<Theme> = { flex: 1, position: 'relative', bgcolor: '#000' };

// מסך הסכמה ראשוני - לפני פתיחת מצלמה/גלריה
export const consentOverlaySx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 2, px: 3, textAlign: 'center', color: 'white',
  bgcolor: 'rgba(0,0,0,0.92)',
  zIndex: 5,
};
export const consentDescSx: SxProps<Theme> = { fontSize: 13, color: 'rgba(255,255,255,0.8)', maxWidth: 320, lineHeight: 1.55 };
export const consentPrimaryButtonSx: SxProps<Theme> = {
  maxWidth: 320, py: 1.4, borderRadius: '14px', fontWeight: 800, fontSize: 14.5, textTransform: 'none',
  bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' },
};
export const consentSecondaryButtonSx: SxProps<Theme> = {
  maxWidth: 320, py: 1.2, borderRadius: '14px', fontWeight: 700, fontSize: 13.5, textTransform: 'none',
  color: 'white', bgcolor: 'rgba(255,255,255,0.12)',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
};
export const inlineErrorChipSx: SxProps<Theme> = {
  fontSize: 12, color: '#FCA5A5', textAlign: 'center',
  bgcolor: 'rgba(0,0,0,0.6)', px: 1.5, py: 0.75, borderRadius: '10px',
  mt: 1, maxWidth: 320,
};

export const videoStyle: CSSProperties = { width: '100%', height: '100%', objectFit: 'cover' };

// מסגרת עזר מרובעת במרכז המסך - עיצוב "פינות בלבד" (בלי מסגרת מלאה) עם
// זוהר עדין וקו סריקה נע - מרגיש בוגר/פרימיום יותר ממסגרת מלאה שטוחה.
export const frameOverlaySx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  pointerEvents: 'none',
};
export const frameBoxSx: SxProps<Theme> = {
  width: 252, height: 252, maxWidth: '72vw', maxHeight: '72vw',
  borderRadius: '28px',
  // וינייטה חזקה מעט יותר מקודם - מבליטה את המסגרת הבהירה במרכז, מרגישה קולנועית יותר
  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
  position: 'relative',
  overflow: 'hidden',
};
// 4 פינות עדינות - קו דק, זווית מעוגלת, וזוהר טורקיז (drop-shadow) במקום
// מסגרת מלאה שטוחה. הפינות בלבד (בלי קו מחבר) הן שפה ויזואלית נפוצה
// בסורקים פרימיום (למשל מסמכים ב-iOS) ומרגישות פחות "טכניות"/גנריות.
export const FRAME_CORNER_POSITIONS = [
  { top: 0, left: 0, borderRight: 0, borderBottom: 0, borderTopLeftRadius: '18px' },
  { top: 0, right: 0, borderLeft: 0, borderBottom: 0, borderTopRightRadius: '18px' },
  { bottom: 0, left: 0, borderRight: 0, borderTop: 0, borderBottomLeftRadius: '18px' },
  { bottom: 0, right: 0, borderLeft: 0, borderTop: 0, borderBottomRightRadius: '18px' },
] as const;
export const frameCornerSx = (pos: (typeof FRAME_CORNER_POSITIONS)[number]): SxProps<Theme> => ({
  position: 'absolute', width: 30, height: 30,
  border: '3px solid #2DD4BF',
  filter: 'drop-shadow(0 0 5px rgba(45,212,191,0.65))',
  ...pos,
});

// קו סריקה נע - שקוף→בהיר→שקוף, נע לאט מלמעלה למטה וחזרה בתוך המסגרת.
// תנועה איטית ורציפה (לא קופצנית) כדי לשמור על תחושה "בוגרת", לא צעצועית.
const scanLineSweep = keyframes`
  0%   { top: 6%; opacity: 0; }
  8%   { opacity: 1; }
  50%  { top: 94%; opacity: 1; }
  92%  { opacity: 1; }
  100% { top: 6%; opacity: 0; }
`;
export const scanLineSx: SxProps<Theme> = {
  position: 'absolute', left: '8%', right: '8%', height: '2px',
  borderRadius: '2px',
  background: 'linear-gradient(90deg, transparent, #5EEAD4 25%, #99F6E4 50%, #5EEAD4 75%, transparent)',
  boxShadow: '0 0 8px 1px rgba(94,234,212,0.8)',
  animation: `${scanLineSweep} 2.8s cubic-bezier(0.45, 0, 0.55, 1) infinite`,
};

// קו עזר אופקי לברקוד - מרמז שיש ליישר את הברקוד אופקית בתוך המסגרת
export const barcodeAimLineSx: SxProps<Theme> = {
  position: 'absolute', left: '8%', right: '8%', top: '50%',
  transform: 'translateY(-50%)',
  height: '2px',
  background: 'linear-gradient(90deg, transparent, rgba(255,200,50,0.6) 20%, rgba(255,220,80,0.9) 50%, rgba(255,200,50,0.6) 80%, transparent)',
  boxShadow: '0 0 6px 1px rgba(255,210,60,0.5)',
  borderRadius: '2px',
  pointerEvents: 'none',
};

// שורת סטטוס תחתונה ("כוון את ה-QR למרכז המסך")
export const bottomStatusSx: SxProps<Theme> = {
  position: 'absolute', bottom: 32, left: 0, right: 0,
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5, px: 3,
};
export const statusTextSx: SxProps<Theme> = {
  fontSize: 15, fontWeight: 600, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.8)', textAlign: 'center',
};
export const galleryPillButtonSx: SxProps<Theme> = {
  bgcolor: 'rgba(255,255,255,0.92)', color: '#0F172A', borderRadius: '999px',
  px: 2.5, py: 1, fontWeight: 700, fontSize: 13.5, textTransform: 'none',
  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
  '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
  '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
};

// מסך שגיאה מלא (מצלמה נדחתה/נכשלה)
export const errorOverlaySx: SxProps<Theme> = {
  position: 'absolute', inset: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexDirection: 'column', gap: 2, p: 3, bgcolor: 'rgba(0,0,0,0.85)',
};
export const errorTextSx: SxProps<Theme> = { color: 'white', fontSize: 15, textAlign: 'center', maxWidth: 320 };
export const errorSubTextSx: SxProps<Theme> = { fontSize: 12, color: '#FCA5A5', textAlign: 'center', maxWidth: 320 };
export const errorGalleryButtonSx: SxProps<Theme> = {
  textTransform: 'none', fontWeight: 700, '& .MuiButton-startIcon': { marginInlineEnd: '8px' },
};
