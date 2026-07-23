import { Box, Typography, Link } from '@mui/material';

interface PriceComparisonFooterProps {
  sourceUrl: string;
  sourceName: string;
}

// FOOTER - מטא קומפקטית: מקור המידע + דיווח על טעות
export const PriceComparisonFooter = ({ sourceUrl, sourceName }: PriceComparisonFooterProps) => (
  <Box sx={{
    mt: 1.5, pt: 1, px: 0.5,
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5,
  }}>
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
      מקור:{' '}
      <Link href={sourceUrl} target="_blank" rel="noopener" sx={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
        {sourceName} ↗
      </Link>
    </Typography>
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>·</Typography>
    <Link
      href={`mailto:smartbasket129@gmail.com?subject=${encodeURIComponent('דיווח על מידע שגוי בהשוואת מחירים')}&body=${encodeURIComponent('שלום,\n\nראיתי מידע שנראה לא נכון:\n\n[פרט: רשת, סניף, מחיר]\n\nתודה!')}`}
      sx={{ fontSize: 9.5, fontWeight: 600, color: '#DC2626', textDecoration: 'none' }}
    >
      🚩 דווח
    </Link>
    <Box sx={{ flex: 1 }} />
    <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontStyle: 'italic' }}>
      מומלץ לאמת בסניף
    </Typography>
  </Box>
);
