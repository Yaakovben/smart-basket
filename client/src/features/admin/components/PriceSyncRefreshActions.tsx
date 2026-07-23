import { Button, Box } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface PriceSyncRefreshActionsProps {
  onRefresh: () => void;
  onToggleBulk: () => void;
  onCleanup: () => void;
}

// ===== כפתור יחיד מרכזי (רענון) + ייבוא המוני + ניקוי seed =====
export const PriceSyncRefreshActions = ({ onRefresh, onToggleBulk, onCleanup }: PriceSyncRefreshActionsProps) => (
  <>
    <Button
      variant="contained"
      onClick={onRefresh}
      startIcon={<RefreshIcon />}
      sx={{
        py: 1.5, borderRadius: '12px',
        textTransform: 'none', fontWeight: 800, fontSize: 14.5,
        background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
        boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
        '&:hover': { background: 'linear-gradient(135deg, #0D9488, #0B7C72)' },
        '& .MuiButton-startIcon': { marginInlineEnd: '10px' },
      }}
    >
      רענן עכשיו (מחירים + סניפים)
    </Button>
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <Button
        size="small"
        onClick={onToggleBulk}
        sx={{
          fontSize: 11, color: '#14B8A6', textTransform: 'none',
          minHeight: 0, py: 0.4, px: 1,
          '&:hover': { bgcolor: 'rgba(20,184,166,0.05)' },
        }}
      >
        📥 ייבוא המוני
      </Button>
      <Button
        size="small"
        onClick={onCleanup}
        sx={{
          fontSize: 11, color: '#DC2626', textTransform: 'none',
          minHeight: 0, py: 0.4, px: 1,
          '&:hover': { bgcolor: 'rgba(220,38,38,0.05)' },
        }}
      >
        🗑️ נקה seed
      </Button>
    </Box>
  </>
);
