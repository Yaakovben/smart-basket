import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogContent, IconButton,
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
import { ConfirmModal } from '../../../global/components';
import type { ToastType } from '../../../global/types';

interface SubscriptionModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

const PRO_FEATURES = [
  'רשימות ללא הגבלה',
  'קבוצות עם עד 10 חברים',
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
            borderRadius: 3,
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

          <IconButton
            onClick={onClose}
            size="small"
            sx={{ position: 'absolute', top: 10, left: 10, color: 'rgba(255,255,255,0.6)' }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>

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
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress size={32} />
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

                  {/* כפתור ביטול */}
                  <Box sx={{ pt: 1 }}>
                    <Button
                      variant="text"
                      color="error"
                      fullWidth
                      disabled={cancelling}
                      onClick={() => setConfirmCancel(true)}
                      sx={{ borderRadius: 2, fontSize: 13, fontWeight: 600, py: 1 }}
                    >
                      {cancelling ? <CircularProgress size={16} color="error" /> : t('subscriptionCancelBtn')}
                    </Button>
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

                  {/* כרטיס שדרוג */}
                  <Box sx={{
                    mx: 3, mb: 3, p: 2.5, borderRadius: 2.5,
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(109,40,217,0.25) 0%, rgba(76,29,149,0.35) 100%)'
                      : 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(109,40,217,0.14) 100%)',
                    border: '1px solid rgba(124,58,237,0.25)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                      <StarIcon sx={{ fontSize: 18, color: '#FCD34D' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 15, color: isDark ? 'white' : '#4C1D95' }}>
                        שדרג ל-Pro
                      </Typography>
                      <Chip
                        label={`${status.currency === 'ILS' ? '₪' : '$'}${status.priceMonthly}/חו׳`}
                        size="small"
                        sx={{ ml: 'auto', fontWeight: 700, fontSize: 12, bgcolor: '#7C3AED', color: 'white' }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
                      {PRO_FEATURES.map((f) => (
                        <Box key={f} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CheckCircleIcon sx={{ fontSize: 15, color: '#7C3AED', flexShrink: 0 }} />
                          <Typography sx={{ fontSize: 13, color: isDark ? 'rgba(255,255,255,0.8)' : '#374151' }}>
                            {f}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<EmailIcon />}
                      href="mailto:smartbasket129@gmail.com?subject=שדרוג%20ל-Pro%20-%20Smart%20Basket"
                      sx={{
                        borderRadius: 2, fontWeight: 700, fontSize: 14,
                        background: 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)',
                        boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
                        '&:hover': { background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' },
                      }}
                    >
                      {t('upgradeContact')}
                    </Button>
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
          message={t('subscriptionCancelDesc')}
          confirmText={t('subscriptionCancelBtn')}
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </>
  );
};
