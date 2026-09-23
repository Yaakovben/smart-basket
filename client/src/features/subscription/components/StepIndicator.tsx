import { Box, Typography } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import type { SubscriptionStrings } from '../subscription.strings';
import { PRO_PURPLE } from '../subscription.styles';

interface Props {
  // 1-3: השלב הנוכחי עדיין בתהליך (השלב הזה מודגש, לא מסומן כהושלם).
  // 4: שלב סופי אמיתי - כל השלבים, כולל "אישור", מסומנים כהושלמו (וי, לא
  // מספר) - כדי שיהיה ברור בעין שהתהליך *נגמר* ולא רק "עדיין מאשרים".
  step: 1 | 2 | 3 | 4;
  s: SubscriptionStrings;
  isDark: boolean;
}

// מחוון שלושה שלבים (בחירה > תשלום > אישור): המשתמש תמיד יודע איפה הוא בדרך.
export const StepIndicator = ({ step, s, isDark }: Props) => {
  const labels = [s.stepChoose, s.stepPay, s.stepDone];
  return (
    <Box role="list" sx={{ display: 'flex', alignItems: 'flex-start', px: 0.5 }}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <Box key={label} role="listitem" aria-current={active ? 'step' : undefined}
            sx={{ display: 'flex', alignItems: 'flex-start', flex: n < 3 ? 1 : 'none' }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5, minWidth: 54 }}>
              <Box sx={{
                width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12.5, fontWeight: 800, transition: 'all 0.2s',
                bgcolor: done || active ? PRO_PURPLE : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'),
                color: done || active ? '#fff' : 'text.secondary',
                boxShadow: active ? '0 0 0 4px rgba(124,58,237,0.2)' : 'none',
              }}>
                {done ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : n}
              </Box>
              <Typography sx={{ fontSize: 11, fontWeight: active || (done && n === 3) ? 800 : 600, color: active || (done && n === 3) ? PRO_PURPLE : 'text.secondary' }}>
                {label}
              </Typography>
            </Box>
            {n < 3 && (
              <Box sx={{
                flex: 1, height: 2, mt: '12px', mx: 0.25, borderRadius: 1, transition: 'background-color 0.2s',
                bgcolor: done ? PRO_PURPLE : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'),
              }} />
            )}
          </Box>
        );
      })}
    </Box>
  );
};
