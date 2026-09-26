import { Dialog, DialogContent, Button, Typography, Box, Chip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PlaylistAddCheckRoundedIcon from '@mui/icons-material/PlaylistAddCheckRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SellRoundedIcon from '@mui/icons-material/SellRounded';
import { useNavigate } from 'react-router-dom';
import type { ReactElement, Ref, ComponentType } from 'react';
import { forwardRef, useEffect, useState } from 'react';
import { subscriptionApi } from '../../services/api/subscription.api';
import { getSubscriptionStrings } from '../../features/subscription/subscription.strings';
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

// אותם 4 יתרונות כאריח צבעוני + אייקון - כדי שמי שנתקל בחלון הזה (הכי נפוץ
// בפועל, קופץ כשמגיעים למגבלה) יזהה מיד את אותה שפה עיצובית גם בעמוד המנוי.
const FEATURES: Array<{ feature: PlanLimitFeature; icon: ComponentType<{ sx?: object }>; grad: string; key: 'perkLists' | 'perkGroups' | 'perkAi' | 'perkPrice' }> = [
  { feature: 'lists', icon: PlaylistAddCheckRoundedIcon, grad: 'linear-gradient(135deg,#8B5CF6,#6D28D9)', key: 'perkLists' },
  { feature: 'members', icon: GroupsRoundedIcon, grad: 'linear-gradient(135deg,#A78BFA,#7C3AED)', key: 'perkGroups' },
  { feature: 'ai', icon: AutoAwesomeRoundedIcon, grad: 'linear-gradient(135deg,#C4B5FD,#8B5CF6)', key: 'perkAi' },
  { feature: 'priceComparison', icon: SellRoundedIcon, grad: 'linear-gradient(135deg,#6D28D9,#4C1D95)', key: 'perkPrice' },
];

// אותה שפה עיצובית בדיוק כמו עמוד המנוי - זו נקודת המגע הכי נפוצה בפועל
// (מופיעה כשמגיעים למגבלה), אז חשוב שתרגיש באותה רמת "פרימיום" ולא כמו
// דיאלוג MUI גנרי.
export function UpgradeModal({ open, onClose, feature }: UpgradeModalProps) {
  const { t, settings } = useSettings();
  const navigate = useNavigate();
  const s = getSubscriptionStrings(settings.language);
  // המחיר האמיתי מהשרת (לא טקסט קבוע) - נטען כשהחלון נפתח; כשל = בלי שורת מחיר.
  const [monthly, setMonthly] = useState<number | null>(null);
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    subscriptionApi.getStatus().then((st) => { if (!cancelled) setMonthly(st.catalog.monthly); }).catch(() => { /* ללא מחיר */ });
    return () => { cancelled = true; };
  }, [open]);
  const isDark = settings.theme === 'dark';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: '24px', overflow: 'hidden', bgcolor: isDark ? '#0F172A' : '#F8FAFC' },
      }}
    >
      {/* כותרת - זהה במבנה לכותרת עמוד המנוי (גרדיאנט סגול חי, עיגולי קישוט, אייקון בתוך אריח) */}
      <Box sx={{
        background: isDark
          ? 'linear-gradient(135deg, #4C1D95, #5B21B6)'
          : 'linear-gradient(135deg, #5B21B6, #7C3AED)',
        px: 3, pt: 3, pb: 3.5, position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
        <Box sx={{ position: 'absolute', bottom: -20, right: -10, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />

        {/* כפתור סגירה - עיגול זכוכית מוגדר במפורש, לא IconButton ברירת מחדל */}
        <Box
          component="button"
          onClick={onClose}
          aria-label="close"
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
            width: 56, height: 56, borderRadius: '18px',
            background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.2)',
            animation: 'sbUpgradePop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
            '@keyframes sbUpgradePop': { from: { transform: 'scale(0.4)', opacity: 0 }, to: { transform: 'scale(1)', opacity: 1 } },
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}>
            <StarRoundedIcon sx={{ fontSize: 30, color: '#fff' }} />
          </Box>

          <Chip
            label="✦ Pro"
            size="small"
            sx={{ fontWeight: 800, fontSize: 12, bgcolor: '#fff', color: '#7C3AED', border: 'none' }}
          />

          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 21, mt: 0.5, textAlign: 'center' }}>
            {s.perksTitle}
          </Typography>
        </Box>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          {FEATURES.map(({ feature: f, icon: Icon, grad, key }, i) => (
            <Box
              key={f}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.1, p: 1.1, borderRadius: '14px',
                bgcolor: f === feature
                  ? (isDark ? 'rgba(124,58,237,0.20)' : 'rgba(124,58,237,0.09)')
                  : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)'),
                border: '1.5px solid',
                borderColor: f === feature ? 'rgba(124,58,237,0.45)' : 'transparent',
                animation: `sbUpgradePerkIn 0.4s ${100 + i * 70}ms cubic-bezier(0.34,1.56,0.64,1) both`,
                '@keyframes sbUpgradePerkIn': { from: { opacity: 0, transform: 'scale(0.85)' }, to: { opacity: 1, transform: 'scale(1)' } },
                '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
              }}
            >
              <Box sx={{
                width: 32, height: 32, borderRadius: '10px', flexShrink: 0, background: grad,
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 3px 8px rgba(15,23,42,0.18)',
              }}>
                <Icon sx={{ fontSize: 17, color: '#fff' }} />
              </Box>
              <Typography sx={{
                fontSize: 12, fontWeight: f === feature ? 800 : 700, lineHeight: 1.25,
                color: isDark ? 'rgba(255,255,255,0.9)' : 'text.primary',
              }}>
                {s[key]}
              </Typography>
            </Box>
          ))}
        </Box>

        {monthly !== null && (
          <Box sx={{ textAlign: 'center', mt: 2.5 }}>
            <Typography sx={{ fontSize: 26, fontWeight: 900, color: isDark ? 'white' : '#4C1D95', lineHeight: 1.1 }}>
              {s.from}₪{Number.isInteger(monthly) ? monthly : monthly.toFixed(2)}
              <Typography component="span" sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}> {s.perMonth}</Typography>
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.4 }}>{s.upgradeModalPrice}</Typography>
          </Box>
        )}

        {/* CTA - אותו "ברק" נע כמו כפתור ההמשך בעמוד המנוי */}
        <Button
          variant="contained"
          fullWidth
          onClick={() => { onClose(); navigate('/subscription'); }}
          sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25,
            mt: 2, borderRadius: '14px', fontWeight: 800, fontSize: 15.5, py: 1.35,
            textTransform: 'none',
            background: '#7C3AED',
            boxShadow: 'none',
            '&:hover': { background: '#6D28D9', boxShadow: 'none' },
            '&:active': { transform: 'scale(0.98)' },
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
