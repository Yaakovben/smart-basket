import { memo, useState } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import { haptic } from '../../../../global/helpers';
import { paperNoteSx, PAPER_NOTE, addChipSx } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== שדה הערה - משותף ל-Add ול-Edit =====
// עיצוב "פתק נייר" (paperNoteSx) - אותה שפה בדיוק כמו הפתק בשורת הרשימה
// ובמסך פרטי המוצר: סרט washi למעלה, פינה מקופלת, הטיה כמעט-שטוחה,
// קווי מחברת עדינים.
export const ProductNoteField = memo(({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const ink = isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight;       // אייקון + תוויות + מונה
  const noteText = isDark ? PAPER_NOTE.textDark : PAPER_NOTE.textLight; // גוף הטקסט שנכתב
  const inkMuted = isDark ? 'rgba(185,240,230,0.65)' : 'rgba(15,118,110,0.7)';
  const [expanded, setExpanded] = useState(value.length > 0);
  const isOpen = expanded || value.length > 0;

  const closeAndClear = () => {
    haptic('light');
    onChange('');
    setExpanded(false);
  };

  return (
    // flexBasis: כשסגור - צ'יפ צר שיושב בשורה אחת ליד "הוסף תמונה";
    // כשפתוח - תופס שורה מלאה וה"הוסף תמונה" יורד לשורה מתחת.
    <Box sx={{ flexBasis: isOpen ? '100%' : 'auto', flexGrow: 0, minWidth: 0 }}>
      {!isOpen ? (
        // מצב סגור - צ'יפ פתק מקופל (addChipSx - זהה לחלוטין ל"הוסף תמונה")
        <Box
          role="button"
          tabIndex={0}
          onClick={() => { haptic('light'); setExpanded(true); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { haptic('light'); setExpanded(true); } }}
          sx={{ ...addChipSx(isDark), cursor: 'pointer' }}
        >
          <EditNoteRoundedIcon sx={{ fontSize: 15 }} />
          <Typography sx={{ fontSize: 11.5, fontWeight: 700, fontStyle: 'italic' }}>
            {t('addNote')}
          </Typography>
          {/* תג + עגול בסוף הצ'יפ (צד שמאל ב-RTL) - מבהיר שזה כפתור הוספה לחיץ */}
          <Box sx={{
            width: 14, height: 14, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: ink, color: isDark ? '#0b1220' : '#fff',
            fontSize: 11, fontWeight: 800, lineHeight: 1,
          }}>+</Box>
        </Box>
      ) : (
        // מצב פתוח - "פתק נייר" מלא (paperNoteSx 'field') עם סרט washi עדין
        // באמצע למעלה וקווי מחברת ברקע.
        <Box sx={{
          ...paperNoteSx('field', isDark),
          mt: 2, mb: 0.5,
          px: 1.5, pt: 1.6, pb: 1.1,
          boxShadow: isDark
            ? '0 6px 16px rgba(0,0,0,0.35)'
            : [
                'inset 0 1px 0 rgba(255,255,255,0.85)',
                '0 1px 2px rgba(15,118,110,0.06)',
                '0 6px 16px rgba(20,184,166,0.10)',
                '0 16px 32px rgba(15,118,110,0.05)',
              ].join(', '),
          // קווי מחברת מאוד עדינים ברקע
          '&::after': {
            content: '""', position: 'absolute', inset: 0,
            backgroundImage: 'repeating-linear-gradient(transparent 0, transparent 23px, rgba(20,184,166,0.06) 23px, rgba(20,184,166,0.06) 24px)',
            pointerEvents: 'none',
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
                fontSize: 10, fontWeight: 800, color: ink,
                letterSpacing: 1, textTransform: 'uppercase',
              }}>
                {t('note')}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: inkMuted, fontWeight: 500, mt: 0.15 }}>
                {t('noteHintKosherTypeBrand')}
              </Typography>
            </Box>
            {/* מונה תווים - טקסט פשוט בגוון הפתק (לא שבב מעוגל שנלחם עם
                שפת הנייר). מסמן אדום כשמתקרבים לגבול. */}
            <Typography sx={{
              fontSize: 10, fontWeight: 700,
              color: value.length >= 180 ? '#DC2626' : ink,
              opacity: value.length >= 180 ? 1 : 0.7,
              fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3,
              flexShrink: 0,
            }}>
              {value.length}/200
            </Typography>
            {/* רווח 1.25 בין הספירה ל-X כדי שלא יהיו דבוקים */}
            <Box
              role="button"
              aria-label={t('closeNoteAria')}
              onClick={closeAndClear}
              sx={{
                ml: 1.25,
                width: 22, height: 22, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: ink,
                cursor: 'pointer', userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
                fontSize: 12, fontWeight: 700, lineHeight: 1,
                transition: 'all 0.15s',
                '&:hover': { bgcolor: 'rgba(20,184,166,0.14)' },
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
                color: noteText,
                py: 0.1,
                '& fieldset': { border: 'none' },
                '&.Mui-focused fieldset': { border: 'none' },
              },
              '& textarea::placeholder': {
                color: inkMuted,
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
