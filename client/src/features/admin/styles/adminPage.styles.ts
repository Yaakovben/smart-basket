import type { SxProps, Theme } from '@mui/material';

// כל אזור בדף המנהל הוא עמוד משלו (כתובת /admin/...), לא פופאפ מעל הדף.
// זה המכל המשותף: גובה מסך מלא, כותרת קבועה עם כפתור חזרה, ותוכן שנגלל.
export const adminPageSx = (isDark: boolean): SxProps<Theme> => ({
  height: 'var(--app-height, 100dvh)',
  bgcolor: isDark ? '#0F172A' : '#F8FAFC',
  display: 'flex', flexDirection: 'column',
  pt: 'env(safe-area-inset-top)',
  maxWidth: { xs: '100%', sm: 600 }, mx: 'auto',
});
