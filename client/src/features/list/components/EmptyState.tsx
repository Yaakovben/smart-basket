import { memo, useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import { haptic } from '../../../global/helpers';
import { IconTile } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';
import type { SavedList } from '../../../global/types';

// ===== Props =====
interface EmptyStateProps {
  filter: ListFilter;
  totalProducts: number;
  hasSearch?: boolean;
  onAddProduct?: () => void;
  onClearPurchased?: () => void;
  savedLists?: SavedList[];
  onApplySavedList?: (savedList: SavedList) => void;
}

// ===== קומפוננטה =====
export const EmptyState = memo(({ filter, totalProducts, hasSearch, savedLists = [], onApplySavedList }: EmptyStateProps) => {
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

  // הצעת "התחל מרשימה קבועה" - רק ברשימה ריקה לגמרי (טאב לקנות, בלי חיפוש).
  const wantsSavedLists = !hasSearch && filter === 'pending' && totalProducts === 0 && savedLists.length > 0 && !!onApplySavedList;

  // ההצעה נעלמת מעצמה אחרי כמה שניות - לא נשארת קבועה על המסך כל עוד
  // הרשימה ריקה (שיכול להיות המון זמן), רק "רמז" חולף כשנכנסים לרשימה חדשה.
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!wantsSavedLists) { setTimedOut(false); return; }
    const timer = window.setTimeout(() => setTimedOut(true), 8000);
    return () => window.clearTimeout(timer);
  }, [wantsSavedLists]);

  const showSavedLists = wantsSavedLists && !timedOut;

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
      minHeight: 'calc(var(--app-height, 100dvh) - 320px)',
      // כשמוצגות רשימות קבועות - pb גדול יותר דוחף את הבלוק המרכזי מעלה,
      // כדי שהצ'יפים לא ייחתכו ע"י ה-FAB (כפתור פלוס, fixed בתחתית). מספיק
      // אמין עכשיו כי קופסת הרשימות עצמה גובהה קבוע (גלילה אופקית בשורה
      // אחת, לא flexWrap) - לא גדל עם כמות הרשימות/אורך השמות כמו קודם.
      pb: showSavedLists
        ? 'calc(env(safe-area-inset-bottom, 0px) + 96px)'
        : 'calc(env(safe-area-inset-bottom, 0px) + 24px)',
    }}>
      {/* דמות ידידותית - אייקון מרכזי צף + פריטים מרחפים מסביב.
          מוקטנת כשמוצגות רשימות קבועות כדי לפנות מקום להצעה. */}
      <Box sx={{
        position: 'relative',
        width: showSavedLists ? { xs: 100, sm: 124 } : { xs: 140, sm: 180 },
        height: showSavedLists ? { xs: 100, sm: 124 } : { xs: 140, sm: 180 },
        mb: showSavedLists ? { xs: 1.25, sm: 2 } : { xs: 1.5, sm: 2.5 },
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
            fontSize: showSavedLists ? { xs: 42, sm: 54 } : { xs: 56, sm: 72 },
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
      {!showSavedLists && (
        <Typography sx={{ fontSize: { xs: 12.5, sm: 14 }, color: 'text.secondary', mb: { xs: 2, sm: 3 } }}>
          {config.description}
        </Typography>
      )}

      {showSavedLists && (
        <Box sx={{
          width: '100%', maxWidth: 360, mt: 1.5,
          p: 1.5, borderRadius: '16px',
          background: isDark
            ? 'linear-gradient(135deg, rgba(20,184,166,0.09), rgba(13,148,136,0.04))'
            : 'linear-gradient(135deg, rgba(20,184,166,0.055), rgba(13,148,136,0.025))',
          border: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.18)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.6, mb: 1.25, color: 'primary.main' }}>
            <PlaylistAddRoundedIcon sx={{ fontSize: 18 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{t('startFromSavedList')}</Typography>
          </Box>
          {/* גלילה אופקית בשורה אחת (לא flexWrap) - גובה הקופסה קבוע בלי
              תלות בכמות הרשימות הקבועות, כדי שלא תגדל ותיכנס לאזור ה-FAB
              (כפתור פלוס, fixed בתחתית) כשיש הרבה רשימות/שמות ארוכים. */}
          <Box sx={{
            display: 'flex', gap: 1, overflowX: 'auto', flexWrap: 'nowrap',
            justifyContent: savedLists.length > 3 ? 'flex-start' : 'center',
            mx: -1.5, px: 1.5, pb: 0.25,
            '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none',
            maskImage: 'linear-gradient(to left, transparent, black 12px, black calc(100% - 12px), transparent)',
            WebkitMaskImage: 'linear-gradient(to left, transparent, black 12px, black calc(100% - 12px), transparent)',
          }}>
            {savedLists.map(sl => (
              <Box
                key={sl.id}
                onClick={() => { haptic('light'); onApplySavedList!(sl); }}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0, cursor: 'pointer',
                  height: 38, pl: 0.5, pr: 1.5, borderRadius: '999px',
                  bgcolor: isDark ? 'rgba(20,184,166,0.14)' : 'rgba(20,184,166,0.1)',
                  transition: 'transform 0.12s, background-color 0.15s',
                  '&:active': { transform: 'scale(0.95)', bgcolor: isDark ? 'rgba(20,184,166,0.22)' : 'rgba(20,184,166,0.18)' },
                }}
              >
                <IconTile emoji={sl.emoji} seedId={sl.id} size={28} fontSize={14} variant="light" />
                <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'primary.main', whiteSpace: 'nowrap' }}>
                  {sl.name}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
      {/* כפתור ניקוי הוסר מטאב 'לקנות' - מופיע רק בטאב 'נקנו' */}
    </Box>
  );
});

EmptyState.displayName = 'EmptyState';
