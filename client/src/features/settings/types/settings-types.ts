import type { Language } from '../../../global/types';

// ===== ערך החזרה של ה-Hook =====
export interface UseSettingsPageReturn {
  showLanguage: boolean;
  showAbout: boolean;
  showHelp: boolean;
  confirmDelete: boolean;
  notificationsExpanded: boolean;
  groupExpanded: boolean;
  productExpanded: boolean;
  pushExpanded: boolean;
  currentLanguageName: string;
  setShowLanguage: (show: boolean) => void;
  setShowAbout: (show: boolean) => void;
  setShowHelp: (show: boolean) => void;
  setConfirmDelete: (show: boolean) => void;
  setNotificationsExpanded: (expanded: boolean) => void;
  setGroupExpanded: (expanded: boolean) => void;
  setProductExpanded: (expanded: boolean) => void;
  setPushExpanded: (expanded: boolean) => void;
  handleLanguageSelect: (lang: Language) => void;
  toggleNotificationsExpanded: () => void;
  toggleGroupExpanded: () => void;
  toggleProductExpanded: () => void;
  togglePushExpanded: () => void;
  handleDeleteData: () => void;
}
