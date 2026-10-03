import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Button, Link } from '@mui/material';
import type { ReactNode } from 'react';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES } from '../../../global/constants';
import type { ToastType } from '../../../global/types';
import { getSubscriptionStrings } from '../subscription.strings';
import { useSubscription } from '../hooks/useSubscription';
import { PlanHero } from '../components/PlanHero';
import { SubscriptionSkeleton } from '../components/SubscriptionSkeleton';
import { PlanComparisonTable } from '../components/PlanComparisonTable';
import { StoreCheckout } from '../components/StoreCheckout';
import { AppOnlyCheckout } from '../components/AppOnlyCheckout';
import { revealSx, PRO_PURPLE, PRO_GRADIENT } from '../subscription.styles';
import { isNativeApp } from '../../../global/services/storeBilling';

// כותרת ייעודית בסגול המותג של המינוי - לא הגרדיאנט התכלת הכללי של האפליקציה
// (COMMON_STYLES.gradients.header), שלא קשור לכלום כאן ויוצר חוסר עקביות
// מול שאר העמוד שכולו בגוני סגול.
const SUBSCRIPTION_HEADER_GRADIENT = {
  light: PRO_GRADIENT,
  dark: 'linear-gradient(135deg, #3B1670, #4C1D95)',
};

interface Props {
  showToast: (msg: string, type?: ToastType) => void;
}

const Reveal = ({ i, children }: { i: number; children: ReactNode }) => <Box sx={revealSx(i)}>{children}</Box>;

const LOCALES = { he: 'he-IL', en: 'en-GB', ru: 'ru-RU' } as const;

// עמוד המנוי. התשלום נעשה רק דרך App Store / Google Play:
//  • באפליקציה: בחירת תוכנית ורכישה בחנות, או ניהול מנוי קיים
//  • באתר: הסבר שההצטרפות נעשית באפליקציה, עם קישורים לחנויות
// סדר העמוד זהה לפני ואחרי מנוי: מצב, פעולה, מה כלול, עזרה.
export const SubscriptionPage = ({ showToast }: Props) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const native = isNativeApp();
  const s = getSubscriptionStrings(settings.language);
  const locale = LOCALES[settings.language] ?? 'he-IL';
  const { status, loading, error, reload } = useSubscription();

  return (
    <Box sx={{
      height: { xs: 'var(--app-height, 100dvh)', sm: '100vh' }, display: 'flex', flexDirection: 'column',
      bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden',
    }}>
      <Box sx={{
        background: isDark ? SUBSCRIPTION_HEADER_GRADIENT.dark : SUBSCRIPTION_HEADER_GRADIENT.light,
        p: { xs: 'max(48px, var(--safe-area-inset-top, env(safe-area-inset-top)) + 12px) 16px 24px', sm: '48px 20px 24px' },
        flexShrink: 0,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={COMMON_STYLES.glassIconButton} aria-label="back">
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 20, fontWeight: 700 }}>{s.pageTitle}</Typography>
        </Box>
      </Box>

      <Box sx={{
        flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
        p: { xs: 2, sm: 2.5 }, pb: 'calc(28px + var(--safe-area-inset-bottom, env(safe-area-inset-bottom)))',
      }}>
        {loading && !status ? (
          <SubscriptionSkeleton />
        ) : error && !status ? (
          <Box sx={{ textAlign: 'center', py: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <Typography sx={{ color: 'text.secondary' }}>{s.loadError}</Typography>
            <Button variant="outlined" onClick={() => void reload()} sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, color: PRO_PURPLE, borderColor: PRO_PURPLE, '&:hover': { borderColor: '#6D28D9', bgcolor: 'rgba(124,58,237,0.06)' } }}>{s.retry}</Button>
          </Box>
        ) : status ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Reveal i={0}><PlanHero status={status} s={s} isDark={isDark} locale={locale} /></Reveal>

            <Reveal i={1}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {native ? (
                  <StoreCheckout
                    status={status} language={settings.language} isDark={isDark}
                    showToast={showToast} onChanged={() => reload(true)}
                  />
                ) : (
                  <AppOnlyCheckout status={status} s={s} isDark={isDark} />
                )}
              </Box>
            </Reveal>

            {/* מה כלול בכל תוכנית - תמיד מוצג (גם למי שכבר Pro), כדי שברור
                בכל רגע מה ההבדל, לא רק ברגע השדרוג. */}
            <Reveal i={2}><PlanComparisonTable status={status} s={s} isDark={isDark} /></Reveal>

            <Reveal i={3}>
              <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', mt: 0.5 }}>
                {s.supportPrompt}{' '}
                <Link
                  href={`mailto:${status.supportEmail}?subject=${encodeURIComponent('Smart Basket Pro')}`}
                  underline="hover" sx={{ fontWeight: 700, color: PRO_PURPLE }}
                >
                  {s.supportCta}
                </Link>
              </Typography>
            </Reveal>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
};
