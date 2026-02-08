import type { Language } from '../../../global/types';

// ===== Hook Return Type =====
export interface UseSettingsPageReturn {
  // State
  showLanguage: boolean;
  showAbout: boolean;
  showHelp: boolean;
  confirmDelete: boolean;
  notificationsExpanded: boolean;
  groupExpanded: boolean;
  productExpanded: boolean;
  pushExpanded: boolean;
  currentLanguageName: string;

  // Setters
  setShowLanguage: (show: boolean) => void;
  setShowAbout: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setConfirmDelete: (show: boolean) => void;
  setNotificationsExpanded: (expanded: boolean) => void;
  setGroupExpanded: (expanded: boolean) => void;
  setProductExpanded: (expanded: boolean) => void;
  setPushExpanded: (expanded: boolean) => void;

  // Handlers
  handleLanguageSelect: (lang: Language) => void;
  toggleNotificationsExpanded: () => void;
  toggleGroupExpanded: () => void;
  toggleProductExpanded: () => void;
  togglePushExpanded: () => void;
  handleDeleteData: () => void;
}
