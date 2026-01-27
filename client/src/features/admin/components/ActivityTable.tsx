import { Box, Typography, Paper } from '@mui/material';
import { useSettings } from '../../../global/context/SettingsContext';
import type { LoginActivity } from '../../../global/types';

interface ActivityTableProps {
  activities: LoginActivity[];
}

export const ActivityTable = ({ activities }: ActivityTableProps) => {
  const { t, settings } = useSettings();

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const locale = settings.language === 'he' ? 'he-IL' : settings.language === 'ru' ? 'ru-RU' : 'en-US';
    return date.toLocaleDateString(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (activities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography sx={{ fontSize: 40, mb: 1 }}>📭</Typography>
        <Typography sx={{ fontSize: 15 }}>{t('noActivityFound')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {activities.map((activity) => (
        <Paper
          key={activity.id}
          sx={{
            p: 2,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: 2
          }}
        >
          {/* Avatar */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              bgcolor: activity.loginMethod === 'google' ? '#4285F4' : '#14B8A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 600,
              fontSize: 16
            }}
          >
            {activity.userName.charAt(0).toUpperCase()}
          </Box>

          {/* User Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 600,
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {activity.userName}
            </Typography>
            <Typography
              sx={{
                fontSize: 13,
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {activity.userEmail}
            </Typography>
          </Box>

          {/* Login Method & Time */}
          <Box sx={{ textAlign: 'end' }}>
            <Typography
              sx={{
                fontSize: 12,
                color: activity.loginMethod === 'google' ? '#4285F4' : '#14B8A6',
                fontWeight: 600
              }}
            >
              {activity.loginMethod === 'google' ? t('viaGoogle') : t('viaEmail')}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {formatDate(activity.timestamp)}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
              {formatTime(activity.timestamp)}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Box>
  );
};
