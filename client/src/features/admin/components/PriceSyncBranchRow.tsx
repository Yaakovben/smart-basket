import { Box, Typography, IconButton } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteIcon from '@mui/icons-material/Delete';
import { haptic } from '../../../global/helpers';
import type { ChainBranch } from '../types/priceSync-types';

interface PriceSyncBranchRowProps {
  branch: ChainBranch;
  isDark: boolean;
  onDelete: () => void;
}

// שורת סניף בודד ברשימת הסניפים של רשת - מקור נתונים, כתובת, קואורדינטות
export const PriceSyncBranchRow = ({ branch: b, isDark, onDelete }: PriceSyncBranchRowProps) => {
  // תג מקור הנתונים - אינדיקציה ברורה לאיך הסניף הגיע למאגר
  const sourceTag =
    b.storeId.startsWith('osm-') ? { label: 'OSM', color: '#0EA5E9' }
    : b.storeId.startsWith('manual-bulk-') ? { label: 'מאומת', color: '#10B981' }
    : b.storeId.startsWith('manual-') ? { label: 'ידני', color: '#10B981' }
    : b.coordSource === 'portal' ? { label: 'פורטל', color: '#10B981' }
    : b.coordSource === 'geocoded' ? { label: 'מקורב', color: '#F59E0B' }
    : { label: 'חסר מיקום', color: '#DC2626' };
  const fullAddress = [b.address, b.city].filter(Boolean).join(', ') || 'כתובת חסרה';
  return (
    <Box sx={{
      display: 'flex', alignItems: 'flex-start', gap: 0.75,
      p: 1, borderRadius: '8px',
      bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'white',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
    }}>
      <Box sx={{
        width: 26, height: 26, borderRadius: '8px',
        flexShrink: 0,
        bgcolor: b.hasCoords ? 'rgba(20,184,166,0.12)' : 'rgba(148,163,184,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <PlaceIcon sx={{ fontSize: 14, color: b.hasCoords ? '#14B8A6' : 'text.disabled' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.primary', lineHeight: 1.25, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {b.storeName}
          </Typography>
          <Box sx={{
            px: 0.6, py: 0.1, borderRadius: '4px',
            fontSize: 8.5, fontWeight: 800, letterSpacing: 0.3,
            bgcolor: `${sourceTag.color}1A`,
            color: sourceTag.color,
            flexShrink: 0,
          }}>
            {sourceTag.label}
          </Box>
        </Box>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25, lineHeight: 1.35 }}>
          📍 {fullAddress}
        </Typography>
        {b.hasCoords && (
          <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.15, fontFamily: 'monospace' }}>
            {b.lat?.toFixed(5)}, {b.lng?.toFixed(5)}
          </Typography>
        )}
      </Box>
      {/* כפתור 'פתח במפה' - חשוב מאוד! גם אם הכתובת חסרה,
          אפשר לראות מיד איפה הסניף ב-Google Maps. */}
      {b.hasCoords && (
        <IconButton
          size="small"
          onClick={() => {
            haptic('light');
            window.open(
              `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`,
              '_blank',
              'noopener,noreferrer'
            );
          }}
          aria-label="פתח במפה"
          title="פתח ב-Google Maps לזיהוי הסניף"
          sx={{
            width: 26, height: 26, flexShrink: 0,
            color: '#1A73E8',
            '&:hover': { bgcolor: 'rgba(26,115,232,0.1)' },
          }}
        >
          <OpenInNewIcon sx={{ fontSize: 13 }} />
        </IconButton>
      )}
      <IconButton
        size="small"
        onClick={onDelete}
        aria-label="מחק"
        sx={{
          width: 26, height: 26, flexShrink: 0,
          color: '#DC2626',
          '&:hover': { bgcolor: 'rgba(220,38,38,0.1)' },
        }}
      >
        <DeleteIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
};
