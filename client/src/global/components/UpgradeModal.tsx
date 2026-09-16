import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Divider, Zoom } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { ReactElement, Ref } from 'react';
import { forwardRef } from 'react';
import type { TransitionProps } from '@mui/material/transitions';
import { useSettings } from '../context/SettingsContext';
import type { PlanLimitFeature } from './UpgradeModalContext';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  feature?: PlanLimitFeature;
}

const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement },
  ref: Ref<unknown>,
) {
  return <Zoom ref={ref} {...props} />;
});

const FEATURE_LIMIT_KEY: Record<PlanLimitFeature, 'upgradeListLimit' | 'upgradeMembersLimit' | 'upgradeAiLimit' | 'upgradePriceLimit'> = {
  lists: 'upgradeListLimit',
  members: 'upgradeMembersLimit',
  ai: 'upgradeAiLimit',
  priceComparison: 'upgradePriceLimit',
};

export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const { t } = useSettings();

  const features: Array<'upgradeListLimit' | 'upgradeMembersLimit' | 'upgradeAiLimit' | 'upgradePriceLimit'> = [
    'upgradeListLimit',
    'upgradeMembersLimit',
    'upgradeAiLimit',
    'upgradePriceLimit',
  ];

  const highlightedKey = feature ? FEATURE_LIMIT_KEY[feature] : undefined;

  return (
    <Dialog open={open} onClose={onClose} TransitionComponent={Transition} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <StarIcon sx={{ color: '#F59E0B', fontSize: 40 }} />
          <Typography variant="h6" fontWeight={700}>{t('upgradeTitle')}</Typography>
          <Typography variant="body2" color="text.secondary">{t('upgradeSubtitle')}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
          {features.map(key => (
            <Box
              key={key}
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 1.5,
                p: 1.5,
                borderRadius: '10px',
                bgcolor: key === highlightedKey ? 'warning.light' : 'action.hover',
                border: key === highlightedKey ? '1.5px solid' : '1.5px solid transparent',
                borderColor: key === highlightedKey ? 'warning.main' : 'transparent',
              }}
            >
              <CheckCircleOutlineIcon sx={{ color: key === highlightedKey ? 'warning.dark' : 'success.main', mt: '2px', flexShrink: 0 }} />
              <Typography variant="body2" sx={{ fontWeight: key === highlightedKey ? 700 : 400 }}>
                {t(key)}
              </Typography>
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 2 }} />

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" fontWeight={700} color="primary">
            {t('upgradePrice')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('upgradeContact')}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          onClick={() => {
            window.open('mailto:upgrade@smartbasket.app?subject=שדרוג ל-Pro', '_blank');
            onClose();
          }}
          sx={{ borderRadius: '12px', fontWeight: 700, py: 1.25, textTransform: 'none' }}
          startIcon={<StarIcon />}
        >
          {t('upgradeCta')}
        </Button>
        <Button variant="text" onClick={onClose} sx={{ textTransform: 'none', color: 'text.secondary' }}>
          {t('notNow')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
