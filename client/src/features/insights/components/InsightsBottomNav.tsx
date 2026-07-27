import { Box, Typography } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import InsightsIcon from '@mui/icons-material/Insights';
import { haptic } from '../../../global/helpers';

interface InsightsBottomNavProps {
  isDark: boolean;
  onNavigateHome: () => void;
  t: (key: string) => string;
}

// בר ניווט תחתון - זהה בעיצוב לבר של הבית, אך ללא FAB/portal (תובנות אינו
// מציג פעולת יצירה). "בית" מנווט חזרה, "תובנות" מודגש (אנחנו כאן).
export const InsightsBottomNav = ({ isDark, onNavigateHome, t }: InsightsBottomNavProps) => {
  return (
    <Box sx={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 1000,
      bgcolor: 'background.paper',
      borderTop: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      pb: 0,
      boxShadow: isDark
        ? '0 -8px 24px rgba(0,0,0,0.4), 0 -2px 6px rgba(0,0,0,0.25)'
        : '0 -8px 24px rgba(0,0,0,0.08), 0 -2px 6px rgba(0,0,0,0.04)',
    }}>
      <Box sx={{
        width: '100%',
        maxWidth: { xs: '100%', sm: 500, md: 600 },
        mx: 'auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: { xs: 1, sm: 1.5 },
        py: { xs: 0.6, sm: 0.85 },
        px: { xs: 2.5, sm: 3.5 },
        minHeight: 50,
        '@media (max-width: 360px)': { py: 0.5, px: 2, minHeight: 46 },
        '@media (max-width: 320px)': { py: 0.4, px: 1.5, minHeight: 42 },
      }}>
        {/* בית - לא מודגש */}
        <Box
          onPointerDown={(e) => {
            (e.currentTarget as HTMLElement).blur();
            haptic('light');
            onNavigateHome();
          }}
          aria-label={t('home')}
          sx={{
            flex: 1, maxWidth: 110,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 0.3, minHeight: 40, py: 0.35,
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
            outline: 'none',
            transition: 'opacity 0.12s ease',
            '&:active': { opacity: 0.6 },
          }}
        >
          <HomeIcon sx={{ fontSize: 24, color: 'text.primary', opacity: 0.55 }} />
          <Box sx={{ width: 18, height: 3, mt: 0.1 }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.primary', opacity: 0.65, letterSpacing: 0.2, lineHeight: 1, mt: 0.15 }}>
            {t('home')}
          </Typography>
        </Box>

        {/* spacer - שומר על אותו מרווח אמצעי כמו בבית (איפה שיש FAB),
            כך שהטאבים יושבים באותו מיקום אופקי בדיוק. */}
        <Box sx={{ width: 64, flexShrink: 0, '@media (max-width: 360px)': { width: 58 }, '@media (max-width: 320px)': { width: 52 } }} />

        {/* תובנות - מודגש (אנחנו כאן) */}
        <Box
          aria-label={t('insights')}
          sx={{
            flex: 1, maxWidth: 110,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 0.3, minHeight: 40, py: 0.35,
            userSelect: 'none', cursor: 'default',
            WebkitTapHighlightColor: 'transparent', outline: 'none',
          }}
        >
          <InsightsIcon sx={{ fontSize: 24, color: '#0D9488' }} />
          {/* פס מוארך מתחת לאייקון מסמן "פעיל", עם אנימציית "מתיחה" בכניסה -
              זהה לזו שב-HomeBottomNav, כדי שההתנהגות תהיה עקבית בין שני הטאבים. */}
          <Box sx={{
            width: 18, height: 3, borderRadius: '2px',
            backgroundImage: 'linear-gradient(90deg, #14B8A6, #0D9488)',
            boxShadow: '0 1px 3px rgba(20,184,166,0.4)',
            mt: 0.1,
            animation: 'tabIndicatorIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            '@keyframes tabIndicatorIn': {
              from: { width: 0, opacity: 0 },
              to: { width: 18, opacity: 1 },
            },
          }} />
          <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#0D9488', letterSpacing: 0.2, lineHeight: 1, mt: 0.15 }}>
            {t('insights')}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
