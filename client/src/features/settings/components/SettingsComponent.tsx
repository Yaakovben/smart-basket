import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Paper, Switch, Button, Collapse, CircularProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSettings } from '../../../global/context/SettingsContext';
import { usePushNotifications } from '../../../global/hooks';
import { LANGUAGES, ADMIN_CONFIG, COMMON_STYLES } from '../../../global/constants';
import type { Language, User, ToastType } from '../../../global/types';
import { ConfirmModal, Modal } from '../../../global/components';
import { useSettingsPage } from '../hooks/useSettingsPage';

// ===== סגנונות =====
const glassButtonSx = COMMON_STYLES.glassIconButton;
const settingRowSx = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  p: 2,
  borderBottom: '1px solid',
  borderColor: 'divider',
  cursor: 'pointer'
};

const subSettingRowSx = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.5,
  p: '12px 16px 12px 48px',
  borderBottom: '1px solid',
  borderColor: 'divider'
};

const switchSx = {
  width: 52,
  height: 32,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: '4px',
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(20px)',
      color: '#fff',
      '& + .MuiSwitch-track': { backgroundColor: '#14B8A6', opacity: 1, border: 0 },
    },
  },
  '& .MuiSwitch-thumb': { boxSizing: 'border-box', width: 24, height: 24, backgroundColor: 'background.paper' },
  '& .MuiSwitch-track': { borderRadius: 16, backgroundColor: 'action.disabled', opacity: 1 },
};

const smallSwitchSx = {
  width: 44,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: '3px',
    transitionDuration: '300ms',
    '&.Mui-checked': {
      transform: 'translateX(18px)',
      color: '#fff',
      '& + .MuiSwitch-track': { backgroundColor: '#14B8A6', opacity: 1, border: 0 },
    },
  },
  '& .MuiSwitch-thumb': { boxSizing: 'border-box', width: 20, height: 20, backgroundColor: 'background.paper' },
  '& .MuiSwitch-track': { borderRadius: 13, backgroundColor: 'action.disabled', opacity: 1 },
};

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
      <Box sx={{ background: isDark ? 'linear-gradient(135deg, #0D9488, #047857)' : 'linear-gradient(135deg, #14B8A6, #0D9488)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 24px', sm: '48px 20px 24px' }, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/')} sx={glassButtonSx}>
            <ArrowForwardIcon sx={{ fontSize: 22 }} />
          </IconButton>
          <Typography sx={{ flex: 1, color: 'white', fontSize: 20, fontWeight: 700 }}>{t('settings')}</Typography>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, sm: 2.5 }, pb: 'calc(24px + env(safe-area-inset-bottom))', WebkitOverflowScrolling: 'touch' }}>
        <Paper sx={{ borderRadius: '16px', overflow: 'hidden' }}>
          {/* Notifications Toggle */}
          <Box sx={settingRowSx} onClick={() => settings.notifications.enabled && toggleNotificationsExpanded()}>
            <Box component="span" sx={{ fontSize: 22 }}>🔔</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('notifications')}</Typography>
            {settings.notifications.enabled && (
              <Box onClick={(e) => { e.stopPropagation(); toggleNotificationsExpanded(); }} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', p: 0.5, mr: 0.5 }}>
                {notificationsExpanded ? <ExpandLessIcon sx={{ color: '#9CA3AF' }} /> : <ExpandMoreIcon sx={{ color: '#9CA3AF' }} />}
              </Box>
            )}
            <Switch checked={settings.notifications.enabled} onChange={(e) => { e.stopPropagation(); handleMainNotificationsToggle(e.target.checked); }} onClick={(e) => e.stopPropagation()} sx={switchSx} />
          </Box>

          <Collapse in={settings.notifications.enabled && notificationsExpanded}>
            <Box sx={{ bgcolor: 'background.default', py: 1.5 }}>
              {/* Push Notifications Section */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, mb: 0.5, cursor: 'pointer' }} onClick={togglePushExpanded}>
                <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📲</Box>
                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
                  {t('pushNotifications')}
                </Typography>
                {pushSubscribed && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: isDark ? 'rgba(16,185,129,0.15)' : '#ECFDF5', borderRadius: '8px', px: 1, py: 0.25 }}>
                    <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981' }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 600, color: isDark ? '#6EE7B7' : '#059669' }}>
                      {t('pushActive')}
                    </Typography>
                  </Box>
                )}
                {pushExpanded ? <ExpandLessIcon sx={{ color: '#9CA3AF', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />}
                <Box onClick={(e) => {
                  e.stopPropagation();
                  if (!pushSupported || !isPwaInstalled) {
                    setPushExpanded(true);
                  }
                }} sx={{ display: 'flex', alignItems: 'center' }}>
                  {pushLoading ? (
                    <CircularProgress size={20} sx={{ color: '#14B8A6' }} />
                  ) : (
                    <Switch
                      checked={pushSubscribed}
                      onChange={(e) => {
                        handlePushToggle();
                        if (!e.target.checked) setPushExpanded(false);
                      }}
                      disabled={!pushSupported || !isPwaInstalled}
                      sx={smallSwitchSx}
                    />
                  )}
                </Box>
              </Box>
              <Collapse in={pushExpanded}>
                <Box sx={subSettingRowSx}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14 }}>
                      {t('pushDescription')}
                    </Typography>
                    {!pushSupported && (
                      <Typography sx={{ fontSize: 12, color: 'error.main', mt: 0.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {t('pushNotSupported')}
                      </Typography>
                    )}
                    {pushSupported && !isPwaInstalled && (
                      <Box sx={{ mt: 1, p: 1.5, bgcolor: isDark ? 'rgba(245,158,11,0.12)' : '#FEF3C7', borderRadius: '10px' }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 600, color: isDark ? '#FCD34D' : '#92400E', mb: 0.5 }}>
                          {t('pushRequiresInstall')}
                        </Typography>
                        <Typography sx={{ fontSize: 12, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
                          {deviceType === 'ios' ? t('pushInstallIOS') : deviceType === 'android' ? t('pushInstallAndroid') : t('pushInstallDesktop')}
                        </Typography>
                      </Box>
                    )}
                    {pushError === 'PERMISSION_DENIED' ? (
                      <Typography sx={{ fontSize: 12, color: 'warning.dark', mt: 0.5, lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {t('pushBlocked')}
                      </Typography>
                    ) : pushError === 'NOT_CONFIGURED' || pushError === 'SAVE_FAILED' || pushError === 'SUBSCRIBE_FAILED' || pushError === 'UNKNOWN' ? (
                      <Typography sx={{ fontSize: 12, color: 'error.main', mt: 0.5 }}>
                        {pushError === 'NOT_CONFIGURED' ? t('pushErrorNotConfigured') : pushError === 'SAVE_FAILED' ? t('pushErrorSaveFailed') : pushError === 'SUBSCRIBE_FAILED' ? t('pushErrorSubscribeFailed') : t('pushErrorUnknown')}
                      </Typography>
                    ) : null}
                  </Box>
                </Box>
              </Collapse>

              {/* List Notifications Section */}
              <Box sx={{ height: '1px', bgcolor: 'divider', mx: 2, my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, mt: 0.5, mb: 0.5, cursor: 'pointer' }} onClick={toggleGroupExpanded}>
                <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: isDark ? 'rgba(99,102,241,0.15)' : '#E0E7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👥</Box>
                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{t('groupNotifications')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', minWidth: 28, textAlign: 'center' }}>
                  {[settings.notifications.groupJoin, settings.notifications.groupLeave, settings.notifications.groupRemoved ?? true, settings.notifications.groupDelete ?? true, settings.notifications.listUpdate].filter(Boolean).length}/5
                </Typography>
                {groupExpanded ? <ExpandLessIcon sx={{ color: '#9CA3AF', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />}
                <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={settings.notifications.groupJoin && settings.notifications.groupLeave && (settings.notifications.groupRemoved ?? true) && (settings.notifications.groupDelete ?? true) && settings.notifications.listUpdate}
                    onChange={(e) => {
                      const value = e.target.checked;
                      updateNotifications({ groupJoin: value, groupLeave: value, groupRemoved: value, groupDelete: value, listUpdate: value });
                      if (!value) setGroupExpanded(false);
                    }}
                    sx={smallSwitchSx}
                  />
                </Box>
              </Box>
              <Collapse in={groupExpanded}>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('memberJoinedNotif')}</Typography>
                  <Switch checked={settings.notifications.groupJoin} onChange={(e) => updateNotifications({ groupJoin: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('memberLeftNotif')}</Typography>
                  <Switch checked={settings.notifications.groupLeave} onChange={(e) => updateNotifications({ groupLeave: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('memberRemovedNotif')}</Typography>
                  <Switch checked={settings.notifications.groupRemoved ?? true} onChange={(e) => updateNotifications({ groupRemoved: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('groupDeletedNotifSetting')}</Typography>
                  <Switch checked={settings.notifications.groupDelete ?? true} onChange={(e) => updateNotifications({ groupDelete: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('listUpdatedNotifSetting')}</Typography>
                  <Switch checked={settings.notifications.listUpdate} onChange={(e) => updateNotifications({ listUpdate: e.target.checked })} sx={smallSwitchSx} />
                </Box>
              </Collapse>

              {/* Product Notifications Section */}
              <Box sx={{ height: '1px', bgcolor: 'divider', mx: 2, my: 1 }} />
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 2, py: 1.5, mt: 0.5, mb: 0.5, cursor: 'pointer' }} onClick={toggleProductExpanded}>
                <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: isDark ? 'rgba(34,197,94,0.15)' : '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>📦</Box>
                <Typography sx={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{t('productNotifications')}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', minWidth: 28, textAlign: 'center' }}>
                  {[settings.notifications.productAdd, settings.notifications.productDelete, settings.notifications.productEdit, settings.notifications.productPurchase].filter(Boolean).length}/4
                </Typography>
                {productExpanded ? <ExpandLessIcon sx={{ color: '#9CA3AF', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: '#9CA3AF', fontSize: 20 }} />}
                <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Switch
                    checked={settings.notifications.productAdd && settings.notifications.productDelete && settings.notifications.productEdit && settings.notifications.productPurchase}
                    onChange={(e) => {
                      const value = e.target.checked;
                      updateNotifications({ productAdd: value, productDelete: value, productEdit: value, productPurchase: value });
                      if (!value) setProductExpanded(false);
                    }}
                    sx={smallSwitchSx}
                  />
                </Box>
              </Box>
              <Collapse in={productExpanded}>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('productAdded')}</Typography>
                  <Switch checked={settings.notifications.productAdd} onChange={(e) => updateNotifications({ productAdd: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('productDeleted')}</Typography>
                  <Switch checked={settings.notifications.productDelete} onChange={(e) => updateNotifications({ productDelete: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={subSettingRowSx}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('productEdited')}</Typography>
                  <Switch checked={settings.notifications.productEdit} onChange={(e) => updateNotifications({ productEdit: e.target.checked })} sx={smallSwitchSx} />
                </Box>
                <Box sx={{ ...subSettingRowSx, borderBottom: 'none' }}>
                  <Typography sx={{ flex: 1, fontSize: 14 }}>{t('productPurchased')}</Typography>
                  <Switch checked={settings.notifications.productPurchase} onChange={(e) => updateNotifications({ productPurchase: e.target.checked })} sx={smallSwitchSx} />
                </Box>
              </Collapse>
            </Box>
          </Collapse>

          <Box sx={settingRowSx} onClick={toggleDarkMode}>
            <Box component="span" sx={{ fontSize: 22 }}>🌙</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('darkMode')}</Typography>
            <Switch checked={settings.theme === 'dark'} onChange={toggleDarkMode} onClick={(e) => e.stopPropagation()} sx={switchSx} />
          </Box>

          <Box sx={{ ...settingRowSx, borderBottom: 'none' }} onClick={() => setShowLanguage(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>🌐</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('language')}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>{currentLanguageName}</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF' }} />
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
          <Box sx={settingRowSx} onClick={() => setShowHelp(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>❓</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('helpSupport')}</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF' }} />
          </Box>
          <Box sx={{ ...settingRowSx, borderBottom: 'none' }} onClick={() => setShowAbout(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>ℹ️</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('about')}</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF' }} />
          </Box>
        </Paper>

        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
          <Box sx={settingRowSx} onClick={() => navigate('/privacy')}>
            <Box component="span" sx={{ fontSize: 22 }}>🔒</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('privacyPolicy')}</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF' }} />
          </Box>
          <Box sx={{ ...settingRowSx, borderBottom: 'none' }} onClick={() => navigate('/terms')}>
            <Box component="span" sx={{ fontSize: 22 }}>📄</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('termsOfService')}</Typography>
            <ChevronLeftIcon sx={{ color: '#9CA3AF' }} />
          </Box>
        </Paper>

        {/* Admin Dashboard - Below terms for admin users */}
        {isAdmin && (
          <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
            <Box sx={{ ...settingRowSx, borderBottom: 'none' }} onClick={() => navigate('/admin')}>
              <Box component="span" sx={{ fontSize: 22 }}>👑</Box>
              <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15 }}>{t('adminDashboard')}</Typography>
              <ChevronLeftIcon sx={{ color: '#9CA3AF' }} />
            </Box>
          </Paper>
        )}

        {/* Show clear cache button only when there's an update available */}
        {hasUpdate && (
          <Paper
            sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2, border: '2px solid', borderColor: 'warning.main', cursor: 'pointer', '&:active': { transform: 'scale(0.98)' }, transition: 'transform 0.1s' }}
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
              <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'warning.main', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>
                🔄
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 16, color: 'warning.dark' }}>
                  {t('clearCacheRefresh')}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
                  {t('version')} {t('appName')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        )}

        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
          <Box sx={{ ...settingRowSx, borderBottom: 'none', color: 'error.dark' }} onClick={() => setConfirmDelete(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>🗑️</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15, color: 'inherit' }}>{t('deleteAllData')}</Typography>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, mt: 4 }}>{t('appName')} {t('version')} 1.1.0</Typography>
      </Box>

      {showLanguage && (
        <Modal title={t('language')} onClose={() => setShowLanguage(false)}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {LANGUAGES.map((lang) => {
              const isSelected = settings.language === lang.code;
              return (
                <Button key={lang.code} onClick={() => handleLanguageSelect(lang.code as Language)} fullWidth sx={{ justifyContent: 'flex-start', p: 2, borderRadius: '12px', border: isSelected ? '2px solid' : '1.5px solid', borderColor: isSelected ? 'primary.main' : 'divider', bgcolor: isSelected ? 'rgba(20, 184, 166, 0.1)' : 'transparent', textTransform: 'none', '&:hover': { bgcolor: isSelected ? 'rgba(20, 184, 166, 0.15)' : 'action.hover' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Typography sx={{ fontSize: 24 }}>{lang.code === 'he' ? '🇮🇱' : lang.code === 'en' ? '🇺🇸' : '🇷🇺'}</Typography>
                    <Box sx={{ flex: 1, textAlign: settings.language === 'he' ? 'right' : 'left' }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary' }}>{lang.name}</Typography>
                      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{lang.nameEn}</Typography>
                    </Box>
                    {isSelected && <Typography sx={{ fontSize: 20, color: 'primary.main' }}>✓</Typography>}
                  </Box>
                </Button>
              );
            })}
          </Box>
        </Modal>
      )}

      {showAbout && (
        <Modal title={t('about')} onClose={() => setShowAbout(false)}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '20px', background: 'linear-gradient(135deg, #14B8A6, #10B981)', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, fontSize: 40, boxShadow: '0 8px 24px rgba(20, 184, 166, 0.3)' }}>🛒</Box>
            <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>{t('appName')}</Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3 }}>{t('version')} 1.1.0</Typography>
            <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3, px: 2 }}>{t('aboutDescription')}</Typography>
            <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', p: 2, mt: 2 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>© {new Date().getFullYear()} {t('appName')}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{t('allRightsReserved')}</Typography>
            </Box>
          </Box>
        </Modal>
      )}

      {showHelp && (
        <Modal title={t('helpSupport')} onClose={() => setShowHelp(false)}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '20px', bgcolor: '#14B8A6', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, fontSize: 36 }}>
              📧
            </Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('contactUs')}</Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3, px: 2 }}>{t('helpDescription')}</Typography>
            <Button component="a" href="mailto:smartbasket129@gmail.com?subject=Smart Basket - Support" target="_blank" rel="noopener noreferrer" fullWidth sx={{ justifyContent: 'flex-start', p: 2, borderRadius: '12px', bgcolor: '#14B8A6', color: 'white', textTransform: 'none', gap: 2, '&:hover': { bgcolor: '#0D9488' }, textDecoration: 'none' }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                📧
              </Box>
              <Box sx={{ flex: 1, textAlign: settings.language === 'he' ? 'right' : 'left' }}>
                <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{t('sendEmail')}</Typography>
                <Typography sx={{ fontSize: 12, opacity: 0.8 }}>smartbasket129@gmail.com</Typography>
              </Box>
            </Button>
          </Box>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal title={t('deleteAllData')} message={t('deleteDataWarning')} confirmText={t('delete')} onConfirm={handleDeleteData} onCancel={() => setConfirmDelete(false)} />
      )}
    </Box>
  );
}
