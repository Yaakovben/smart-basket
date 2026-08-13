import { memo } from 'react';
import { Button, CircularProgress } from '@mui/material';
import type { List } from '../../../../global/types';
import { haptic, LIST_ICONS, GROUP_ICONS } from '../../../../global/helpers';
import { Modal } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';
import type { EditListForm } from '../../types/list-types';
import { EditListBasicFields } from './EditListBasicFields';
import { ChangePasswordSection } from './ChangePasswordSection';
import { ConvertToGroupSection } from './ConvertToGroupSection';
import { ConvertToPrivateSection } from './ConvertToPrivateSection';

// ===== מודאל עריכת רשימה =====
interface EditListModalProps {
  isOpen: boolean;
  list: List;
  editData: EditListForm | null;
  hasChanges: boolean;
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
  onUpdateData: (data: EditListForm) => void;
  onConvertToGroup?: (password: string) => void | Promise<void>;
  onConvertToPrivate?: () => void | Promise<void>;
  onChangePassword?: (password: string) => void | Promise<void>;
}

export const EditListModal = memo(({
  isOpen,
  list,
  editData,
  hasChanges,
  saving = false,
  onClose,
  onSave,
  onUpdateData,
  onConvertToGroup,
  onConvertToPrivate,
  onChangePassword,
}: EditListModalProps) => {
  const { t } = useSettings();

  if (!isOpen || !editData) return null;

  const icons = list.isGroup ? GROUP_ICONS : LIST_ICONS;

  return (
    <Modal title={list.isGroup ? t('editGroup') : t('editList')} onClose={() => !saving && onClose()}>
      <EditListBasicFields editData={editData} onUpdateData={onUpdateData} icons={icons} />

      {list.isGroup && onChangePassword && (
        <ChangePasswordSection list={list} onChangePassword={onChangePassword} />
      )}

      <Button variant="contained" fullWidth onClick={() => { haptic('medium'); onSave(); }} disabled={!hasChanges || saving} sx={{ py: 1.25, fontSize: 15 }}>
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('saveChanges')}
      </Button>

      {!list.isGroup && onConvertToGroup && (
        <ConvertToGroupSection onConvertToGroup={onConvertToGroup} />
      )}

      {list.isGroup && onConvertToPrivate && list.members.length === 0 && (
        <ConvertToPrivateSection onConvertToPrivate={onConvertToPrivate} />
      )}

    </Modal>
  );
});

EditListModal.displayName = 'EditListModal';
