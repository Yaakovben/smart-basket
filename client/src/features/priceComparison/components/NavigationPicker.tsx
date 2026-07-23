/**
 * NavigationPicker - דיאלוג לבחירת אפליקציית ניווט (Waze / Google Maps / Apple Maps).
 * נפתח בלחיצה על סניף קרוב בהשוואת המחירים.
 */

import { memo } from 'react';
import { siWaze, siGooglemaps } from 'simple-icons';
import { Box, Typography, IconButton, Dialog } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import type { NearestBranch } from '../types/priceComparison.types';

// בוני URL לאפליקציות הניווט השונות - לא פותחים ישר, מציגים picker למשתמש.
// אם יש lat/lng - ניווט מדויק. אם יש רק כתובת (כמו במעיין 2000/שפע) -
// ניווט לפי חיפוש כתובת. בכל מקרה ה-FAB ייפתח Waze/Maps עם היעד.
const buildNavUrls = (branch: NearestBranch) => {
  const { lat, lng, branchName, address, city } = branch;
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  // הכתובת המלאה - שם סניף + כתובת + עיר - עוזר לאפליקציות הניווט לדייק
  // לסניף הספציפי גם אם הקואורדינטות מצביעות על מרכז אזור.
  const fullAddress = [branchName, address, city].filter(Boolean).join(', ');
  const addressQuery = encodeURIComponent(fullAddress);
  const label = encodeURIComponent(branchName);

  if (hasCoords) {
    // משולב: קואורדינטות + טקסט - האפליקציה תעדיף את הטקסט אם היא מזהה
    // אותו (POI מוכר), אחרת תיפול לקואורדינטות. כך מקבלים את הדיוק
    // המקסימלי האפשרי בכל מקרה.
    return {
      // Waze: q=text מציע חיפוש; ll=coords נקודת התחלה. שילוב נותן את הטוב משניהם.
      waze: `https://waze.com/ul?q=${addressQuery}&ll=${lat},${lng}&navigate=yes`,
      // Google Maps: שם הסניף כיעד טקסטואלי - הוא יחפש את הסניף במאגר POI
      // שלו (מדויק יותר מקואורדינטות בלבד). אם לא מוצא, הקואורדינטות בגיבוי.
      googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`,
      // Apple Maps: daddr נקודת היעד, q תווית התצוגה. שילוב coord+text לדיוק.
      appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}&address=${addressQuery}`,
    };
  }
  // אין קואורדינטות - חיפוש לפי כתובת בלבד.
  return {
    waze: `https://waze.com/ul?q=${addressQuery}&navigate=yes`,
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${addressQuery}`,
    appleMaps: `https://maps.apple.com/?daddr=${addressQuery}&q=${label}`,
  };
};

// בוחר אפליקציית ניווט - דיאלוג נקי עם 3 אפשרויות.
// אין שימוש באימוג'י מותגים (🍎 וכו') - אייקונים נקיים מ-MUI + צבעי מותג עדינים.
type NavApp = {
  key: 'waze' | 'googleMaps' | 'appleMaps';
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  url: string;
};

export const NavigationPicker = memo(({ branch, isDark, onClose }: {
  branch: NearestBranch | null;
  isDark?: boolean;
  onClose: () => void;
}) => {
  if (!branch) return null;
  const urls = buildNavUrls(branch);
  const open = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  // זיהוי iOS - Apple Maps רלוונטי רק שם, ב-Android הוא רק יוצר רעש
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

  // לוגואים מ-Simple Icons (CC0) - paths רשמיים מהמותגים.
  // ה-path הוא silhouette צבע אחד; שמנו אותו על tile מעוגל בצבע המותג כמו ב-iOS.
  const WazeLogo = (
    // Waze (siWaze, hex #33CCFF) - silhouette לבן על tile תכלת.
    <Box component="svg" viewBox="0 0 32 32" sx={{ width: 56, height: 56 }}>
      <rect width="32" height="32" rx="7.5" fill="#33CCFF"/>
      <g transform="translate(4 4)">
        <path fill="#fff" d={siWaze.path} />
      </g>
    </Box>
  );
  const GoogleMapsLogo = (
    // Google Maps (siGooglemaps, hex #4285F4) - silhouette כחול-גוגל על tile לבן.
    <Box component="svg" viewBox="0 0 32 32" sx={{ width: 56, height: 56 }}>
      <rect width="32" height="32" rx="7.5" fill="#fff"/>
      <g transform="translate(4 4)">
        <path fill="#4285F4" d={siGooglemaps.path} />
      </g>
    </Box>
  );
  const AppleMapsLogo = (
    // Apple Maps - tile עם מפה צבעונית (כביש כחול, שטחים ירוק/ורוד/צהוב)
    // ועיגול ניווט כחול במרכז עם חץ לבן. השראה מהאייקון הרשמי של iOS.
    <Box component="svg" viewBox="0 0 64 64" sx={{ width: 56, height: 56 }}>
      <clipPath id="appleMapsClip">
        <rect width="64" height="64" rx="14"/>
      </clipPath>
      <g clipPath="url(#appleMapsClip)">
        {/* רקע לבן בסיסי */}
        <rect width="64" height="64" fill="#FAFAF6"/>
        {/* שטח ירוק בפינה ימנית-עליונה */}
        <path d="M30 0 H64 V36 Q48 36 38 24 Q32 16 30 0z" fill="#4CD37D"/>
        {/* כביש כחול אנכי */}
        <path d="M22 0 H32 V64 H22 z" fill="#4DA3F7"/>
        {/* פינה ורודה תחתונה-שמאלית */}
        <path d="M0 36 H22 V64 H0 z" fill="#F5A0C2"/>
        {/* פינה צהובה תחתונה-ימנית */}
        <path d="M32 50 H64 V64 H32 z" fill="#FFD23F"/>
        {/* דרך לבנה אופקית באמצע */}
        <path d="M0 36 H64 V44 H0 z" fill="#FAFAF6"/>
        {/* עיגול לבן מסביב לעיגול הכחול - מסגרת */}
        <circle cx="32" cy="34" r="13" fill="#fff"/>
        {/* עיגול כחול במרכז */}
        <circle cx="32" cy="34" r="10" fill="#1A8CFF"/>
        {/* חץ ניווט לבן */}
        <path fill="#fff" d="M32 28 L37 39 L32 36.5 L27 39 Z"/>
      </g>
    </Box>
  );

  const allApps: NavApp[] = [
    {
      key: 'waze',
      label: 'Waze',
      subtitle: 'ניווט קהילתי',
      icon: WazeLogo,
      color: '#33CCFF',
      url: urls.waze,
    },
    {
      key: 'googleMaps',
      label: 'Google Maps',
      subtitle: 'מפות גוגל',
      icon: GoogleMapsLogo,
      color: '#1A73E8',
      url: urls.googleMaps,
    },
    {
      key: 'appleMaps',
      label: 'Apple Maps',
      subtitle: 'מפות אפל',
      icon: AppleMapsLogo,
      color: '#64748B',
      url: urls.appleMaps,
    },
  ];
  // ב-iOS - מציגים את כל ה-3. ב-אנדרואיד/דסקטופ - רק Waze + Google (Apple Maps לא רלוונטי).
  const apps = isIOS ? allApps : allApps.filter(a => a.key !== 'appleMaps');

  return (
    <Dialog
      open={!!branch}
      onClose={onClose}
      // bottom-sheet style: דבוק לתחתית במובייל, מרכזי בדסקטופ
      PaperProps={{
        sx: {
          borderRadius: { xs: '24px 24px 0 0', sm: '20px' },
          p: 0,
          m: 0,
          maxWidth: { xs: '100%', sm: 380 },
          width: '100%',
          bgcolor: isDark ? '#0F1F1E' : '#fff',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.3)',
          overflow: 'hidden',
        },
      }}
      sx={{
        '& .MuiDialog-container': {
          alignItems: { xs: 'flex-end', sm: 'center' },
        },
      }}
    >
      {/* drag handle */}
      <Box sx={{
        display: { xs: 'flex', sm: 'none' },
        justifyContent: 'center', pt: 1.25, pb: 0.5,
      }}>
        <Box sx={{
          width: 44, height: 5, borderRadius: '3px',
          bgcolor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.16)',
        }} />
      </Box>

      {/* HERO - גרדיאנט טורקיז עדין עם פין מיקום מרכזי, שם ומרחק מודגש */}
      <Box sx={{
        position: 'relative',
        px: 2.5, pt: 2.25, pb: 2,
        background: isDark
          ? 'linear-gradient(165deg, rgba(20,184,166,0.18) 0%, rgba(20,184,166,0.04) 100%)'
          : 'linear-gradient(165deg, rgba(20,184,166,0.10) 0%, rgba(20,184,166,0.02) 100%)',
        textAlign: 'center',
      }}>
        {/* X לסגירה - אותו עיצוב כמו ב-Modal הגלובלי לאחידות אפליקציה */}
        <IconButton
          onMouseDown={(e) => e.preventDefault()}
          onClick={onClose}
          aria-label="סגור"
          disableRipple
          disableFocusRipple
          sx={{
            position: 'absolute', top: 10, insetInlineEnd: 12,
            bgcolor: 'action.hover',
            width: 36, height: 36,
            touchAction: 'manipulation',
            transition: 'opacity 0.1s, background-color 0.15s',
            '&:hover': { bgcolor: 'action.hover' },
            '&:active': { opacity: 0.7, bgcolor: 'action.selected' },
            '@media (max-width: 360px)': { width: 32, height: 32 },
          }}
        >
          <CloseIcon sx={{ fontSize: 20, color: 'text.secondary' }} />
        </IconButton>

        {/* תג מרחק זוהר במרכז למעלה - או "ניווט לפי כתובת" אם אין קואורדינטות */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'baseline', gap: 0.4,
          px: 1.4, py: 0.5, borderRadius: '999px',
          backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
          boxShadow: '0 4px 14px rgba(20,184,166,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
          mb: 1.4,
        }}>
          {typeof branch.distanceKm === 'number' ? (
            <>
              <Typography sx={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {branch.isApproximate ? `~${branch.distanceKm}` : branch.distanceKm}
              </Typography>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.3 }}>
                ק״מ{branch.isApproximate ? ' (משוער)' : ''}
              </Typography>
            </>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.2 }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: 0.3 }}>
                מרחק לא ידוע
              </Typography>
              <Typography sx={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1 }}>
                ניווט לפי כתובת
              </Typography>
            </Box>
          )}
        </Box>

        <Typography sx={{
          fontSize: 9.5, fontWeight: 800, color: '#0D9488',
          letterSpacing: 1.4, textTransform: 'uppercase', mb: 0.4, opacity: 0.85,
        }}>
          ניווט אל
        </Typography>
        <Typography sx={{
          fontSize: 18, fontWeight: 800, color: 'text.primary',
          lineHeight: 1.25, wordBreak: 'break-word', mb: (branch.city || branch.address) ? 0.5 : 0,
        }}>
          {branch.branchName}
        </Typography>
        {(branch.city || branch.address) && (
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.4, color: 'text.secondary' }}>
            <LocationOnIcon sx={{ fontSize: 13, color: '#0D9488' }} />
            <Typography sx={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, wordBreak: 'break-word' }}>
              {[branch.city, branch.address].filter(Boolean).join(', ')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* כפתורי אפליקציה - גריד אופקי. כל אפליקציה תופסת עמודה אחת:
          לוגו עגול גדול + שם מתחת. clean & symmetric. */}
      <Box sx={{
        px: 1.25, pt: 1.5, pb: 0.5,
        display: 'grid',
        gridTemplateColumns: `repeat(${apps.length}, 1fr)`,
        gap: 1,
      }}>
        {apps.map(app => (
          <Box
            key={app.key}
            role="button"
            tabIndex={0}
            onClick={() => open(app.url)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(app.url); }}
            sx={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 0.85,
              py: 1.4, px: 0.5, borderRadius: '16px',
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
              transition: 'all 0.15s',
              '&:hover': {
                bgcolor: `${app.color}10`,
                borderColor: `${app.color}55`,
                transform: 'translateY(-2px)',
              },
              '&:active': { transform: 'translateY(0) scale(0.97)' },
            }}
          >
            {/* האייקון עצמו הוא tile מלא בסגנון iOS עם רקע משלו (rect ב-SVG),
                ולכן המעטפת לא מוסיפה רקע - רק צל עדין שייתן תחושת אפליקציה אמיתית. */}
            <Box sx={{
              width: 56, height: 56,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.18))',
            }}>
              {app.icon}
            </Box>
            <Typography sx={{
              fontSize: 12, fontWeight: 800, color: 'text.primary',
              textAlign: 'center', lineHeight: 1.2,
            }}>
              {app.label}
            </Typography>
          </Box>
        ))}
      </Box>

      <Typography sx={{
        fontSize: 10, color: 'text.disabled', textAlign: 'center',
        pt: 1, pb: 1.75, px: 2, lineHeight: 1.4,
      }}>
        אם האפליקציה לא מותקנת היא תיפתח בדפדפן
      </Typography>
    </Dialog>
  );
});
NavigationPicker.displayName = 'NavigationPicker';
