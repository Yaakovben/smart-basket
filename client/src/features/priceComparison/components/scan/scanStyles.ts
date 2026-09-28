import type { SxProps, Theme } from '@mui/material';

export const SCAN_TEAL = '#0D9488';

export const scanCardSx = (isDark: boolean): SxProps<Theme> => ({
  bgcolor: 'background.paper', borderRadius: '18px', p: 2,
  border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
});

export const scanLabelSx: SxProps<Theme> = {
  fontSize: 12, fontWeight: 800, color: 'text.secondary', mb: 1.25, letterSpacing: 0.2,
};
