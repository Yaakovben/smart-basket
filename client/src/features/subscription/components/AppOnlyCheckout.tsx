import { Box, Typography, ButtonBase } from '@mui/material';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import { siApple, siGoogleplay } from 'simple-icons';
import type { SubscriptionStatus } from '../../../services/api/subscription.api';
import type { SubscriptionStrings } from '../subscription.strings';
import { cardSx, PRO_PURPLE, PRO_SOFT } from '../subscription.styles';

// כתובות האפליקציה בחנויות. מוגדרות במשתני הסביבה של ה-build, ולא נכתבות
// כאן ידנית: אם עוד לא הוגדרו (האפליקציה עוד לא פורסמה) לא מוצג קישור שבור.
const APP_STORE_URL: string | undefined = import.meta.env.VITE_APP_STORE_URL;
const PLAY_STORE_URL: string | undefined = import.meta.env.VITE_PLAY_STORE_URL;

interface Props {
  status: SubscriptionStatus;
  s: SubscriptionStrings;
  isDark: boolean;
}

const StoreButton = ({ href, path, top, name }: { href: string; path: string; top: string; name: string }) => (
  <ButtonBase
    component="a" href={href} target="_blank" rel="noopener noreferrer"
    sx={{
      flex: 1, minWidth: 0, gap: 1, px: 1.5, py: 1, borderRadius: '14px',
      bgcolor: '#0F172A', color: '#fff', justifyContent: 'center',
      transition: 'transform 0.12s ease', '&:active': { transform: 'scale(0.97)' },
    }}
  >
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 22, height: 22, flexShrink: 0 }} aria-hidden>
      <path fill="#fff" d={path} />
    </Box>
    <Box sx={{ textAlign: 'start', lineHeight: 1.1 }} dir="ltr">
      <Typography sx={{ fontSize: 9.5, opacity: 0.75, lineHeight: 1.2 }}>{top}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 700, lineHeight: 1.2 }}>{name}</Typography>
    </Box>
  </ButtonBase>
);

// באתר (דפדפן) אין תשלום: Pro נרכש רק דרך App Store / Google Play באפליקציה.
// הכרטיס מסביר את זה ומפנה לחנויות. מנוי שכבר נרכש בחנות מנוהל שם.
export const AppOnlyCheckout = ({ status, s, isDark }: Props) => {
  const isPro = status.plan === 'pro';
  const isPermanent = isPro && !status.planExpiresAt;
  if (isPermanent) return null;

  if (status.store.isStorePlan) {
    return (
      <Box sx={{ ...cardSx(isDark), display: 'flex', gap: 1.5, alignItems: 'flex-start' } as object}>
        <Box sx={iconTileSx(isDark)}><StorefrontRoundedIcon sx={{ fontSize: 22, color: PRO_PURPLE }} /></Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>{s.storeManageTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.4, lineHeight: 1.55 }}>{s.storeManageBody}</Typography>
        </Box>
      </Box>
    );
  }

  const hasLinks = !!(APP_STORE_URL || PLAY_STORE_URL);

  return (
    <Box sx={cardSx(isDark)}>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
        <Box sx={iconTileSx(isDark)}><PhoneIphoneRoundedIcon sx={{ fontSize: 22, color: PRO_PURPLE }} /></Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{isPro ? s.appOnlyRenewTitle : s.appOnlyTitle}</Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.4, lineHeight: 1.55 }}>{s.appOnlyBody}</Typography>
        </Box>
      </Box>

      {hasLinks ? (
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          {APP_STORE_URL && <StoreButton href={APP_STORE_URL} path={siApple.path} top="Download on the" name="App Store" />}
          {PLAY_STORE_URL && <StoreButton href={PLAY_STORE_URL} path={siGoogleplay.path} top="GET IT ON" name="Google Play" />}
        </Box>
      ) : (
        <Box sx={{
          mt: 1.75, px: 1.5, py: 1, borderRadius: '12px', textAlign: 'center',
          bgcolor: isDark ? 'rgba(124,58,237,0.14)' : PRO_SOFT,
        }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: PRO_PURPLE }}>{s.appOnlySoon}</Typography>
        </Box>
      )}
    </Box>
  );
};

const iconTileSx = (isDark: boolean) => ({
  width: 42, height: 42, borderRadius: '13px', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  bgcolor: isDark ? 'rgba(124,58,237,0.18)' : PRO_SOFT,
});
