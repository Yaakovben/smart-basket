import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import PlaylistAddRoundedIcon from '@mui/icons-material/PlaylistAddRounded';
import BookmarkAddRoundedIcon from '@mui/icons-material/BookmarkAddRounded';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { Modal } from '../../../../global/components';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';

// ===== בורר "רשימות קבועות" =====
// נפתח מכניסה אחת מאוחדת בתפריט ה-⋮ (שילוב "שמור כרשימה קבועה" ו-"ניהול
// רשימות קבועות" לכניסה אחת, כדי לא להציף את התפריט בשני פריטים חופפים).
// מציע שתי פעולות: (א) הוספת רשימה קבועה קיימת לרשימה הנוכחית - פותח את
// SavedListsModal, שכבר תומך גם בניהול וגם בהחלה; (ב) יצירת רשימה קבועה
// חדשה מהמוצרים הנוכחיים - פותח את SaveAsSavedListModal, מושבת אם אין
// מוצרים ברשימה (אין מה לשמור).
interface SavedListsChooserModalProps {
  hasProducts: boolean;
  onApply: () => void;
  onCreate: () => void;
  onClose: () => void;
}

export const SavedListsChooserModal = memo(({ hasProducts, onApply, onCreate, onClose }: SavedListsChooserModalProps) => {
  const { t } = useSettings();

  const handleApply = () => { haptic('light'); onApply(); };
  const handleCreate = () => { if (!hasProducts) return; haptic('light'); onCreate(); };

  return (
    <Modal title={t('savedLists')} onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box
          onClick={handleApply}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
            borderRadius: '14px', border: '1px solid', borderColor: 'divider',
            cursor: 'pointer', userSelect: 'none', WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.1s',
            '&:active': { bgcolor: 'action.hover' },
          }}
        >
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(20,184,166,0.12)', color: 'primary.main',
          }}>
            <PlaylistAddRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
              {t('savedListsChooserApplyTitle')}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.15 }}>
              {t('savedListsChooserApplyDesc')}
            </Typography>
          </Box>
          <ChevronLeftIcon sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }} />
        </Box>

        <Box
          onClick={handleCreate}
          aria-disabled={!hasProducts}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
            borderRadius: '14px', border: '1px solid', borderColor: 'divider',
            cursor: hasProducts ? 'pointer' : 'default',
            opacity: hasProducts ? 1 : 0.5,
            userSelect: 'none', WebkitTapHighlightColor: 'transparent',
            transition: 'background-color 0.1s',
            '&:active': hasProducts ? { bgcolor: 'action.hover' } : undefined,
          }}
        >
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: 'rgba(20,184,166,0.12)', color: 'primary.main',
          }}>
            <BookmarkAddRoundedIcon sx={{ fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary' }}>
              {t('savedListsChooserCreateTitle')}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.15 }}>
              {hasProducts ? t('savedListsChooserCreateDesc') : t('savedListsChooserCreateDisabledDesc')}
            </Typography>
          </Box>
          {hasProducts && <ChevronLeftIcon sx={{ color: 'text.secondary', fontSize: 20, flexShrink: 0 }} />}
        </Box>
      </Box>
    </Modal>
  );
});

SavedListsChooserModal.displayName = 'SavedListsChooserModal';
