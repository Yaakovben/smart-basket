import type { TranslationKeys } from '../../../global/i18n/translations';
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
  savingProfile: boolean;
  // מפתח הודעת שגיאה לשדה (null = תקין)
  nameError: TranslationKeys | null;
  emailError: TranslationKeys | null;
  setEditProfile: (profile: EditProfileForm | null) => void;
  setConfirmLogout: (show: boolean) => void;
  openEditProfile: () => void;
  handleSave: () => Promise<void>;
  handleLogout: () => void;
  updateEditField: <K extends keyof EditProfileForm>(field: K, value: EditProfileForm[K]) => void;
  closeEdit: () => void;
}

// ===== קבועים =====
export const AVATAR_COLORS = ['#14B8A6', '#0EA5E9', '#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F59E0B', '#10B981'];
// '' = האות הראשונה של השם במקום אמוג'י
export const AVATAR_EMOJIS = ['', '😊', '😎', '🤓', '🥳', '😇', '🦁', '🐻', '🐼', '🦊', '🐱', '🐶', '🦄', '🌸', '🌟', '⚡'];
