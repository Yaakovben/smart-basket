import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, ButtonBase, Button, CircularProgress, Link } from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import type { Language, ToastType } from '../../../global/types';
import { subscriptionApi, type SubscriptionStatus } from '../../../services/api/subscription.api';
import {
  getStorePackages, purchaseStorePackage, restoreStorePurchases, openStoreSubscriptionManagement,
  nativePlatform, isStoreBillingAvailable, type StorePackage,
} from '../../../global/services/storeBilling';
import { cardSx, sectionLabelSx, primaryCtaSx, PRO_PURPLE } from '../subscription.styles';

// רכישת Pro בתוך האפליקציה הנייטיב, דרך App Store / Google Play.
// המחירים מגיעים מהחנות עצמה (במטבע ובפורמט של המשתמש), לא מהשרת שלנו,
// כי אפל וגוגל קובעות את המחיר הסופי לפי מדינה. אין כאן שום אזכור של
// אמצעי תשלום אחרים: החנויות אוסרות להפנות לתשלום מחוץ לאפליקציה.

const he = {
  planTitle: 'בחרו תוכנית',
  monthly: 'חודשי',
  annual: 'שנתי',
  perMonth: 'לחודש',
  perYear: 'לשנה',
  subscribe: 'הצטרפות ל-Pro',
  renewNote: 'המנוי מתחדש אוטומטית בסוף כל תקופה, עד שמבטלים.',
  autoRenewLegal: 'התשלום יחויב בחשבון {store} שלכם עם אישור הרכישה. המנוי מתחדש אוטומטית אלא אם מבטלים אותו לפחות 24 שעות לפני סוף התקופה הנוכחית. אפשר לנהל ולבטל בכל עת בהגדרות החשבון בחנות.',
  restore: 'שחזור רכישות',
  manage: 'ניהול או ביטול המנוי',
  storePlanActive: 'המנוי שלך נרכש דרך {store}.',
  storePlanRenews: 'המנוי יתחדש אוטומטית.',
  storePlanCancelled: 'החידוש האוטומטי בוטל. Pro יישאר פעיל עד סוף התקופה.',
  terms: 'תנאי שימוש',
  privacy: 'מדיניות פרטיות',
  loadError: 'לא הצלחנו לטעון את התוכניות מהחנות',
  retry: 'נסו שוב',
  unavailable: 'הרכישה באפליקציה עדיין לא זמינה. נסו שוב מאוחר יותר.',
  purchased: 'המנוי הופעל, תודה!',
  pendingActivation: 'הרכישה התקבלה. המנוי יופעל בעוד כמה רגעים.',
  restored: 'הרכישות שוחזרו',
  nothingToRestore: 'לא נמצאו רכישות לשחזור בחשבון הזה',
  error: 'הרכישה לא הושלמה. לא חויבתם.',
};

type Strings = typeof he;

const en: Strings = {
  planTitle: 'Choose a plan',
  monthly: 'Monthly',
  annual: 'Yearly',
  perMonth: 'per month',
  perYear: 'per year',
  subscribe: 'Get Pro',
  renewNote: 'The subscription renews automatically at the end of each period until cancelled.',
  autoRenewLegal: 'Payment will be charged to your {store} account at confirmation of purchase. The subscription renews automatically unless cancelled at least 24 hours before the end of the current period. You can manage and cancel it anytime in your store account settings.',
  restore: 'Restore purchases',
  manage: 'Manage or cancel subscription',
  storePlanActive: 'Your subscription was purchased through {store}.',
  storePlanRenews: 'It will renew automatically.',
  storePlanCancelled: 'Auto-renew is off. Pro stays active until the end of the period.',
  terms: 'Terms of Use',
  privacy: 'Privacy Policy',
  loadError: 'Could not load plans from the store',
  retry: 'Try again',
  unavailable: 'In-app purchase is not available yet. Please try again later.',
  purchased: 'Subscription activated, thank you!',
  pendingActivation: 'Purchase received. Your subscription will activate in a few moments.',
  restored: 'Purchases restored',
  nothingToRestore: 'No purchases found to restore on this account',
  error: 'The purchase was not completed. You were not charged.',
};

const ru: Strings = {
  planTitle: 'Выберите тариф',
  monthly: 'Месяц',
  annual: 'Год',
  perMonth: 'в месяц',
  perYear: 'в год',
  subscribe: 'Оформить Pro',
  renewNote: 'Подписка продлевается автоматически в конце каждого периода, пока вы её не отмените.',
  autoRenewLegal: 'Оплата списывается с вашего аккаунта {store} при подтверждении покупки. Подписка продлевается автоматически, если не отменить её минимум за 24 часа до конца текущего периода. Управлять и отменять можно в любое время в настройках аккаунта магазина.',
  restore: 'Восстановить покупки',
  manage: 'Управление или отмена подписки',
  storePlanActive: 'Подписка оформлена через {store}.',
  storePlanRenews: 'Она продлится автоматически.',
  storePlanCancelled: 'Автопродление отключено. Pro активен до конца периода.',
  terms: 'Условия использования',
  privacy: 'Политика конфиденциальности',
  loadError: 'Не удалось загрузить тарифы из магазина',
  retry: 'Повторить',
  unavailable: 'Покупка в приложении пока недоступна. Попробуйте позже.',
  purchased: 'Подписка активирована, спасибо!',
  pendingActivation: 'Покупка получена. Подписка активируется через несколько минут.',
  restored: 'Покупки восстановлены',
  nothingToRestore: 'Покупок для восстановления в этом аккаунте не найдено',
  error: 'Покупка не завершена. Деньги не списаны.',
};

const DICTS: Record<Language, Strings> = { he, en, ru };

interface Props {
  status: SubscriptionStatus;
  language: Language;
  isDark: boolean;
  showToast: (msg: string, type?: ToastType) => void;
  onChanged: () => Promise<void> | void;
}

export const StoreCheckout = ({ status, language, isDark, showToast, onChanged }: Props) => {
  const s = DICTS[language] ?? he;
  const storeName = nativePlatform() === 'ios' ? 'App Store' : 'Google Play';
  const appUserId = status.store.appUserId;
  const available = status.store.enabled && isStoreBillingAvailable();
  const isStorePlan = status.store.isStorePlan;
  const isPermanent = status.plan === 'pro' && !status.planExpiresAt;

  const [packages, setPackages] = useState<StorePackage[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'buy' | 'restore' | null>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const pkgs = await getStorePackages(appUserId);
      setPackages(pkgs);
      setSelectedId((cur) => cur ?? (pkgs.find((p) => p.kind === 'annual') ?? pkgs[0])?.id ?? null);
    } catch {
      setLoadFailed(true);
    }
  }, [appUserId]);

  useEffect(() => {
    if (available && !isStorePlan && !isPermanent) void load();
  }, [available, isStorePlan, isPermanent, load]);

  // השרת מאמת מול RevenueCat. אם ה-webhook עוד לא הגיע והחנות עוד מעבדת,
  // מנסים שוב כמה פעמים לפני שמודיעים שההפעלה תגיע בקרוב.
  const syncWithServer = async (): Promise<boolean> => {
    for (let i = 0; i < 3; i++) {
      try {
        const r = await subscriptionApi.syncStore();
        if (r.active) return true;
      } catch { /* ננסה שוב */ }
      await new Promise((res) => setTimeout(res, 1500));
    }
    return false;
  };

  const handleBuy = async () => {
    const pkg = packages?.find((p) => p.id === selectedId);
    if (!pkg) return;
    setBusy('buy');
    try {
      const outcome = await purchaseStorePackage(appUserId, pkg);
      if (outcome === 'cancelled') return;
      const active = await syncWithServer();
      showToast(active ? s.purchased : s.pendingActivation, active ? 'success' : 'info');
      await onChanged();
    } catch {
      showToast(s.error, 'error');
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async () => {
    setBusy('restore');
    try {
      await restoreStorePurchases(appUserId);
      const active = await syncWithServer();
      showToast(active ? s.restored : s.nothingToRestore, active ? 'success' : 'info');
      await onChanged();
    } catch {
      showToast(s.error, 'error');
    } finally {
      setBusy(null);
    }
  };

  const legalLinks = (
    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
      <Link href="/terms" underline="hover" sx={{ fontSize: 12, color: 'text.secondary' }}>{s.terms}</Link>
      <Link href="/privacy" underline="hover" sx={{ fontSize: 12, color: 'text.secondary' }}>{s.privacy}</Link>
    </Box>
  );

  const restoreButton = (
    <Button
      fullWidth variant="text" disabled={!!busy} onClick={handleRestore}
      sx={{ textTransform: 'none', fontWeight: 700, color: PRO_PURPLE, borderRadius: '12px' }}
    >
      {busy === 'restore' ? <CircularProgress size={18} sx={{ color: PRO_PURPLE }} /> : s.restore}
    </Button>
  );

  // מנוי קבוע שהוענק ידנית: אין מה לקנות.
  if (isPermanent) return null;

  // מנוי פעיל מהחנות: ניהול וביטול נעשים בחנות.
  if (isStorePlan) {
    return (
      <Box sx={cardSx(isDark)}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{s.storePlanActive.replace('{store}', storeName)}</Typography>
        <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
          {status.store.autoRenew ? s.storePlanRenews : s.storePlanCancelled}
        </Typography>
        <Button
          fullWidth variant="outlined" onClick={() => void openStoreSubscriptionManagement(appUserId)}
          sx={{ mt: 1.5, textTransform: 'none', fontWeight: 700, borderRadius: '12px', color: PRO_PURPLE, borderColor: PRO_PURPLE }}
        >
          {s.manage}
        </Button>
        {restoreButton}
      </Box>
    );
  }

  if (!available) {
    return (
      <Box sx={cardSx(isDark)}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center' }}>{s.unavailable}</Typography>
        {restoreButton}
      </Box>
    );
  }

  if (loadFailed || (packages && packages.length === 0)) {
    return (
      <Box sx={{ ...cardSx(isDark), textAlign: 'center' } as object}>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 1 }}>{s.loadError}</Typography>
        <Button onClick={() => void load()} sx={{ textTransform: 'none', fontWeight: 700, color: PRO_PURPLE }}>{s.retry}</Button>
        {restoreButton}
      </Box>
    );
  }

  if (!packages) {
    return (
      <Box sx={{ ...cardSx(isDark), display: 'flex', justifyContent: 'center', py: 4 } as object}>
        <CircularProgress size={26} sx={{ color: PRO_PURPLE }} />
      </Box>
    );
  }

  const labelFor = (p: StorePackage) => (p.kind === 'monthly' ? s.monthly : p.kind === 'annual' ? s.annual : p.title);
  const periodFor = (p: StorePackage) => (p.kind === 'monthly' ? s.perMonth : p.kind === 'annual' ? s.perYear : '');

  return (
    <>
      <Box sx={cardSx(isDark)}>
        <Typography sx={sectionLabelSx}>{s.planTitle}</Typography>
        <Box role="radiogroup" sx={{ display: 'grid', gridTemplateColumns: `repeat(${packages.length}, 1fr)`, gap: 1 }}>
          {packages.map((p) => {
            const selected = p.id === selectedId;
            return (
              <ButtonBase
                key={p.id}
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedId(p.id)}
                sx={{
                  position: 'relative', flexDirection: 'column', gap: 0.25,
                  minHeight: 92, px: 0.75, py: 1.5, borderRadius: '14px',
                  border: '2px solid', textAlign: 'center',
                  borderColor: selected ? PRO_PURPLE : (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.1)'),
                  bgcolor: selected ? (isDark ? 'rgba(124,58,237,0.16)' : 'rgba(124,58,237,0.07)') : 'transparent',
                  transition: 'border-color 0.2s, background-color 0.2s',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {selected && (
                  <CheckCircleRoundedIcon sx={{ position: 'absolute', top: 6, insetInlineEnd: 6, fontSize: 17, color: PRO_PURPLE }} />
                )}
                <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}>{labelFor(p)}</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800, lineHeight: 1.1, color: selected ? PRO_PURPLE : 'text.primary' }}>
                  {p.priceString}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{periodFor(p)}</Typography>
              </ButtonBase>
            );
          })}
        </Box>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1.5, lineHeight: 1.55 }}>{s.renewNote}</Typography>
      </Box>

      <Button variant="contained" fullWidth disabled={!!busy || !selectedId} onClick={handleBuy} sx={primaryCtaSx}>
        {busy === 'buy' ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : s.subscribe}
      </Button>

      {restoreButton}

      <Typography sx={{ fontSize: 11, color: 'text.disabled', lineHeight: 1.6, textAlign: 'center' }}>
        {s.autoRenewLegal.replace('{store}', storeName)}
      </Typography>
      {legalLinks}
    </>
  );
};
