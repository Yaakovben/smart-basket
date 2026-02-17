import { Box, Typography, Paper, Chip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateLong, formatTimeShort, isToday, isYesterday } from '../../../global/helpers';
import type { LoginActivity } from '../../../global/types';

interface ActivityTableProps {
  activities: LoginActivity[];
}

interface GroupedActivities {
  date: string;
  displayDate: string;
  activities: LoginActivity[];
}

export const ActivityTable = ({ activities }: ActivityTableProps) => {
  const { t, settings } = useSettings();

  const getDateLabel = (dateStr: string) => {
    if (isToday(dateStr)) return t('today');
    if (isYesterday(dateStr)) return t('yesterday');
    return formatDateLong(dateStr + 'T00:00:00', settings.language);
  };

  // קיבוץ פעילויות לפי תאריך
  const groupedActivities: GroupedActivities[] = activities.reduce((groups: GroupedActivities[], activity) => {
    const dateStr = activity.timestamp.split('T')[0];
    const existingGroup = groups.find(g => g.date === dateStr);

    if (existingGroup) {
      existingGroup.activities.push(activity);
    } else {
      groups.push({
        date: dateStr,
        displayDate: getDateLabel(dateStr),
        activities: [activity]
      });
    }

    return groups;
  }, []);

  if (activities.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography sx={{ fontSize: 40, mb: 1 }}>📭</Typography>
        <Typography sx={{ fontSize: 15 }}>{t('noActivityFound')}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {groupedActivities.map((group) => (
        <Box key={group.date}>
          {/* Date Header */}
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            mb: 1.5,
            px: 0.5
          }}>
            <Typography sx={{
              fontSize: 14,
              fontWeight: 700,
              color: isToday(group.date) ? '#14B8A6' : 'text.primary'
            }}>
              {group.displayDate}
            </Typography>
            <Chip
              label={group.activities.length}
              size="small"
              sx={{
                height: 20,
                fontSize: 11,
                fontWeight: 600,
                bgcolor: isToday(group.date) ? '#14B8A6' : 'action.selected',
                color: isToday(group.date) ? 'white' : 'text.secondary'
              }}
            />
          </Box>

          {/* Activities for this date */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {group.activities.map((activity) => (
              <Paper
                key={activity.id}
                sx={{
                  p: 2,
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                  }
                }}
              >
                {/* Time Badge */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 60,
                    p: 1,
                    borderRadius: '10px',
                    bgcolor: activity.loginMethod === 'google' ? 'rgba(66, 133, 244, 0.1)' : 'rgba(20, 184, 166, 0.1)'
                  }}
                >
                  <AccessTimeIcon sx={{
                    fontSize: 16,
                    color: activity.loginMethod === 'google' ? '#4285F4' : '#14B8A6',
                    mb: 0.25
                  }} />
                  <Typography sx={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: activity.loginMethod === 'google' ? '#4285F4' : '#14B8A6'
                  }}>
                    {formatTimeShort(activity.timestamp, settings.language)}
                  </Typography>
                </Box>

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
                    fontSize: 17,
                    flexShrink: 0
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
                      fontSize: 12,
                      color: 'text.secondary',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {activity.userEmail}
                  </Typography>
                </Box>

                {/* Login Method Badge */}
                <Chip
                  label={activity.loginMethod === 'google' ? 'Google' : 'Email'}
                  size="small"
                  sx={{
                    height: 24,
                    fontSize: 11,
                    fontWeight: 600,
                    bgcolor: activity.loginMethod === 'google' ? 'rgba(66, 133, 244, 0.15)' : 'rgba(20, 184, 166, 0.15)',
                    color: activity.loginMethod === 'google' ? '#4285F4' : '#14B8A6',
                    border: '1px solid',
                    borderColor: activity.loginMethod === 'google' ? 'rgba(66, 133, 244, 0.3)' : 'rgba(20, 184, 166, 0.3)'
                  }}
                />
              </Paper>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
