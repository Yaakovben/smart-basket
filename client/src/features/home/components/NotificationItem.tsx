import { memo } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { LocalNotification } from '../../../global/hooks';
import { useSettings } from '../../../global/context/SettingsContext';
import { getLocale } from '../../../global/helpers/dateFormatting';
import type { Language } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';

// ===== אנימציות =====
const notificationDismissKeyframes = {
  '@keyframes notificationDismiss': {
    '0%': { transform: 'translateY(0) translateX(0) rotate(0deg)', opacity: 1 },
    '20%': { transform: 'translateY(20px) translateX(30px) rotate(5deg)', opacity: 0.9 },
    '100%': { transform: 'translateY(400px) translateX(100px) rotate(15deg)', opacity: 0 }
  }
};

const notificationSlideInKeyframes = {
  '@keyframes notificationSlideIn': {
    '0%': { opacity: 0, transform: 'translateY(10px)' },
    '100%': { opacity: 1, transform: 'translateY(0)' }
  }
};

// ===== פונקציות טהורות (מחוץ לקומפוננטה - לא נוצרות מחדש) =====
const getEmoji = (type: LocalNotification['type']): string => {
  switch (type) {
    case 'leave': return '👋';
    case 'removed': case 'member_removed': return '🚫';
    case 'list_deleted': return '🗑️';
    case 'join': return '🎉';
    case 'product_add': return '🛒';
    case 'product_edit': return '✏️';
    case 'product_delete': return '❌';
    case 'product_purchase': return '✅';
    case 'product_unpurchase': return '↩️';
    case 'list_update': return '⚙️';
    default: return '📢';
  }
};

const getAccentColor = (type: LocalNotification['type']): string => {
  switch (type) {
    case 'leave': case 'removed': case 'member_removed': case 'list_deleted': case 'product_delete': return '#EF4444';
    case 'join': return '#10B981';
    case 'product_add': return '#3B82F6';
    case 'product_edit': return '#F59E0B';
    case 'product_purchase': case 'product_unpurchase': return '#14B8A6';
    case 'list_update': return '#8B5CF6';
    default: return '#6B7280';
  }
};

const getTimeDisplay = (
  timestamp: Date,
  language: Language,
  t: (key: TranslationKeys) => string
): string => {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffDays = Math.floor(diffMs / 86400000);

  const isToday = timestamp.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = timestamp.toDateString() === yesterday.toDateString();

  if (diffMin < 1) return t('timeNow');
  if (diffMin < 60 && isToday) return t('timeMinutesAgo').replace('{count}', String(diffMin));
  if (isToday) {
    const time = timestamp.toLocaleTimeString(getLocale(language), { hour: '2-digit', minute: '2-digit' });
    return t('timeHoursAgo').replace('{time}', time);
  }
  if (isYesterday) return t('timeYesterday');
  if (diffDays < 7) return t('timeDaysAgo').replace('{count}', String(diffDays));
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return t('timeWeeksAgo').replace('{count}', language === 'he' ? (weeks === 1 ? 'שבוע' : `${weeks} שבועות`) : String(weeks));
  }
  const months = Math.floor(diffDays / 30);
  return t('timeMonthsAgo').replace('{count}', language === 'he' ? (months === 1 ? 'חודש' : `${months} חודשים`) : String(months));
};

// ===== טייפים =====
interface NotificationData {
  id: string;
  type: LocalNotification['type'];
  listId: string;
  listName: string;
  userName: string;
  productName?: string;
  timestamp: Date;
}

interface NotificationItemProps {
  notification: NotificationData;
  index: number;
  isDismissing: boolean;
  onDismiss: (listId: string, notificationId: string) => void;
}

// ===== קומפוננטה =====
export const NotificationItem = memo(({ notification: n, index, isDismissing, onDismiss }: NotificationItemProps) => {
  const { t, settings } = useSettings();
  const accent = getAccentColor(n.type);

  const getNotificationText = (): string => {
    switch (n.type) {
      case 'leave': return t('memberLeft');
      case 'removed': return t('memberRemoved');
      case 'member_removed': return t('removedYouNotif');
      case 'list_deleted': return t('deletedGroupNotif');
      case 'join': return t('memberJoined');
      case 'product_add': return `${t('addedProductNotif')} "${n.productName}"`;
      case 'product_edit': return `${t('editedProductNotif')} "${n.productName}"`;
      case 'product_delete': return `${t('deletedProductNotif')} "${n.productName}"`;
      case 'product_purchase': return `${t('purchasedNotif')} "${n.productName}"`;
      case 'product_unpurchase': return `${t('unmarkedPurchasedNotif')} "${n.productName}"`;
      case 'list_update': return t('listUpdatedNotif');
      default: return '';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.25,
        px: 1.5,
        mb: 0.75,
        borderRadius: '12px',
        bgcolor: 'action.hover',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        borderInlineStart: `3.5px solid ${accent}`,
        transition: 'background-color 0.2s',
        ...notificationSlideInKeyframes,
        ...(isDismissing
          ? { ...notificationDismissKeyframes, animation: 'notificationDismiss 0.5s ease-out forwards' }
          : { animation: `notificationSlideIn 0.35s ease-out ${index * 0.05}s both` }
        ),
        '&:active': { bgcolor: 'rgba(0,0,0,0.04)' },
        '&:last-child': { mb: 0 },
      }}
    >
      {/* Icon */}
      <Box sx={{
        width: 44,
        height: 44,
        borderRadius: '14px',
        bgcolor: `${accent}14`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        flexShrink: 0,
      }}>
        {getEmoji(n.type)}
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontSize: 13.5,
          color: 'text.primary',
          lineHeight: 1.45,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          <Box component="span" sx={{ fontWeight: 700 }}>{n.userName}</Box>
          {' '}{getNotificationText()}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4 }}>
          <Typography sx={{
            fontSize: 11.5,
            color: 'text.secondary',
            fontWeight: 500,
            maxWidth: 140,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {n.listName}
          </Typography>
          <Box sx={{ width: 3, height: 3, borderRadius: '50%', bgcolor: 'text.disabled', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11.5, color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {getTimeDisplay(n.timestamp, settings.language, t)}
          </Typography>
        </Box>
      </Box>

      {/* Dismiss */}
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); onDismiss(n.listId, n.id); }}
        disabled={isDismissing}
        disableRipple
        tabIndex={-1}
        sx={{
          color: 'text.disabled',
          flexShrink: 0,
          width: 36,
          height: 36,
          bgcolor: 'action.hover',
          borderRadius: '50%',
          opacity: isDismissing ? 0 : 0.5,
          transition: 'opacity 0.2s',
          '&:hover': { opacity: 0.7 },
          border: 'none !important',
          outline: 'none !important',
          boxShadow: 'none !important',
          '&:focus, &:focus-visible, &.Mui-focusVisible': { outline: 'none !important', boxShadow: 'none !important', border: 'none !important', bgcolor: 'action.hover' },
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <CloseIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
});

NotificationItem.displayName = 'NotificationItem';
