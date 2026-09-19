import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogContent,
  Button, CircularProgress, Chip, LinearProgress,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import { useSettings } from '../../../global/context/SettingsContext';
import { subscriptionApi, type SubscriptionStatus } from '../../../services/api/subscription.api';
import { ConfirmModal, ShimmerBlock } from '../../../global/components';
import type { ToastType } from '../../../global/types';

interface SubscriptionModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

const PRO_FEATURES = [
  'רשימות ללא הגבלה',
  'קבוצות עם חברים ללא הגבלה',
  'עוזר AI ללא הגבלה',
  'השוואות מחיר ללא הגבלה',
];

const FREE_LIMITS_LABELS = [
  { key: 'maxOwnedLists', suffix: 'רשימות בלבד' },
  { key: 'maxGroupMembers', suffix: 'חברים לקבוצה' },
  { key: 'maxAiRequestsPerDay', suffix: 'שאלות AI ביום' },
  { key: 'maxPriceComparisonsPerDay', suffix: 'השוואות מחיר ביום' },
] as const;

export const SubscriptionModal = ({ onClose, showToast }: SubscriptionModalProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await subscriptionApi.getStatus();
      setStatus(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancel = async () => {
    setConfirmCancel(false);
    setCancelling(true);
    try {
      await subscriptionApi.cancel();
      showToast(t('subscriptionCancelled'), 'success');
      onClose();
    } catch {
      showToast(t('unknownError'), 'error');
    } finally {
      setCancelling(false);
    }
  };

  const isPro = status?.plan === 'pro';

  const expiryDate = status?.planExpiresAt
    ? new Date(status.planExpiresAt).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  const daysLeft = status?.planExpiresAt
    ? Math.max(0, Math.ceil((new Date(status.planExpiresAt).getTime() - Date.now()) / 86400000))
    : null;

  return (
    <>
      <Dialog
        open
        onClose={onClose}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            bgcolor: isDark ? '#0F172A' : '#F8FAFC',
          },
        }}
      >
        {/* כותרת */}
        <Box sx={{
          background: isPro
            ? 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%)'
            : (isDark
              ? 'linear-gradient(135deg, #1E293B 0%, #1E3A5F 100%)'
              : 'linear-gradient(135deg, #1E3A5F 0%, #1E40AF 100%)'),
          px: 3,
          pt: 3,
          pb: isPro ? 4 : 3,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* עיגולי קישוט ברקע */}
          <Box sx={{
            position: 'absolute', top: -30, left: -30,
            width: 120, height: 120, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }} />
          <Box sx={{
            position: 'absolute', bottom: -20, right: -10,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
          }} />

          {/* כפתור סגירה - עיגול זכוכית מוגדר במפורש (רקע+גבול קבועים),
              לא IconButton ברירת מחדל שנראה כמו "בועה" מקרית רק בזמן
              hover/ripple. גודל מגע מלא (36px) עם אייקון קטן במרכז. */}
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

          {/* אייקון + תוכנית */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: 2.5,
              background: isPro ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.2)',
            }}>
              {isPro
                ? <StarIcon sx={{ fontSize: 30, color: '#FCD34D' }} />
                : <AutoAwesomeIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.8)' }} />}
            </Box>

            <Chip
              label={isPro ? '✦ Pro' : 'Free'}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: 12,
                bgcolor: isPro ? '#FCD34D' : 'rgba(255,255,255,0.15)',
                color: isPro ? '#4C1D95' : 'white',
                border: 'none',
              }}
            />

            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: 20, mt: 0.5 }}>
              {t('manageSubscription')}
            </Typography>

            {isPro && expiryDate && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                <CalendarTodayIcon sx={{ fontSize: 13, color: 'rgba(255,255,255,0.65)' }} />
                <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)' }}>
                  {t('subscriptionActiveUntil')} {expiryDate}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        <DialogContent sx={{ p: 0 }}>
          {loading ? (
            // שלד בצורת התצוגה הצפויה (מגבלות free - המצב הנפוץ ביותר),
            // לא ספינר גנרי - המשתמש רואה מיד את מבנה המסך, לא רק "טוען".
            <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <ShimmerBlock width={140} height={11} radius={4} />
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <ShimmerBlock key={i} height={64} radius={16} />
                ))}
              </Box>
              <ShimmerBlock height={168} radius={20} sx={{ mt: 0.5 }} />
            </Box>
          ) : status ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

              {isPro ? (
                /* ——— תצוגת Pro ——— */
                <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                  {/* ימים שנותרו */}
                  {daysLeft !== null && (
                    <Box sx={{
                      p: 2, borderRadius: 2.5,
                      bgcolor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.06)',
                      border: '1px solid rgba(124,58,237,0.18)',
                    }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 500 }}>
                          תקופת המנוי
                        </Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: daysLeft <= 7 ? 'error.main' : '#7C3AED' }}>
                          {daysLeft} ימים נותרו
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={Math.min(100, daysLeft / 30 * 100)}
                        sx={{
                          height: 6, borderRadius: 3,
                          bgcolor: 'rgba(124,58,237,0.15)',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                            background: daysLeft <= 7
                              ? 'linear-gradient(90deg, #EF4444, #F97316)'
                              : 'linear-gradient(90deg, #7C3AED, #A855F7)',
                          },
                        }}
                      />
                    </Box>
                  )}

                  {/* פיצ'רים כלולים */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      כלול בתוכנית שלך
                    </Typography>
                    {PRO_FEATURES.map((f) => (
                      <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <CheckCircleIcon sx={{ fontSize: 18, color: '#7C3AED', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 14, color: 'text.primary' }}>{f}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* חידוש אוטומטי - סטטוס שקט, לא כפתור בולט. "ביטול" פה
                      אף פעם לא חותך גישה - isPro() בשרת ממשיך לכבד את
                      planExpiresAt, זה רק מכבה את "יתחדש שוב אחרי". במתכוון
                      לא בצבע אדום/מזמין-לחיצה כמו כפתור השדרוג - ה-UI לא
                      "מפתה" לבטל, רק מאפשר את זה בלי להסתיר. */}
                  <Box sx={{ pt: 0.5, textAlign: 'center' }}>
                    {!status.planExpiresAt ? (
                      // מנוי קבוע (הוענק ידנית, בלי תאריך תפוגה) - "ביטול
                      // חידוש אוטומטי" לא רלוונטי כשאין מה לחדש/לבטל. השרת
                      // ממילא לא משנה כלום במקרה הזה (ראו subscription.routes.ts)
                      // - עדיף לא להציג כפתור שנראה פעיל אבל לא עושה כלום.
                      <Typography sx={{ fontSize: 12, color: 'text.disabled', lineHeight: 1.5 }}>
                        {t('subscriptionPermanentDesc')}
                      </Typography>
                    ) : status.planAutoRenew ? (
                      <Box
                        component="button"
                        disabled={cancelling}
                        onClick={() => setConfirmCancel(true)}
                        sx={{
                          background: 'none', border: 'none', cursor: cancelling ? 'default' : 'pointer',
                          fontSize: 12, color: 'text.disabled', fontWeight: 500,
                          textDecoration: 'underline', textUnderlineOffset: 3,
                          py: 0.5, px: 1,
                          '&:hover': { color: 'text.secondary' },
                        }}
                      >
                        {cancelling ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : t('subscriptionCancelBtn')}
                      </Box>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled', lineHeight: 1.5 }}>
                        {t('subscriptionAutoRenewOffDesc')} {expiryDate}
                      </Typography>
                    )}
                  </Box>
                </Box>

              ) : (
                /* ——— תצוגת Free ——— */
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>

                  {/* מגבלות נוכחיות */}
                  {status.limits && (
                    <Box sx={{ px: 3, pt: 3, pb: 2 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: 0.5, mb: 1.5 }}>
                        המגבלות שלך עכשיו
                      </Typography>
                      <Box sx={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1,
                      }}>
                        {FREE_LIMITS_LABELS.map(({ key, suffix }) => (
                          <Box key={key} sx={{
                            p: 1.5, borderRadius: 2,
                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                            border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(0,0,0,0.07)',
                            textAlign: 'center',
                          }}>
                            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                              {status.limits![key]}
                            </Typography>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                              {suffix}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* כרטיס שדרוג - הכרטיס "מגרה" בכוונה: הילה זוהרת שפועמת
                      בעדינות, כוכב שמנצנץ, ותג "הכי משתלם" בפינה - מנוגד
                      במתכוון לכפתור הביטול השקט למעלה. */}
                  <Box sx={{
                    position: 'relative',
                    mx: 3, mb: 3, mt: 0.5,
                    animation: 'sbUpgradeGlow 2.6s ease-in-out infinite',
                    '@keyframes sbUpgradeGlow': {
                      '0%, 100%': { boxShadow: '0 0 0 0 rgba(124,58,237,0.35), 0 4px 18px rgba(124,58,237,0.18)' },
                      '50%': { boxShadow: '0 0 0 7px rgba(124,58,237,0), 0 4px 18px rgba(124,58,237,0.3)' },
                    },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                    borderRadius: 2.5,
                  }}>
                    {/* תג "הכי משתלם" */}
                    <Box sx={{
                      position: 'absolute', top: -10, insetInlineStart: 16, zIndex: 1,
                      px: 1.25, py: 0.35, borderRadius: '999px',
                      background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
                      boxShadow: '0 2px 8px rgba(245,158,11,0.4)',
                    }}>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#4C1D95', letterSpacing: 0.2 }}>
                        ✨ {t('upgradeBestValueBadge')}
                      </Typography>
                    </Box>

                    <Box sx={{
                      p: 2.5, pt: 3, borderRadius: 2.5,
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(109,40,217,0.3) 0%, rgba(76,29,149,0.4) 100%)'
                        : 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(109,40,217,0.16) 100%)',
                      border: '1px solid rgba(124,58,237,0.3)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <StarIcon sx={{
                          fontSize: 20, color: '#FCD34D',
                          animation: 'sbStarPulse 1.8s ease-in-out infinite',
                          '@keyframes sbStarPulse': {
                            '0%, 100%': { transform: 'scale(1) rotate(0deg)' },
                            '50%': { transform: 'scale(1.15) rotate(-8deg)' },
                          },
                          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                        }} />
                        <Typography sx={{ fontWeight: 800, fontSize: 16, color: isDark ? 'white' : '#4C1D95' }}>
                          שדרג ל-Pro
                        </Typography>
                        <Box sx={{ ml: 'auto', textAlign: 'end' }}>
                          <Typography sx={{ fontSize: 18, fontWeight: 800, color: isDark ? 'white' : '#4C1D95', lineHeight: 1 }}>
                            {status.currency === 'ILS' ? '₪' : '$'}{status.priceMonthly}
                            <Typography component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
                              {' '}/{t('perMonthShort')}
                            </Typography>
                          </Typography>
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.85, mb: 2.25 }}>
                        {PRO_FEATURES.map((f) => (
                          <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckCircleIcon sx={{ fontSize: 16, color: '#7C3AED', flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 13.5, fontWeight: 500, color: isDark ? 'rgba(255,255,255,0.85)' : '#374151' }}>
                              {f}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <Button
                        variant="contained"
                        fullWidth
                        href="mailto:smartbasket129@gmail.com?subject=שדרוג%20ל-Pro%20-%20Smart%20Basket"
                        sx={{
                          position: 'relative', overflow: 'hidden',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.25,
                          borderRadius: 2, fontWeight: 800, fontSize: 15, py: 1.1,
                          textTransform: 'none',
                          background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                          boxShadow: '0 6px 18px rgba(124,58,237,0.45)',
                          transition: 'transform 0.15s ease',
                          '&:hover': { background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)', transform: 'translateY(-1px)' },
                          '&:active': { transform: 'scale(0.98)' },
                          // "ברק" שעובר על הכפתור בלולאה - מרמז שיש כאן משהו לתפוס
                          '&::after': {
                            content: '""', position: 'absolute', inset: 0,
                            background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%)',
                            backgroundSize: '250% 100%',
                            animation: 'sbBtnShine 3.2s ease-in-out infinite',
                          },
                          '@keyframes sbBtnShine': {
                            '0%, 60%': { backgroundPosition: '150% 0' },
                            '100%': { backgroundPosition: '-150% 0' },
                          },
                          '@media (prefers-reduced-motion: reduce)': { '&::after': { animation: 'none' } },
                        }}
                      >
                        <EmailIcon sx={{ fontSize: 18 }} />
                        <Box component="span">{t('upgradeContact')}</Box>
                      </Button>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      {confirmCancel && (
        <ConfirmModal
          title={t('subscriptionCancelTitle')}
          message={expiryDate ? `${t('subscriptionCancelDesc')} ${expiryDate}` : t('subscriptionCancelDesc')}
          confirmText={t('subscriptionCancelBtn')}
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </>
  );
};
