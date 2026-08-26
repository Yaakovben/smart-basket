import { Box, Typography, Link } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';

interface PriceComparisonFooterProps {
  sourceUrl: string;
  sourceName: string;
}

// FOOTER - מטא קומפקטית: מקור המידע + דיווח על טעות
export const PriceComparisonFooter = ({ sourceUrl, sourceName }: PriceComparisonFooterProps) => {
  const { t } = useSettings();
  return (
  <Box sx={{
    mt: 1.5, pt: 1, px: 0.5,
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5,
  }}>
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
      {t('sourceLabel')}{' '}
      <Link href={sourceUrl} target="_blank" rel="noopener" sx={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
        {sourceName} ↗
      </Link>
    </Typography>
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>·</Typography>
    <Link
      href={`mailto:smartbasket129@gmail.com?subject=${encodeURIComponent(t('reportEmailSubject'))}&body=${encodeURIComponent(t('reportEmailBody'))}`}
      sx={{ fontSize: 9.5, fontWeight: 600, color: '#DC2626', textDecoration: 'none' }}
    >
      {t('reportLabel')}
    </Link>
    <Box sx={{ flex: 1 }} />
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontStyle: 'italic' }}>
      {t('verifyInStoreHint')}
    </Typography>
  </Box>
  );
};
