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
    setConfirmDelete(false);
    await onDeleteAllData?.();
  }, [onDeleteAllData]);

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
