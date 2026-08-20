import { Box, Typography, IconButton } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import MemoryIcon from '@mui/icons-material/Memory';
import CloseIcon from '@mui/icons-material/Close';
import { spin } from '../styles/AdminDashboard.styles';
import type { AiStatus } from '../../../services/api/admin.api';

interface AdminAiStatusHeaderProps {
  data: AiStatus | null;
  loading: boolean;
  refreshing: boolean;
  lastFetchAt: Date | null;
  onRefresh: () => void;
  onClose: () => void;
}

// כותרת קבועה (לא גוללת עם התוכן) - אותו דפוס כמו DbHealthHeader, כדי
// שהמנהל תמיד יראה את זמן העדכון האחרון ואת כפתור הרענון בלי לגלול.
export const AdminAiStatusHeader = ({ data, loading, refreshing, lastFetchAt, onRefresh, onClose }: AdminAiStatusHeaderProps) => {
  const primary = data?.providers.find(p => p.role === 'primary');
  const lastUpdatedText = lastFetchAt
    ? lastFetchAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        <MemoryIcon sx={{ color: '#0D9488' }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>פרטי AI</Typography>
          {data && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mt: 0.25, flexWrap: 'wrap' }}>
              {primary?.model && (
                <Box sx={{
                  px: 0.7, py: 0.1, borderRadius: 0.75,
                  bgcolor: 'rgba(13,148,136,0.14)', border: '1px solid', borderColor: '#0D9488',
                  maxWidth: 160, overflow: 'hidden',
                }}>
                  <Typography sx={{ fontSize: 9.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {primary.model}
                  </Typography>
                </Box>
              )}
              {lastUpdatedText && (
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                  · עודכן {lastUpdatedText}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
        <IconButton onClick={onRefresh} disabled={loading || refreshing} aria-label="עדכון עכשווי">
          <RefreshIcon sx={{ animation: refreshing ? `${spin} 1s linear infinite` : 'none' }} />
        </IconButton>
        <IconButton onClick={onClose} aria-label="סגירה">
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
};
