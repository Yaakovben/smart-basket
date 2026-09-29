import { memo, useState } from 'react';
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
  // newPassword: קוד כניסה חדש לקבוצה, נשמר באותה פעולה יחד עם השם והעיצוב
  onSave: (newPassword?: string) => void;
  onUpdateData: (data: EditListForm) => void;
  onConvertToGroup?: (password: string) => void | Promise<void>;
  onConvertToPrivate?: () => void | Promise<void>;
  canChangePassword?: boolean;
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
  canChangePassword = false,
}: EditListModalProps) => {
  const { t } = useSettings();
  const [newPassword, setNewPassword] = useState('');
  const [wasOpen, setWasOpen] = useState(isOpen);

  // קוד שהוקלד ולא נשמר לא נשאר לפתיחה הבאה של המודאל
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    if (!isOpen) setNewPassword('');
  }

  if (!isOpen || !editData) return null;

  const passwordReady = list.isGroup && canChangePassword && newPassword.length === 4 && newPassword !== (list.password || '');
  // קוד שהתחיל להיות מוקלד ולא הושלם חוסם שמירה, כדי שלא יישמר בטעות רק חלק מהשינויים
  const passwordPartial = newPassword.length > 0 && newPassword.length < 4;
  const canSave = (hasChanges || passwordReady) && !passwordPartial && !saving;

  const icons = list.isGroup ? GROUP_ICONS : LIST_ICONS;

  return (
    <Modal title={list.isGroup ? t('editGroup') : t('editList')} onClose={() => !saving && onClose()}>
      <EditListBasicFields editData={editData} onUpdateData={onUpdateData} icons={icons} />

      {list.isGroup && canChangePassword && (
        <ChangePasswordSection value={newPassword} onChange={setNewPassword} />
      )}

      {!list.isGroup && onConvertToGroup && (
        <ConvertToGroupSection onConvertToGroup={onConvertToGroup} />
      )}

      {list.isGroup && onConvertToPrivate && (
        <ConvertToPrivateSection onClick={onConvertToPrivate} />
      )}

      <Button variant="contained" fullWidth onClick={() => { haptic('medium'); onSave(passwordReady ? newPassword : undefined); }} disabled={!canSave} sx={{ py: 1.25, fontSize: 15, mt: 2 }}>
        {saving ? <CircularProgress size={22} sx={{ color: 'white' }} /> : t('saveChanges')}
      </Button>
    </Modal>
  );
});

EditListModal.displayName = 'EditListModal';
