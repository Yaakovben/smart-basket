import { Box, Typography } from '@mui/material';
import type { SyncFeedback } from '../types/priceSync-types';

// פידבק לפעולת אדמין אחרונה (הצלחה/שגיאה) - צבע לפי tone
export const PriceSyncFeedbackBanner = ({ feedback }: { feedback: SyncFeedback }) => (
  <Box sx={{
    px: 1.5, py: 1, borderRadius: '10px',
    bgcolor: feedback.tone === 'error' ? '#EF444415' : '#10B98115',
    border: '1px solid',
    borderColor: feedback.tone === 'error' ? '#EF444444' : '#10B98144',
  }}>
    <Typography sx={{
      fontSize: 12, fontWeight: 600,
      color: feedback.tone === 'error' ? '#B91C1C' : '#0F766E',
      wordBreak: 'break-word',
    }}>
      {feedback.msg}
    </Typography>
  </Box>
);
