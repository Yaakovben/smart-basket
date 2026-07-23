import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Paper, Switch } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { useSettings } from '../../../global/context/SettingsContext';
import { usePushNotifications } from '../../../global/hooks';
import { ADMIN_CONFIG } from '../../../global/constants';
import type { User, ToastType } from '../../../global/types';
import { ConfirmModal } from '../../../global/components';
import { useSettingsPage } from '../hooks/useSettingsPage';
import { NotificationsSettingsSection } from './NotificationsSettingsSection';
import { LanguageModal } from './LanguageModal';
import { AboutModal } from './AboutModal';
import { HelpModal } from './HelpModal';
import {
  glassButtonSx, settingRowSx, lastSettingRowSx, dangerSettingRowSx, switchSx, rowLabelSx, headerSx,
  updateCardSx, updateCardIconSx,
} from '../styles/SettingsComponent.styles';

// ===== ממשק Props =====
interface SettingsPageProps {
  user: User;
  hasUpdate?: boolean;
  onDeleteAllData?: () => void;
  showToast: (msg: string, type?: ToastType) => void;
}

export const SettingsComponent = ({ user, hasUpdate = false, onDeleteAllData, showToast }: SettingsPageProps) => {
  const navigate = useNavigate();
  const { settings, toggleDarkMode, updateNotifications, t } = useSettings();
  const isDark = settings.theme === 'dark';
  const isAdmin = user.email === ADMIN_CONFIG.adminEmail;
  const { isSupported: pushSupported, isPwaInstalled, isSubscribed: pushSubscribed, loading: pushLoading, error: pushError, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotifications();

  // זיהוי סוג מכשיר להנחיות התקנה
  const getDeviceType = (): 'ios' | 'android' | 'desktop' => {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
  };
  const deviceType = getDeviceType();

  const {
    showLanguage, showAbout, showHelp, confirmDelete, notificationsExpanded, groupExpanded, productExpanded, pushExpanded, currentLanguageName,
    setShowLanguage, setShowAbout, setShowHelp, setConfirmDelete, setGroupExpanded, setProductExpanded, setPushExpanded,
    handleLanguageSelect, toggleNotificationsExpanded, toggleGroupExpanded, toggleProductExpanded, togglePushExpanded, handleDeleteData
  } = useSettingsPage({ onDeleteAllData, showToast, t });

  // state לאישור ניקוי מטמון - popup שמסביר השלכות לפני פעולה הרסנית
  const [confirmClearCache, setConfirmClearCache] = useState(false);

  const handleMainNotificationsToggle = async (enabled: boolean) => {
    updateNotifications({ enabled });
    if (!enabled && pushSubscribed) {
      // כיבוי התראות ראשיות → גם ביטול הרשמה ל-push
      await unsubscribePush();
    } else if (enabled && pushSupported && isPwaInstalled && !pushSubscribed && Notification.permission === 'granted') {
      // הפעלת התראות → הרשמה מחדש ל-push אם כבר ניתנה הרשאה
      await subscribePush();
    }
  };

  const handlePushToggle = async () => {
    if (pushSubscribed) {
      await unsubscribePush();
    } else {
      await subscribePush();
    }
  };

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden' }}>
      <Box sx={headerSx(isDark)}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/')} sx={glassButtonSx}>
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 20, fontWeight: 700 }}>{t('settings')}</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 }, pb: 'calc(24px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          <NotificationsSettingsSection
            isDark={isDark}
            notifications={settings.notifications}
            updateNotifications={updateNotifications}
            notificationsExpanded={notificationsExpanded}
            toggleNotificationsExpanded={toggleNotificationsExpanded}
            groupExpanded={groupExpanded}
            toggleGroupExpanded={toggleGroupExpanded}
            setGroupExpanded={setGroupExpanded}
            productExpanded={productExpanded}
            toggleProductExpanded={toggleProductExpanded}
            setProductExpanded={setProductExpanded}
            pushExpanded={pushExpanded}
            togglePushExpanded={togglePushExpanded}
            setPushExpanded={setPushExpanded}
            pushSupported={pushSupported}
            isPwaInstalled={isPwaInstalled}
            pushSubscribed={pushSubscribed}
            pushLoading={pushLoading}
            pushError={pushError}
            deviceType={deviceType}
            onMainToggle={handleMainNotificationsToggle}
            onPushToggle={handlePushToggle}
          />

          <Box sx={settingRowSx} onClick={toggleDarkMode}>
            <Box component="span" sx={{ fontSize: 22 }}>🌙</Box>
            <Typography sx={rowLabelSx}>{t('darkMode')}</Typography>
            <Switch checked={settings.theme === 'dark'} onChange={toggleDarkMode} onClick={(e) => e.stopPropagation()} sx={switchSx} />
          </Box>

          <Box sx={lastSettingRowSx} onClick={() => setShowLanguage(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>🌐</Box>
            <Typography sx={rowLabelSx}>{t('language')}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{currentLanguageName}</Typography>
            <ChevronLeftIcon sx={{ color: 'text.disabled' }} />
          </Box>
        </Paper>

        {/* Admin Dashboard */}
        {isAdmin && (
          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
            <Box sx={lastSettingRowSx} onClick={() => navigate('/admin')}>
              <Box component="span" sx={{ fontSize: 22 }}>👑</Box>
              <Typography sx={rowLabelSx}>{t('adminDashboard')}</Typography>
              <ChevronLeftIcon sx={{ color: 'text.disabled' }} />
            </Box>
          </Paper>
        )}

        {/* מקבץ מידע: עזרה ותמיכה + אודות + תנאי שימוש */}
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
          <Box sx={settingRowSx} onClick={() => setShowHelp(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>❓</Box>
            <Typography sx={rowLabelSx}>{t('helpSupport')}</Typography>
            <ChevronLeftIcon sx={{ color: 'text.disabled' }} />
          </Box>
          <Box sx={settingRowSx} onClick={() => setShowAbout(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>ℹ️</Box>
            <Typography sx={rowLabelSx}>{t('about')}</Typography>
            <ChevronLeftIcon sx={{ color: 'text.disabled' }} />
          </Box>
          <Box sx={lastSettingRowSx} onClick={() => navigate('/privacy')}>
            <Box component="span" sx={{ fontSize: 22 }}>📋</Box>
            <Typography sx={rowLabelSx}>{t('termsAndPrivacy')}</Typography>
            <ChevronLeftIcon sx={{ color: 'text.disabled' }} />
          </Box>
        </Paper>

        {/* כפתור ניקוי מטמון, מוצג רק כשיש עדכון זמין */}
        {hasUpdate && (
          <Paper
            sx={updateCardSx(isDark)}
            onClick={async () => {
              if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
              }
              if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(registrations.map(reg => reg.unregister()));
              }
              window.location.reload();
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5 }}>
              <Box sx={updateCardIconSx}>
                🔄
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'white' }}>
                  {t('clearCacheRefresh')}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', mt: 0.25 }}>
                  {t('version')} {t('appName')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        {/* מקבץ ניהול נתונים: ניקוי מטמון + מחיקת כל הנתונים */}
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
          <Box sx={settingRowSx} onClick={() => setConfirmClearCache(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>🧹</Box>
            <Typography sx={rowLabelSx}>{t('clearCache')}</Typography>
            <ChevronLeftIcon sx={{ color: 'text.disabled' }} />
          </Box>
          <Box sx={dangerSettingRowSx} onClick={() => setConfirmDelete(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>🗑️</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15, color: 'inherit' }}>{t('deleteAllData')}</Typography>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: 'text.disabled', fontSize: 13, mt: 4 }}>{t('appName')} {t('version')} 1.1.0</Typography>
      </Box>

      {showLanguage && <LanguageModal onClose={() => setShowLanguage(false)} onSelect={handleLanguageSelect} />}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {confirmClearCache && (
        <ConfirmModal
          title="ניקוי מטמון"
          message={'הפעולה תנקה את המטמון של האפליקציה ותרענן את העמוד. ייתכן שתצטרך להתחבר מחדש.'}
          confirmText="נקה"
          onConfirm={() => { setConfirmClearCache(false); navigate('/clear-cache'); }}
          onCancel={() => setConfirmClearCache(false)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal title={t('deleteAllData')} message={t('deleteDataWarning')} confirmText={t('delete')} onConfirm={handleDeleteData} onCancel={() => setConfirmDelete(false)} />
      )}
    </Box>
  );
};
