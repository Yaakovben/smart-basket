import { Dialog, DialogContent, Button, Typography, Box, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useNavigate } from 'react-router-dom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import type { ReactElement, Ref } from 'react';
import { forwardRef } from 'react';
import Zoom from '@mui/material/Zoom';
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

// אותה שפה עיצובית בדיוק כמו SubscriptionModal (הכרטיס "שדרג ל-Pro" שם) -
// זו נקודת המגע הכי נפוצה בפועל (מופיעה כשמגיעים למגבלה), אז חשוב שתרגיש
// באותה רמת "פרימיום" ולא כמו דיאלוג MUI גנרי.
export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const { t, settings } = useSettings();
  const navigate = useNavigate();
  const isDark = settings.theme === 'dark';

  const features: Array<'upgradeListLimit' | 'upgradeMembersLimit' | 'upgradeAiLimit' | 'upgradePriceLimit'> = [
    'upgradeListLimit',
    'upgradeMembersLimit',
    'upgradeAiLimit',
    'upgradePriceLimit',
  ];

  const highlightedKey = feature ? FEATURE_LIMIT_KEY[feature] : undefined;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '20px', overflow: 'hidden', bgcolor: isDark ? '#0F172A' : '#F8FAFC' },
      }}
    >
      {/* כותרת - זהה במבנה לכותרת SubscriptionModal (גרדיאנט סגול, עיגולי
          קישוט, אייקון בתוך אריח) */}
      <Box sx={{
        background: isDark
          ? 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%)'
          : 'linear-gradient(135deg, #5B21B6 0%, #7C3AED 50%, #8B5CF6 100%)',
        px: 3, pt: 3, pb: 3.5, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ position: 'absolute', bottom: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        {/* כפתור סגירה - עיגול זכוכית מוגדר במפורש, לא IconButton ברירת
            מחדל (ראו הערה מקבילה ב-SubscriptionModal). */}
        <Box
          component="button"
          onClick={onClose}
          aria-label={t('close')}
          sx={{
            position: 'absolute', top: 12, left: 12,
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(255,255,255,0.14)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.85)',
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.15s, transform 0.15s',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' },
            '&:active': { transform: 'scale(0.92)' },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <Box sx={{
            width: 56, height: 56, borderRadius: 2.5,
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
          }}>
            <AutoAwesomeIcon sx={{
              fontSize: 28, color: '#FCD34D',
              animation: 'sbUpgradeIconPulse 1.8s ease-in-out infinite',
              '@keyframes sbUpgradeIconPulse': {
                '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
                '50%': { transform: 'scale(1.12) rotate(-6deg)' },
              },
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            }} />
          </Box>

          <Chip
            label="✦ Pro"
            size="small"
            sx={{ fontWeight: 700, fontSize: 12, bgcolor: '#FCD34D', color: '#4C1D95', border: 'none' }}
          />

          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 20, mt: 0.5, textAlign: 'center' }}>
            {t('upgradeTitle')}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center', px: 1 }}>
            {t('upgradeSubtitle')}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {features.map(key => (
            <Box
              key={key}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.25,
                p: 1.25, borderRadius: 2,
                bgcolor: key === highlightedKey
                  ? (isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.08)')
                  : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'),
                border: '1px solid',
                borderColor: key === highlightedKey ? 'rgba(124,58,237,0.35)' : 'transparent',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 18, color: '#7C3AED', flexShrink: 0 }} />
              <Typography sx={{
                fontSize: 13.5,
                fontWeight: key === highlightedKey ? 700 : 500,
                color: isDark ? 'rgba(255,255,255,0.9)' : 'text.primary',
              }}>
                {t(key)}
              </Typography>
            </Box>
          ))}
        </Box>


        {/* CTA - אותו "ברק" נע כמו כפתור השדרוג ב-SubscriptionModal */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => { onClose(); navigate('/subscription'); }}
          sx={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25,
            mt: 2, borderRadius: 2, fontWeight: 800, fontSize: 15, py: 1.1,
            textTransform: 'none',
            background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
            boxShadow: '0 6px 18px rgba(124,58,237,0.45)',
            transition: 'transform 0.15s ease',
            '&:hover': { background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)', transform: 'translateY(-1px)' },
            '&:active': { transform: 'scale(0.98)' },
            '&::after': {
              content: '""', position: 'absolute', inset: 0,
              background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
              backgroundSize: '250% 100%',
              animation: 'sbUpgradeBtnShine 3.2s ease-in-out infinite',
            },
            '@keyframes sbUpgradeBtnShine': {
              '0%, 60%': { backgroundPosition: '150% 0' },
              '100%': { backgroundPosition: '-150% 0' },
            },
            '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' } },
          }}
        >
          <StarRoundedIcon sx={{ fontSize: 19 }} />
          <Box component="span">{t('upgradeCta')}</Box>
        </Button>
        <Button variant="text" fullWidth onClick={onClose} sx={{ mt: 0.5, textTransform: 'none', color: 'text.secondary', fontSize: 13 }}>
          {t('notNow')}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
