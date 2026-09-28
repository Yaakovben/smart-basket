import { Box, Typography } from '@mui/material';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import { formatILS } from '../../../../global/helpers';
import type { ScanPromo } from '../../types/priceComparison.types';
import type { PriceScanStrings } from '../../priceScan.strings';

export const PROMO_COLOR = '#DB2777';

// תווית מבצע: "3 ב-₪10", ולמועדון או לחלק מהסניפים עם הסבר קצר
export const PromoChip = ({ s, promo, someBranches = false, onDark = false }: {
  s: PriceScanStrings;
  promo: ScanPromo;
  someBranches?: boolean;
  onDark?: boolean;
}) => {
  const extra = [promo.clubOnly ? s.promoClub : null, someBranches ? s.promoSomeBranches : null].filter(Boolean).join(' · ');
  return (
    <Box
      title={promo.description}
      sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.25, borderRadius: '8px', maxWidth: '100%',
        bgcolor: onDark ? 'rgba(255,255,255,0.2)' : 'rgba(219,39,119,0.1)',
        color: onDark ? '#fff' : PROMO_COLOR,
      }}
    >
      <LocalOfferRoundedIcon sx={{ fontSize: 13, flexShrink: 0 }} />
      <Typography component="span" sx={{ fontSize: 11.5, fontWeight: 800, whiteSpace: 'nowrap' }}>
        {s.promo(promo.minQty, formatILS(promo.price, 2))}
      </Typography>
      {extra && (
        <Typography component="span" sx={{ fontSize: 10.5, fontWeight: 600, opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          · {extra}
        </Typography>
      )}
    </Box>
  );
};
