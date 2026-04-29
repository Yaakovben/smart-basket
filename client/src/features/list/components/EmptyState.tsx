import { memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import PlaylistRemoveIcon from '@mui/icons-material/PlaylistRemove';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';

// ===== Props =====
interface EmptyStateProps {
  filter: ListFilter;
  totalProducts: number;
  hasSearch?: boolean;
  onAddProduct?: () => void;
  onClearPurchased?: () => void;
}

// ===== קומפוננטה =====
export const EmptyState = memo(({ filter, totalProducts, hasSearch, onClearPurchased }: EmptyStateProps) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  // קביעת סוג מצב:
  // - 'search': חיפוש ללא תוצאות
  // - 'allDone': טאב ממתינים עם מוצרים (הכל נקנה)
  // - 'noPurchased': טאב נקנו ללא פריטים
  // - 'noProducts': אין מוצרים בכלל
  const isAllDone = filter === 'pending' && totalProducts > 0;
  const isPurchasedEmpty = filter === 'purchased';

  // תצורת תצוגה לפי מצב
  const getDisplayConfig = () => {
    if (hasSearch) {
      return {
        icon: '🔍',
        gradient: isDark ? 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))' : 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
        title: t('noSearchResults'),
        description: t('noSearchResultsDesc')
      };
    }
    if (isAllDone) {
      return {
        icon: '🎉',
        gradient: isDark ? 'linear-gradient(135deg, rgba(20,184,166,0.15), rgba(16,185,129,0.1))' : 'linear-gradient(135deg, #CCFBF1, #99F6E4)',
        title: t('allDone'),
        description: t('allDoneDesc')
      };
    }
    if (isPurchasedEmpty) {
      return {
        icon: '🛒',
        gradient: isDark ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(129,140,248,0.1))' : 'linear-gradient(135deg, #E0E7FF, #C7D2FE)',
        title: t('noPurchasedProducts'),
        description: t('noPurchasedProductsDesc')
      };
    }
    return {
      icon: '📦',
      gradient: 'action.hover',
      title: t('noProducts'),
      description: t('noProductsDesc')
    };
  };

  const config = getDisplayConfig();

  // פריטים מרחפים סביב הדמות - שונים לפי סוג ה-empty state
  const floatingItems = hasSearch
    ? ['❓', '🔎', '💭', '✨']
    : isAllDone
      ? ['🎊', '⭐', '✅', '💚']
      : isPurchasedEmpty
        ? ['📦', '🛍️', '✨', '💫']
        : ['🥕', '🍞', '🥛', '🍎'];

  return (
    <Box sx={{
      textAlign: 'center',
      p: { xs: 2.5, sm: 5 },
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      // ממלא את כל השטח הפנוי באלמנט ההורה - האייקון יושב באמת באמצע אנכי
      // במקום לתפוס רק minHeight ולהיתקע למעלה.
      flex: 1,
      minHeight: { xs: '60vh', sm: '65vh' },
    }}>
      {/* דמות ידידותית - אייקון מרכזי צף + פריטים מרחפים מסביב */}
      <Box sx={{
        position: 'relative',
        width: { xs: 140, sm: 180 },
        height: { xs: 140, sm: 180 },
        mb: { xs: 1.5, sm: 2.5 },
      }}>
        <Box sx={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: config.gradient,
          animation: 'esPulse 3s ease-in-out infinite',
          '@keyframes esPulse': {
            '0%, 100%': { transform: 'scale(1)' },
            '50%': { transform: 'scale(1.05)' },
          },
        }} />
        <Box
          sx={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: { xs: 56, sm: 72 },
            animation: 'esFloat 3s ease-in-out infinite',
            '@keyframes esFloat': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-6px)' },
            },
          }}
          role="img"
          aria-label={config.title}
        >
          {config.icon}
        </Box>
        {floatingItems.map((emoji, i) => (
          <Box key={i} sx={{
            position: 'absolute',
            fontSize: { xs: 18, sm: 22 },
            top: ['10%', '12%', '70%', '68%'][i],
            left: ['10%', '78%', '8%', '78%'][i],
            animation: `esItem 2.8s ease-in-out ${i * 0.3}s infinite`,
            '@keyframes esItem': {
              '0%, 100%': { transform: 'translateY(0) rotate(-5deg)', opacity: 0.85 },
              '50%': { transform: 'translateY(-8px) rotate(5deg)', opacity: 1 },
            },
          }}>
            {emoji}
          </Box>
        ))}
      </Box>
      <Typography sx={{ fontSize: { xs: 15, sm: 18 }, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
        {config.title}
      </Typography>
      <Typography sx={{ fontSize: { xs: 12.5, sm: 14 }, color: 'text.secondary', mb: { xs: 2, sm: 3 } }}>
        {config.description}
      </Typography>
      {/* כפתור ניקוי כשהכל נקנה */}
      {isAllDone && onClearPurchased && (
        <Button
          variant="outlined"
          onClick={() => { haptic('light'); onClearPurchased(); }}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            px: { xs: 2.5, sm: 3 },
            py: { xs: 1, sm: 1.25 },
            fontSize: { xs: 13, sm: 14 },
            borderColor: 'warning.main',
            color: 'warning.main',
            '&:hover': { borderColor: 'warning.dark', bgcolor: 'rgba(245,158,11,0.04)' }
          }}
        >
          <PlaylistRemoveIcon sx={{ fontSize: { xs: 18, sm: 20 } }} />
          <span>{t('clearPurchased')}</span>
        </Button>
      )}
      {/* כפתור הוספה לא מוצג כאן, ה-FAB הקבוע למטה תמיד זמין */}
    </Box>
  );
});

EmptyState.displayName = 'EmptyState';
