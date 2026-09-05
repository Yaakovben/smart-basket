import { Box, Typography, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { BetaRibbon } from '../../priceComparison';
import { COMMON_STYLES } from '../../../global/helpers';

interface InsightsHeaderProps {
  isDark: boolean;
  title: string;
  onBack: () => void;
  mb?: number;
  // שורת משנה קטנה מתחת לכותרת - למשל שם הרשימה שעליה מתבצע ניתוח המחירים,
  // כדי שיהיה ברור מיד בכניסה (מקישור "פירוט מלא בתובנות") בלי צורך לגלול.
  subtitle?: string;
}

// הדר גרדיאנט קומפקטי + ריבון BETA אלכסוני - משותף למסך התובנות הרגיל
// ולמסך "עוד אין נתונים".
export const InsightsHeader = ({ isDark, title, onBack, mb = 1.5, subtitle }: InsightsHeaderProps) => {
  return (
    <Box sx={{
      background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
      p: { xs: 'max(50px, env(safe-area-inset-top) + 20px) 16px 16px', sm: '54px 20px 18px' },
      borderRadius: '0 0 24px 24px',
      position: 'relative', overflow: 'hidden',
      mb,
    }}>
      <BetaRibbon corner="top-left" offsetTop={2} size="xl" />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <IconButton onClick={onBack} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', width: 36, height: 36 }}>
          <ArrowForwardIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Box sx={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{
              fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', mt: 0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {/* מרווח סימטרי לכפתור החזרה - שומר על כותרת ממורכזת באמת.
            אייקון החיבור עבר ל-overlay גלובלי (ConnectionStatusIcon,
            mounted פעם אחת ב-AppRouter) ולא צריך יותר סלוט כאן. */}
        <Box sx={{ width: 36, flexShrink: 0 }} />
      </Box>
    </Box>
  );
};
