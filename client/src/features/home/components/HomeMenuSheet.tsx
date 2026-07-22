import { Box, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { MENU_OPTIONS } from '../../../global/helpers';

interface HomeMenuSheetProps {
  closing: boolean;
  onClose: () => void;
  onSelectOption: (optionId: string) => void;
  t: (key: TranslationKeys) => string;
}

// תפריט תחתון "מה תרצה ליצור?" - נפתח מה-FAB, עם אנימציית כניסה/יציאה דו-כיוונית.
export const HomeMenuSheet = ({ closing, onClose, onSelectOption, t }: HomeMenuSheetProps) => {
  return (
    <>
      {/* רקע מאחור - fade-in/fade-out הדרגתי */}
      <Box
        onClick={onClose}
        sx={{
          position: 'fixed', inset: 0,
          bgcolor: 'rgba(0,0,0,0.5)',
          zIndex: 998,
          backdropFilter: 'blur(4px)',
          animation: closing
            ? 'menuBackdropOut 0.28s ease-in forwards'
            : 'menuBackdropIn 0.28s ease-out',
          '@keyframes menuBackdropIn': {
            from: { opacity: 0, backdropFilter: 'blur(0px)' },
            to: { opacity: 1, backdropFilter: 'blur(4px)' },
          },
          '@keyframes menuBackdropOut': {
            from: { opacity: 1, backdropFilter: 'blur(4px)' },
            to: { opacity: 0, backdropFilter: 'blur(0px)' },
          },
        }}
      />
      {/* התפריט - עולה מלמטה ובסגירה יורד חזרה. אנימציה דו-כיוונית */}
      <Box
        sx={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          bgcolor: 'background.paper',
          borderRadius: '24px 24px 0 0',
          p: 2, pb: 'calc(16px + env(safe-area-inset-bottom))',
          zIndex: 999,
          maxWidth: { xs: '100%', sm: 400 },
          mx: 'auto',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.15)',
          animation: closing
            ? 'menuSlideDown 0.28s cubic-bezier(0.4, 0, 0.6, 1) forwards'
            : 'menuSlideUp 0.36s cubic-bezier(0.34, 1.32, 0.64, 1)',
          '@keyframes menuSlideUp': {
            from: { transform: 'translateY(100%)', opacity: 0.9 },
            to: { transform: 'translateY(0)', opacity: 1 },
          },
          '@keyframes menuSlideDown': {
            from: { transform: 'translateY(0)', opacity: 1 },
            to: { transform: 'translateY(100%)', opacity: 0.9 },
          },
        }}
      >
        {/* כפתור X צף - חצי-חצי בקצה העליון של התפריט, באותו עיצוב כמו ה-FAB */}
        <Box
          role="button"
          tabIndex={0}
          aria-label="סגור"
          onClick={onClose}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClose(); }}
          sx={{
            position: 'absolute',
            top: -28,                                  // חצי הגובה של ה-X (56/2)
            left: '50%',
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            background: 'linear-gradient(135deg, #2DD4BF 0%, #14B8A6 50%, #0D9488 100%)',
            boxShadow: [
              '0 8px 22px rgba(20,184,166,0.5)',
              '0 3px 8px rgba(0,0,0,0.15)',
              'inset 0 1px 0 rgba(255,255,255,0.3)',
            ].join(', '),
            // מצב התחלה: + ממורכז. אחרי האנימציה: X (rotate 135°). שמירה על המרכוז.
            transform: 'translateX(-50%) rotate(135deg)',
            animation: 'fabRotateIn 0.42s cubic-bezier(0.34, 1.32, 0.64, 1)',
            '@keyframes fabRotateIn': {
              from: { transform: 'translateX(-50%) rotate(0deg)' },
              to: { transform: 'translateX(-50%) rotate(135deg)' },
            },
            '&:active': { opacity: 0.9 },
            '@media (max-width: 360px)': { width: 52, height: 52, top: -26 },
            '@media (max-width: 320px)': { width: 48, height: 48, top: -24 },
          }}
        >
          <AddIcon sx={{
            fontSize: 30,
            color: 'white',
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            '@media (max-width: 360px)': { fontSize: 28 },
            '@media (max-width: 320px)': { fontSize: 26 },
          }} />
        </Box>
        <Box sx={{ width: 36, height: 4, bgcolor: 'divider', borderRadius: '4px', mx: 'auto', mb: 1.5 }} />
        {/* ה-X להסגרה הוא ה-FAB עצמו (מסתובב 135° כשהתפריט פתוח) */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 4, mt: 2 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'text.primary' }}>{t('whatToCreate')}</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {MENU_OPTIONS.map((option) => (
            <Box
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                p: 1.5,
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                gap: 1.5,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                userSelect: 'none',
                '&:active': { bgcolor: 'action.hover' }
              }}
            >
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: option.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                {option.icon}
              </Box>
              <Box sx={{ flex: 1, textAlign: 'right' }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>{t(option.titleKey)}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t(option.descKey)}</Typography>
              </Box>
              <ChevronLeftIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            </Box>
          ))}
        </Box>
      </Box>
    </>
  );
};
