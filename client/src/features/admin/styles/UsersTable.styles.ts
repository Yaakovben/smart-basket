import { keyframes, type SxProps, type Theme } from '@mui/material';

export const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); }
`;

// ===== MethodBadge =====
export const methodBadgeSx = (size: number, color: string): SxProps<Theme> => ({
  width: size,
  height: size,
  borderRadius: '50%',
  bgcolor: `${color}14`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
});

// ===== ListCard =====
export const listCardSx = (isDark: boolean): SxProps<Theme> => ({
  display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.75, borderRadius: '10px',
  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)',
  border: '1px solid',
  borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
});
export const listCardIconBoxSx = (isGroup: boolean): SxProps<Theme> => ({
  width: 32, height: 32, borderRadius: '8px',
  bgcolor: isGroup ? 'rgba(59,130,246,0.1)' : 'rgba(20,184,166,0.1)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
});
export const listCardNameSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 12.5, fontWeight: 600, color: isDark ? '#E5E7EB' : '#374151',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
});
export const listCardProductCountSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 13, fontWeight: 700, color: isDark ? '#D1D5DB' : '#374151',
});

// ===== UserRow - כרטיס ראשי =====
export const userRowPaperSx = (isOnline: boolean, isDark: boolean, isRtl: boolean): SxProps<Theme> => ({
  borderRadius: '16px',
  overflow: 'hidden',
  boxShadow: isOnline
    ? (isDark ? '0 2px 8px rgba(34,197,94,0.15)' : '0 2px 8px rgba(34,197,94,0.1)')
    : '0 1px 4px rgba(0,0,0,0.06)',
  border: '1px solid',
  borderColor: isOnline
    ? (isDark ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.2)')
    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
  background: isOnline
    ? `linear-gradient(${isRtl ? '270deg' : '90deg'}, rgba(34,197,94,0.05), transparent 60%)`
    : (isDark ? 'rgba(255,255,255,0.03)' : 'white'),
});

export const userRowMainSx = (isDark: boolean): SxProps<Theme> => ({
  p: 1.5, display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer',
  transition: 'background-color 0.15s',
  '&:active': { bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
});

export const avatarCircleSx = (bgColor: string | undefined, isOnline: boolean, isDark: boolean, hasEmoji: boolean): SxProps<Theme> => ({
  width: 44, height: 44, borderRadius: '50%',
  bgcolor: bgColor || '#14B8A6',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  color: 'white', fontWeight: 700, fontSize: hasEmoji ? 20 : 16,
  boxShadow: isOnline ? '0 0 0 2.5px rgba(34,197,94,0.3)' : (isDark ? 'none' : '0 1px 3px rgba(0,0,0,0.1)'),
});

export const onlineDotSx = (isRtl: boolean, isOnline: boolean, isDark: boolean): SxProps<Theme> => ({
  position: 'absolute',
  bottom: 0,
  [isRtl ? 'left' : 'right']: 0,
  width: 13, height: 13, borderRadius: '50%',
  bgcolor: isOnline ? '#22C55E' : (isDark ? '#4B5563' : '#D1D5DB'),
  border: `2.5px solid ${isDark ? '#1F2937' : 'white'}`,
  ...(isOnline && { animation: `${pulse} 2.5s ease-in-out infinite` }),
});

export const userNameSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 14, fontWeight: 600, color: isDark ? '#F3F4F6' : '#1F2937',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
});
export const lastSeenSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 11.5, color: isDark ? '#6B7280' : '#9CA3AF',
});

export const loginCountBoxSx: SxProps<Theme> = {
  bgcolor: 'rgba(20,184,166,0.08)', borderRadius: '10px', px: 1, py: 0.5, textAlign: 'center', flexShrink: 0,
};

export const expandArrowSx = (isExpanded: boolean): SxProps<Theme> => ({
  fontSize: 22, color: '#9CA3AF', transition: 'transform 0.2s',
  transform: isExpanded ? 'rotate(180deg)' : 'none',
});

// ===== UserRow - אזור מורחב =====
// כרטיסי אירוע (רישום/פתיחה אחרונה) - זהים במבנה, רק צבע ה-accent משתנה
export const eventCardSx = (color: string): SxProps<Theme> => ({
  mb: 1, borderRadius: '12px', border: `1px solid ${color}26`, overflow: 'hidden',
});
export const eventHeaderSx = (color: string): SxProps<Theme> => ({
  display: 'flex', alignItems: 'center', gap: 1, px: 1.25, py: 0.75,
  bgcolor: `${color}0F`, borderBottom: `1px solid ${color}1A`,
});
export const eventTitleSx = (color: string): SxProps<Theme> => ({ fontSize: 11.5, fontWeight: 600, color });
export const eventBodySx: SxProps<Theme> = { px: 1.25, py: 1 };
export const eventDateSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 13, fontWeight: 500, color: isDark ? '#D1D5DB' : '#374151',
});

export const detailsButtonSx = (showDetails: boolean, isDark: boolean): SxProps<Theme> => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, py: 0.75, borderRadius: '10px', cursor: 'pointer',
  bgcolor: showDetails
    ? (isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.06)')
    : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
  border: '1px solid',
  borderColor: showDetails ? 'rgba(20,184,166,0.2)' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
  transition: 'all 0.2s',
  '&:active': { transform: 'scale(0.98)' },
});

export const listsSummaryLabelSx = (isDark: boolean): SxProps<Theme> => ({
  fontSize: 11.5, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 500,
});

// ציר זמן פעילות
export const timelineContainerSx = (isRtl: boolean): SxProps<Theme> => ({
  position: 'relative', [isRtl ? 'pr' : 'pl']: 2.5,
});
export const timelineLineSx = (isRtl: boolean, isDark: boolean): SxProps<Theme> => ({
  position: 'absolute', [isRtl ? 'right' : 'left']: 5, top: 6, bottom: 6, width: 2,
  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E5E7EB', borderRadius: 1,
});
export const timelineRowSx: SxProps<Theme> = { display: 'flex', alignItems: 'center', gap: 1, py: 0.5, position: 'relative' };
export const timelineDotSx = (isRtl: boolean, dotColor: string, isDark: boolean): SxProps<Theme> => ({
  position: 'absolute', [isRtl ? 'right' : 'left']: -16, width: 8, height: 8, borderRadius: '50%',
  bgcolor: dotColor,
  border: `2px solid ${isDark ? '#1F2937' : 'white'}`,
  boxShadow: `0 0 0 1px ${dotColor}40`,
});
