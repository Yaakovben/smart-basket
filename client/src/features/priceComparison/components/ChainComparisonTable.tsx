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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import NavigationIcon from '@mui/icons-material/Navigation';
import CloseIcon from '@mui/icons-material/Close';
import NearMeIcon from '@mui/icons-material/NearMe';
import MapIcon from '@mui/icons-material/Map';
import DirectionsIcon from '@mui/icons-material/Directions';
import type { PriceChainTotal, PriceMatch, NearestBranch } from '../types/priceComparison.types';
import { useSettings } from '../../../global/context/SettingsContext';

type SortMode = 'price' | 'distance' | 'combined';

interface Props {
  chainTotals: PriceChainTotal[];
}

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

const NavigationPicker = memo(({ branch, isDark, onClose }: {
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

  const apps: NavApp[] = [
    {
      key: 'waze',
      label: 'Waze',
      subtitle: 'ניווט בזמן אמת',
      icon: <NearMeIcon sx={{ fontSize: 22, color: '#fff' }} />,
      color: '#33CCFF',
      url: urls.waze,
    },
    {
      key: 'googleMaps',
      label: 'Google Maps',
      subtitle: 'מפות Google',
      icon: <DirectionsIcon sx={{ fontSize: 22, color: '#fff' }} />,
      color: '#1A73E8',
      url: urls.googleMaps,
    },
    {
      key: 'appleMaps',
      label: 'מפות (iOS)',
      subtitle: 'Apple Maps',
      icon: <MapIcon sx={{ fontSize: 22, color: '#fff' }} />,
      color: '#64748B',
      url: urls.appleMaps,
    },
  ];

  const NavRow = ({ app }: { app: NavApp }) => (
    <Box
      role="button"
      tabIndex={0}
      onClick={() => open(app.url)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') open(app.url); }}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 1.5, py: 1.25, borderRadius: '14px',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
        transition: 'background-color 0.12s, transform 0.12s, border-color 0.12s',
        '&:hover': {
          bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
          borderColor: `${app.color}66`,
        },
        '&:active': { transform: 'scale(0.985)' },
      }}
    >
      {/* אייקון במסגרת צבועה בצבע המותג - נראה מקצועי בלי אימוג'י */}
      <Box sx={{
        width: 42, height: 42, borderRadius: '12px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, ${app.color}, ${app.color}CC)`,
        boxShadow: `0 3px 10px ${app.color}55`,
        flexShrink: 0,
      }}>
        {app.icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
          {app.label}
        </Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.2, lineHeight: 1.3 }}>
          {app.subtitle}
        </Typography>
      </Box>
      <Box sx={{
        width: 28, height: 28, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        color: 'text.secondary',
        flexShrink: 0,
        fontSize: 16, fontWeight: 700,
      }}>
        ←
      </Box>
    </Box>
  );

  return (
    <Dialog
      open={!!branch}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: '22px', p: 0, m: 2, maxWidth: 380, width: '100%',
          bgcolor: isDark ? '#1E1B3A' : '#fff',
          boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
        },
      }}
    >
      {/* כותרת עם גרדיאנט סגול עדין - מקבץ של סניף + מרחק בראש, נראה מקצועי */}
      <Box sx={{
        background: 'linear-gradient(135deg, #7C3AED, #A78BFA)',
        color: 'white',
        px: 2, py: 1.75,
        borderRadius: '22px 22px 0 0',
        position: 'relative',
      }}>
        <IconButton
          size="small"
          onClick={onClose}
          aria-label="סגור"
          sx={{
            position: 'absolute', top: 8, insetInlineEnd: 8,
            color: 'rgba(255,255,255,0.9)',
            bgcolor: 'rgba(255,255,255,0.15)',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' },
            width: 28, height: 28,
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, pe: 4 }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            bgcolor: 'rgba(255,255,255,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <LocationOnIcon sx={{ fontSize: 22, color: 'white' }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 10.5, opacity: 0.85, fontWeight: 700, letterSpacing: 0.3, lineHeight: 1 }}>
              ניווט אל
            </Typography>
            <Typography sx={{
              fontSize: 15, fontWeight: 800, lineHeight: 1.3, mt: 0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {branch.branchName}
            </Typography>
          </Box>
          <Box sx={{
            flexShrink: 0, textAlign: 'center',
            px: 1, py: 0.4, borderRadius: '8px',
            bgcolor: 'rgba(255,255,255,0.2)',
          }}>
            <Typography sx={{ fontSize: 14, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {branch.distanceKm}
            </Typography>
            <Typography sx={{ fontSize: 9, opacity: 0.9, mt: 0.15 }}>
              ק״מ
            </Typography>
          </Box>
        </Box>

        {(branch.city || branch.address) && (
          <Typography sx={{
            fontSize: 11, opacity: 0.92, mt: 0.85, lineHeight: 1.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {[branch.city, branch.address].filter(Boolean).join(' · ')}
          </Typography>
        )}
      </Box>

      {/* רשימת האפליקציות */}
      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 0.85 }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', px: 0.5, letterSpacing: 0.4 }}>
          בחר אפליקציית ניווט
        </Typography>
        {apps.map(app => <NavRow key={app.key} app={app} />)}
      </Box>

      <Typography sx={{
        fontSize: 10, color: 'text.disabled', textAlign: 'center',
        pb: 1.5, px: 2, lineHeight: 1.45,
      }}>
        אם האפליקציה לא מותקנת היא תיפתח בדפדפן
      </Typography>
    </Dialog>
  );
});
NavigationPicker.displayName = 'NavigationPicker';

// תג מרחק + כפתור ניווט - מוצג לכל רשת כשהמשתמש שיתף מיקום.
// הלחיצה על הכפתור פותחת picker (לא ישיר לאפליקציה) - המשתמש בוחר.
const BranchInfo = memo(({ branch, isDark, onOpenPicker }: {
  branch: NearestBranch; isDark?: boolean; onOpenPicker: (b: NearestBranch) => void;
}) => (
  <Box
    onClick={(e) => { e.stopPropagation(); }}
    sx={{
      display: 'flex', alignItems: 'center', gap: 0.5,
      mt: 0.35,
    }}
  >
    <LocationOnIcon sx={{ fontSize: 12, color: '#7C3AED', flexShrink: 0 }} />
    <Typography sx={{
      fontSize: 10.5, color: 'text.secondary', fontWeight: 600,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      minWidth: 0, flex: 1,
    }}>
      <b style={{ color: isDark ? '#A78BFA' : '#7C3AED' }}>{branch.distanceKm} ק״מ</b>
      {' · '}{branch.branchName}
    </Typography>
    <IconButton
      size="small"
      onClick={(e) => { e.stopPropagation(); onOpenPicker(branch); }}
      aria-label={`נווט ל${branch.branchName}`}
      sx={{
        width: 24, height: 24, flexShrink: 0,
        bgcolor: isDark ? 'rgba(124,58,237,0.2)' : 'rgba(124,58,237,0.1)',
        color: '#7C3AED',
        '&:hover': { bgcolor: isDark ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.18)' },
      }}
    >
      <NavigationIcon sx={{ fontSize: 13 }} />
    </IconButton>
  </Box>
));
BranchInfo.displayName = 'BranchInfo';

// בר מיון - מוצג רק כשיש מידע מיקום לפחות ברשת אחת.
const SortBar = memo(({ sortMode, setSortMode, isDark }: {
  sortMode: SortMode; setSortMode: (m: SortMode) => void; isDark?: boolean;
}) => {
  const Chip = ({ mode, emoji, label }: { mode: SortMode; emoji: string; label: string }) => {
    const active = sortMode === mode;
    return (
      <Box
        role="button"
        tabIndex={0}
        onClick={() => setSortMode(mode)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSortMode(mode); }}
        sx={{
          flex: 1, minWidth: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
          py: 0.75, px: 1, borderRadius: '10px',
          cursor: 'pointer', userSelect: 'none',
          WebkitTapHighlightColor: 'transparent',
          bgcolor: active
            ? (isDark ? 'rgba(124,58,237,0.28)' : 'rgba(124,58,237,0.14)')
            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
          border: '1.5px solid',
          borderColor: active
            ? '#7C3AED'
            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
          transition: 'all 0.12s',
          '&:active': { opacity: 0.8 },
        }}
      >
        <Box sx={{ fontSize: 14, lineHeight: 1 }}>{emoji}</Box>
        <Typography sx={{ fontSize: 11.5, fontWeight: active ? 800 : 600, color: active ? '#7C3AED' : 'text.primary' }}>
          {label}
        </Typography>
      </Box>
    );
  };

  return (
    <Box sx={{ display: 'flex', gap: 0.75, px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Chip mode="price" emoji="💰" label="זול" />
      <Chip mode="distance" emoji="📍" label="קרוב" />
      <Chip mode="combined" emoji="⚖️" label="משולב" />
    </Box>
  );
});
SortBar.displayName = 'SortBar';

export const ChainComparisonTable = memo(({ chainTotals }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // מצב מיון - נפתח רק אם יש נתוני מיקום; אחרת תמיד 'price'
  const [sortMode, setSortMode] = useState<SortMode>('price');
  // ה-branch שנבחר לפתיחת picker ניווט
  const [navBranch, setNavBranch] = useState<NearestBranch | null>(null);

  // האם יש מיקום לפחות לרשת אחת - מפעיל את בר המיון
  const hasAnyLocation = chainTotals.some(c => c.nearestBranch);

  // מיון לפי מצב. 'price' = ההגיון המקורי (שלמות קודם, לפי מחיר).
  // 'distance' = רשתות עם מיקום ממוינות לפי מרחק; אחרות נדחקות לסוף.
  // 'combined' = ציון מנורמל של מחיר+מרחק במשקל שווה.
  const sortedChains = useMemo(() => {
    const chains = [...chainTotals];
    if (sortMode === 'distance' && hasAnyLocation) {
      return chains.sort((a, b) => {
        // רשתות בלי נתונים/התאמות בסוף
        const aEmpty = a.matchedCount === 0;
        const bEmpty = b.matchedCount === 0;
        if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
        // רשתות עם מיקום לפני רשתות בלי מיקום
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
    // ברירת מחדל - סדר המחיר המקורי מהשרת
    return chains;
  }, [chainTotals, sortMode, hasAnyLocation]);

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
        {maxSavings > 0 && (
          <Box sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 1, py: 0.3, borderRadius: '8px',
            bgcolor: '#10B98122', color: '#059669',
            fontSize: 11, fontWeight: 700,
          }}>
            <TrendingDownIcon sx={{ fontSize: 13 }} />
            חיסכון עד ₪{maxSavings.toFixed(0)}
          </Box>
        )}
      </Box>

      {/* בר מיון - רק כשיש לפחות מיקום אחד. מאפשר זול/קרוב/משולב */}
      {hasAnyLocation && <SortBar sortMode={sortMode} setSortMode={setSortMode} isDark={isDark} />}

      {/* הסבר — מופיע רק אם יש רשתות חלקיות */}
      {chainsWithData.some(c => !c.isComplete) && (
        <Box sx={{
          display: 'flex', alignItems: 'flex-start', gap: 0.75,
          px: 2, py: 1,
          bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.05)',
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(245,158,11,0.18)' : 'rgba(245,158,11,0.15)',
        }}>
          <WarningAmberIcon sx={{ fontSize: 15, color: '#F59E0B', flexShrink: 0, mt: 0.2 }} />
          <Typography sx={{ fontSize: 11, color: 'text.secondary', lineHeight: 1.5 }}>
            רק רשתות שמצאו את כל <b>{maxMatched}</b> המוצרים מדורגות להשוואה הוגנת.
            רשתות עם פחות התאמות מוצגות בסוף.
          </Typography>
        </Box>
      )}

      {/* רשימת רשתות - כולל רשתות ללא התאמות (שם מאגר עדיין קיים) */}
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        {allChains.map((chain) => {
          const isCheapest = chain.isCheapest;
          const isComplete = chain.isComplete;
          const isEmpty = chain.matchedCount === 0;
          const isExpanded = expandedId === chain.chainId;

          return (
            <Box key={chain.chainId} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
              {/* שורת סיכום - לחיצה פותחת פירוט */}
              <Box
                onClick={() => setExpandedId(prev => prev === chain.chainId ? null : chain.chainId)}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  px: 2, py: 1.25,
                  cursor: 'pointer',
                  position: 'relative',
                  userSelect: 'none',
                  bgcolor: isCheapest
                    ? (isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
                    : isEmpty
                      ? (isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.025)')
                    : !isComplete
                      ? (isDark ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)')
                      : 'transparent',
                  // רשת ריקה - עוד יותר שקופה; חלקית - בינונית; שלמה - מלאה
                  opacity: isEmpty ? 0.55 : isComplete ? 1 : 0.72,
                  '&:active': { opacity: 0.85 },
                  transition: 'background-color 0.15s',
                }}
              >
                {/* פס ירוק לזולה ביותר */}
                {isCheapest && (
                  <Box sx={{
                    position: 'absolute', top: 0, bottom: 0, insetInlineStart: 0,
                    width: 3,
                    background: 'linear-gradient(180deg, #10B981, #059669)',
                    animation: `${shimmer} 3s ease-in-out infinite`,
                    backgroundSize: '100% 200%',
                  }} />
                )}

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: 14, fontWeight: isCheapest ? 800 : 600, color: 'text.primary' }}>
                      {chain.chainName}
                    </Typography>
                    {isCheapest && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#10B981', color: 'white',
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                      }}>
                        הכי זול
                      </Box>
                    )}
                    {isEmpty && !chain.hasData && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#F59E0B22', color: '#B45309',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        אין נתונים היום
                      </Box>
                    )}
                    {isEmpty && chain.hasData && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        color: 'text.disabled',
                        fontSize: 9.5, fontWeight: 700, letterSpacing: 0.3,
                      }}>
                        אין התאמות
                      </Box>
                    )}
                    {!isComplete && !isEmpty && chain.unmatchedCount > 0 && (
                      <Box sx={{
                        px: 0.75, py: 0.15, borderRadius: '6px',
                        bgcolor: '#F59E0B22', color: '#F59E0B',
                        fontSize: 9.5, fontWeight: 800, letterSpacing: 0.3,
                      }}>
                        לא זוהו {chain.unmatchedCount} מוצרים
                      </Box>
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.15 }}>
                    {isEmpty && !chain.hasData
                      ? `${chain.chainName} לא פרסמה מחירים היום - ננסה שוב בקרוב`
                      : isEmpty
                        ? `לא נמצאו התאמות במאגר של ${chain.chainName}`
                        : `${chain.matchedCount} / ${chain.matchedCount + chain.unmatchedCount} מוצרים זוהו`}
                  </Typography>
                  {chain.nearestBranch && (
                    <BranchInfo branch={chain.nearestBranch} isDark={isDark} onOpenPicker={setNavBranch} />
                  )}
                </Box>

                <Box sx={{ textAlign: 'end' }}>
                  <Typography sx={{
                    fontSize: 17, fontWeight: 800,
                    color: isCheapest ? '#059669' : 'text.primary',
                    lineHeight: 1.1,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    ₪{chain.total.toFixed(0)}
                  </Typography>
                  {chain.savings > 0 && !isCheapest && isComplete && (
                    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
                      +₪{chain.savings.toFixed(0)}
                    </Typography>
                  )}
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
