import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { getIconGradient, getIconGlow, hashSeed, SQUIRCLE_RADIUS } from '../theme/iconArt';
import { IconPattern } from './IconPattern';

interface IconTileProps {
  emoji: string;
  color?: string;
  seedId: string;
  size?: number;
  fontSize?: number;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}

// "אריח גרדיאנט חי" - מחליף את כל ה-Box{bgcolor:flat}+emoji הישנים
// (ListCard/ListHeader/MoveToListModal/CreateListModal/EditListBasicFields
// /SavedListsModal/EmptyState). גרדיאנט+glow+דפוס נגזרים מ-color+seedId
// בלבד (ראו iconArt.ts) - שום שדה חדש ב-DB.
export const IconTile = ({ emoji, color, seedId, size = 48, fontSize, onClick, ariaLabel, sx }: IconTileProps) => {
  const seed = hashSeed(seedId);
  // אין color (רשימות קבועות, שאין להן שדה צבע) - נופל לאחד מ-2 גוונים
  // קבועים לפי seed, לא צבע אקראי בכל render.
  const effectiveColor = color ?? (seed % 2 === 0 ? '#14B8A6' : '#8B5CF6');

  return (
    <Box
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      sx={{
        position: 'relative', overflow: 'hidden',
        width: size, height: size, borderRadius: SQUIRCLE_RADIUS,
        background: getIconGradient(effectiveColor),
        boxShadow: getIconGlow(effectiveColor),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, cursor: onClick ? 'pointer' : undefined,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '&:active': onClick ? { transform: 'scale(0.88)' } : undefined,
        ...sx,
      }}
    >
      <IconPattern seed={seed} size={size} />
      {/* ברק זכוכיתי אלכסוני - טכניקת "glossy tile" קלאסית (אייקוני iOS
          וכו') שנותנת עומק/פרימיום לגרדיאנט השטוח, בלי תלות בצבע/seed. */}
      <Box aria-hidden="true" sx={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(135deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)',
        pointerEvents: 'none',
      }} />
      <Box component="span" sx={{ fontSize: fontSize ?? Math.round(size * 0.5), lineHeight: 1, position: 'relative', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))' }}>
        {emoji}
      </Box>
    </Box>
  );
};
