import { useState } from 'react';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import StarIcon from '@mui/icons-material/Star';
import StarOutlineIcon from '@mui/icons-material/StarOutline';
import { haptic } from '../../../../global/helpers';

interface SaveAsTemplateSectionProps {
  isTemplate: boolean;
  onToggle: (value: boolean) => Promise<void>;
}

// ===== כפתור שמירה/ביטול תבנית =====
export const SaveAsTemplateSection = ({ isTemplate, onToggle }: SaveAsTemplateSectionProps) => {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    haptic('light');
    setLoading(true);
    try {
      await onToggle(!isTemplate);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      mt: 1.5, mb: 1,
      border: '1.5px solid',
      borderColor: isTemplate ? 'warning.main' : 'divider',
      borderRadius: '14px',
      p: 1.5,
      bgcolor: isTemplate ? 'rgba(245,158,11,0.07)' : 'transparent',
      transition: 'all 0.2s ease',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {isTemplate
            ? <StarIcon sx={{ color: '#F59E0B', fontSize: 22 }} />
            : <StarOutlineIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
          }
          <Box>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: isTemplate ? '#B45309' : 'text.primary' }}>
              {isTemplate ? 'נשמר כתבנית' : 'שמור כתבנית'}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.3 }}>
              {isTemplate ? 'ניתן ליצור ממנה רשימות חדשות' : 'צור רשימות חדשות מהרשימה הזו'}
            </Typography>
          </Box>
        </Box>
        <Button
          size="small"
          variant={isTemplate ? 'outlined' : 'contained'}
          onClick={handleClick}
          disabled={loading}
          sx={{
            minWidth: 80, fontSize: 12.5, fontWeight: 700, textTransform: 'none',
            borderRadius: '10px', py: 0.6, px: 1.5, flexShrink: 0,
            ...(isTemplate
              ? { color: 'text.secondary', borderColor: 'divider', '&:hover': { borderColor: 'error.main', color: 'error.main', bgcolor: 'rgba(239,68,68,0.05)' } }
              : { bgcolor: '#F59E0B', '&:hover': { bgcolor: '#D97706' }, boxShadow: '0 2px 8px rgba(245,158,11,0.35)' }
            ),
          }}
        >
          {loading
            ? <CircularProgress size={16} sx={{ color: 'inherit' }} />
            : isTemplate ? 'בטל תבנית' : 'שמור'
          }
        </Button>
      </Box>
    </Box>
  );
};
