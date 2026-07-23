import { memo } from 'react';
import { Box } from '@mui/material';

// אייקון דירוג לכל רשת (1=מנצחת, 2-3=מקום קרוב, 4+=מספר בתוך עיגול)
export const RankBadge = memo(({ rank, isWinner }: { rank: number; isWinner: boolean }) => {
  if (isWinner) {
    return (
      <Box className="chain-rank" sx={{
        width: 38, height: 38, borderRadius: '50%',
        background: 'linear-gradient(135deg, #FCD34D, #F59E0B)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(245,158,11,0.45)',
        fontSize: 20,
      }}>
        👑
      </Box>
    );
  }
  return (
    <Box className="chain-rank" sx={{
      width: 38, height: 38, borderRadius: '50%',
      bgcolor: 'rgba(20,184,166,0.1)',
      border: '1.5px solid rgba(20,184,166,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: 14, fontWeight: 800,
      color: '#0F766E',
      fontVariantNumeric: 'tabular-nums',
    }}>
      {rank}
    </Box>
  );
});
RankBadge.displayName = 'RankBadge';
