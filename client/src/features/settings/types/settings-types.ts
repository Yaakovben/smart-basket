import type { Language } from '../../../global/types';

// ===== Hook Return Type =====
export interface UseSettingsPageReturn {
  // State
  showLanguage: boolean;
  showAbout: boolean;
  showHelp: boolean;
  confirmDelete: boolean;
  notificationsExpanded: boolean;
  currentLanguageName: string;

  // Setters
  setShowLanguage: (show: boolean) => void;
  setShowAbout: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setConfirmDelete: (show: boolean) => void;
  setNotificationsExpanded: (expanded: boolean) => void;

  // Handlers
  handleLanguageSelect: (lang: Language) => void;
  toggleNotificationsExpanded: () => void;
  handleDeleteData: () => void;
}
