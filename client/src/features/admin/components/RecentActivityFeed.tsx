import { useState } from 'react';
import { Box, Typography, Collapse } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateShort, formatTimeShort } from '../../../global/helpers';
import type { LoginActivity, Language } from '../../../global/types';

const MAX_ENTRIES = 30;

const getMethodIcon = (method: string) => {
  if (method === 'google') return <GoogleIcon sx={{ fontSize: 12, color: '#4285F4' }} />;
  if (method === 'app_open') return <PhoneAndroidIcon sx={{ fontSize: 12, color: '#14B8A6' }} />;
  return <EmailIcon sx={{ fontSize: 12, color: '#14B8A6' }} />;
};

interface RecentActivityFeedProps {
  activities: LoginActivity[];
  language: Language;
}

export const RecentActivityFeed = ({ activities, language }: RecentActivityFeedProps) => {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const displayActivities = activities.slice(0, MAX_ENTRIES);

  return (
    <Box sx={{ mt: 2 }}>
      {/* כותרת מקופלת */}
      <Box
        onClick={() => setExpanded(prev => !prev)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
          px: 0.5,
        }}
      >
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
          {t('recentActivity')} ({activities.length})
        </Typography>
        {expanded
          ? <ExpandLessIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
          : <ExpandMoreIcon sx={{ fontSize: 20, color: 'text.disabled' }} />
        }
      </Box>

      {/* לוג פעילות */}
      <Collapse in={expanded}>
        <Box sx={{
          bgcolor: 'background.paper',
          borderRadius: '10px',
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}>
          {displayActivities.map((activity, i) => (
            <Box
              key={activity.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                px: 1.25,
                py: 0.6,
                borderBottom: i < displayActivities.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}
            >
              <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 70, fontFamily: 'monospace' }}>
                {formatDateShort(activity.timestamp, language)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.disabled', minWidth: 38, fontFamily: 'monospace' }}>
                {formatTimeShort(activity.timestamp, language)}
              </Typography>
              <Typography sx={{
                fontSize: 11,
                fontWeight: 500,
                color: 'text.primary',
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {activity.userName}
              </Typography>
              {getMethodIcon(activity.loginMethod)}
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
};
