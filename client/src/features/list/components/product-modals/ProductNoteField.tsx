import { memo, useState, useEffect } from 'react';
import { Box, Typography, TextField } from '@mui/material';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import { haptic } from '../../../../global/helpers';
import { paperNoteSx, PAPER_NOTE, addChipSx } from '../../helpers/paperNote';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== שדה הערה - משותף ל-Add ול-Edit =====
// עיצוב "פתק נייר" (paperNoteSx) - אותה שפה בדיוק כמו הפתק בשורת הרשימה
// ובמסך פרטי המוצר: סרט washi למעלה, פינה מקופלת, הטיה כמעט-שטוחה,
// קווי מחברת עדינים.
interface Props {
  value: string;
  onChange: (v: string) => void;
  // מודיע להורה (AddProductModal/EditProductModal) כשהפתק נפתח/נסגר, כדי
  // שה-grid יוכל להרחיב את עמודת ההערה על חשבון עמודת התמונה (ראו שם) -
  // אין דרך אחרת להורה לדעת את מצב ה-expanded הפנימי כאן.
  onOpenChange?: (open: boolean) => void;
}

export const ProductNoteField = memo(({ value, onChange, onOpenChange }: Props) => {
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const ink = isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight;       // אייקון + תוויות + מונה
  const noteText = isDark ? PAPER_NOTE.textDark : PAPER_NOTE.textLight; // גוף הטקסט שנכתב
  const inkMuted = isDark ? 'rgba(185,240,230,0.65)' : 'rgba(15,118,110,0.7)';
  const [expanded, setExpanded] = useState(value.length > 0);
  const isOpen = expanded || value.length > 0;

  useEffect(() => { onOpenChange?.(isOpen); }, [isOpen, onOpenChange]);

  const closeAndClear = () => {
    haptic('light');
    onChange('');
    setExpanded(false);
  };

  return (
    // תא בעמודת ה-grid (ראו AddProductModal/EditProductModal) - חצי קבוע
    // מהרוחב, לא תלוי ב"הוסף תמונה". סגור - justifySelf:start כדי שהצ'יפ
    // יישאר בגודלו הטבעי (לא יימתח לכל העמודה). פתוח - stretch כדי שהפתק
    // ינצל את כל החצי שלו, בלי לדחוף את התמונה לשורה חדשה.
    <Box sx={{ minWidth: 0, justifySelf: isOpen ? 'stretch' : 'start' }}>
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
        </Box>
      ) : (
        // מצב פתוח - "פתק נייר" נקי (paperNoteSx 'field'): משטח תכלת, מסגרת
        // דקה, קווי מחברת חיוורים ברקע. בלי קיפול, בלי סרט washi.
        <Box sx={{
          ...paperNoteSx('field', isDark),
          mt: 2, mb: 0.5,
          px: 1.5, pt: 1.6, pb: 1.1,
        }}>
          {/* כפתור סגירה - עיגול בפינה העליונה-שמאלית (הפיזית) של הפתק,
              בולט קצת החוצה (ב-'field' אין overflow:hidden). */}
          <Box
            role="button"
            aria-label={t('closeNoteAria')}
            onClick={closeAndClear}
            sx={{
              position: 'absolute', top: -12, left: -12, zIndex: 3,
              width: 30, height: 30, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: isDark ? '#1E293B' : '#FFFFFF',
              color: ink,
              border: '1.5px solid',
              borderColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
              boxShadow: '0 1.5px 6px rgba(15,118,110,0.28)',
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.12s, background-color 0.15s',
              '&:active': { transform: 'scale(0.88)' },
              '&:hover': { bgcolor: isDark ? '#293548' : '#F0FDFA' },
            }}
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </Box>

          {/* מונה תווים - בפינה הימנית העליונה (מול ה-X שבשמאל). top/right
              חייבים לפצות על ה-border-radius של הפתק (RADIUS.field=12 ב-
              paperNote.ts) - 'field' בכוונה בלי overflow:hidden (כדי שכפתור
              הסגירה יבצבץ מהפינה השנייה), אז כל תיבה שמתחילה קרוב מדי לפינה
              המעוגלת "בורחת" חזותית מחוץ לקו העקומה במקום להיחתך אליו. 14px
              משני הצדדים משאיר מרווח ביטחון מעל ה-12px רדיוס. */}
          <Typography sx={{
            position: 'absolute', top: 14, right: 14, zIndex: 2,
            fontSize: 10, fontWeight: 700,
            color: value.length >= 180 ? '#DC2626' : ink,
            opacity: value.length >= 180 ? 1 : 0.7,
            fontVariantNumeric: 'tabular-nums', letterSpacing: 0.3,
          }}>
            {value.length}/200
          </Typography>

          <Box sx={{ position: 'relative', zIndex: 2, mb: 0.6, pr: 5, lineHeight: 1.15 }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 800, color: ink,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {t('note')}:
            </Typography>
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
              // חיווי גלילה בצד - סרגל דק צבוע (לא חץ מרפרף) - אותה שפה
              // בדיוק כמו הפתק במסך פרטי המוצר (ProductDetailsModal).
              '& textarea::-webkit-scrollbar': { width: 4 },
              '& textarea::-webkit-scrollbar-thumb': {
                backgroundColor: isDark ? PAPER_NOTE.edgeDark : PAPER_NOTE.edgeLight,
                borderRadius: 4,
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
});
ProductNoteField.displayName = 'ProductNoteField';
