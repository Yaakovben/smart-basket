export interface SettingsPageProps {
  onDeleteAllData?: () => void;
}

export interface SettingsState {
  darkMode: boolean;
  notifications: boolean;
  language: 'he' | 'en';
}
