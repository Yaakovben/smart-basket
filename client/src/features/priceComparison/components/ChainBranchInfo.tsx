import { memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';
import NearMeIcon from '@mui/icons-material/NearMe';
import type { NearestBranch } from '../types/priceComparison.types';

// סניף קרוב + כפתור ניווט - מוצג בתוך הפירוט המורחב של כרטיס רשת
export const ChainBranchInfo = memo(({ branch, isDark, onNavigate }: {
  branch: NearestBranch; isDark: boolean; onNavigate: (e: React.MouseEvent) => void;
}) => (
  <Box sx={{
    mt: 1.25, p: 1, borderRadius: '10px',
    bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', gap: 1.5,
  }}>
    <StorefrontIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {branch.branchName}
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {branch.address}, {branch.city}
      </Typography>
    </Box>
    <Button
      size="small"
      variant="contained"
      onClick={onNavigate}
      startIcon={<NearMeIcon sx={{ fontSize: 15 }} />}
      sx={{
        bgcolor: '#0D9488',
        '&:hover': { bgcolor: '#0F766E' },
        fontSize: 11, fontWeight: 800,
        textTransform: 'none',
        borderRadius: '8px',
        px: 2.25, py: 0.6,
        flexShrink: 0,
        minWidth: 0,
        ml: 1,
        // ריווח גדול בין האייקון לטקסט
        gap: 2,
        '& .MuiButton-startIcon': { mr: 0, ml: 0 },
      }}
    >
      ניווט
    </Button>
  </Box>
));
ChainBranchInfo.displayName = 'ChainBranchInfo';
