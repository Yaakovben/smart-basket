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
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4,
        py: 0.7, px: 1, borderRadius: '10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        userSelect: 'none', WebkitTapHighlightColor: 'transparent',
        bgcolor: active && !disabled
          ? (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.13)')
          : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
        border: '1.5px solid',
        borderColor: active && !disabled ? '#14B8A6' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'),
        transition: 'all 0.12s',
        '&:active': disabled ? {} : { transform: 'scale(0.98)' },
      }}
    >
      <Box sx={{ fontSize: 13 }}>{emoji}</Box>
      <Typography sx={{
        fontSize: 12, fontWeight: active && !disabled ? 800 : 700,
        color: active && !disabled ? '#14B8A6' : 'text.primary',
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
              width: 40, height: 40, borderRadius: '10px',
              bgcolor: isDark ? 'rgba(20,184,166,0.14)' : 'rgba(20,184,166,0.1)',
              border: '1.5px solid', borderColor: isDark ? 'rgba(20,184,166,0.3)' : 'rgba(20,184,166,0.25)',
              '&:hover': { bgcolor: isDark ? 'rgba(20,184,166,0.22)' : 'rgba(20,184,166,0.18)' },
            }}
          >
            <MapOutlinedIcon sx={{ fontSize: 19, color: '#0D9488' }} />
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
