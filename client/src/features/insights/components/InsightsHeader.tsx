import { Box, Typography, IconButton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { BetaRibbon } from '../../priceComparison';

interface InsightsHeaderProps {
  isDark: boolean;
  title: string;
  onBack: () => void;
  mb?: number;
}

// הדר גרדיאנט קומפקטי + ריבון BETA אלכסוני - משותף למסך התובנות הרגיל
// ולמסך "עוד אין נתונים".
export const InsightsHeader = ({ isDark, title, onBack, mb = 1.5 }: InsightsHeaderProps) => {
  return (
    <Box sx={{
      background: isDark ? 'linear-gradient(160deg, #134E4A, #0F766E)' : 'linear-gradient(160deg, #0F766E, #0D9488, #14B8A6)',
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
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ width: 36, flexShrink: 0 }} />
      </Box>
    </Box>
  );
};
