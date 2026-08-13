import { Dialog, Box, Typography, IconButton, Slide } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { forwardRef } from 'react';
import { BranchesMapView } from './BranchesMapView';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/helpers';

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} timeout={180} {...props} />;
});

interface Props {
  isDark: boolean;
  onClose: () => void;
}

export const BranchesMapDialog = ({ isDark, onClose }: Props) => {
  const { settings, t } = useSettings();
  const dark = settings.theme === 'dark';

  return (
    <Dialog
      open
      onClose={onClose}
      fullScreen
      TransitionComponent={SlideUp}
      PaperProps={{
        sx: {
          height: '100dvh', maxHeight: '100dvh',
          bgcolor: 'background.default',
          display: 'flex', flexDirection: 'column',
        },
      }}
    >
      {/* הדר זהה לסגנון InsightsHeader */}
      <Box sx={{
        background: dark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
        pt: 'max(env(safe-area-inset-top) + 12px, 48px)',
        pb: '16px',
        px: 2,
        borderRadius: '0 0 24px 24px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 4px 16px rgba(13,148,136,0.2)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <IconButton
            onClick={onClose}
            aria-label={t('back')}
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 38, height: 38, '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
          >
            <ArrowForwardIcon sx={{ fontSize: 21 }} />
          </IconButton>

          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>
              {t('branchesMapDialogTitle')}
            </Typography>
          </Box>

          <Box sx={{ width: 38, flexShrink: 0 }} />
        </Box>
      </Box>

      {/* תוכן המפה - position relative עם גובה מחושב */}
      <Box sx={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <BranchesMapView isDark={isDark} fillHeight />
      </Box>
    </Dialog>
  );
};
