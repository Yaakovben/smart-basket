import { useState } from 'react';
import { Dialog, Box, Typography, Button, IconButton, Fade, keyframes } from '@mui/material';
import IosShareIcon from '@mui/icons-material/IosShare';
import { useSettings } from '../../global/context/SettingsContext';
import { haptic } from '../../global/helpers';
import { renderFaithText, stripFaithMarkers } from './formatFaithText';

// אנימציית חגיגה: אימוג'ים עפים למעלה עם סיבוב קל ודהייה
const celebrateFloat = keyframes`
  0%   { transform: translate(0, 0) rotate(0deg) scale(0.6); opacity: 0; }
  15%  { opacity: 1; transform: translate(0, -20px) scale(1); }
  100% { transform: translate(var(--drift), -260px) rotate(var(--rot)) scale(1.1); opacity: 0; }
`;

// glow זהוב פועם — מוחל על הכפתור בזמן החגיגה, שומר על הזהות של הפופאפ
const goldGlowPulse = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(244,228,166,0.6), 0 4px 14px rgba(184,134,11,0.4); }
  60%  { box-shadow: 0 0 0 14px rgba(244,228,166,0), 0 10px 28px rgba(212,175,55,0.75); }
  100% { box-shadow: 0 0 0 0 rgba(244,228,166,0), 0 4px 14px rgba(184,134,11,0.4); }
`;

// Pop של אייקון הצ'ק במעבר למצב "התחזקת"
const checkPop = keyframes`
  0%   { transform: scale(0) rotate(-180deg); opacity: 0; }
  70%  { transform: scale(1.3) rotate(10deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

// אימוג'ים חגיגיים מתאימים ל"קראתי והתחזקתי" - גאווה יהודית + חוזק + ספר
const CELEBRATE_EMOJIS = ['💪', '📖', '👌', '👍', '🇮🇱', '✨', '🌟', '🕊️', '🙌'];

interface DailyFaithPopupProps {
  text: string;
  onClose: () => void;
}

/**
 * פופאפ החיזוק היומי — גרסת קלף זהוב עם פינות מעוטרות.
 * רקע עם gradient חם, גבול מוזהב, טקסט סריף מעוצב, בלי תמונות.
 * Backdrop click סוגר (safety-net), כפתור "קראתי והתחזקתי" ראשי.
 */
export const DailyFaithPopup = ({ text, onClose }: DailyFaithPopupProps) => {
  const { t } = useSettings();
  // מצב חגיגה - פעיל אחרי לחיצה על "קראתי והתחזקתי". בזמן הזה אימוג'ים מרחפים
  // למעלה, הכפתור מושבת, ואחרי ~1.2 שנ' הפופאפ נסגר בחלקלקות.
  const [celebrating, setCelebrating] = useState(false);

  const handleClose = () => {
    if (celebrating) return;
    haptic('medium');
    setCelebrating(true);
    // סוגרים אחרי משך האנימציה - נותן תחושה של "זכית"
    window.setTimeout(() => {
      onClose();
    }, 1200);
  };

  // שיתוף המשפט - מנסה share sheet נטיבי (מובייל), נופל ל-wa.me (דסקטופ)
  const handleShare = async () => {
    haptic('light');
    // מנקים סימוני עיצוב פנימיים לפני שיתוף כדי שהודעת WhatsApp תצא טבעית
    const cleanText = stripFaithMarkers(text);
    const message = `${t('dailyFaithShareLine')}\n\n"${cleanText}"\n\n${t('dailyFaithShareFooter')}\n${window.location.origin}`;
    type ShareCapable = Navigator & { share?: (data: { text?: string; title?: string; url?: string }) => Promise<void> };
    const nav = navigator as ShareCapable;
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ text: message, title: t('dailyFaithTitle') });
        return;
      } catch {
        // המשתמש ביטל או שה-share נכשל — נופלים לפתיחת WhatsApp
      }
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog
      open
      // הפופאפ נסגר רק בלחיצה על "קראתי והתחזקתי" — לא ב-backdrop וגם לא ב-Escape
      onClose={(_e, reason) => {
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') return;
        handleClose();
      }}
      disableEscapeKeyDown
      TransitionComponent={Fade}
      transitionDuration={500}
      PaperProps={{
        sx: {
          bgcolor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
          m: 2,
          maxWidth: 400,
          width: '100%',
        },
      }}
      sx={{
        '& .MuiBackdrop-root': {
          bgcolor: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
        },
      }}
    >
      {/* קלף חיצוני - מסגרת זהובה עם gradient */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: '22px',
          p: 0.5,
          background: 'linear-gradient(135deg, #D4AF37 0%, #F4E4A6 40%, #B8860B 100%)',
          boxShadow: '0 20px 60px rgba(184, 134, 11, 0.5), 0 0 40px rgba(212, 175, 55, 0.3)',
        }}
      >
        {/* פנים הקלף - רקע קרם-זהב חם */}
        <Box
          sx={{
            borderRadius: '18px',
            background: 'linear-gradient(160deg, #FFF9E6 0%, #FFF3D4 50%, #FDE8B4 100%)',
            border: '2px solid rgba(184, 134, 11, 0.3)',
            px: 3,
            py: 5,
            textAlign: 'center',
            position: 'relative',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            overflow: 'hidden',
          }}
        >
          {/* קישוטים בפינות */}
          <Box sx={cornerSx('top', 'left')}>✦</Box>
          <Box sx={cornerSx('top', 'right')}>✦</Box>
          <Box sx={cornerSx('bottom', 'left')}>✦</Box>
          <Box sx={cornerSx('bottom', 'right')}>✦</Box>

          {/* אפקט חגיגה - מופיע רק בזמן "קראתי והתחזקתי", מתפזר מתחתית הפופאפ */}
          {celebrating && (
            <Box sx={{
              position: 'absolute', inset: 0,
              pointerEvents: 'none',
              zIndex: 10,
            }} aria-hidden="true">
              {Array.from({ length: 18 }).map((_, i) => {
                const emoji = CELEBRATE_EMOJIS[i % CELEBRATE_EMOJIS.length];
                // פיזור אופקי: חצי משמאל חצי מימין, קצת אקראיות
                const leftPct = 8 + (i * 5) + (i % 3) * 3;
                const drift = ((i % 5) - 2) * 30; // -60 עד +60 פיקסלים אופקית
                const rot = ((i % 7) - 3) * 25; // -75° עד +75°
                const dur = 0.9 + (i % 5) * 0.15; // משך משתנה לכל אימוג'י
                const delay = (i % 6) * 0.06;
                return (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      bottom: '18%',
                      left: `${leftPct}%`,
                      fontSize: 26,
                      lineHeight: 1,
                      animation: `${celebrateFloat} ${dur}s ease-out ${delay}s forwards`,
                      '--drift': `${drift}px`,
                      '--rot': `${rot}deg`,
                      willChange: 'transform, opacity',
                    }}
                  >
                    {emoji}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* כותרת "החיזוק היומי" במסגרת עגולה מעוטרת - כדי שיהיה ברור שזו הכותרת */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1.25,
              px: 3,
              py: 1.1,
              borderRadius: '999px',
              background: 'linear-gradient(135deg, #FFF4C9 0%, #FFE7A0 100%)',
              border: '1.5px solid rgba(184, 134, 11, 0.5)',
              boxShadow: '0 3px 10px rgba(184, 134, 11, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
            }}
          >
            {/* כוכבית דקורטיבית שמאל */}
            <Box sx={{ color: '#B8860B', fontSize: 15, opacity: 0.85 }} aria-hidden="true">✦</Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                color: '#8B6914',
                letterSpacing: 1.5,
                fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
              }}
            >
              {t('dailyFaithTitle')}
            </Typography>
            {/* כוכבית דקורטיבית ימין */}
            <Box sx={{ color: '#B8860B', fontSize: 15, opacity: 0.85 }} aria-hidden="true">✦</Box>
          </Box>

          {/* קו מפריד זהב */}
          <Box sx={{ width: 40, height: 2, bgcolor: '#B8860B', borderRadius: 2, opacity: 0.6 }} />

          {/* טקסט החיזוק */}
          <Typography
            sx={{
              fontSize: 19,
              fontWeight: 500,
              lineHeight: 1.7,
              color: '#3E2F0E',
              fontFamily: '"Frank Ruhl Libre", "Times New Roman", serif',
              px: 1,
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              overflowWrap: 'normal',
              hyphens: 'none',
            }}
          >
            {renderFaithText(text)}
          </Typography>

          {/* שורת כפתורים - WhatsApp (ריבוע) + קראתי והתחזקתי (רחב) */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1.25, width: '100%', alignItems: 'stretch' }}>
            <IconButton
              onClick={handleShare}
              aria-label={t('dailyFaithShareAria')}
              disableRipple
              sx={{
                width: 52,
                height: 'auto',
                minHeight: 46,
                borderRadius: '14px',
                color: 'white',
                // אייקון שיתוף גנרי בצבע הזהב של הפופאפ - תואם לברנדינג
                background: 'linear-gradient(135deg, #D4AF37 0%, #B8860B 100%)',
                boxShadow: '0 4px 14px rgba(184, 134, 11, 0.4)',
                flexShrink: 0,
                transition: 'transform 0.12s, box-shadow 0.2s',
                '&:hover': {
                  background: 'linear-gradient(135deg, #B8860B 0%, #9C7209 100%)',
                  boxShadow: '0 6px 18px rgba(184, 134, 11, 0.5)',
                },
                '&:active': { transform: 'scale(0.94)' },
              }}
            >
              <IosShareIcon sx={{ fontSize: 22 }} />
            </IconButton>

            <Button
              onClick={handleClose}
              disabled={celebrating}
              sx={{
                flex: 1,
                px: 2,
                py: 1.25,
                borderRadius: '14px',
                // הכפתור נשאר זהוב גם בחגיגה - שומרים את הזהות של הפופאפ.
                // האפקט מגיע מ-glow זהוב שפועם + הילה חיצונית מתרחבת.
                background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #F4E4A6 100%)',
                color: 'white',
                fontWeight: 700,
                fontSize: 15,
                boxShadow: celebrating
                  ? '0 0 0 4px rgba(244,228,166,0.35), 0 6px 24px rgba(212,175,55,0.75), inset 0 1px 0 rgba(255,255,255,0.5)'
                  : '0 4px 14px rgba(184, 134, 11, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
                textTransform: 'none',
                transition: 'box-shadow 0.4s ease',
                '&:hover': {
                  background: 'linear-gradient(135deg, #9C7209 0%, #B8860B 50%, #D4AF37 100%)',
                },
                '&:active': {
                  transform: 'scale(0.97)',
                },
                '&.Mui-disabled': {
                  color: 'white',
                  background: 'linear-gradient(135deg, #B8860B 0%, #D4AF37 50%, #F4E4A6 100%)',
                  // פולס עדין על הכפתור בזמן החגיגה - glow זהוב שמתרחב ומתכווץ
                  animation: celebrating ? `${goldGlowPulse} 0.6s ease-out 2` : 'none',
                },
              }}
            >
              {celebrating ? (
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                  <Box component="span" sx={{ fontSize: 18, animation: `${checkPop} 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)` }}>
                    ✦
                  </Box>
                  <Box component="span">התחזקת!</Box>
                </Box>
              ) : (
                t('dailyFaithReadButton')
              )}
            </Button>
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
};

// סגנון הפינות המעוטרות (✦)
const cornerSx = (v: 'top' | 'bottom', h: 'left' | 'right') => ({
  position: 'absolute' as const,
  [v]: 10,
  [h]: 14,
  color: '#B8860B',
  fontSize: 18,
  opacity: 0.6,
  pointerEvents: 'none' as const,
});
