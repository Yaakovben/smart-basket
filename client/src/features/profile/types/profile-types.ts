// ===== Edit Profile Form =====
export interface EditProfileForm {
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
}

// ===== Hook Return Type =====
export interface UseProfileReturn {
  // State
  editProfile: EditProfileForm | null;
  confirmLogout: boolean;

  // Setters
  setEditProfile: (profile: EditProfileForm | null) => void;
  setConfirmLogout: (show: boolean) => void;

  // Handlers
  openEditProfile: () => void;
  handleSave: () => void;
  handleLogout: () => void;
  updateEditField: <K extends keyof EditProfileForm>(field: K, value: EditProfileForm[K]) => void;
  closeEdit: () => void;
}

// ===== Constants =====
export const AVATAR_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];
export const AVATAR_EMOJIS = ['', '😊', '😎', '🦁', '🐻', '🦊', '🌟', '⚡'];
