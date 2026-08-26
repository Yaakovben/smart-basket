import { memo, useState } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== שדה הערה - משותף ל-Add ול-Edit =====
// עיצוב פתק יצירתי: סלוטייפ באמצע למעלה, פינה מקופלת בשמאל-עליון,
// הטיה קלה, קווי מחברת עדינים, וגופן Caveat איטלי.
export const ProductNoteField = memo(({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(value.length > 0);
  const isOpen = expanded || value.length > 0;

  const closeAndClear = () => {
    haptic('light');
    onChange('');
    setExpanded(false);
  };

  return (
    <Box sx={{ mb: 1.25 }}>
      {!isOpen ? (
        // מצב סגור - פתק מיני מקופל, יצירתי וקטן עם הטיה
        <Box
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); setExpanded(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('light'); setExpanded(true); } }}
          sx={{
            position: 'relative',
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            py: 0.55, pl: 1.1, pr: 1.4,
            cursor: 'pointer', userSelect: 'none',
            WebkitTapHighlightColor: 'transparent',
            color: '#0D9488',
            bgcolor: '#E0F7F4',
            transform: 'rotate(-1.2deg)',
            boxShadow: '0 1.5px 4px rgba(20,184,166,0.18)',
            transition: 'all 0.18s',
            // פינה מקופלת בצד שמאל-עליון
            clipPath: 'polygon(7px 0, 100% 0, 100% 100%, 0 100%, 0 7px)',
            '&::before': {
              content: '""',
              position: 'absolute', top: 0, left: 0,
              width: 8, height: 8,
              bgcolor: 'rgba(13,148,136,0.25)',
              clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
            },
            '&:hover': { bgcolor: '#CCF1EC', transform: 'rotate(-0.6deg) translateY(-1px)' },
          }}
        >
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontStyle: 'italic' }}>
            {t('addNote')}
          </Typography>
          {/* תג + עגול בסוף הצ'יפ (צד שמאל ב-RTL) - מבהיר שזה כפתור הוספה לחיץ */}
          <Box sx={{
            width: 14, height: 14, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: '#0D9488', color: '#fff',
            fontSize: 11, fontWeight: 800, lineHeight: 1,
          }}>+</Box>
        </Box>
      ) : (
        // מצב פתוח - גרסה מבוגרת ומלוטשת: סרט washi עדין במקום סלוטייפ מקווקו,
        // הטיה כמעט-שטוחה (-0.15deg), גופן sans-serif מקצועי, ריווח בין X לטקסט.
        <Box sx={{
          position: 'relative',
          mt: 2, mb: 0.5,
          px: 1.5, pt: 1.6, pb: 1.1,
          backgroundImage: 'linear-gradient(180deg, #F0FDFA 0%, #E6F9F5 100%)',
          transform: 'rotate(-0.15deg)',
          border: '1px solid rgba(20,184,166,0.18)',
          boxShadow: [
            'inset 0 1px 0 rgba(255,255,255,0.85)',
            '0 1px 2px rgba(15,118,110,0.06)',
            '0 6px 16px rgba(20,184,166,0.10)',
            '0 16px 32px rgba(15,118,110,0.05)',
          ].join(', '),
          clipPath: 'polygon(16px 0, 100% 0, 100% 100%, 0 100%, 0 16px)',
          // קווי מחברת מאוד עדינים ברקע
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(transparent 0, transparent 23px, rgba(20,184,166,0.06) 23px, rgba(20,184,166,0.06) 24px)',
            pointerEvents: 'none',
          },
          // משולש פינה מקופלת בשמאל-עליון
          '&::before': {
            content: '""', position: 'absolute', top: 0, left: 0,
            width: 18, height: 18,
            bgcolor: 'rgba(13,148,136,0.18)',
            clipPath: 'polygon(0 0, 100% 100%, 0 100%)',
            zIndex: 1,
          },
        }}>
          {/* סרט washi עדין באמצע למעלה - מינימליסטי, בלי קווים מקווקווים */}
          <Box sx={{
            position: 'absolute', top: -6, left: '50%',
            transform: 'translateX(-50%) rotate(-1deg)',
            width: 56, height: 10,
            backgroundImage: 'linear-gradient(180deg, rgba(20,184,166,0.45) 0%, rgba(13,148,136,0.55) 100%)',
            borderRadius: '1px',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 2px rgba(15,118,110,0.2)',
            zIndex: 2,
          }} />
          <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 0.7, mb: 0.6 }}>
            <Box sx={{ flex: 1, lineHeight: 1.15 }}>
              <Typography sx={{
                fontSize: 10, fontWeight: 800, color: '#0F766E',
                letterSpacing: 1, textTransform: 'uppercase',
              }}>
                {t('note')}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: 'rgba(15,118,110,0.7)', fontWeight: 500, mt: 0.15 }}>
                {t('noteHintKosherTypeBrand')}
              </Typography>
            </Box>
            <Box sx={{
              px: 0.7, py: 0.15, borderRadius: '999px',
              bgcolor: value.length >= 180 ? 'rgba(239,68,68,0.10)' : 'rgba(20,184,166,0.10)',
              border: '1px solid',
              borderColor: value.length >= 180 ? 'rgba(239,68,68,0.3)' : 'rgba(20,184,166,0.22)',
            }}>
              <Typography sx={{
                fontSize: 9.5, fontWeight: 700,
                color: value.length >= 180 ? '#DC2626' : '#0F766E',
                fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3,
              }}>
                {value.length}/200
              </Typography>
            </Box>
            {/* רווח 1.25 בין הספירה ל-X כדי שלא יהיו דבוקים */}
            <Box
              role="button"
              aria-label={t('closeNoteAria')}
              onClick={closeAndClear}
              sx={{
                ml: 1.25,
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#0F766E',
                cursor: 'pointer', userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                fontSize: 12, fontWeight: 700, lineHeight: 1,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(20,184,166,0.14)', color: '#0D9488' },
              }}
            >
              ✕
            </Box>
          </Box>
          <TextField
            fullWidth
            multiline
            minRows={1}
            maxRows={3}
            size="small"
            autoFocus={expanded && value.length === 0}
            value={value}
            onChange={e => onChange(e.target.value.slice(0, 200))}
            placeholder={t('productNotePlaceholder')}
            inputProps={{ maxLength: 200 }}
            sx={{
              position: 'relative', zIndex: 2,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'transparent',
                fontSize: 13.5,
                fontWeight: 500,
                color: '#134E4A',
                py: 0.1,
                '& fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
              '& textarea::placeholder': {
                color: 'rgba(15,118,110,0.5)',
                opacity: 1,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
});
ProductNoteField.displayName = 'ProductNoteField';
