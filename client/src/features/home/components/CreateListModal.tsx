import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { LIST_ICONS, GROUP_ICONS, LIST_COLORS, SIZES } from '../../../global/helpers';
import { Modal, ClearableTextField, IconTile } from '../../../global/components';
import type { NewListForm } from '../types/home-types';
import { iconSelectSx, colorSelectSx } from '../helpers/homeStyles';
import { getIconGradient } from '../../../global/theme/iconArt';

interface CreateListModalProps {
  isGroup: boolean;
  newL: NewListForm;
  createError: string;
  creatingList: boolean;
  onClose: () => void;
  onUpdateField: <K extends keyof NewListForm>(field: K, value: NewListForm[K]) => void;
  onSubmit: () => void;
  t: (key: TranslationKeys) => string;
}

// מודאל יצירת רשימה פרטית/קבוצה - אותה טופס בדיוק, רק אייקונים/תוויות שונים.
export const CreateListModal = ({ isGroup, newL, createError, creatingList, onClose, onUpdateField, onSubmit, t }: CreateListModalProps) => {
  const icons = isGroup ? GROUP_ICONS : LIST_ICONS;

  return (
    <Modal title={isGroup ? t('newGroup') : t('privateList')} onClose={() => !creatingList && onClose()}>
      {createError && <Alert severity="error" sx={{ mb: 2, borderRadius: SIZES.radius.md }}>{createError}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2.5 }}>
        <IconTile emoji={newL.icon} color={newL.color} seedId={`${newL.icon}${newL.color}`} size={60} fontSize={28} />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>{isGroup ? t('groupName') : t('listName')}</Typography>
        <ClearableTextField autoFocus fullWidth value={newL.name} onChange={e => onUpdateField('name', e.target.value)} onClear={() => onUpdateField('name', '')} size="small" />
      </Box>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('icon')}</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
          {icons.map(i => (
            <Box key={i} onClick={() => onUpdateField('icon', i)} sx={iconSelectSx(newL.icon === i)}>{i}</Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('color')}</Typography>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
          {LIST_COLORS.map(c => (
            <Box key={c} onClick={() => onUpdateField('color', c)} sx={{ ...colorSelectSx(newL.color === c), background: getIconGradient(c) }} />
          ))}
        </Box>
      </Box>
      <Button variant="contained" fullWidth onClick={onSubmit} disabled={creatingList} sx={{ py: 1.25, fontSize: 15 }}>
        {creatingList ? <CircularProgress size={22} sx={{ color: 'white' }} /> : (isGroup ? t('createGroup') : t('createList'))}
      </Button>
    </Modal>
  );
};
