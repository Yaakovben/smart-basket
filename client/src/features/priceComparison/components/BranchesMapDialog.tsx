import { Dialog, Box, Typography, IconButton, Slide } from '@mui/material';
import type { TransitionProps } from '@mui/material/transitions';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { forwardRef } from 'react';
import { BranchesMapView } from './BranchesMapView';
import { useSettings } from '../../../global/context/SettingsContext';

const SlideUp = forwardRef(function SlideUp(
  props: TransitionProps & { children: React.ReactElement },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="up" ref={ref} {...props} />;
});

interface Props {
  isDark: boolean;
  onClose: () => void;
}

export const BranchesMapDialog = ({ isDark, onClose }: Props) => {
  const { settings } = useSettings();
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
        background: dark
          ? 'linear-gradient(160deg, #134E4A, #0F766E, #0D9488)'
          : 'linear-gradient(160deg, #0D9488, #14B8A6, #2DD4BF)',
        pt: 'max(env(safe-area-inset-top) + 12px, 48px)',
        pb: '16px',
        px: 2,
        borderRadius: '0 0 24px 24px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        boxShadow: '0 4px 16px rgba(13,148,136,0.2)',
      }}>
        <Box sx={{ position: 'absolute', top: -30, right: -20, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, position: 'relative' }}>
          <IconButton
            onClick={onClose}
            aria-label="חזור"
            sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 38, height: 38, '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' } }}
          >
            <ArrowForwardIcon sx={{ fontSize: 21 }} />
          </IconButton>

          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'white', letterSpacing: -0.3 }}>
              🗺️ מפת סניפים
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
