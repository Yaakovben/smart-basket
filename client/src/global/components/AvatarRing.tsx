import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';
import { getIconStops, getIconGradient, getIconTintRing, hashSeed } from '../theme/iconArt';

interface AvatarRingProps {
  emoji?: string;
  initials: string;
  color?: string;
  seedId: string;
  size?: number;
  onClick?: () => void;
  sx?: SxProps<Theme>;
}

// אווטאר עגול עם טבעת גרדיאנט קבועה (בסגנון "story ring", בלי סיבוב -
// היה מוסח מדי על מסך הפרופיל שבו האווטאר גדול ותפוס תשומת לב) - מחליף
// את ה-Avatar{bgcolor:flat} הישן. שימוש: MemberAvatar.tsx (עוטף את זה +
// נקודת "מחובר"), HomeHeader.tsx, ProfileComponent.tsx.
export const AvatarRing = ({ emoji, initials, color, seedId, size = 44, onClick, sx }: AvatarRingProps) => {
  const seed = hashSeed(seedId);
  const [light, dark] = getIconStops(color);
  const gradient = getIconGradient(color);
  const ringWidth = Math.max(2, Math.round(size * 0.06));
  // זווית התחלה של הטבעת נגזרת מה-seed - שתי אווטארים באותו צבע לא
  // מתחילים באותה נקודה בדיוק בסיבוב.
  const startDeg = seed % 360;

  return (
    <Box
      onClick={onClick}
      sx={{
        position: 'relative', width: size, height: size, borderRadius: '50%',
        flexShrink: 0, cursor: onClick ? 'pointer' : undefined,
        p: `${ringWidth}px`,
        background: `conic-gradient(from ${startDeg}deg, ${light}, ${dark}, ${light})`,
        // אווטארים הם UI משני - טבעת עדינה + צל דק נייטרלי, בלי ה-glow הצבעוני
        // החזק של אריח-רשימה (getIconGlow). היה "צועק" יחסית לשאר האפליקציה.
        boxShadow: `${getIconTintRing(color)}, 0 1px 4px rgba(0,0,0,0.14)`,
        transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        '&:active': onClick ? { transform: 'scale(0.9)' } : undefined,
        ...sx,
      }}
    >
      <Box sx={{
        position: 'relative', overflow: 'hidden',
        width: '100%', height: '100%', borderRadius: '50%',
        background: gradient,
        border: '2px solid', borderColor: 'background.paper',
        boxSizing: 'border-box',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: emoji ? size * 0.5 : size * 0.4,
        fontWeight: 700, color: 'white', lineHeight: 1,
      }}>
        {/* ברק זכוכיתי עדין (מעומעם מ-IconTile - כאן הוא על עיגול קטן ומשני) */}
        <Box aria-hidden="true" sx={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 45%)',
          pointerEvents: 'none',
        }} />
        <Box component="span" sx={{ position: 'relative' }}>{emoji || initials}</Box>
      </Box>
    </Box>
  );
};
