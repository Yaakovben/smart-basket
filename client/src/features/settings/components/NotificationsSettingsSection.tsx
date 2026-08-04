import { Box, Typography, Switch, Collapse, CircularProgress } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSettings } from '../../../global/context/SettingsContext';
import type { NotificationSettings } from '../../../global/types';
import {
  settingRowSx, subSettingRowSx, lastSubSettingRowSx, switchSx, smallSwitchSx, rowLabelSx, subRowLabelSx,
  sectionHeaderRowSx, sectionHeaderRowWithMtSx, sectionLabelSx, sectionCountBadgeSx, sectionDividerSx,
  sectionIconBadgeSx, pushActiveBadgeSx, installHintBoxSx, installHintTitleSx, installHintBodySx,
} from '../styles/SettingsComponent.styles';

interface NotificationsSettingsSectionProps {
  isDark: boolean;
  notifications: NotificationSettings;
  updateNotifications: (updates: Partial<NotificationSettings>) => void;
  notificationsExpanded: boolean;
  toggleNotificationsExpanded: () => void;
  groupExpanded: boolean;
  toggleGroupExpanded: () => void;
  setGroupExpanded: (expanded: boolean) => void;
  productExpanded: boolean;
  toggleProductExpanded: () => void;
  setProductExpanded: (expanded: boolean) => void;
  pushExpanded: boolean;
  togglePushExpanded: () => void;
  setPushExpanded: (expanded: boolean) => void;
  pushSupported: boolean;
  isPwaInstalled: boolean;
  pushSubscribed: boolean;
  pushLoading: boolean;
  pushError: string | null;
  deviceType: 'ios' | 'android' | 'desktop';
  onMainToggle: (enabled: boolean) => void;
  onPushToggle: () => void;
}

// כרטיס ההתראות המלא: מתג ראשי + שלוש קבוצות מתקפלות (push/קבוצה/מוצר)
export const NotificationsSettingsSection = ({
  isDark, notifications, updateNotifications,
  notificationsExpanded, toggleNotificationsExpanded,
  groupExpanded, toggleGroupExpanded, setGroupExpanded,
  productExpanded, toggleProductExpanded, setProductExpanded,
  pushExpanded, togglePushExpanded, setPushExpanded,
  pushSupported, isPwaInstalled, pushSubscribed, pushLoading, pushError, deviceType,
  onMainToggle, onPushToggle,
}: NotificationsSettingsSectionProps) => {
  const { t } = useSettings();

  return (
    <>
      {/* Notifications Toggle */}
      <Box sx={settingRowSx} onClick={() => notifications.enabled && toggleNotificationsExpanded()}>
        <Box component="span" sx={{ fontSize: 22 }}>🔔</Box>
        <Typography sx={rowLabelSx}>{t('notifications')}</Typography>
        {notifications.enabled && (
          <Box onClick={(e) => { e.stopPropagation(); toggleNotificationsExpanded(); }} sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', p: 0.5, mr: 0.5 }}>
            {notificationsExpanded ? <ExpandLessIcon sx={{ color: 'text.disabled' }} /> : <ExpandMoreIcon sx={{ color: 'text.disabled' }} />}
          </Box>
        )}
        <Switch checked={notifications.enabled} onChange={(e) => { e.stopPropagation(); onMainToggle(e.target.checked); }} onClick={(e) => e.stopPropagation()} sx={switchSx} />
      </Box>

      <Collapse in={notifications.enabled && notificationsExpanded}>
        <Box sx={{ bgcolor: 'background.default', py: 1.5 }}>
          {/* Push Notifications Section */}
          <Box sx={sectionHeaderRowSx} onClick={togglePushExpanded}>
            <Box sx={sectionIconBadgeSx(isDark, '#FEF3C7', 'rgba(245,158,11,0.15)')}>📲</Box>
            <Typography sx={sectionLabelSx}>
              {t('pushNotifications')}
            </Typography>
            {pushSubscribed && (
              <Box sx={pushActiveBadgeSx(isDark)}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981' }} />
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: isDark ? '#6EE7B7' : '#059669' }}>
                  {t('pushActive')}
                </Typography>
              </Box>
            )}
            {pushExpanded ? <ExpandLessIcon sx={{ color: 'text.disabled', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
            <Box onClick={(e) => {
              e.stopPropagation();
              if (!pushSupported || !isPwaInstalled) {
                setPushExpanded(true);
              }
            }} sx={{ display: 'flex', alignItems: 'center' }}>
              {pushLoading ? (
                <CircularProgress size={20} sx={{ color: 'primary.main' }} />
              ) : (
                <Switch
                  checked={pushSubscribed}
                  onChange={(e) => {
                    onPushToggle();
                    if (!e.target.checked) setPushExpanded(false);
                  }}
                  disabled={!pushSupported || !isPwaInstalled}
                  // disabled על MUI Switch מתרגם ל-<input disabled> - דפדפנים
                  // לא יורים click בכלל על אלמנט disabled, אז זה אף פעם לא
                  // הגיע ל-onClick של ה-Box העוטף (למעלה) שאמור להציג את
                  // הסבר ההתקנה. pointerEvents:none מעביר את הקליק "מבעד"
                  // ל-Switch ישירות ל-Box העוטף שכן מגיב.
                  sx={!pushSupported || !isPwaInstalled ? { ...smallSwitchSx, pointerEvents: 'none' } : smallSwitchSx}
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
                  <Box sx={installHintBoxSx(isDark)}>
                    <Typography sx={installHintTitleSx(isDark)}>
                      {t('pushRequiresInstall')}
                    </Typography>
                    <Typography sx={installHintBodySx(isDark)}>
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
          <Box sx={sectionDividerSx} />
          <Box sx={sectionHeaderRowWithMtSx} onClick={toggleGroupExpanded}>
            <Box sx={sectionIconBadgeSx(isDark, '#E0E7FF', 'rgba(99,102,241,0.15)')}>👥</Box>
            <Typography sx={sectionLabelSx}>{t('groupNotifications')}</Typography>
            <Typography sx={sectionCountBadgeSx}>
              {[notifications.groupJoin, notifications.groupLeave, notifications.groupRemoved ?? true, notifications.groupDelete ?? true, notifications.listUpdate].filter(Boolean).length}/5
            </Typography>
            {groupExpanded ? <ExpandLessIcon sx={{ color: 'text.disabled', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={notifications.groupJoin && notifications.groupLeave && (notifications.groupRemoved ?? true) && (notifications.groupDelete ?? true) && notifications.listUpdate}
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
              <Typography sx={subRowLabelSx}>{t('memberJoinedNotif')}</Typography>
              <Switch checked={notifications.groupJoin} onChange={(e) => updateNotifications({ groupJoin: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={subSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('memberLeftNotif')}</Typography>
              <Switch checked={notifications.groupLeave} onChange={(e) => updateNotifications({ groupLeave: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={subSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('memberRemovedNotif')}</Typography>
              <Switch checked={notifications.groupRemoved ?? true} onChange={(e) => updateNotifications({ groupRemoved: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={subSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('groupDeletedNotifSetting')}</Typography>
              <Switch checked={notifications.groupDelete ?? true} onChange={(e) => updateNotifications({ groupDelete: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={subSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('listUpdatedNotifSetting')}</Typography>
              <Switch checked={notifications.listUpdate} onChange={(e) => updateNotifications({ listUpdate: e.target.checked })} sx={smallSwitchSx} />
            </Box>
          </Collapse>

          {/* Product Notifications Section */}
          <Box sx={sectionDividerSx} />
          <Box sx={sectionHeaderRowWithMtSx} onClick={toggleProductExpanded}>
            <Box sx={sectionIconBadgeSx(isDark, '#F0FDF4', 'rgba(34,197,94,0.15)')}>📦</Box>
            <Typography sx={sectionLabelSx}>{t('productNotifications')}</Typography>
            <Typography sx={sectionCountBadgeSx}>
              {[notifications.productAdd, notifications.productDelete, notifications.productEdit, notifications.productPurchase].filter(Boolean).length}/4
            </Typography>
            {productExpanded ? <ExpandLessIcon sx={{ color: 'text.disabled', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
            <Box onClick={(e) => e.stopPropagation()} sx={{ display: 'flex', alignItems: 'center' }}>
              <Switch
                checked={notifications.productAdd && notifications.productDelete && notifications.productEdit && notifications.productPurchase}
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
              <Typography sx={subRowLabelSx}>{t('productAdded')}</Typography>
              <Switch checked={notifications.productAdd} onChange={(e) => updateNotifications({ productAdd: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={subSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('productDeleted')}</Typography>
              <Switch checked={notifications.productDelete} onChange={(e) => updateNotifications({ productDelete: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={subSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('productEdited')}</Typography>
              <Switch checked={notifications.productEdit} onChange={(e) => updateNotifications({ productEdit: e.target.checked })} sx={smallSwitchSx} />
            </Box>
            <Box sx={lastSubSettingRowSx}>
              <Typography sx={subRowLabelSx}>{t('productPurchased')}</Typography>
              <Switch checked={notifications.productPurchase} onChange={(e) => updateNotifications({ productPurchase: e.target.checked })} sx={smallSwitchSx} />
            </Box>
          </Collapse>
        </Box>
      </Collapse>
    </>
  );
};
