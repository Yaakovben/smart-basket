import { memo, useState, useEffect, useRef, useCallback } from 'react';
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

// גובה קבוע לפתק במצב פתוח - זהה בערך לגובה הכולל של עמודת התמונה
// ב-ProductImageField (תווית ~15px + gap 4.8px + תמונה 112px). לא מיובא
// משם ישירות (קובץ אחר, בלי קבוע משותף כרגע) - אם גובה התמונה שם משתנה,
// יש לעדכן גם כאן כדי ששתי העמודות בגריד יישארו מאוזנות.
const NOTE_FIELD_HEIGHT = 132;

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
  const ink = isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight;       // אייקון + תוויות
  const noteText = isDark ? PAPER_NOTE.textDark : PAPER_NOTE.textLight; // גוף הטקסט שנכתב
  const inkMuted = isDark ? 'rgba(185,240,230,0.65)' : 'rgba(15,118,110,0.7)';
  const [expanded, setExpanded] = useState(value.length > 0);
  const isOpen = expanded || value.length > 0;

  useEffect(() => { onOpenChange?.(isOpen); }, [isOpen, onOpenChange]);

  // חיווי גלילה עצמאי - סרגל דק בצד שמופיע *מיד* כשההערה ארוכה מגובה השדה
  // (סרגל ה-textarea הנייטיב מתחבא ב-iOS/מובייל). ה-thumb מתעדכן *ישירות
  // ב-DOM* דרך ref (בלי setState / בלי transition) ומסונכרן ל-rAF - ככה
  // הוא נצמד לאצבע 1:1 בלי "דיליי" ובלי רעד.
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const thumbRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [over, setOver] = useState(false);

  const paintThumb = useCallback(() => {
    const el = taRef.current;
    const thumb = thumbRef.current;
    if (!el) return;
    const { scrollHeight: sh, clientHeight: ch, scrollTop: st } = el;
    const isOver = sh - ch > 4;
    setOver((prev) => (prev === isOver ? prev : isOver));
    if (thumb && isOver) {
      thumb.style.top = `${(st / sh) * 100}%`;
      thumb.style.height = `${Math.max(0.18, ch / sh) * 100}%`;
    }
  }, []);

  const onScroll = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      paintThumb();
    });
  }, [paintThumb]);

  useEffect(() => {
    if (!isOpen) return;
    paintThumb();
    const id = window.setTimeout(paintThumb, 60); // אחרי שה-layout מתייצב
    return () => {
      window.clearTimeout(id);
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [isOpen, value, over, paintThumb]);

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
        // גובה קבוע (NOTE_FIELD_HEIGHT) - זהה בערך לגובה הכולל של עמודת
        // התמונה (תווית + תמונה 112px ב-ProductImageField), כדי ששתי
        // העמודות בגריד תמיד ייראו מאוזנות, גם כשההערה קצרה/ריקה. עמודה
        // פנימית (flex) - שורת התווית קבועה, ה-textarea ממלא את השאר וגולל
        // פנימית מעבר לזה.
        <Box sx={{
          ...paperNoteSx('field', isDark),
          mt: 2, mb: 0.5,
          px: 1.5, pt: 1.6, pb: 1.1,
          height: NOTE_FIELD_HEIGHT,
          display: 'flex', flexDirection: 'column',
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

          <Box sx={{ position: 'relative', zIndex: 2, mb: 0.6, lineHeight: 1.15, flexShrink: 0 }}>
            <Typography sx={{
              fontSize: 10, fontWeight: 800, color: ink,
              letterSpacing: 1, textTransform: 'uppercase',
            }}>
              {t('note')}:
            </Typography>
          </Box>
          {/* עוטפת ה-textarea - ממלאת את מה שנשאר מהגובה הקבוע (flex:1),
              אחרי שורת התווית שמעליה. */}
          <Box sx={{ flex: '1 1 auto', minHeight: 0, position: 'relative', zIndex: 2 }}>
            <TextField
              fullWidth
              multiline
              size="small"
              autoFocus={expanded && value.length === 0}
              value={value}
              onChange={e => onChange(e.target.value.slice(0, 200))}
              placeholder={t('productNotePlaceholder')}
              inputRef={taRef}
              inputProps={{ maxLength: 200, onScroll }}
              sx={{
                height: '100%',
                // מקום לסרגל החיווי בצד ה-inline-end (השמאלי ב-RTL).
                '& .MuiInputBase-root': { height: '100%', alignItems: 'flex-start' },
                '& .MuiOutlinedInput-root': {
                  height: '100%',
                  bgcolor: 'transparent',
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: noteText,
                  py: 0.1,
                  pl: '9px', // מרווח קבוע מצד סרגל החיווי (inline-end)
                  '& fieldset': { border: 'none' },
                  '&.Mui-focused fieldset': { border: 'none' },
                },
                // גובה קבוע (לא autosize) - ה-textarea תמיד ממלא את כל
                // ה-flex:1 שמעליו, בלי קשר לכמות הטקסט. !important כי
                // MUI (TextareaAutosize) קובע height inline דרך JS על כל
                // שינוי תוכן - צריך לדרוס אותו. גלישה - גלילה פנימית עם
                // סרגל החיווי שלנו (over/paintThumb למעלה), לא native.
                '& textarea': {
                  height: '100% !important',
                  overflowY: 'auto !important',
                  scrollbarWidth: 'none',
                },
                '& textarea::placeholder': {
                  color: inkMuted,
                  opacity: 1,
                },
                '& textarea::-webkit-scrollbar': { width: 0, height: 0 },
              }}
            />
          </Box>

          {/* סרגל החיווי שלנו - צמוד לקצה השמאלי (inline-end) של הפתק,
              גלוי מיד כשההערה ארוכה מהשדה. ה-thumb מעודכן ישירות ב-DOM. */}
          {over && (
            <Box aria-hidden sx={{
              position: 'absolute', insetInlineEnd: 4, zIndex: 3,
              top: 34, bottom: 10, width: 3, borderRadius: 3,
              bgcolor: isDark ? 'rgba(94,234,212,0.14)' : 'rgba(20,184,166,0.12)',
              pointerEvents: 'none',
            }}>
              <Box
                ref={thumbRef}
                sx={{
                  position: 'absolute', insetInline: 0, borderRadius: 3,
                  top: 0, height: '30%',
                  bgcolor: isDark ? PAPER_NOTE.inkDark : PAPER_NOTE.inkLight,
                  opacity: 0.55,
                }}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
});
ProductNoteField.displayName = 'ProductNoteField';
