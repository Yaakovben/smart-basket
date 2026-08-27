import { memo } from 'react';
import { Box, Typography } from '@mui/material';
import type { List } from '../../../global/types';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';

interface MoveToListModalProps {
  lists: List[];
  onSelect: (listId: string) => void;
  onClose: () => void;
}

// בורר רשימת יעד להעברת מוצרים - בשימוש מתוך בחירה מרובה (ראה
// SelectionActionBar, שם הכפתור תמיד פעיל - לא מנוטרל גם כשאין רשימות
// אחרות). אם אין לאן להעביר, המודל מציג הסבר במקום רשימת יעדים ריקה
// בשקט - כדי שהמשתמש יבין שצריך קודם ליצור רשימה נוספת.
export const MoveToListModal = memo(({ lists, onSelect, onClose }: MoveToListModalProps) => {
  const { t } = useSettings();

  if (lists.length === 0) {
    return (
      <Modal title={t('moveToList')} onClose={onClose}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography sx={{ fontSize: 36, mb: 1.5 }} role="img" aria-hidden="true">📋</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
            {t('moveToListNoOtherListsTitle')}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', maxWidth: 260, mx: 'auto', lineHeight: 1.6 }}>
            {t('moveToListNoOtherListsDesc')}
          </Typography>
        </Box>
      </Modal>
    );
  }

  return (
    <Modal title={t('moveToList')} onClose={onClose}>
      {/* הסבר קצר */}
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.55, mb: 2 }}>
        {t('moveToListHint')}
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
        {lists.map((l) => (
          <Box
            key={l.id}
            role="button"
            onClick={() => { haptic('light'); onSelect(l.id); }}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.25,
              p: 1.25, borderRadius: '14px',
              bgcolor: 'action.hover',
              cursor: 'pointer',
              '&:active': { bgcolor: 'action.selected' },
              transition: 'background-color 0.15s',
            }}
          >
            <Box sx={{
              width: 40, height: 40, borderRadius: '12px', bgcolor: l.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, flexShrink: 0,
            }}>
              {l.icon}
            </Box>
            <Typography sx={{ fontSize: 14.5, fontWeight: 600, color: 'text.primary', flex: 1, minWidth: 0 }} noWrap>
              {l.name}
            </Typography>
          </Box>
        ))}
      </Box>
    </Modal>
  );
});
MoveToListModal.displayName = 'MoveToListModal';
