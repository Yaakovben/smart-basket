import { Box, Typography, LinearProgress, keyframes } from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import type { PriceSyncStatus } from '../../priceComparison';

const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`;

interface PriceSyncProgressBannerProps {
  status: PriceSyncStatus | null;
  isDark: boolean;
}

// ===== באנר פרוגרס בזמן סנכרון פעיל =====
export const PriceSyncProgressBanner = ({ status, isDark }: PriceSyncProgressBannerProps) => {
  const prog = status?.syncProgress;
  const total = prog?.totalChains ?? 0;
  const done = prog?.completedChains ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const branchActive = !!status?.branchSync?.active;
  return (
    <Box sx={{
      p: 1.5, borderRadius: '12px',
      bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)',
      border: '1px solid', borderColor: isDark ? 'rgba(94,234,212,0.35)' : 'rgba(20,184,166,0.2)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.85 }}>
        <SyncIcon sx={{ fontSize: 17, color: '#14B8A6', animation: `${spin} 1.8s linear infinite` }} />
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#14B8A6', flex: 1 }}>
          {prog?.active ? 'סנכרון מחירים' : branchActive ? 'סנכרון סניפים' : 'סנכרון פעיל'}
        </Typography>
        {total > 0 && (
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#14B8A6', fontVariantNumeric: 'tabular-nums' }}>
            {pct}%
          </Typography>
        )}
      </Box>
      <LinearProgress
        variant={total > 0 ? 'determinate' : 'indeterminate'}
        value={pct}
        sx={{
          height: 6, borderRadius: 3,
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #14B8A6, #5EEAD4)' },
        }}
      />
      {total > 0 && prog?.currentChainName && done < total && (
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.6 }}>
          רשת {done}/{total} · {prog.currentChainName}
        </Typography>
      )}
    </Box>
  );
};
