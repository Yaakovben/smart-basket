import { Box, Typography } from '@mui/material';
import type { InsightsData } from '../../../../../services/api';
import { fadeIn } from '../../insightsShared';

interface PulseAnomaliesProps {
  anomalies: InsightsData['anomalies'];
  isDark: boolean;
  t: (key: string) => string;
}

// כרטיס "שינויים בהרגלים שלך" - מוצרים/קטגוריות שחוזרים, דועכים, או קופצים.
export const PulseAnomalies = ({ anomalies, isDark, t }: PulseAnomaliesProps) => {
  if (!anomalies || anomalies.length === 0) return null;
  return (
    <Box sx={{
      p: 1.5, mb: 2, borderRadius: '16px',
      bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)',
      border: '1px solid', borderColor: 'rgba(139,92,246,0.25)',
      animation: `${fadeIn} 0.5s ease 0.15s both`,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
        <Typography sx={{ fontSize: 16 }}>👀</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>
          {t('habitsChangesTitle')}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {anomalies.map((a, i) => (
          <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.85, py: 0.4, px: 0.6 }}>
            <Typography sx={{ fontSize: 14, flexShrink: 0 }}>
              {a.type === 'returning' ? '🔄' : a.type === 'fading' ? '↘️' : '📈'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.4 }}>
              {a.description}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
