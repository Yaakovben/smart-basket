import { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort, isToday } from '../../../global/helpers';
import type { LoginActivity, Language } from '../../../global/types';

const MAX_ENTRIES = 30;

const EVENT_COLORS = {
  email: '#14B8A6',
  google: '#4285F4',
  app_open: '#3B82F6',
} as const;

const getColor = (method: string) => EVENT_COLORS[method as keyof typeof EVENT_COLORS] || EVENT_COLORS.email;

interface RecentActivityFeedProps {
  activities: LoginActivity[];
  language: Language;
  defaultExpanded?: boolean;
}

export const RecentActivityFeed = ({ activities, language, defaultExpanded = false }: RecentActivityFeedProps) => {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const displayActivities = activities.slice(0, MAX_ENTRIES);

  return (
    <Box sx={{ mt: 3 }}>
      {/* כותרת */}
      <Box
        onClick={() => setExpanded(prev => !prev)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          py: 1,
          px: 0.5,
        }}
      >
        <HistoryIcon sx={{ fontSize: 18, color: '#9CA3AF' }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#6B7280', flex: 1 }}>
          {t('recentActivity')}
        </Typography>
        <Box sx={{
          bgcolor: '#14B8A6',
          color: 'white',
          borderRadius: '10px',
          px: 1,
          py: 0.15,
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.5,
        }}>
          {activities.length}
        </Box>
        <ExpandMoreIcon sx={{
          fontSize: 20,
          color: '#9CA3AF',
          transition: 'transform 0.2s',
          transform: expanded ? 'rotate(180deg)' : 'none',
        }} />
      </Box>

      {/* לוג */}
      <Collapse in={expanded}>
        <Box sx={{
          bgcolor: 'white',
          borderRadius: '14px',
          border: '1px solid rgba(0,0,0,0.06)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          overflow: 'hidden',
        }}>
          {displayActivities.map((activity, i) => {
            const color = getColor(activity.loginMethod);
            const showDateHeader = i === 0 || formatDateShort(activity.timestamp, language) !== formatDateShort(displayActivities[i - 1].timestamp, language);

            return (
              <Box key={activity.id}>
                {/* כותרת תאריך */}
                {showDateHeader && (
                  <Box sx={{
                    px: 1.25,
                    py: 0.5,
                    bgcolor: '#F9FAFB',
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    ...(i > 0 && { borderTop: '1px solid rgba(0,0,0,0.04)' }),
                  }}>
                    <Typography sx={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: isToday(activity.timestamp.split('T')[0]) ? '#14B8A6' : '#9CA3AF',
                      textTransform: 'uppercase',
                      letterSpacing: 0.3,
                    }}>
                      {formatDateShort(activity.timestamp, language)}
                    </Typography>
                  </Box>
                )}

                {/* שורת פעילות */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.25,
                    py: 0.7,
                    borderBottom: i < displayActivities.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' },
                  }}
                >
                  {/* אייקון צבעוני */}
                  <Box sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    bgcolor: `${color}12`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {activity.loginMethod === 'google' && <GoogleIcon sx={{ fontSize: 12, color }} />}
                    {activity.loginMethod === 'app_open' && <PhoneAndroidIcon sx={{ fontSize: 12, color }} />}
                    {activity.loginMethod === 'email' && <EmailIcon sx={{ fontSize: 12, color }} />}
                  </Box>

                  {/* שעה */}
                  <Typography sx={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 500, minWidth: 40 }}>
                    {formatTimeShort(activity.timestamp, language)}
                  </Typography>

                  {/* שם */}
                  <Typography sx={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: '#374151',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {activity.userName}
                  </Typography>

                  {/* label סוג */}
                  <Typography sx={{ fontSize: 10, color, fontWeight: 600, flexShrink: 0 }}>
                    {activity.loginMethod === 'app_open' ? t('methodApp') : activity.loginMethod === 'google' ? t('methodGoogle') : t('methodEmail')}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Box>
  );
};
