import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Paper, Switch } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

interface SettingsPageProps {
  onDeleteAllData?: () => void;
}

const settingRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: { xs: 1.25, sm: 1.5 },
  p: { xs: 1.5, sm: 2 },
  borderBottom: '1px solid',
  borderColor: 'divider'
};

export const SettingsComponent = ({ onDeleteAllData }: SettingsPageProps) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ minHeight: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 24px' }, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.25, sm: 1.5 } }}>
          <IconButton
            onClick={() => navigate('/')}
            sx={{ color: 'white', width: { xs: 38, sm: 42 }, height: { xs: 38, sm: 42 } }}
          >
            <ArrowForwardIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: { xs: 18, sm: 20 }, fontWeight: 700 }}>הגדרות</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 }, pb: 'calc(24px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
        <Paper sx={{ borderRadius: { xs: '14px', sm: '16px' }, overflow: 'hidden' }}>
          <Box sx={settingRowSx}>
            <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>🔔</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>התראות</Typography>
            <Switch defaultChecked color="primary" size="small" />
          </Box>
          <Box sx={settingRowSx}>
            <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>🌙</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>מצב כהה</Typography>
            <Switch color="primary" size="small" />
          </Box>
          <Box sx={{ ...settingRowSx, borderBottom: 'none' }}>
            <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>🌐</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>שפה</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: { xs: 13, sm: 14 } }}>עברית</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF', fontSize: { xs: 20, sm: 24 } }} />
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: { xs: '14px', sm: '16px' }, overflow: 'hidden', mt: { xs: 1.5, sm: 2 } }}>
          <Box sx={settingRowSx}>
            <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>❓</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>עזרה ותמיכה</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF', fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box sx={{ ...settingRowSx, borderBottom: 'none' }}>
            <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>ℹ️</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: { xs: 14, sm: 15 } }}>אודות</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF', fontSize: { xs: 20, sm: 24 } }} />
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: { xs: '14px', sm: '16px' }, overflow: 'hidden', mt: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ ...settingRowSx, borderBottom: 'none', color: 'error.dark', cursor: 'pointer' }} onClick={onDeleteAllData}>
            <Box component="span" sx={{ fontSize: { xs: 18, sm: 20 } }}>🗑️</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, color: 'inherit', fontSize: { xs: 14, sm: 15 } }}>מחק את כל הנתונים</Typography>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: '#9CA3AF', fontSize: { xs: 12, sm: 13 }, mt: { xs: 3, sm: 4 } }}>
          SmartBasket גרסה 1.0.0
        </Typography>
      </Box>
    </Box>
  );
}
