import { memo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import DriveFileMoveRoundedIcon from '@mui/icons-material/DriveFileMoveRounded';
import { haptic } from '../../../global/helpers';
import { useSettings } from '../../../global/context/SettingsContext';
import type { ListFilter } from '../types/list-types';

// ===== בר פעולות בחירה מרובה - מוצג בתחתית המסך כשמצב בחירה פעיל =====
interface SelectionActionBarProps {
  filter: ListFilter;
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onExit: () => void;
  onToggleSelectAll: () => void;
  onBulkAction: () => void;
  onDelete: () => void;
  onMove: () => void;
}

export const SelectionActionBar = memo(({
  filter,
  selectedCount,
  totalCount,
  allSelected,
  onExit,
  onToggleSelectAll,
  onBulkAction,
  onDelete,
  onMove,
}: SelectionActionBarProps) => {
  const { t } = useSettings();

  return (
    <Box sx={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200,
      pb: 'max(16px, env(safe-area-inset-bottom))',
      px: 2, pt: 1.5,
      bgcolor: 'background.paper',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
      borderRadius: '20px 20px 0 0',
      animation: 'slideUp 0.25s ease-out',
      '@keyframes slideUp': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
    }}>
      {/* שורה עליונה: "בחר הכל" בצד ימין (ראשון ב-DOM ב-RTL), ואז מרווח,
          ובצד שמאל הספירה ("כמה מתוך כמה") וה-✕ בקצה. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
        <Box
          onClick={() => { haptic('light'); onToggleSelectAll(); }}
          sx={{
            height: 36, px: 2,
            borderRadius: '18px',
            bgcolor: allSelected ? 'primary.main' : 'rgba(20,184,166,0.1)',
            cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 0.75,
            '&:active': { transform: 'scale(0.95)' },
            transition: 'all 0.2s',
          }}
        >
          <Typography sx={{ fontSize: 16, color: allSelected ? 'white' : 'primary.main', lineHeight: 1 }}>
            {allSelected ? '☑' : '☐'}
          </Typography>
          <Typography sx={{
            fontSize: 13, fontWeight: 700,
            color: allSelected ? 'white' : 'primary.main',
          }}>
            {t('selectAllItems')}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        <Typography sx={{ fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
          <Typography component="span" sx={{ color: 'primary.main', fontWeight: 800, fontSize: 17 }}>
            {selectedCount}
          </Typography>
          <Typography component="span" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: 13 }}>
            {` ${t('selectedOfCount').replace('{total}', String(totalCount))}`}
          </Typography>
        </Typography>
        <Box
          onClick={onExit}
          sx={{
            width: 36, height: 36, borderRadius: '50%',
            bgcolor: 'action.hover',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
            '&:active': { transform: 'scale(0.9)', bgcolor: 'action.selected' },
            transition: 'all 0.15s',
          }}
        >
          <Typography sx={{ fontSize: 18, color: 'text.secondary', lineHeight: 1 }}>✕</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1 }}>
        {/* כפתור ראשי - סמן/החזר, בצבע מתאים */}
        {filter === 'purchased' ? (
          <Button
            variant="contained"
            disabled={selectedCount === 0}
            onClick={onBulkAction}
            sx={{
              flex: 1, borderRadius: '14px', textTransform: 'none', fontWeight: 700,
              fontSize: 14, py: 1.25, color: 'white !important',
              background: 'linear-gradient(135deg, #F59E0B, #D97706) !important',
              boxShadow: '0 4px 14px rgba(245,158,11,0.45)',
              '&:hover': { background: 'linear-gradient(135deg, #D97706, #B45309) !important', boxShadow: '0 6px 18px rgba(245,158,11,0.55)' },
              '&.Mui-disabled': {
                background: 'linear-gradient(135deg, #F59E0B, #D97706) !important',
                color: 'white !important',
                opacity: 0.55,
              },
            }}
          >
            {t('returnToList')}
          </Button>
        ) : (
          <Button
            variant="contained"
            disabled={selectedCount === 0}
            onClick={onBulkAction}
            sx={{
              flex: 1, borderRadius: '14px', textTransform: 'none', fontWeight: 700,
              fontSize: 14, py: 1.25, color: 'white !important',
              background: 'linear-gradient(135deg, #22C55E, #16A34A) !important',
              boxShadow: '0 4px 14px rgba(34,197,94,0.45)',
              '&:hover': { background: 'linear-gradient(135deg, #16A34A, #15803D) !important', boxShadow: '0 6px 18px rgba(34,197,94,0.55)' },
              '&.Mui-disabled': {
                background: 'linear-gradient(135deg, #22C55E, #16A34A) !important',
                color: 'white !important',
                opacity: 0.55,
              },
            }}
          >
            {t('markPurchased')}
          </Button>
        )}
        {/* כפתור מחיקה - בצד שמאל (בדום אחרון = שמאל ב-RTL), בלי אייקון */}
        <Button
          disabled={selectedCount === 0}
          onClick={onDelete}
          sx={{
            flex: 1, borderRadius: '14px', py: 1.25,
            fontSize: 14, fontWeight: 700, textTransform: 'none',
            bgcolor: 'rgba(239,68,68,0.08)',
            color: '#EF4444',
            border: '1.5px solid rgba(239,68,68,0.3)',
            '&:hover': { bgcolor: 'rgba(239,68,68,0.15)', borderColor: '#EF4444' },
            '&.Mui-disabled': { opacity: 0.4, color: '#EF4444' },
          }}
        >
          {t('delete')}
        </Button>
        {/* העברה לרשימה אחרת - icon-only, מושתק (בלי גרדיאנט/צל כמו שני
            הכפתורים הראשיים) ובקצה השורה, כי משתמשים בזה הרבה פחות. תמיד
            פעיל (לא מושבת גם כשאין רשימות אחרות) - MoveToListModal עצמו
            מסביר את המצב אם אין לאן להעביר, במקום כפתור מושתק בלי הסבר. */}
        <Button
          disabled={selectedCount === 0}
          onClick={onMove}
          aria-label={t('moveToList')}
          sx={{
            flex: '0 0 auto', width: 44, minWidth: 44, borderRadius: '14px',
            bgcolor: 'action.hover', color: 'text.secondary',
            '&:hover': { bgcolor: 'action.selected' },
            '&.Mui-disabled': { opacity: 0.4, color: 'text.secondary' },
          }}
        >
          <DriveFileMoveRoundedIcon sx={{ fontSize: 20 }} />
        </Button>
      </Box>
    </Box>
  );
});

SelectionActionBar.displayName = 'SelectionActionBar';
