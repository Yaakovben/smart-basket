import type { ComponentType } from 'react';
import { Box } from '@mui/material';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';
import { proSoftPillSx } from '../../subscription/subscription.styles';
import type { ProKind } from '../helpers/adminDashboardHelpers';

// תגית Pro אחידה לכל דף המנהל: קומפקטית ונקייה, רקע סגול רך וטקסט כהה.
// kind מוסיף אייקון קטן לסוג המנוי (מתנה, קבוע) באותה תגית, בלי תגית נוספת.
const KIND_ICON: Partial<Record<ProKind, ComponentType<{ sx?: object }>>> = {
  trial: CardGiftcardRoundedIcon,
  permanent: AllInclusiveRoundedIcon,
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
  const Icon = kind ? KIND_ICON[kind] : undefined;
  return (
    <Box component="span" sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.35, flexShrink: 0,
      height: sm ? 18 : 22, px: sm ? 0.75 : 1, borderRadius: '999px',
      fontSize: sm ? 9.5 : 11, fontWeight: 800, letterSpacing: 0.5, lineHeight: 1, whiteSpace: 'nowrap',
      ...(isPro
        ? proSoftPillSx(isDark)
        : { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6', color: isDark ? '#9CA3AF' : '#6B7280', border: '1px solid transparent' }),
    }}>
      {Icon && <Icon sx={{ fontSize: sm ? 11 : 13 }} />}
      {isPro ? 'PRO' : 'Free'}
    </Box>
  );
};
