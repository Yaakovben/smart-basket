import { useEffect } from 'react';
import { ButtonBase, Box, Typography } from '@mui/material';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import type { Language } from '../../../global/types';
import { haptic } from '../../../global/helpers';

const TEXT: Record<Language, { title: string; sub: string }> = {
  he: { title: 'סרוק מוצר ובדוק איפה הכי זול', sub: 'קרוב אליך ובכל הארץ' },
  en: { title: 'Scan a product, find where it is cheapest', sub: 'Near you and across the country' },
  ru: { title: 'Сканируйте товар и узнайте, где дешевле', sub: 'Рядом с вами и по всей стране' },
};

// כניסה לעמוד "איפה הכי זול" מטאב המחירים
export const PriceScanEntry = ({ isDark, language, onOpen }: { isDark: boolean; language: Language; onOpen: () => void }) => {
  const txt = TEXT[language] ?? TEXT.he;
  // טעינה מוקדמת ברקע של העמוד ושל הסורק (@zxing), כדי שהלחיצה תפתח מצלמה מיד
  useEffect(() => {
    const warm = () => {
      void import('../pages/PriceScanPage');
      void import('../../../global/components/QRScanner');
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm);
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(warm, 1500);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <ButtonBase
      onClick={() => { haptic('light'); onOpen(); }}
      sx={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5, mb: 1.5, borderRadius: '16px', textAlign: 'start',
        bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)',
        border: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.3)' : 'rgba(20,184,166,0.22)',
        '&:active': { transform: 'scale(0.99)' },
      }}
    >
      <Box sx={{
        width: 40, height: 40, borderRadius: '12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#14B8A6',
      }}>
        <QrCodeScannerRoundedIcon sx={{ color: '#fff', fontSize: 22 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{txt.title}</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{txt.sub}</Typography>
      </Box>
      <ChevronLeftRoundedIcon sx={{ color: 'text.disabled', transform: language === 'he' ? 'none' : 'scaleX(-1)' }} />
    </ButtonBase>
  );
};
