import { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Dialog, DialogContent, IconButton,
  Button, CircularProgress, Divider, Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useSettings } from '../../../global/context/SettingsContext';
import { subscriptionApi, type SubscriptionStatus } from '../../../services/api/subscription.api';
import { ConfirmModal } from '../../../global/components';
import type { ToastType } from '../../../global/types';

interface SubscriptionModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

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

  return (
    <>
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
        <Box sx={{ position: 'relative' }}>
          {/* כותרת */}
          <Box sx={{
            background: isPro
              ? 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)'
              : (isDark ? 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)' : 'linear-gradient(135deg, #F1F5F9 0%, #E2E8F0 100%)'),
            px: 3, py: 2.5, display: 'flex', alignItems: 'center', gap: 1.5,
          }}>
            <StarIcon sx={{ color: isPro ? '#FCD34D' : 'text.disabled', fontSize: 28 }} />
            <Typography sx={{ flex: 1, fontWeight: 700, fontSize: 18, color: isPro ? 'white' : 'text.primary' }}>
              {t('manageSubscription')}
            </Typography>
            <IconButton onClick={onClose} size="small" sx={{ color: isPro ? 'rgba(255,255,255,0.7)' : 'text.secondary' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <DialogContent sx={{ p: 3 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress size={32} />
              </Box>
            ) : status ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                {/* תוכנית נוכחית */}
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  p: 2, borderRadius: 2,
                  bgcolor: isPro ? 'rgba(124,58,237,0.08)' : 'action.hover',
                  border: isPro ? '1px solid rgba(124,58,237,0.2)' : '1px solid transparent',
                }}>
                  <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.secondary' }}>
                    {t('subscriptionCurrentPlan')}
                  </Typography>
                  <Chip
                    label={isPro ? t('planPro') : t('planFree')}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: isPro ? '#7C3AED' : 'action.selected',
                      color: isPro ? 'white' : 'text.primary',
                    }}
                  />
                </Box>

                {/* תוקף מנוי Pro */}
                {isPro && expiryDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
                    <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
                      {t('subscriptionActiveUntil')}
                    </Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
                      {expiryDate}
                    </Typography>
                  </Box>
                )}

                <Divider />

                {isPro ? (
                  /* ——— מנוי Pro פעיל ——— */
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.6 }}>
                      יש לך גישה מלאה לכל הפיצ'רים — רשימות ללא הגבלה, קבוצות עם עד 10 חברים, AI ללא הגבלה, והשוואות מחיר ללא הגבלה.
                    </Typography>
                    <Button
                      variant="outlined"
                      color="error"
                      fullWidth
                      disabled={cancelling}
                      onClick={() => setConfirmCancel(true)}
                      sx={{ borderRadius: 2, fontWeight: 600, mt: 1 }}
                    >
                      {cancelling ? <CircularProgress size={18} /> : t('subscriptionCancelBtn')}
                    </Button>
                  </Box>
                ) : (
                  /* ——— תוכנית חינמית — הצגת מגבלות + אפשרות שדרוג ——— */
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {status.limits && (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
                          {t('subscriptionFreeLimits')}
                        </Typography>
                        {[
                          `${status.limits.maxLists} ${t('upgradeListLimit')}`,
                          `${status.limits.maxMembersPerGroup} ${t('upgradeMembersLimit')}`,
                          `${status.limits.aiQueriesPerDay} ${t('upgradeAiLimit')}`,
                          `${status.limits.priceComparisonsPerDay} ${t('upgradePriceLimit')}`,
                        ].map((item, i) => (
                          <Typography key={i} sx={{ fontSize: 13, color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box component="span" sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
                            {item}
                          </Typography>
                        ))}
                      </Box>
                    )}

                    <Box sx={{
                      p: 2, borderRadius: 2,
                      background: 'linear-gradient(135deg, #7C3AED22 0%, #5B21B622 100%)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      display: 'flex', flexDirection: 'column', gap: 1,
                    }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 15, color: 'primary.main' }}>
                        {t('upgradeTitle')} — {status.currency === 'ILS' ? '₪' : '$'}{status.priceMonthly}/חודש
                      </Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                        {t('subscriptionUpgradeHint')}
                      </Typography>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<WhatsAppIcon />}
                        href="https://wa.me/972525000000?text=שלום%2C%20אני%20מעוניין%20לשדרג%20ל-Pro"
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          mt: 0.5, borderRadius: 2, fontWeight: 700,
                          background: '#25D366', '&:hover': { background: '#1DA851' },
                          color: 'white',
                        }}
                      >
                        {t('upgradeContact')} — WhatsApp
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            ) : null}
          </DialogContent>
        </Box>
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
