import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import PaidRoundedIcon from '@mui/icons-material/PaidRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { safeStorage, haptic } from '../../../../global/helpers';
import type { ListCostEstimate } from '../../hooks/useListCostEstimate';

interface ListCostEstimateBadgeProps {
  listId: string;
  listName: string;
  estimate: ListCostEstimate;
}

// גלולה עדינה בכותרת הרשימה - "~₪84" - לחיצה פותחת תפריט קטן: פירוט מלא
// בתובנות (טאב מחירים, מסונן לרשימה הזו), או ניתוח חופשי עם עוזר ה-AI.
// שני היעדים נפתחים ב-push (לא replace) כך שכפתור "חזור" שלהם (navigate(-1))
// מחזיר בדיוק לרשימה הזו.
export const ListCostEstimateBadge = memo(({ listId, listName, estimate }: ListCostEstimateBadgeProps) => {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    haptic('light');
    setAnchorEl(e.currentTarget);
  };
  const handleClose = () => setAnchorEl(null);

  const goToInsights = () => {
    handleClose();
    safeStorage.setJSON('sb_insights_selected_list', listId);
    navigate('/insights?tab=price');
  };

  const askAi = () => {
    handleClose();
    navigate('/assistant', {
      state: { initialPrompt: t('aiAnalyzeListPrompt').replace('{name}', listName) },
    });
  };

  return (
    <>
      <Box
        component="button"
        type="button"
        onClick={handleOpen}
        sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          bgcolor: 'rgba(255,255,255,0.15)', border: 'none', cursor: 'pointer',
          borderRadius: '999px', px: 1.1, py: 0.4,
          color: 'rgba(255,255,255,0.85)',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
          '&:active': { transform: 'scale(0.96)' },
        }}
      >
        <PaidRoundedIcon sx={{ fontSize: 13 }} />
        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
          {t('estimatedCostBadge').replace('{amount}', String(Math.round(estimate.estimatedTotal)))}
        </Typography>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: '14px', mt: 0.5, minWidth: 220 } } }}
      >
        <MenuItem onClick={goToInsights} sx={{ py: 1.1 }}>
          <ListItemIcon><InsightsRoundedIcon sx={{ fontSize: 20, color: '#0D9488' }} /></ListItemIcon>
          <ListItemText
            primary={t('fullDetailsInInsights')}
            secondary={t('estimatedCostDisclaimer')}
            slotProps={{ primary: { fontSize: 14, fontWeight: 600 }, secondary: { fontSize: 11 } }}
          />
        </MenuItem>
        <MenuItem onClick={askAi} sx={{ py: 1.1 }}>
          <ListItemIcon><AutoAwesomeRoundedIcon sx={{ fontSize: 20, color: '#8B5CF6' }} /></ListItemIcon>
          <ListItemText
            primary={t('askAiAboutList')}
            slotProps={{ primary: { fontSize: 14, fontWeight: 600 } }}
          />
        </MenuItem>
      </Menu>
    </>
  );
});

ListCostEstimateBadge.displayName = 'ListCostEstimateBadge';
