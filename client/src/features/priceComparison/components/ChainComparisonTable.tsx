/**
 * ChainComparisonTable - תצוגה השוואתית של מחיר הסל בכל הרשתות.
 *
 * חוקים הוגנים:
 * - "הכי זול" ניתן רק לרשת עם סל שלם (מקסימום מוצרים זוהו). רשת שמצאה פחות
 *   לא תקבל הכי זול גם אם הסה"כ נמוך.
 * - רשתות חלקיות מוצגות בצבע מעומעם עם הודעה "חסר X מוצרים" כדי שהמשתמש
 *   יבין למה הן לא מדרוג.
 *
 * אינטראקציה:
 * - לחיצה על רשת פותחת את הפירוט של כל המוצרים והמחירים באותה רשת.
 */

import { memo, useState, useMemo } from 'react';
import { Box, Typography, Collapse, IconButton, Dialog, keyframes } from '@mui/material';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StorefrontIcon from '@mui/icons-material/Storefront';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NavigationIcon from '@mui/icons-material/Navigation';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import SavingsIcon from '@mui/icons-material/Savings';
import type { PriceChainTotal, PriceMatch, NearestBranch } from '../types/priceComparison.types';
import { useSettings } from '../../../global/context/SettingsContext';

type SortMode = 'price' | 'distance' | 'combined';

interface Props {
  chainTotals: PriceChainTotal[];
  lastUpdatedISO?: string | null;
}

// פורמט יחסי לזמן ("לפני X דק'") - משוכפל מ-PriceComparisonCard ובמכוון:
// הקומפוננטה הזו עומדת בפני עצמה ויכולה להיות מוצגת בלי הכרטיס העליון.
const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'זה עתה';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `לפני ${mins || 1} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
};

// סיווג טריות הנתונים לרמזור צבעים (תואם לכרטיס העליון)
const freshnessColor = (iso: string | null | undefined, isDark: boolean) => {
  if (!iso) return { color: '#6B7280', bg: isDark ? 'rgba(107,114,128,0.15)' : 'rgba(107,114,128,0.08)' };
  const ageH = (Date.now() - new Date(iso).getTime()) / 3_600_000;
  if (ageH < 1) return { color: '#059669', bg: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' };
  if (ageH < 24) return { color: '#D97706', bg: isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)' };
  return { color: '#DC2626', bg: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)' };
};

const shimmer = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

// שורה בודדת של מוצר בתוך הפירוט של רשת.
// isCheapestInChain מוסיף badge "הכי זול ברשת" - משמש ל-3 הזולים בפירוט.
const ChainProductRow = memo(({ m, isDark, isCheapestInChain }: { m: PriceMatch; isDark?: boolean; isCheapestInChain?: boolean }) => {
  const subtotal = m.price * m.userQuantity;
  if (!m.matched) {
    // לא זוהה ברשת זו
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        py: 0.85, px: 1.25,
        borderRadius: '8px',
        bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
        border: '1px dashed',
        borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.25)',
      }}>
        <HelpOutlineIcon sx={{ fontSize: 14, color: '#F59E0B' }} />
        <Typography sx={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
          {m.userProductName}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: '#F59E0B', fontWeight: 700 }}>
          לא זוהה
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 1,
      py: 0.85, px: 1.25,
      borderRadius: '8px',
      bgcolor: isCheapestInChain
        ? (isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)')
        : (isDark ? 'rgba(20,184,166,0.05)' : 'rgba(20,184,166,0.03)'),
      border: isCheapestInChain ? '1px solid rgba(16,185,129,0.35)' : 'none',
    }}>
      <CheckCircleIcon sx={{ fontSize: 14, color: isCheapestInChain ? '#059669' : '#14B8A6', flexShrink: 0, mt: 0.2 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }}>
            {m.userProductName}
          </Typography>
          {isCheapestInChain && (
            <Box sx={{
              px: 0.6, py: 0.1, borderRadius: '4px',
              bgcolor: '#10B981', color: 'white',
              fontSize: 9, fontWeight: 800, letterSpacing: 0.3,
            }}>
              זול
            </Box>
          )}
        </Box>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.3, mt: 0.15 }}>
          {m.itemName}
        </Typography>
      </Box>
      <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#0D9488', fontFamily: 'monospace', lineHeight: 1.1 }}>
          ₪{subtotal.toFixed(2)}
        </Typography>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontFamily: 'monospace', mt: 0.15 }}>
          {m.userQuantity > 1 ? `${m.userQuantity} × ` : ''}₪{m.price.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
});
ChainProductRow.displayName = 'ChainProductRow';

// בוני URL לאפליקציות הניווט השונות - לא פותחים ישר, מציגים picker למשתמש.
const buildNavUrls = (branch: NearestBranch) => {
  const { lat, lng, branchName } = branch;
  const label = encodeURIComponent(branchName);
  return {
    // Waze - הפופולרי בישראל; עובד כ-deep link ו-web fallback
    waze: `https://waze.com/ul?ll=${lat},${lng}&navigate=yes`,
    // Google Maps - נוח לכל פלטפורמה
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`,
    // Apple Maps - ל-iOS; בדפדפנים אחרים ייכשל
    appleMaps: `https://maps.apple.com/?daddr=${lat},${lng}&q=${label}`,
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

  // לוגואים בסגנון מותגי - SVG אינליין שדומים לאייקוני האפליקציות האמיתיים.
  // לא הלוגו המקורי בדיוק (זכויות יוצרים) אבל בולט וזיהוי מיידי.
  const WazeLogo = (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 24, height: 24, color: '#fff' }}>
      <path fill="currentColor" d="M20.54 6.63c.96 1.7 1.46 3.5 1.46 5.37 0 5.61-4.39 9.5-9.65 9.83-.21.83-.97 1.42-1.85 1.42-1.06 0-1.92-.86-1.92-1.92 0-.04 0-.08.01-.12-1.36-.18-2.66-.61-3.78-1.34-.39.31-.88.49-1.43.49-1.27 0-2.31-1.04-2.31-2.31 0-.69.31-1.31.79-1.74-.34-.84-.53-1.74-.53-2.69 0-2.04.84-3.92 2.27-5.32C2.93 7.8 2.5 6.6 2.5 5.27c0-.16.13-.29.29-.29.96 0 1.86.45 2.46 1.18C6.83 5.07 8.83 4.5 11 4.5c4.04 0 7.65 1.93 9.54 5.13zM12 11.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm5 0c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5zm-9.04 3.84c-.31.25-.36.7-.11 1.01.62.78 1.59 1.4 2.85 1.81 1.05.34 2.18.51 3.32.51.46 0 .92-.03 1.37-.09 1.78-.24 3.31-.96 4.31-2.04.27-.29.25-.74-.04-1.01-.29-.27-.74-.25-1.01.04-.78.84-2.04 1.42-3.45 1.62-1.39.19-2.85.05-4.05-.34-1.05-.34-1.79-.81-2.18-1.3-.25-.31-.7-.36-1.01-.11z" />
    </Box>
  );
  const GoogleMapsLogo = (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 24, height: 24 }}>
      <path fill="#34A853" d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8z" opacity="0.95" />
      <circle cx="12" cy="10" r="3" fill="#FFF" />
      <circle cx="12" cy="10" r="1.5" fill="#EA4335" />
    </Box>
  );
  const AppleMapsLogo = (
    <Box component="svg" viewBox="0 0 24 24" sx={{ width: 24, height: 24, color: '#fff' }}>
      <path fill="currentColor" d="M12 2C7.58 2 4 5.58 4 10c0 5.5 8 12 8 12s8-6.5 8-12c0-4.42-3.58-8-8-8zm0 11a3 3 0 110-6 3 3 0 010 6z" />
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
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="סגור"
          sx={{
            position: 'absolute', top: 10, insetInlineEnd: 12,
            color: 'text.secondary',
            bgcolor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)',
            backdropFilter: 'blur(6px)',
            '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.10)' },
            width: 30, height: 30,
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>

        {/* תג מרחק זוהר במרכז למעלה */}
        <Box sx={{
          display: 'inline-flex', alignItems: 'baseline', gap: 0.4,
          px: 1.4, py: 0.5, borderRadius: '999px',
          backgroundImage: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
          boxShadow: '0 4px 14px rgba(20,184,166,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
          mb: 1.4,
        }}>
          <Typography sx={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            {branch.distanceKm}
          </Typography>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,0.92)', letterSpacing: 0.3 }}>
            ק״מ
          </Typography>
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

      {/* כפתורי אפליקציה - כרטיסים נקיים עם תג צבעוני קטן (לא רקע מלא) */}
      <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5, display: 'flex', flexDirection: 'column', gap: 0.7 }}>
        <Typography sx={{
          fontSize: 9.5, fontWeight: 800, color: 'text.disabled',
          letterSpacing: 1.2, textTransform: 'uppercase', mb: 0.25, mt: 0.25, px: 0.5,
        }}>
          בחר אפליקציה
        </Typography>
        {apps.map(app => (
          <Box
            key={app.key}
            role="button"
            tabIndex={0}
            onClick={() => open(app.url)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(app.url); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5,
              py: 1.1, px: 1.25, borderRadius: '14px',
              cursor: 'pointer', userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
              transition: 'all 0.15s',
              '&:hover': {
                bgcolor: `${app.color}12`,
                borderColor: `${app.color}55`,
                transform: 'translateY(-1px)',
              },
              '&:active': { transform: 'translateY(0) scale(0.99)' },
            }}
          >
            <Box sx={{
              width: 42, height: 42, borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              backgroundImage: `linear-gradient(135deg, ${app.color} 0%, ${app.color}D0 100%)`,
              boxShadow: `0 3px 8px ${app.color}45, inset 0 1px 0 rgba(255,255,255,0.25)`,
              flexShrink: 0,
              '& svg': { fontSize: '22px !important', color: 'white !important' },
            }}>
              {app.icon}
            </Box>
            <Typography sx={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {app.label}
            </Typography>
            <Box sx={{
              flexShrink: 0,
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${app.color}18`,
              color: app.color,
              fontSize: 16, fontWeight: 800, lineHeight: 1,
            }}>
              ←
            </Box>
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

// תג מרחק + כפתור ניווט - מוצג לכל רשת כשהמשתמש שיתף מיקום.
// כרטיסון סניף קרוב - מרחק בולט, שם סניף + עיר, כפתור ניווט גדול וברור
const BranchInfo = memo(({ branch, isDark, onOpenPicker }: {
  branch: NearestBranch; isDark?: boolean; onOpenPicker: (b: NearestBranch) => void;
}) => {
  const subtitle = [branch.city, branch.address].filter(Boolean).join(' · ');
  return (
    <Box
      onClick={(e) => { e.stopPropagation(); onOpenPicker(branch); }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.85,
        mt: 0.5, p: 0.85, borderRadius: '10px',
        bgcolor: isDark ? 'rgba(124,58,237,0.1)' : 'rgba(124,58,237,0.06)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(167,139,250,0.25)' : 'rgba(124,58,237,0.18)',
        cursor: 'pointer', userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: 'background-color 0.12s',
        '&:hover': { bgcolor: isDark ? 'rgba(124,58,237,0.18)' : 'rgba(124,58,237,0.1)' },
        '&:active': { opacity: 0.85 },
      }}
    >
      {/* תג מרחק בולט - אפשר לראות מרחוק */}
      <Box sx={{
        flexShrink: 0,
        minWidth: 48, px: 0.5, py: 0.5,
        borderRadius: '8px',
        background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
        color: 'white',
        textAlign: 'center',
        boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
      }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
          {branch.distanceKm}
        </Typography>
        <Typography sx={{ fontSize: 8, fontWeight: 700, opacity: 0.95, lineHeight: 1, mt: 0.2 }}>
          ק"מ
        </Typography>
      </Box>

      {/* שם הסניף + עיר/כתובת - הכתובת נשברת לשורות כדי שתמיד תהיה קריאה */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 11.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.25,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {branch.branchName}
        </Typography>
        {subtitle && (
          <Typography sx={{
            fontSize: 10, color: 'text.secondary', mt: 0.2, lineHeight: 1.35,
            // שבירת שורות במקום חיתוך - הלקוח חייב לראות את הכתובת המלאה
            wordBreak: 'break-word', whiteSpace: 'normal',
          }}>
            📍 {subtitle}
          </Typography>
        )}
      </Box>

      {/* כפתור ניווט גדול וברור */}
      <Box sx={{
        flexShrink: 0,
        width: 36, height: 36, borderRadius: '10px',
        bgcolor: '#7C3AED',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 6px rgba(124,58,237,0.3)',
      }}>
        <NavigationIcon sx={{ fontSize: 18, color: 'white' }} />
      </Box>
    </Box>
  );
});
BranchInfo.displayName = 'BranchInfo';

// בר מיון - מוצג תמיד. אופציות שדורשות מיקום (קרוב/משולב) מוצגות
// כמנוטרלות (disabled) כשאין מיקום, ולחיצה לא משנה כלום.
const SortBar = memo(({ sortMode, setSortMode, isDark, hasLocation }: {
  sortMode: SortMode; setSortMode: (m: SortMode) => void; isDark?: boolean; hasLocation?: boolean;
}) => {
  const Chip = ({ mode, emoji, label, hint, requiresLocation }: { mode: SortMode; emoji: string; label: string; hint: string; requiresLocation?: boolean }) => {
    const active = sortMode === mode;
    const disabled = requiresLocation && !hasLocation;
    return (
      <Box
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => { if (!disabled) setSortMode(mode); }}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) setSortMode(mode); }}
        aria-label={`מיון לפי ${label} - ${hint}${disabled ? ' (דורש הפעלת מיקום)' : ''}`}
        aria-disabled={disabled || undefined}
        sx={{
          flex: 1, minWidth: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.15,
          py: 0.85, px: 1, borderRadius: '12px',
          cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none',
          opacity: disabled ? 0.5 : 1,
          WebkitTapHighlightColor: 'transparent',
          bgcolor: active && !disabled
            ? (isDark ? 'rgba(20,184,166,0.28)' : 'rgba(20,184,166,0.14)')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
          border: '1.5px solid',
          borderColor: active && !disabled ? '#14B8A6' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          transition: 'all 0.12s',
          '&:active': disabled ? {} : { opacity: 0.85, transform: 'scale(0.98)' },
          '@media (max-width: 360px)': { py: 0.55, px: 0.5, borderRadius: '10px' },
          '@media (max-width: 320px)': { py: 0.4, px: 0.35, borderRadius: '8px' },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <Box sx={{ fontSize: 15, lineHeight: 1, '@media (max-width: 360px)': { fontSize: 13 }, '@media (max-width: 320px)': { fontSize: 12 } }}>{emoji}</Box>
          <Typography sx={{
            fontSize: 12, fontWeight: active && !disabled ? 800 : 700,
            color: active && !disabled ? '#14B8A6' : 'text.primary',
            '@media (max-width: 360px)': { fontSize: 11 },
            '@media (max-width: 320px)': { fontSize: 10 },
          }}>
            {label}
          </Typography>
        </Box>
        <Typography sx={{
          fontSize: 9, color: active && !disabled ? '#14B8A6' : 'text.disabled', fontWeight: 500, letterSpacing: 0.2,
          // hint מוסתר במסך זעיר - חוסך גובה, רק התווית הקצרה נשארת
          '@media (max-width: 360px)': { display: 'none' },
        }}>
          {hint}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ px: 1.25, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', mb: 0.6, letterSpacing: 0.4 }}>
        מיין לפי:
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.6 }}>
        {/* בעברית RTL - הראשון ב-DOM הוא הימני ביותר. 'קרוב' = ברירת המחדל = ימין.
            'קרוב' ו-'משולב' דורשים מיקום ומוצגים מעומעמים בלעדיו. */}
        <Chip mode="distance" emoji="📍" label="קרוב" hint="מרחק מהבית" requiresLocation />
        <Chip mode="price" emoji="💰" label="זול" hint="מחיר נמוך" />
        <Chip mode="combined" emoji="⚖️" label="משולב" hint="זול+קרוב" requiresLocation />
      </Box>
      {!hasLocation && (
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.5, textAlign: 'center', fontStyle: 'italic' }}>
          שתף מיקום כדי למיין לפי קרבה
        </Typography>
      )}
    </Box>
  );
});
SortBar.displayName = 'SortBar';

export const ChainComparisonTable = memo(({ chainTotals, lastUpdatedISO }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // מצב מיון - ברירת המחדל היא 'distance' (קרוב). אם אין מיקום פעיל,
  // בפועל המיון יתבצע לפי 'price' כי distance דורש hasAnyLocation.
  const [sortMode, setSortMode] = useState<SortMode>('distance');
  // ה-branch שנבחר לפתיחת picker ניווט
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);

  // האם יש מיקום לפחות לרשת אחת - מפעיל את בר המיון
  const hasAnyLocation = chainTotals.some(c => c.nearestBranch);
  // טווח מחירים בין רשתות שלמות - לחישוב בר יחסי
  const completeForRange = chainTotals.filter(c => c.isComplete && c.matchedCount > 0);
  const minTotalAcross = completeForRange.length > 0 ? Math.min(...completeForRange.map(c => c.total)) : 0;
  const maxTotalAcross = completeForRange.length > 0 ? Math.max(...completeForRange.map(c => c.total)) : 0;
  const totalRange = maxTotalAcross - minTotalAcross;
  // פורמט מחיר עם הפרדת אלפים בעברית - עוזר לקריאה של מספרים גדולים (₪1,234)
  const formatPrice = (n: number) => `₪${n.toLocaleString('he-IL', { maximumFractionDigits: 0 })}`;

  // מיון לפי מצב. 'price' = ההגיון המקורי (שלמות קודם, לפי מחיר).
  // 'distance' = רשתות עם מיקום ממוינות לפי מרחק; אחרות נדחקות לסוף.
  // 'combined' = ציון מנורמל של מחיר+מרחק במשקל שווה.
  const sortedChains = useMemo(() => {
    const chains = [...chainTotals];
    if (sortMode === 'distance' && hasAnyLocation) {
      // במצב "קרוב" - מרחק קודם כל. אפילו רשת בלי מוצרים תופיע למעלה
      // אם הסניף שלה הקרוב ביותר. רק רשתות בלי מיקום בכלל יורדות לסוף.
      return chains.sort((a, b) => {
        const aDist = a.nearestBranch?.distanceKm ?? Infinity;
        const bDist = b.nearestBranch?.distanceKm ?? Infinity;
        return aDist - bDist;
      });
    }
    if (sortMode === 'combined' && hasAnyLocation) {
      const withData = chains.filter(c => c.matchedCount > 0 && c.nearestBranch);
      if (withData.length > 0) {
        const prices = withData.map(c => c.total);
        const dists = withData.map(c => c.nearestBranch!.distanceKm);
        const minP = Math.min(...prices), maxP = Math.max(...prices);
        const minD = Math.min(...dists), maxD = Math.max(...dists);
        const rangeP = maxP - minP || 1;
        const rangeD = maxD - minD || 1;
        const score = (c: PriceChainTotal): number => {
          if (c.matchedCount === 0) return Infinity;
          if (!c.nearestBranch) return Infinity;
          const p = (c.total - minP) / rangeP;
          const d = (c.nearestBranch.distanceKm - minD) / rangeD;
          return p * 0.5 + d * 0.5;
        };
        return chains.sort((a, b) => score(a) - score(b));
      }
    }
    if (sortMode === 'price') {
      // השוואה הוגנת: רשת שזיהתה פחות מוצרים נראית "זולה" באופן מטעה.
      // לכן מדרגים: ריקות בסוף → שלמות בראש לפי מחיר → חלקיות לפי כמות
      // המוצרים שזוהו (יותר זוהו = גבוה יותר), ובתוך אותו מספר זוהויים
      // לפי מחיר עולה.
      return chains.sort((a, b) => {
        const aEmpty = a.matchedCount === 0;
        const bEmpty = b.matchedCount === 0;
        if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
        if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
        if (a.isComplete && b.isComplete) return a.total - b.total;
        // שניהם חלקיים - יותר התאמות קודם, אז מחיר
        if (a.matchedCount !== b.matchedCount) return b.matchedCount - a.matchedCount;
        return a.total - b.total;
      });
    }
    // ברירת מחדל - סדר המחיר המקורי מהשרת
    return chains;
  }, [chainTotals, sortMode, hasAnyLocation]);

  // המנצח הוויזואלי לפי המיון הנוכחי - הראשון בסדר המתאים.
  // נחשב מקומית כדי שהסימון יתאים תמיד לסדר המוצג (ולא יסתור את 'isCheapest' מהשרת).
  const winnerId = useMemo(() => {
    if (sortMode === 'price') {
      // המנצח חייב לבוא מסל הוגן: שלמות קודם. אם אין - הרשתות עם מספר
      // ההתאמות המקסימלי (הכי קרוב לסל מלא), ובתוכן הזולה.
      const candidates = chainTotals.filter(c => c.matchedCount > 0);
      if (candidates.length === 0) return null;
      const completes = candidates.filter(c => c.isComplete);
      const pool = completes.length > 0
        ? completes
        : (() => {
            const maxMatched = Math.max(...candidates.map(c => c.matchedCount));
            return candidates.filter(c => c.matchedCount === maxMatched);
          })();
      return pool.reduce((best, c) => c.total < best.total ? c : best, pool[0]).chainId;
    }
    if (sortMode === 'distance') {
      // במצב "קרוב" - המנצח הוא הסניף הקרוב ביותר, גם אם אין לרשת מוצרים.
      const withLoc = chainTotals.filter(c => c.nearestBranch);
      if (withLoc.length === 0) return null;
      return withLoc.reduce((best, c) =>
        c.nearestBranch!.distanceKm < best.nearestBranch!.distanceKm ? c : best,
        withLoc[0]
      ).chainId;
    }
    // combined - הראשון בסדר הממויין
    return sortedChains.find(c => c.matchedCount > 0)?.chainId ?? null;
  }, [chainTotals, sortMode, sortedChains]);

  const winnerChain = winnerId ? chainTotals.find(c => c.chainId === winnerId) || null : null;

  // צבע אחיד למנצח בכל מצב מיון - ירוק (אותו "ירוק זול" של האפליקציה).
  // התווית בלבד מותאמת למצב.
  const winnerInfo = useMemo(() => {
    const label = sortMode === 'distance' ? 'הכי קרוב' : sortMode === 'combined' ? 'הכי משתלם' : 'הכי זול';
    return {
      label,
      main: '#10B981', dark: '#059669',
      bgLight: 'rgba(16,185,129,0.10)', bgDark: 'rgba(16,185,129,0.16)',
      borderLight: 'rgba(16,185,129,0.35)', borderDark: 'rgba(16,185,129,0.45)',
    };
  }, [sortMode]);

  const jumpToWinner = () => {
    if (!winnerChain) return;
    setExpandedId(winnerChain.chainId);
    requestAnimationFrame(() => {
      document.getElementById(`chain-row-${winnerChain.chainId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  if (chainTotals.length === 0) return null;

  // מציגים את כל הרשתות במאגר - גם אלו שלא מצאו אף התאמה (שקוף למשתמש שחיפשנו שם).
  const allChains = sortedChains;
  const chainsWithData = chainTotals.filter(c => c.matchedCount > 0);
  // המקסימום של מוצרים זוהו - משמש כסף ל"סל שלם"
  const maxMatched = chainsWithData.length > 0
    ? Math.max(...chainsWithData.map(c => c.matchedCount))
    : 0;
  const completeChains = chainsWithData.filter(c => c.isComplete);
  const maxSavings = completeChains.length > 1
    ? Math.max(...completeChains.map(c => c.savings))
    : 0;

  // מחשבים לכל מוצר באיזו רשת הוא הזול ביותר מכל הרשתות (לא רק בתוך רשת אחת).
  // זה מאפשר לסמן "זול" רק על רשת עם המחיר הזול ביותר לאותו מוצר.
  // אם 2 רשתות אותו מחיר - שתיהן מסומנות.
  const cheapestPriceByProduct = new Map<string, number>();
  for (const chain of chainsWithData) {
    for (const m of chain.matches) {
      if (!m.matched) continue;
      const current = cheapestPriceByProduct.get(m.productId);
      if (current === undefined || m.price < current) {
        cheapestPriceByProduct.set(m.productId, m.price);
      }
    }
  }

  return (
    <Box
      sx={{
        borderRadius: '16px',
        bgcolor: isDark ? 'rgba(20,184,166,0.04)' : 'rgba(20,184,166,0.03)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.12)',
        overflow: 'hidden',
      }}
    >
      {/* כותרת */}
      <Box
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          px: 2, py: 1.25,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
        }}
      >
        <StorefrontIcon sx={{ fontSize: 18, color: '#14B8A6' }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', flex: 1 }}>
          השוואה בין רשתות
        </Typography>
        {/* תג טריות נתונים - אותו רמזור צבעים כמו בכרטיס העליון, מזכיר ללקוח שהמחירים מתעדכנים */}
        {lastUpdatedISO && (() => {
          const { color, bg } = freshnessColor(lastUpdatedISO, isDark);
          return (
            <Box sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.3,
              px: 0.7, py: 0.2, borderRadius: '999px',
              bgcolor: bg, color,
              border: '1px solid', borderColor: `${color}33`,
              fontSize: 10, fontWeight: 800, letterSpacing: 0.2,
            }}>
              {formatRelative(lastUpdatedISO)}
            </Box>
          );
        })()}
        {/* תג חיסכון מוקטן - גודל פונט 9.5 במקום 11, ריווח קומפקטי יותר */}
        {maxSavings > 0 && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.25,
            px: 0.6, py: 0.15, borderRadius: '6px',
            bgcolor: '#10B98122', color: '#059669',
            fontSize: 9.5, fontWeight: 700,
          }}>
            <TrendingDownIcon sx={{ fontSize: 11 }} />
            חיסכון {formatPrice(maxSavings)}
          </Box>
        )}
      </Box>

      {/* בר מיון - מוצג תמיד. אופציות 'קרוב' ו-'משולב' מנוטרלות בלי מיקום
          ומציגות הנחיה להפעיל מיקום. */}
      <SortBar sortMode={sortMode} setSortMode={setSortMode} isDark={isDark} hasLocation={hasAnyLocation} />

      {/* הסבר קומפקטי - שורה דקה אחת ללא צבעי אזהרה */}
      {chainsWithData.some(c => !c.isComplete) && (
        <Box sx={{
          px: 2, py: 0.6,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.4 }}>
            מדורג לפי רשתות עם כל {maxMatched} המוצרים. חלקיות בסוף.
          </Typography>
        </Box>
      )}

      {/* רשימת רשתות - כולל רשתות ללא התאמות (שם מאגר עדיין קיים) */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {allChains.map((chain) => {
          const isWinner = chain.chainId === winnerId;
          const isComplete = chain.isComplete;
          const isEmpty = chain.matchedCount === 0;
          const isExpanded = expandedId === chain.chainId;

          return (
            <Box key={chain.chainId} id={`chain-row-${chain.chainId}`} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
              {/* שורת סיכום - לחיצה פותחת פירוט */}
              <Box
                onClick={() => setExpandedId(prev => prev === chain.chainId ? null : chain.chainId)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.25,
                  cursor: 'pointer',
                  position: 'relative',
                  userSelect: 'none',
                  // המנצח לפי המיון הנוכחי - תמיד מודגש ברקע יפה בצבע מתאים
                  bgcolor: isWinner
                    ? (isDark ? winnerInfo.bgDark : winnerInfo.bgLight)
                    : isEmpty
                      ? (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)')
                    : !isComplete
                      ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)')
                      : 'transparent',
                  // מסגרת עדינה בצבע המנצח לכל מצב מיון
                  boxShadow: isWinner
                    ? `inset 0 0 0 1.5px ${isDark ? winnerInfo.borderDark : winnerInfo.borderLight}`
                    : 'none',
                  // רשת ריקה - עוד יותר שקופה; חלקית - בינונית; שלמה - מלאה
                  opacity: isEmpty ? 0.55 : isComplete ? 1 : 0.72,
                  '&:active': { opacity: 0.85 },
                  transition: 'background-color 0.15s',
                }}
              >
                {/* פס צבע למנצח - גוון לפי מצב המיון */}
                {isWinner && (
                  <Box sx={{
                    position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0,
                    width: 3,
                    background: `linear-gradient(180deg, ${winnerInfo.main}, ${winnerInfo.dark})`,
                    animation: `${shimmer} 3s ease-in-out infinite`,
                    backgroundSize: '100% 200%',
                  }} />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: isWinner ? 800 : 600, color: 'text.primary' }}>
                      {chain.chainName}
                    </Typography>
                    {isWinner && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: winnerInfo.main, color: 'white',
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                      }}>
                        {winnerInfo.label}
                      </Box>
                    )}
                    {/* "אין נתונים היום" - הרשת לא פרסמה מחירים. אייקון שעון להבדל מ"אין התאמות" */}
                    {isEmpty && !chain.hasData && (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.3,
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#F59E0B22', color: '#B45309',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        <AccessTimeIcon sx={{ fontSize: 11 }} />
                        אין נתונים היום
                      </Box>
                    )}
                    {/* "אין התאמות" - הרשת פרסמה אבל אף מוצר לא זוהה במאגר. אייקון חיפוש */}
                    {isEmpty && chain.hasData && (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.3,
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        color: 'text.disabled',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        <SearchOffIcon sx={{ fontSize: 11 }} />
                        לא נמצאו במאגר הרשת
                      </Box>
                    )}
                    {!isComplete && !isEmpty && chain.unmatchedCount > 0 && (
                      <Box sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.3,
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#F59E0B22', color: '#F59E0B',
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                      }}>
                        <SearchOffIcon sx={{ fontSize: 11 }} />
                        {chain.unmatchedCount} לא נמצאו ברשת
                      </Box>
                    )}
                  </Box>
                  {/* "X מתוך Y מוצרים זוהו" - מודגש יותר בעזרת מספרים בגוון
                      טורקיז כדי שהמשתמש יראה במבט אחד את שיעור ההתאמה. */}
                  {!isEmpty ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.2, flexWrap: 'wrap' }}>
                      <Typography component="span" sx={{
                        fontSize: 12, fontWeight: 800,
                        color: isComplete ? '#059669' : '#0F766E',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {chain.matchedCount} / {chain.matchedCount + chain.unmatchedCount}
                      </Typography>
                      <Typography component="span" sx={{ fontSize: 11, color: 'text.secondary' }}>
                        מוצרים זוהו
                      </Typography>
                      {isComplete && (
                        <Box component="span" sx={{
                          display: 'inline-flex', alignItems: 'center', px: 0.5, py: 0.05,
                          borderRadius: '4px', bgcolor: 'rgba(16,185,129,0.15)',
                          color: '#059669', fontSize: 9, fontWeight: 800, letterSpacing: 0.3, ml: 0.3,
                        }}>
                          סל שלם
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.15 }}>
                      {!chain.hasData
                        ? `${chain.chainName} לא פרסמה מחירים היום - ננסה שוב בקרוב`
                        : `לא נמצאו התאמות במאגר של ${chain.chainName}`}
                    </Typography>
                  )}
                  {chain.nearestBranch ? (
                    <BranchInfo branch={chain.nearestBranch} isDark={isDark} onOpenPicker={setNavBranch} />
                  ) : !isEmpty && hasAnyLocation ? (
                    /* אין סניף במאגר - מוצג רק כשהמיקום פעיל. לפני אישור מיקום
                        אין סיבה לטעון "לא נמצא" - פשוט עוד לא חיפשנו. */
                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      mt: 0.5, p: 0.7, borderRadius: '8px',
                      bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
                      border: '1px dashed',
                      borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.25)',
                    }}>
                      <LocationOnIcon sx={{ fontSize: 12, color: 'text.disabled', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>
                        אין סניף של רשת זו במאגר שלנו
                      </Typography>
                    </Box>
                  ) : null}
                </Box>

                <Box sx={{ textAlign: 'end', minWidth: 78 }}>
                  <Typography sx={{
                    fontSize: 17, fontWeight: 800,
                    color: isWinner ? winnerInfo.dark : 'text.primary',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatPrice(chain.total)}
                  </Typography>
                  {/* תג חיסכון - רק במיון לפי מחיר, ורק לרשת שאינה הזולה */}
                  {sortMode === 'price' && chain.savings > 0 && !isWinner && isComplete && (
                    <Box sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.25,
                      mt: 0.3, px: 0.5, py: 0.15, borderRadius: '5px',
                      bgcolor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)',
                      color: '#DC2626',
                    }}>
                      <Typography sx={{ fontSize: 10, fontWeight: 800, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                        +{formatPrice(chain.savings)}
                      </Typography>
                    </Box>
                  )}
                  {/* בר יחסי דק - מציג ויזואלית את המיקום של הרשת בטווח המחירים.
                      הזולה = בר ירוק מלא; היקרה = בר אדום קצר. עוזר לעין לתפוס מבט. */}
                  {isComplete && totalRange > 0 && (() => {
                    const ratio = 1 - (chain.total - minTotalAcross) / totalRange;
                    const barColor = (isWinner && sortMode === 'price') ? '#10B981' : ratio > 0.5 ? '#14B8A6' : ratio > 0.2 ? '#F59E0B' : '#EF4444';
                    return (
                      <Box sx={{
                        mt: 0.4, height: 3, width: '100%',
                        borderRadius: '2px',
                        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                        overflow: 'hidden',
                      }}>
                        <Box sx={{
                          height: '100%', width: `${Math.max(8, ratio * 100)}%`,
                          bgcolor: barColor, borderRadius: '2px',
                          transition: 'width 0.3s, background-color 0.2s',
                        }} />
                      </Box>
                    );
                  })()}
                </Box>

                <ExpandMoreIcon sx={{
                  fontSize: 20, color: 'text.disabled',
                  transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }} />
              </Box>

              {/* פירוט המוצרים - מתרחב בלחיצה.
                  מיון: קודם מוצרים שזוהו מהזול ליקר (לפי מחיר יחידה), אחר כך לא זוהו.
                  3 הזולים ביותר מקבלים badge "הכי זול ברשת". */}
              <Collapse in={isExpanded} timeout={200} unmountOnExit>
                <Box sx={{
                  px: 1.25, py: 1.25,
                  display: 'flex', flexDirection: 'column', gap: 0.5,
                  bgcolor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.015)',
                }}>
                  {/* callout חיסכון - מוצג רק במיון לפי מחיר וקופץ לרשת הזולה */}
                  {sortMode === 'price' && chain.savings > 0 && !isWinner && isComplete && winnerChain && (
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); jumpToWinner(); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          jumpToWinner();
                        }
                      }}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.85,
                        px: 1.25, py: 0.85, mb: 0.5, borderRadius: '10px',
                        bgcolor: isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.07)',
                        border: '1px solid',
                        borderColor: isDark ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.25)',
                        cursor: 'pointer', userSelect: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        transition: 'background-color 0.12s, transform 0.1s',
                        '&:hover': { bgcolor: isDark ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.12)' },
                        '&:active': { transform: 'scale(0.98)' },
                      }}
                    >
                      <SavingsIcon sx={{ fontSize: 18, color: '#059669', flexShrink: 0 }} />
                      <Typography sx={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.35 }}>
                        תחסוך{' '}
                        <Box component="span" sx={{ color: '#059669', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                          {formatPrice(chain.savings)}
                        </Box>
                        {' '}ב-{winnerChain.chainName}
                      </Typography>
                      <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#059669', letterSpacing: 0.3, flexShrink: 0 }}>
                        הצג ←
                      </Typography>
                    </Box>
                  )}
                  {(() => {
                    const matched = [...chain.matches].filter(m => m.matched).sort((a, b) => a.price - b.price);
                    const unmatched = chain.matches.filter(m => !m.matched);
                    // "זול" מסמן כל מוצר שהמחיר ברשת הזו = המחיר הכי זול בכל הרשתות
                    // (לא רק הזול בתוך הרשת הזו). כך אם מוצר זול יותר במקום אחר,
                    // הוא לא יסומן כאן.
                    const cheapestAcrossIds = new Set(
                      matched
                        .filter(m => cheapestPriceByProduct.get(m.productId) === m.price)
                        .map(m => m.productId)
                    );
                    const hasAnyCheapest = cheapestAcrossIds.size > 0;
                    return (
                      <>
                        {matched.length > 0 && (
                          <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#0D9488', px: 0.5, mb: 0.25, letterSpacing: 0.5 }}>
                            {hasAnyCheapest
                              ? `${cheapestAcrossIds.size} מוצרים במחיר הטוב ביותר כאן`
                              : 'מחירים ברשת זו'}
                          </Typography>
                        )}
                        {matched.map(m => (
                          <ChainProductRow
                            key={m.productId}
                            m={m}
                            isDark={isDark}
                            isCheapestInChain={cheapestAcrossIds.has(m.productId)}
                          />
                        ))}
                        {unmatched.length > 0 && (
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', px: 0.5, mt: matched.length > 0 ? 0.75 : 0, mb: 0.25 }}>
                            לא זוהו ({unmatched.length})
                          </Typography>
                        )}
                        {unmatched.map(m => (
                          <ChainProductRow key={m.productId} m={m} isDark={isDark} />
                        ))}
                      </>
                    );
                  })()}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>

      {/* Picker לבחירת Waze/Google Maps/Apple Maps */}
      <NavigationPicker branch={navBranch} isDark={isDark} onClose={() => setNavBranch(null)} />
    </Box>
  );
});

ChainComparisonTable.displayName = 'ChainComparisonTable';
