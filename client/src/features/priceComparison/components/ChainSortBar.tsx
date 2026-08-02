import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import { haptic } from '../../../global/helpers';
import type { SortMode } from '../helpers/priceComparisonCardHelpers';

interface SortChipProps {
  mode: SortMode;
  emoji: string;
  label: string;
  requiresLoc?: boolean;
  sortMode: SortMode;
  hasAnyLocation: boolean;
  isDark: boolean;
  onSelect: (mode: SortMode) => void;
}

const SortChip = ({ mode, emoji, label, requiresLoc, sortMode, hasAnyLocation, isDark, onSelect }: SortChipProps) => {
  const active = sortMode === mode;
  const disabled = requiresLoc && !hasAnyLocation;
  return (
    <Box
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => { if (!disabled) { haptic('light'); onSelect(mode); } }}
      sx={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3,
        // גובה קטן במכוון: אלה מסנני-משנה, לא ניווט ראשי
        py: 0.45, px: 0.75, borderRadius: '8px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        bgcolor: active && !disabled
          ? (isDark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.1)')
          : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
        border: '1px solid',
        borderColor: active && !disabled ? 'rgba(20,184,166,0.55)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'),
        transition: 'all 0.12s',
        '&:active': disabled ? {} : { transform: 'scale(0.97)' },
      }}
    >
      <Box sx={{ fontSize: 11 }}>{emoji}</Box>
      <Typography sx={{
        fontSize: 11, fontWeight: active && !disabled ? 700 : 600,
        color: active && !disabled ? '#0D9488' : 'text.secondary',
        letterSpacing: 0.1,
      }}>
        {label}
      </Typography>
    </Box>
  );
};

interface ChainSortBarProps {
  sortMode: SortMode;
  setSortMode: (m: SortMode) => void;
  hasAnyLocation: boolean;
  isDark: boolean;
  onOpenMap?: () => void;
}

// בר מיון - תמיד גלוי. "קרוב"/"משולב" מעומעמים בלי מיקום.
// כפתור המפה יושב כאן בכוונה - זו בדיוק השורה שבה המשתמש כבר חושב על
// מרחק/מיקום (מיון "קרוב"), אז "הצג על מפה" הוא המשך טבעי של אותה כוונה
// במקום פעולה מנותקת שצפה בראש הכרטיס.
export const ChainSortBar = ({ sortMode, setSortMode, hasAnyLocation, isDark, onOpenMap }: ChainSortBarProps) => (
  <Box sx={{ mb: 1.25 }}>
    {/* תווית "מיין לפי:" - מבהירה שאלה מסנני-משנה, לא ניווט ראשי */}
    <Typography sx={{
      fontSize: 10, fontWeight: 600, color: 'text.disabled',
      letterSpacing: 0.5, mb: 0.5, px: 0.25,
    }}>
      מיין לפי:
    </Typography>
    <Box sx={{ display: 'flex', gap: 0.5, px: 0.25 }}>
      <SortChip mode="distance" emoji="📍" label="קרוב" requiresLoc sortMode={sortMode} hasAnyLocation={hasAnyLocation} isDark={isDark} onSelect={setSortMode} />
      <SortChip mode="price" emoji="💰" label="זול" sortMode={sortMode} hasAnyLocation={hasAnyLocation} isDark={isDark} onSelect={setSortMode} />
      <SortChip mode="combined" emoji="⚖️" label="משולב" requiresLoc sortMode={sortMode} hasAnyLocation={hasAnyLocation} isDark={isDark} onSelect={setSortMode} />
      {onOpenMap && (
        <Tooltip title="הצג את כל הסניפים על מפה">
          <IconButton
            onClick={() => { haptic('light'); onOpenMap(); }}
            aria-label="הצג את כל הסניפים על מפה"
            sx={{
              // ברירת מחדל: ghost ניטרלי - לא נראה לחוץ. רק hover נותן אינדיקציה.
              // כך לא מתבלבל עם chip פעיל (שיש לו רקע turquoise).
              width: 32, height: 32, borderRadius: '8px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.09)',
              '&:hover': {
                bgcolor: isDark ? 'rgba(20,184,166,0.16)' : 'rgba(20,184,166,0.10)',
                borderColor: 'rgba(20,184,166,0.5)',
              },
              transition: 'all 0.12s',
            }}
          >
            <MapOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </IconButton>
        </Tooltip>
      )}
    </Box>
    {!hasAnyLocation && (
      <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.4, textAlign: 'center', fontStyle: 'italic' }}>
        שתף מיקום כדי למיין לפי קרבה
      </Typography>
    )}
  </Box>
);
