import { useState, useCallback } from 'react';
import { useSettings } from '../../../global/context/SettingsContext';
import { LANGUAGES } from '../../../global/constants';
import type { Language, ToastType } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import type { UseSettingsPageReturn } from '../types/settings-types';

interface UseSettingsPageParams {
  onDeleteAllData?: () => void;
  showToast: (msg: string, type?: ToastType) => void;
  t: (key: TranslationKeys) => string;
}

export const useSettingsPage = ({ onDeleteAllData, showToast, t }: UseSettingsPageParams): UseSettingsPageReturn => {
  const { settings, updateLanguage } = useSettings();

  // ===== מצב =====
  const [showLanguage, setShowLanguage] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [groupExpanded, setGroupExpanded] = useState(false);
  const [productExpanded, setProductExpanded] = useState(false);
  const [pushExpanded, setPushExpanded] = useState(false);

  // ===== מחושבים =====
  const currentLanguage = LANGUAGES.find(l => l.code === settings.language);
  const currentLanguageName = currentLanguage?.name || '';

  // ===== טיפולים =====
  const handleLanguageSelect = useCallback((lang: Language) => {
    updateLanguage(lang);
    setShowLanguage(false);
  }, [updateLanguage]);

  const toggleNotificationsExpanded = useCallback(() => {
    setNotificationsExpanded(prev => !prev);
  }, []);

  const toggleGroupExpanded = useCallback(() => {
    setGroupExpanded(prev => !prev);
  }, []);

  const toggleProductExpanded = useCallback(() => {
    setProductExpanded(prev => !prev);
  }, []);

  const togglePushExpanded = useCallback(() => {
    setPushExpanded(prev => !prev);
  }, []);

  const handleDeleteData = useCallback(async () => {
    try {
      await onDeleteAllData?.();
    } catch {
      showToast(t('unknownError'), 'error');
    } finally {
      setConfirmDelete(false);
    }
  }, [onDeleteAllData, showToast, t]);

  return {
    showLanguage,
    showAbout,
    showHelp,
    confirmDelete,
    notificationsExpanded,
    groupExpanded,
    productExpanded,
    pushExpanded,
    currentLanguageName,
    setShowLanguage,
    setShowAbout,
    setShowHelp,
    setConfirmDelete,
    setNotificationsExpanded,
    setGroupExpanded,
    setProductExpanded,
    setPushExpanded,
    handleLanguageSelect,
    toggleNotificationsExpanded,
    toggleGroupExpanded,
    toggleProductExpanded,
    togglePushExpanded,
    handleDeleteData
  };
};
