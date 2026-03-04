import { useState, useCallback, memo } from 'react';
import { Box, Typography, Paper, Chip, Collapse } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateLong, formatDateShort, formatTimeShort, isToday, isYesterday } from '../../../global/helpers';
import type { LoginActivity } from '../../../global/types';
import type { Language } from '../../../global/types';

interface ActivityTableProps {
  activities: LoginActivity[];
  language: Language;
}

interface GroupedActivities {
  date: string;
  displayDate: string;
  activities: LoginActivity[];
}

const getMethodColor = (method: string) => {
  if (method === 'google') return '#4285F4';
  if (method === 'app_open') return '#F59E0B';
  return '#14B8A6';
};

const getMethodLabel = (method: string) => {
  if (method === 'google') return 'Google';
  if (method === 'app_open') return 'App';
  return 'Email';
};

const getMethodIcon = (method: string) => {
  if (method === 'google') return <GoogleIcon sx={{ fontSize: 14 }} />;
  if (method === 'app_open') return <PhoneAndroidIcon sx={{ fontSize: 14 }} />;
  return <EmailIcon sx={{ fontSize: 14 }} />;
};

// שורת פעילות עם פרטים מורחבים
const ActivityRow = memo(({ activity, language }: { activity: LoginActivity; language: Language }) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(p => !p), []);
  const color = getMethodColor(activity.loginMethod);

  return (
    <Paper
      onClick={toggle}
      sx={{
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'divider',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        '&:active': { bgcolor: 'action.hover' }
      }}
    >
      {/* שורה ראשית */}
      <Box sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* תג שעה */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 52,
            p: 0.75,
            borderRadius: '8px',
            bgcolor: `${color}14`
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 14, color, mb: 0.25 }} />
          <Typography sx={{ fontSize: 14, fontWeight: 700, color }}>
            {formatTimeShort(activity.timestamp, language)}
          </Typography>
        </Box>

        {/* אווטאר */}
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '10px',
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 16,
            flexShrink: 0
          }}
        >
          {activity.userName.charAt(0).toUpperCase()}
        </Box>

        {/* שם */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activity.userName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getMethodIcon(activity.loginMethod)}
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {getMethodLabel(activity.loginMethod)}
            </Typography>
          </Box>
        </Box>

        {/* כפתור הרחבה */}
        {expanded ? <ExpandLessIcon sx={{ color: 'text.disabled', fontSize: 20 }} /> : <ExpandMoreIcon sx={{ color: 'text.disabled', fontSize: 20 }} />}
      </Box>

      {/* פרטים מורחבים */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.5, pb: 1.5, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1 }}>
            {/* אימייל מלא */}
            <Box sx={{ gridColumn: '1 / -1', bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.25 }}>Email</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', wordBreak: 'break-all' }}>
                {activity.userEmail}
              </Typography>
            </Box>

            {/* שיטה */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.25 }}>
                {activity.loginMethod === 'app_open' ? 'App Open' : 'Login'}
              </Typography>
              <Chip
                icon={getMethodIcon(activity.loginMethod)}
                label={getMethodLabel(activity.loginMethod)}
                size="small"
                sx={{
                  height: 24,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: `${color}18`,
                  color,
                  '& .MuiChip-icon': { color: `${color} !important` }
                }}
              />
            </Box>

            {/* תאריך ושעה מלאים */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.25 }}>Date</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>
                {formatDateShort(activity.timestamp, language)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {formatTimeShort(activity.timestamp, language)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
});

ActivityRow.displayName = 'ActivityRow';

export const ActivityTable = ({ activities, language }: ActivityTableProps) => {
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
          {/* כותרת תאריך */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, px: 0.5 }}>
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

          {/* פעילויות */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {group.activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} language={language} />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
