import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../../global/types';
import type { EditProfileForm, UseProfileReturn } from '../types/profile-types';

// ===== קבועים =====
const DEFAULT_AVATAR_COLOR = '#14B8A6';

interface UseProfileParams {
  user: User;
  onUpdateUser: (user: Partial<User>) => Promise<void>;
  onLogout: () => void;
}

export const useProfile = ({ user, onUpdateUser, onLogout }: UseProfileParams): UseProfileReturn => {
  const navigate = useNavigate();

  // ===== מצב =====
  const [editProfile, setEditProfile] = useState<EditProfileForm | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // ===== מחושבים =====
  const hasChanges = useMemo(() => {
    if (!editProfile) return false;
    return (
      editProfile.name !== user.name ||
      editProfile.email !== user.email ||
      editProfile.avatarColor !== (user.avatarColor || DEFAULT_AVATAR_COLOR) ||
      editProfile.avatarEmoji !== (user.avatarEmoji || '')
    );
  }, [editProfile, user]);

  // ===== טיפולים =====
  const openEditProfile = useCallback(() => {
    setEditProfile({
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor || DEFAULT_AVATAR_COLOR,
      avatarEmoji: user.avatarEmoji || ''
    });
  }, [user.name, user.email, user.avatarColor, user.avatarEmoji]);

  const handleSave = useCallback(async () => {
    if (editProfile && hasChanges) {
      try {
        await onUpdateUser(editProfile);
        setEditProfile(null);
      } catch {
        // שגיאה מטופלת ע"י ההורה - שמירת טופס פתוח
      }
    }
  }, [editProfile, hasChanges, onUpdateUser]);

  const handleLogout = useCallback(() => {
    onLogout();
    navigate('/login');
  }, [onLogout, navigate]);

  const updateEditField = useCallback(<K extends keyof EditProfileForm>(
    field: K,
    value: EditProfileForm[K]
  ) => {
    setEditProfile(prev => prev ? { ...prev, [field]: value } : null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditProfile(null);
  }, []);

  return {
    editProfile,
    confirmLogout,
    hasChanges,
    setEditProfile,
    setConfirmLogout,
    openEditProfile,
    handleSave,
    handleLogout,
    updateEditField,
    closeEdit
  };
};
