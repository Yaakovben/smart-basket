import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { ShimmerBlock } from '../../../../global/components';
import type { PriceScanStrings } from '../../priceScan.strings';
import { SCAN_TEAL, scanCardSx } from './scanStyles';

// כל כמה זמן מתקדם שלב ברשימה (כל הבדיקות רצות במקביל בשרת)
const STEP_MS = 1100;

// המתנה לתוצאה: ברקוד מונפש עם קרן סריקה, רשימת שלבים שמתמלאת בהדרגה, וביטול
// זמין תמיד. מתחת, שלד בצורת התוצאה עצמה, כדי שהמעבר לא יקפיץ את המסך.
export const ScanResultSkeleton = ({ s, isDark, barcode, onCancel }: {
  s: PriceScanStrings;
  isDark: boolean;
  barcode: string | null;
  onCancel: () => void;
}) => {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setStep((v) => Math.min(v + 1, s.loadingSteps.length - 1)), STEP_MS);
    return () => window.clearInterval(timer);
  }, [s.loadingSteps.length]);

  const stripes = isDark ? 'rgba(255,255,255,0.8)' : '#0F172A';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }} aria-busy="true" aria-live="polite">
      <Box sx={{ ...scanCardSx(isDark), p: 2.25 } as object}>
        {/* ברקוד עם קרן סריקה שנעה עליו */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box aria-hidden sx={{
            position: 'relative', width: 150, height: 72, borderRadius: '10px', overflow: 'hidden',
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC', p: '10px 14px',
          }}>
            <Box sx={{
              width: '100%', height: '100%', opacity: 0.85,
              background: `repeating-linear-gradient(90deg, ${stripes} 0 2px, transparent 2px 4px, ${stripes} 4px 5px, transparent 5px 8px, ${stripes} 8px 11px, transparent 11px 13px)`,
            }} />
            <Box sx={{
              position: 'absolute', insetInline: 6, height: 3, borderRadius: 2, top: 10,
              bgcolor: SCAN_TEAL, boxShadow: `0 0 12px 3px ${alpha(SCAN_TEAL, 0.65)}`,
              animation: 'scanBeam 1.3s ease-in-out infinite alternate',
              '@keyframes scanBeam': { from: { top: 8 }, to: { top: 60 } },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none', top: 34 },
            }} />
          </Box>
          {barcode && (
            <Typography dir="ltr" sx={{ fontSize: 12, color: 'text.disabled', mt: 0.75, letterSpacing: 1.5 }}>{barcode}</Typography>
          )}
          {/* אותה כותרת רגועה לאורך כל ההמתנה, בלי להדגיש שזה לוקח זמן */}
          <Typography sx={{ fontSize: 16, fontWeight: 900, mt: 1.25, textAlign: 'center' }}>
            {s.loadingTitle}
          </Typography>
        </Box>

        {/* השלבים: מה כבר נבדק, ומה נבדק עכשיו */}
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, mt: 1.75, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {s.loadingSteps.map((label, i) => {
            const done = i < step;
            const current = i === step;
            return (
              <Box component="li" key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, opacity: done || current ? 1 : 0.45, transition: 'opacity 0.3s ease' }}>
                <Box sx={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: done ? SCAN_TEAL : 'transparent',
                  border: done ? 'none' : `2px solid ${current ? SCAN_TEAL : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(15,23,42,0.15)')}`,
                  transition: 'background-color 0.3s ease',
                  ...(current && {
                    animation: 'scanStepPulse 1s ease-in-out infinite',
                    '@keyframes scanStepPulse': { '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(SCAN_TEAL, 0.45)}` }, '50%': { boxShadow: `0 0 0 5px ${alpha(SCAN_TEAL, 0)}` } },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }),
                }}>
                  {done && <CheckRoundedIcon sx={{ fontSize: 15, color: '#fff' }} />}
                </Box>
                <Typography sx={{ fontSize: 13.5, fontWeight: current ? 800 : 600, color: done ? 'text.secondary' : 'text.primary' }}>
                  {/* שלב שהסתיים בלי שלוש נקודות: הוא כבר לא "בתהליך" */}
                  {done ? label.replace(/(\.\.\.|…)$/, '') : label}
                </Typography>
              </Box>
            );
          })}
        </Box>

        {/* ביטול זמין, אבל שקט: קישור טקסט קטן ולא כפתור בולט */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1.25 }}>
          <Button
            variant="text" onClick={onCancel}
            sx={{ textTransform: 'none', fontWeight: 600, fontSize: 13, color: 'text.disabled', minWidth: 0, px: 1.5, '&:hover': { bgcolor: 'transparent', color: 'text.secondary' } }}
          >
            {s.cancel}
          </Button>
        </Box>
      </Box>
      {/* שלד בצורת התוצאה: הסניף הכי זול, ואז הסניפים הקרובים */}
      <ShimmerBlock height={150} radius={22} />
      <ShimmerBlock height={170} radius={18} />
    </Box>
  );
};
