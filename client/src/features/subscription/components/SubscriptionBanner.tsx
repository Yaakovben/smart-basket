import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, ButtonBase } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { subscriptionApi, type SubscriptionStatus } from '../../../services/api/subscription.api';
import { getSubscriptionStrings } from '../subscription.strings';
// אייקון לבן על אריח סגול - עקבי עם שאר המינוי

const DAY_MS = 86_400_000;
const DISMISS_KEY = 'sb_sub_banner_dismissed_on';
const CACHE_TTL_MS = 5 * 60_000;
let cache: { at: number; status: SubscriptionStatus } | null = null;

const todayKey = () => new Date().toISOString().slice(0, 10);
const wasDismissedToday = () => { try { return localStorage.getItem(DISMISS_KEY) === todayKey(); } catch { return false; } };

// באנר בדף הבית: מופיע כשמנוי ה-Pro (כולל ניסיון) מסתיים בעוד 7 ימים או פחות,
// או כשהניסיון כבר הסתיים. אפשר לסגור עד סוף היום. כשל בטעינה = אין באנר.
export const SubscriptionBanner = () => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const s = getSubscriptionStrings(settings.language);
  const [status, setStatus] = useState<SubscriptionStatus | null>(() => (cache && Date.now() - cache.at < CACHE_TTL_MS ? cache.status : null));
  const [dismissed, setDismissed] = useState(wasDismissedToday);

  useEffect(() => {
    if (status || dismissed) return;
    let cancelled = false;
    subscriptionApi.getStatus()
      .then((st) => { cache = { at: Date.now(), status: st }; if (!cancelled) setStatus(st); })
      .catch(() => { /* ללא באנר */ });
    return () => { cancelled = true; };
  }, [status, dismissed]);

  if (!status || dismissed || status.openRequest) return null;

  const days = status.planExpiresAt
    ? Math.ceil((new Date(status.planExpiresAt).getTime() - Date.now()) / DAY_MS)
    : null;
  const expiringSoon = status.plan === 'pro' && days !== null && days <= 7;
  const ended = status.plan === 'free' && status.trialEnded;
  if (!expiringSoon && !ended) return null;

  const title = ended
    ? s.bannerTrialEnded
    : days !== null && days <= 0 ? s.bannerTrialToday : s.bannerTrialSoon.replace('{n}', String(days));
  const sub = ended ? s.bannerTrialEndedSub : s.bannerTrialSoonSub;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, todayKey()); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <Box sx={{
      px: { xs: 2, sm: 2.5 }, pt: 1.5, flexShrink: 0,
      animation: 'sbBannerIn 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      '@keyframes sbBannerIn': { from: { opacity: 0, transform: 'translateY(-10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
      '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
    }}>
      <ButtonBase
        onClick={() => navigate('/subscription')}
        sx={{
          width: '100%', textAlign: 'start', display: 'flex', alignItems: 'center', gap: 1.25,
          px: 1.5, py: 1.1, borderRadius: '16px', position: 'relative', overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, rgba(109,40,217,0.35), rgba(76,29,149,0.45))'
            : 'linear-gradient(135deg, #F5F3FF, #EDE9FE)',
          border: '1px solid', borderColor: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.22)',
          WebkitTapHighlightColor: 'transparent', '&:active': { transform: 'scale(0.99)' },
        }}
      >
        <Box sx={{
          width: 36, height: 36, borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
        }}>
          <StarRoundedIcon sx={{ fontSize: 21, color: '#fff' }} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: isDark ? '#EDE9FE' : '#4C1D95', lineHeight: 1.25 }}>{title}</Typography>
          <Typography sx={{ fontSize: 12, color: isDark ? 'rgba(237,233,254,0.75)' : '#6D28D9', lineHeight: 1.3 }}>{sub}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', color: isDark ? '#C4B5FD' : '#6D28D9', fontSize: 12.5, fontWeight: 800 }}>
          {s.bannerCta}
          <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
        </Box>
        <Box
          role="button"
          aria-label="close"
          onClick={dismiss}
          sx={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: isDark ? 'rgba(237,233,254,0.6)' : 'rgba(76,29,149,0.55)', '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </Box>
      </ButtonBase>
    </Box>
  );
};
