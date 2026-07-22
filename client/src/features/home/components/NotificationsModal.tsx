import { Box, Typography, Button } from '@mui/material';
import type { TranslationKeys } from '../../../global/i18n/translations';
import type { LocalNotification } from '../../../global/hooks';
import { Modal } from '../../../global/components';
import { NotificationItem } from './NotificationItem';

interface NotificationsModalProps {
  notifications: LocalNotification[];
  dismissingNotifications: Set<string>;
  onClose: () => void;
  onDismiss: (listId: string, notificationId: string) => void;
  onNavigate: (listId: string) => void;
  onMarkAllRead: () => void;
  t: (key: TranslationKeys) => string;
}

export const NotificationsModal = ({ notifications, dismissingNotifications, onClose, onDismiss, onNavigate, onMarkAllRead, t }: NotificationsModalProps) => {
  return (
    <Modal title={t('notifications')} onClose={onClose}>
      {notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
          <Box sx={{
            width: 80,
            height: 80,
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(20,184,166,0.12), rgba(16,185,129,0.06))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 38,
            mx: 'auto',
            mb: 2.5,
          }}>
            🔔
          </Box>
          <Typography sx={{ fontSize: 16, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
            {t('noNotifications')}
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
            {t('noNotificationsYet')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          {/* כותרת */}
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.secondary', mb: 1.5, textAlign: 'center', px: 0.5 }}>
            {notifications.length}{' '}
            {notifications.length === 1 ? t('newNotification') : t('newNotifications')}
          </Typography>

          {/* Notification list */}
          <Box sx={{
            maxHeight: '55vh',
            overflowY: 'auto',
            overscrollBehavior: 'contain',
            mx: -0.5,
            px: 0.5,
            pb: 1,
          }}>
            {notifications.map((n, index) => (
              <NotificationItem
                key={n.id}
                notification={n}
                index={index}
                isDismissing={dismissingNotifications.has(n.id)}
                onDismiss={onDismiss}
                onNavigate={onNavigate}
              />
            ))}
          </Box>

          {/* כפתור סמן הכל כנקרא */}
          <Box sx={{ pt: 1.5, px: 0.5 }}>
            <Button
              fullWidth
              size="small"
              onClick={onMarkAllRead}
              sx={{
                fontSize: 13,
                fontWeight: 600,
                color: '#14B8A6',
                textTransform: 'none',
                borderRadius: '12px',
                py: 1,
                bgcolor: 'rgba(20,184,166,0.06)',
                border: '1px solid rgba(20,184,166,0.15)',
                '&:hover': { bgcolor: 'rgba(20,184,166,0.12)' },
                '&:active': { transform: 'scale(0.98)' },
              }}
            >
              {t('markAllAsRead')}
            </Button>
          </Box>
        </Box>
      )}
    </Modal>
  );
};
