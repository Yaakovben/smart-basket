import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../../global/types';
import type { EditProfileForm, UseProfileReturn } from '../types/profile-types';

interface UseProfileParams {
  user: User;
  onUpdateUser: (user: Partial<User>) => void;
  onLogout: () => void;
}

export const useProfile = ({ user, onUpdateUser, onLogout }: UseProfileParams): UseProfileReturn => {
  const navigate = useNavigate();

  // ===== State =====
  const [editProfile, setEditProfile] = useState<EditProfileForm | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // ===== Handlers =====
  const openEditProfile = useCallback(() => {
    setEditProfile({
      name: user.name,
      email: user.email,
      avatarColor: user.avatarColor || '#14B8A6',
      avatarEmoji: user.avatarEmoji || ''
    });
  }, [user.name, user.email, user.avatarColor, user.avatarEmoji]);

  const handleSave = useCallback(() => {
    if (editProfile) {
      onUpdateUser(editProfile);
      setEditProfile(null);
    }
  }, [editProfile, onUpdateUser]);

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
    // State
    editProfile,
    confirmLogout,

    // Setters
    setEditProfile,
    setConfirmLogout,

    // Handlers
    openEditProfile,
    handleSave,
    handleLogout,
    updateEditField,
    closeEdit
  };
};
