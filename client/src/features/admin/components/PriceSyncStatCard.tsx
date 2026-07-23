import { Box, Typography } from '@mui/material';

// כרטיס מטריקה - מספר גדול עם תיאור, בתפריט הגלילה האופקי בראש המסך
export const PriceSyncStatCard = ({ icon, value, label, color, isDark }: {
  icon: React.ReactNode; value: string | number; label: string; color: string; isDark: boolean;
}) => (
  <Box sx={{
    flexShrink: 0, minWidth: 120,
    p: 1.5, borderRadius: '14px',
    bgcolor: isDark ? `${color}1A` : `${color}10`,
    border: '1px solid', borderColor: `${color}33`,
    textAlign: 'center',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4, mb: 0.4 }}>
      {icon}
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: 0.3 }}>
        {label}
      </Typography>
    </Box>
    <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {value}
    </Typography>
  </Box>
);
