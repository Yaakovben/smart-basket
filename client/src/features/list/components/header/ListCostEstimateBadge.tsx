import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import { useSettings } from '../../../../global/context/SettingsContext';
import { safeStorage, haptic } from '../../../../global/helpers';
import type { ListCostEstimate } from '../../hooks/useListCostEstimate';
import { ListAnalysisDrawer } from './ListAnalysisDrawer';

interface ListCostEstimateBadgeProps {
  listId: string;
  listName: string;
  estimate: ListCostEstimate | null;
  productNames?: string[];
  sx?: object;
}

export const ListCostEstimateBadge = memo(({ listId, listName, estimate: _, productNames = [], sx }: ListCostEstimateBadgeProps) => {
  const { t } = useSettings();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const openAnalysis = () => {
    handleClose();
    setDrawerOpen(true);
  };

  return (
    <>
      <IconButton onClick={handleOpen} aria-label="AI ותובנות" sx={sx}>
        <AutoAwesomeRoundedIcon sx={{ color: 'white', fontSize: 20 }} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: '14px', mt: 0.5, minWidth: 220 } } }}
      >
        <MenuItem onClick={openAnalysis} sx={{ py: 1.1 }}>
          <ListItemIcon><AutoAwesomeRoundedIcon sx={{ fontSize: 20, color: '#8B5CF6' }} /></ListItemIcon>
          <ListItemText
            primary={t('askAiAboutList')}
            slotProps={{ primary: { fontSize: 14, fontWeight: 600 } }}
          />
        </MenuItem>
        <MenuItem onClick={goToInsights} sx={{ py: 1.1 }}>
          <ListItemIcon><InsightsRoundedIcon sx={{ fontSize: 20, color: '#0D9488' }} /></ListItemIcon>
          <ListItemText
            primary={t('fullDetailsInInsights')}
            secondary={t('estimatedCostDisclaimer')}
            slotProps={{ primary: { fontSize: 14, fontWeight: 600 }, secondary: { fontSize: 11 } }}
          />
        </MenuItem>
      </Menu>

      <ListAnalysisDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        listId={listId}
        listName={listName}
        productNames={productNames}
      />
    </>
  );
});

ListCostEstimateBadge.displayName = 'ListCostEstimateBadge';
