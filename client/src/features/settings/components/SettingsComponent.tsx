import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, Paper, Switch, Button, Collapse } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSettings } from '../../../global/context/SettingsContext';
import { LANGUAGES } from '../../../global/constants';
import type { Language } from '../../../global/types';
import { ConfirmModal, Modal } from '../../../global/components';
import { useSettingsPage } from '../hooks/useSettingsPage';

// ===== Reusable Styles =====
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

// ===== Props Interface =====
interface SettingsPageProps {
  onDeleteAllData?: () => void;
}

export const SettingsComponent = ({ onDeleteAllData }: SettingsPageProps) => {
  const navigate = useNavigate();
  const { settings, toggleDarkMode, updateNotifications, t } = useSettings();

  const {
    showLanguage, showAbout, showHelp, confirmDelete, notificationsExpanded, currentLanguageName,
    setShowLanguage, setShowAbout, setShowHelp, setConfirmDelete,
    handleLanguageSelect, toggleNotificationsExpanded, handleDeleteData
  } = useSettingsPage({ onDeleteAllData });

  return (
    <Box sx={{ height: { xs: '100dvh', sm: '100vh' }, display: 'flex', flexDirection: 'column', bgcolor: 'background.default', maxWidth: { xs: '100%', sm: 500, md: 600 }, mx: 'auto', overflow: 'hidden' }}>
      <Box sx={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)', p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 24px', sm: '48px 20px 24px' }, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate('/')} sx={{ color: 'white' }}>
            <ArrowForwardIcon />
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
            <Switch checked={settings.notifications.enabled} onChange={(e) => { e.stopPropagation(); updateNotifications({ enabled: e.target.checked }); }} onClick={(e) => e.stopPropagation()} sx={switchSx} />
          </Box>

          <Collapse in={settings.notifications.enabled && notificationsExpanded}>
            <Box sx={{ bgcolor: 'background.default', py: 1 }}>
              <Typography sx={{ px: 2, py: 1, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{t('groupNotifications')}</Typography>
              <Box sx={subSettingRowSx}>
                <Typography sx={{ flex: 1, fontSize: 14 }}>{t('memberJoined')}</Typography>
                <Switch checked={settings.notifications.groupJoin} onChange={(e) => updateNotifications({ groupJoin: e.target.checked })} sx={smallSwitchSx} />
              </Box>
              <Box sx={{ ...subSettingRowSx, borderBottom: 'none' }}>
                <Typography sx={{ flex: 1, fontSize: 14 }}>{t('memberLeft')}</Typography>
                <Switch checked={settings.notifications.groupLeave} onChange={(e) => updateNotifications({ groupLeave: e.target.checked })} sx={smallSwitchSx} />
              </Box>
              <Typography sx={{ px: 2, py: 1, fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>{t('productNotifications')}</Typography>
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

        <Paper sx={{ borderRadius: '16px', overflow: 'hidden', mt: 2 }}>
          <Box sx={{ ...settingRowSx, borderBottom: 'none', color: 'error.dark' }} onClick={() => setConfirmDelete(true)}>
            <Box component="span" sx={{ fontSize: 22 }}>🗑️</Box>
            <Typography sx={{ flex: 1, fontWeight: 500, fontSize: 15, color: 'inherit' }}>{t('deleteAllData')}</Typography>
          </Box>
        </Paper>

        <Typography sx={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13, mt: 4 }}>{t('appName')} {t('version')} 1.0.0</Typography>
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
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3 }}>{t('version')} 1.0.0</Typography>
            <Typography sx={{ fontSize: 15, color: 'text.secondary', mb: 3, px: 2 }}>{t('aboutDescription')}</Typography>
            <Box sx={{ bgcolor: 'background.default', borderRadius: '12px', p: 2, mt: 2 }}>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>© 2024 {t('appName')}</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{t('allRightsReserved')}</Typography>
            </Box>
          </Box>
        </Modal>
      )}

      {showHelp && (
        <Modal title={t('helpSupport')} onClose={() => setShowHelp(false)}>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '20px', bgcolor: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2, fontSize: 40 }}>💬</Box>
            <Typography sx={{ fontSize: 18, fontWeight: 600, color: 'text.primary', mb: 1 }}>{t('contactUs')}</Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary', mb: 3, px: 2 }}>{t('helpDescription')}</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button fullWidth onClick={() => window.open('mailto:support@smartbasket.app')} sx={{ justifyContent: 'flex-start', p: 2, borderRadius: '12px', border: '1.5px solid', borderColor: 'divider', textTransform: 'none', gap: 2 }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📧</Box>
                <Box sx={{ flex: 1, textAlign: settings.language === 'he' ? 'right' : 'left' }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 600, color: 'text.primary' }}>{t('sendEmail')}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>support@smartbasket.app</Typography>
                </Box>
              </Button>
              <Button fullWidth onClick={() => window.open('https://wa.me/972500000000')} sx={{ justifyContent: 'flex-start', p: 2, borderRadius: '12px', bgcolor: '#25D366', color: 'white', textTransform: 'none', gap: 2, '&:hover': { bgcolor: '#1ebe5a' } }}>
                <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </Box>
                <Box sx={{ flex: 1, textAlign: settings.language === 'he' ? 'right' : 'left' }}>
                  <Typography sx={{ fontSize: 15, fontWeight: 600 }}>{t('sendWhatsApp')}</Typography>
                  <Typography sx={{ fontSize: 12, opacity: 0.8 }}>WhatsApp</Typography>
                </Box>
              </Button>
            </Box>
          </Box>
        </Modal>
      )}

      {confirmDelete && (
        <ConfirmModal title={t('deleteAllData')} message={t('deleteConfirmMessage')} confirmText={t('delete')} onConfirm={handleDeleteData} onCancel={() => setConfirmDelete(false)} />
      )}
    </Box>
  );
}
