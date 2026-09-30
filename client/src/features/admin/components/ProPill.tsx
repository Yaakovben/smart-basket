import { Box } from '@mui/material';
import { PRO_GRADIENT, PRO_GOLD } from '../../subscription/subscription.styles';
import type { ProKind } from '../helpers/adminDashboardHelpers';

// תגית Pro אחידה לכל דף המנהל: סגלגלה, בגרדיאנט הסגול עם הכוכב הזהוב של המנוי.
// kind מוסיף רמז קטן לסוג המנוי (מתנה, חנות, קבוע) באותה תגית, בלי תגית נוספת.
const KIND_MARK: Record<ProKind, string> = {
  store: '✦ ',
  granted: '✦ ',
  trial: '🎁 ',
  permanent: '∞ ',
};

interface Props {
  kind?: ProKind | null;
  // תגית "חינמי" אפורה כשאין Pro (למשל בכרטיס פרטי משתמש)
  showFree?: boolean;
  isDark?: boolean;
  size?: 'sm' | 'md';
}

export const ProPill = ({ kind, showFree = false, isDark = false, size = 'sm' }: Props) => {
  const isPro = !!kind;
  if (!isPro && !showFree) return null;
  const sm = size === 'sm';
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', flexShrink: 0,
      height: sm ? 18 : 22, px: sm ? 0.9 : 1.2, borderRadius: '999px',
      fontSize: sm ? 10 : 11.5, fontWeight: 800, letterSpacing: 0.3, lineHeight: 1, whiteSpace: 'nowrap',
      background: isPro ? PRO_GRADIENT : undefined,
      bgcolor: isPro ? undefined : (isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6'),
      color: isPro ? '#fff' : (isDark ? '#9CA3AF' : '#6B7280'),
      boxShadow: isPro ? '0 1px 5px rgba(91,33,182,0.35)' : 'none',
    }}>
      {isPro
        ? <><Box component="span" sx={{ color: PRO_GOLD }}>{KIND_MARK[kind!]}</Box>PRO</>
        : 'Free'}
    </Box>
  );
};

