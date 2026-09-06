import { Dialog, Box, Typography, Button, Fade } from '@mui/material';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { FEATURE_TIPS, type FeatureTip } from './tips';

interface FeatureTipPopupProps {
  tip: FeatureTip;
  onClose: () => void;
}

// פופאפ "ידעת ש...?" - hero גרדיאנט עם אמוג'י בזכוכית מט, כותרת+גוף,
// נקודות התקדמות, וכפתור "הבנתי". מעוצב פרימיום, מותאם למצב כהה.
export const FeatureTipPopup = ({ tip, onClose }: FeatureTipPopupProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const idx = FEATURE_TIPS.findIndex(x => x.id === tip.id);

  const handleClose = () => { haptic('light'); onClose(); };

  return (
    <Dialog
      open
      onClose={handleClose}
      fullWidth
      maxWidth={false}
      TransitionComponent={Fade}
      transitionDuration={{ enter: 320, exit: 200 }}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible',
            m: 2, width: '100%', maxWidth: 360, mx: 'auto',
          },
        },
        backdrop: {
          sx: { bgcolor: 'rgba(3,7,18,0.62)', backdropFilter: 'blur(6px)' },
        },
      }}
    >
      <Box sx={{
        borderRadius: '24px', overflow: 'hidden',
        bgcolor: isDark ? '#0F172A' : '#FFFFFF',
        boxShadow: '0 24px 64px rgba(0,0,0,0.32), 0 2px 8px rgba(0,0,0,0.2)',
        animation: 'tipIn 0.42s cubic-bezier(0.16, 1, 0.3, 1) both',
        '@keyframes tipIn': {
          from: { opacity: 0, transform: 'translateY(14px) scale(0.96)' },
          to: { opacity: 1, transform: 'translateY(0) scale(1)' },
        },
      }}>
        {/* ===== Hero ===== */}
        <Box sx={{
          position: 'relative', overflow: 'hidden',
          background: tip.gradient,
          px: 3, pt: 3, pb: 3.25,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          {/* בוקה - עומק עדין */}
          <Box aria-hidden sx={{
            position: 'absolute', top: -60, insetInlineEnd: -40, width: 180, height: 180,
            borderRadius: '50%', background: 'rgba(255,255,255,0.14)', filter: 'blur(6px)',
          }} />
          <Box aria-hidden sx={{
            position: 'absolute', bottom: -70, insetInlineStart: -50, width: 160, height: 160,
            borderRadius: '50%', background: 'rgba(0,0,0,0.10)', filter: 'blur(8px)',
          }} />

          {/* Eyebrow */}
          <Box sx={{
            position: 'relative', zIndex: 1,
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1.25, py: 0.4, mb: 2, borderRadius: '999px',
            bgcolor: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.28)',
          }}>
            <Box component="span" sx={{ fontSize: 11 }}>✨</Box>
            <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#fff', letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {t('tipEyebrow')}
            </Typography>
          </Box>

          {/* אמוג'י בזכוכית מט */}
          <Box sx={{
            position: 'relative', zIndex: 1,
            width: 78, height: 78, borderRadius: '22px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38, lineHeight: 1,
            bgcolor: 'rgba(255,255,255,0.22)',
            border: '1px solid rgba(255,255,255,0.4)',
            backdropFilter: 'blur(6px)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 10px 24px rgba(0,0,0,0.18)',
          }}>
            {tip.emoji}
          </Box>
        </Box>

        {/* ===== גוף ===== */}
        <Box sx={{ px: 3, pt: 2.5, pb: 2.75, textAlign: 'center' }}>
          <Typography sx={{ fontSize: 19, fontWeight: 800, color: 'text.primary', lineHeight: 1.3, mb: 1 }}>
            {t(tip.titleKey)}
          </Typography>
          <Typography sx={{ fontSize: 13.5, color: 'text.secondary', lineHeight: 1.65 }}>
            {t(tip.bodyKey)}
          </Typography>

          {/* נקודות התקדמות בסבב הטיפים */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.6, mt: 2.25, mb: 2.5 }}>
            {FEATURE_TIPS.map((x, i) => (
              <Box key={x.id} sx={{
                height: 6, borderRadius: '999px',
                width: i === idx ? 20 : 6,
                background: i === idx ? tip.gradient : (isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.12)'),
                transition: 'width 0.25s ease',
              }} />
            ))}
          </Box>

          <Button
            fullWidth
            onClick={handleClose}
            disableRipple
            sx={{
              height: 50, borderRadius: '14px',
              background: tip.gradient, color: '#fff',
              fontSize: 15, fontWeight: 800, textTransform: 'none',
              boxShadow: `0 8px 22px ${tip.glowColor}`,
              transition: 'transform 0.08s ease, filter 0.12s ease',
              '&:hover': { background: tip.gradient, filter: 'brightness(1.04)' },
              '&:active': { transform: 'scale(0.97)' },
            }}
          >
            {t('tipGotIt')}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};
