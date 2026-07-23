import { Box, Typography, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorageIcon from '@mui/icons-material/Storage';
import CloseIcon from '@mui/icons-material/Close';
import type { DbHealth } from '../../../services/api/admin.api';
import { tierName } from '../helpers/dbHealthHelpers';

interface DbHealthHeaderProps {
  data: DbHealth | null;
  loading: boolean;
  isDark: boolean;
  lastUpdatedText: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

export const DbHealthHeader = ({ data, loading, isDark, lastUpdatedText, onRefresh, onClose }: DbHealthHeaderProps) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
      <StorageIcon sx={{ color: '#0D9488' }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>שימוש במאגר</Typography>
        {data && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.25 }}>
            <Box sx={{
              px: 0.7, py: 0.1, borderRadius: 0.75,
              bgcolor: isDark ? 'rgba(13,148,136,0.18)' : '#CCFBF1',
              border: '1px solid', borderColor: '#0D9488',
            }}>
              <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.3 }}>
                Atlas {tierName(data.limitMB)}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
              · {data.limitMB} MB
            </Typography>
            {lastUpdatedText && (
              <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                · עודכן {lastUpdatedText}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    </Box>
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <IconButton onClick={onRefresh} disabled={loading} aria-label="רענון">
        <RefreshIcon />
      </IconButton>
      <IconButton onClick={onClose} aria-label="סגירה">
        <CloseIcon />
      </IconButton>
    </Box>
  </Box>
);
