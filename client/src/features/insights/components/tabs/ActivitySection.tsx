import { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { haptic } from '../../../../global/helpers';

interface ActivitySectionProps {
  title: string;
  icon: string;
  isDark: boolean;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

// כותרת סקציה גלויה + אפשרות קיפול לטאב "פעילות" - הטאב מציג הרבה כרטיסים
// ברצף אחד ארוך; זה נותן עוגני התמצאות בגלילה ושליטה אמיתית על האורך
// (לא רק ויזואלי - תוכן מקופל לא בגלילה בכלל).
export const ActivitySection = ({ title, icon, isDark, defaultExpanded = true, children }: ActivitySectionProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        onClick={() => { haptic('light'); setExpanded(e => !e); }}
        role="button"
        aria-expanded={expanded}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          py: 1, cursor: 'pointer', userSelect: 'none',
          '&:active': { opacity: 0.7 },
        }}
      >
        <Typography sx={{ fontSize: 15, lineHeight: 1 }}>{icon}</Typography>
        <Typography sx={{
          flex: 1, fontSize: 13, fontWeight: 800, letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: isDark ? '#5EEAD4' : '#0F766E',
        }}>
          {title}
        </Typography>
        <ExpandMoreIcon sx={{
          fontSize: 20, color: 'text.secondary',
          transform: expanded ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
        }} />
      </Box>
      <Collapse in={expanded} timeout={220}>
        <Box sx={{ pt: 0.5 }}>{children}</Box>
      </Collapse>
    </Box>
  );
};
