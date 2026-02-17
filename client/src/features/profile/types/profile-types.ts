// ===== טופס עריכת פרופיל =====
export interface EditProfileForm {
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
}

// ===== ערך החזרה של ה-Hook =====
export interface UseProfileReturn {
  editProfile: EditProfileForm | null;
  confirmLogout: boolean;
  hasChanges: boolean;
  setEditProfile: (profile: EditProfileForm | null) => void;
  setConfirmLogout: (show: boolean) => void;
  openEditProfile: () => void;
  handleSave: () => Promise<void>;
  handleLogout: () => void;
  updateEditField: <K extends keyof EditProfileForm>(field: K, value: EditProfileForm[K]) => void;
  closeEdit: () => void;
}

// ===== קבועים =====
export const AVATAR_COLORS = ['#14B8A6', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];
export const AVATAR_EMOJIS = ['', '😊', '😎', '🦁', '🐻', '🦊', '🌟', '⚡'];
