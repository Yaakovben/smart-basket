import { keyframes, type SxProps, type Theme } from '@mui/material';

export const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

export const spin = keyframes`
  0% { transform: rotate(0deg);   }
  100% { transform: rotate(360deg); }
`;

// סגנון כרטיס סטטיסטיקה ראשי (לחיץ)
export const cardSx = (isSelected: boolean): SxProps<Theme> => ({
  p: 1.5,
  borderRadius: '16px',
  bgcolor: isSelected ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)',
  border: '1px solid',
  borderColor: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  transform: isSelected ? 'scale(1.03)' : 'none',
  '&:active': { transform: 'scale(0.97)' },
});

// סגנון כרטיס סטטיסטיקה משני (לחיץ)
export const infoCardSx = (isSelected: boolean): SxProps<Theme> => ({
  p: 1.5,
  borderRadius: '16px',
  bgcolor: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
  border: '1px solid',
  borderColor: isSelected ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)',
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s',
  transform: isSelected ? 'scale(1.03)' : 'none',
  '&:active': { transform: 'scale(0.97)' },
});

// כפתור אייקון בכותרת - חוזר על עצמו (חזרה, ניהול DB, חיזוק יומי, מחירים, רענון)
export const headerIconButtonSx = (size: number): SxProps<Theme> => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'white',
  width: size,
  height: size,
  cursor: 'pointer',
  WebkitTapHighlightColor: 'transparent',
  '&:active': { transform: 'scale(0.92)' },
});
