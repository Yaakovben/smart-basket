import { useState, useCallback } from 'react';
import { useSettings } from '../../../global/context/SettingsContext';
import { LANGUAGES } from '../../../global/constants';
import type { Language } from '../../../global/types';
import type { UseSettingsPageReturn } from '../types/settings-types';

interface UseSettingsPageParams {
  onDeleteAllData?: () => void;
}

export const useSettingsPage = ({ onDeleteAllData }: UseSettingsPageParams): UseSettingsPageReturn => {
  const { settings, updateLanguage } = useSettings();

  // ===== State =====
  const [showLanguage, setShowLanguage] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [groupExpanded, setGroupExpanded] = useState(false);
  const [productExpanded, setProductExpanded] = useState(false);

  // ===== Computed =====
  const currentLanguage = LANGUAGES.find(l => l.code === settings.language);
  const currentLanguageName = currentLanguage?.name || '';

  // ===== Handlers =====
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

  const handleDeleteData = useCallback(() => {
    setConfirmDelete(false);
    onDeleteAllData?.();
  }, [onDeleteAllData]);

  return {
    // State
    showLanguage,
    showAbout,
    showHelp,
    confirmDelete,
    notificationsExpanded,
    groupExpanded,
    productExpanded,
    currentLanguageName,

    // Setters
    setShowLanguage,
    setShowAbout,
    setShowHelp,
    setConfirmDelete,
    setNotificationsExpanded,

    // Handlers
    handleLanguageSelect,
    toggleNotificationsExpanded,
    toggleGroupExpanded,
    toggleProductExpanded,
    handleDeleteData
  };
};
