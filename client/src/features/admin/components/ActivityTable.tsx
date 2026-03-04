import { useState, useCallback, memo } from 'react';
import { Box, Typography, Paper, Chip, Collapse, keyframes } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { useSettings } from '../../../global/context/SettingsContext';
import { formatDateLong, formatDateShort, formatTimeShort, isToday, isYesterday } from '../../../global/helpers';
import type { LoginActivity } from '../../../global/types';
import type { Language } from '../../../global/types';

// צבעים אחידים
const TEAL = '#14B8A6';
const GOOGLE_BLUE = '#4285F4';
const APP_AMBER = '#F59E0B';
const ONLINE_GREEN = '#22C55E';

const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.7; }
`;

interface ActivityTableProps {
  activities: LoginActivity[];
  language: Language;
  onlineUserIds: Set<string>;
}

interface GroupedActivities {
  date: string;
  displayDate: string;
  activities: LoginActivity[];
}

const getMethodColor = (method: string) => {
  if (method === 'google') return GOOGLE_BLUE;
  if (method === 'app_open') return APP_AMBER;
  return TEAL;
};

// תוויות שיטה מתורגמות, נקראות בתוך קומפוננטה עם t()
type TranslateFn = (key: 'methodEmail' | 'methodGoogle' | 'methodApp') => string;
const getMethodLabel = (method: string, t: TranslateFn) => {
  if (method === 'google') return t('methodGoogle');
  if (method === 'app_open') return t('methodApp');
  return t('methodEmail');
};

const getMethodIcon = (method: string) => {
  if (method === 'google') return <GoogleIcon sx={{ fontSize: 14 }} />;
  if (method === 'app_open') return <PhoneAndroidIcon sx={{ fontSize: 14 }} />;
  return <EmailIcon sx={{ fontSize: 14 }} />;
};

// שורת פעילות
const ActivityRow = memo(({ activity, language, isOnline }: { activity: LoginActivity; language: Language; isOnline: boolean }) => {
  const { t } = useSettings();
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(p => !p), []);
  const color = getMethodColor(activity.loginMethod);

  return (
    <Paper
      onClick={toggle}
      sx={{
        borderRadius: '12px',
        border: '1px solid',
        borderColor: isOnline ? 'rgba(34, 197, 94, 0.3)' : 'divider',
        bgcolor: isOnline ? 'rgba(34, 197, 94, 0.04)' : 'background.paper',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'background-color 0.15s',
        '&:active': { bgcolor: 'action.hover' }
      }}
    >
      {/* שורה ראשית */}
      <Box sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
        {/* שעה */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 48,
            p: 0.5,
            borderRadius: '8px',
            bgcolor: `${color}10`
          }}
        >
          <AccessTimeIcon sx={{ fontSize: 13, color, mb: 0.25 }} />
          <Typography sx={{ fontSize: 13, fontWeight: 700, color, lineHeight: 1 }}>
            {formatTimeShort(activity.timestamp, language)}
          </Typography>
        </Box>

        {/* אווטאר עם סטטוס אונליין */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            bgcolor: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 600,
            fontSize: 15,
            flexShrink: 0,
            position: 'relative',
          }}
        >
          {activity.userName.charAt(0).toUpperCase()}
          {isOnline && (
            <Box sx={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 11,
              height: 11,
              borderRadius: '50%',
              bgcolor: ONLINE_GREEN,
              border: '2px solid white',
              animation: `${pulse} 2s ease-in-out infinite`,
            }} />
          )}
        </Box>

        {/* שם + שיטה */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography sx={{
              fontSize: 13,
              fontWeight: 600,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {activity.userName}
            </Typography>
            {isOnline && (
              <FiberManualRecordIcon sx={{ fontSize: 8, color: ONLINE_GREEN, flexShrink: 0 }} />
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {getMethodIcon(activity.loginMethod)}
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              {getMethodLabel(activity.loginMethod, t)}
            </Typography>
          </Box>
        </Box>

        {/* חץ הרחבה */}
        {expanded
          ? <ExpandLessIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
          : <ExpandMoreIcon sx={{ color: 'text.disabled', fontSize: 20 }} />
        }
      </Box>

      {/* פרטים מורחבים */}
      <Collapse in={expanded}>
        <Box sx={{ px: 1.25, pb: 1.25, borderTop: '1px solid', borderColor: 'divider', bgcolor: 'action.hover' }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.75, mt: 1 }}>
            {/* אימייל מלא */}
            <Box sx={{ gridColumn: '1 / -1', bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.25 }}>{t('emailField')}</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary', wordBreak: 'break-all' }}>
                {activity.userEmail}
              </Typography>
            </Box>

            {/* שיטה */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.5 }}>
                {activity.loginMethod === 'app_open' ? t('appOpenAction') : t('loginAction')}
              </Typography>
              <Chip
                icon={getMethodIcon(activity.loginMethod)}
                label={getMethodLabel(activity.loginMethod, t)}
                size="small"
                sx={{
                  height: 24,
                  fontSize: 11,
                  fontWeight: 600,
                  bgcolor: `${color}14`,
                  color,
                  '& .MuiChip-icon': { color: `${color} !important` }
                }}
              />
            </Box>

            {/* תאריך ושעה */}
            <Box sx={{ bgcolor: 'background.paper', borderRadius: '8px', p: 1 }}>
              <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 500, mb: 0.25 }}>{t('dateField')}</Typography>
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

export const ActivityTable = ({ activities, language, onlineUserIds }: ActivityTableProps) => {
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1, px: 0.5 }}>
            <Typography sx={{
              fontSize: 13,
              fontWeight: 700,
              color: isToday(group.date) ? TEAL : 'text.primary'
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
                bgcolor: isToday(group.date) ? TEAL : 'action.selected',
                color: isToday(group.date) ? 'white' : 'text.secondary',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          </Box>

          {/* פעילויות */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {group.activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                language={language}
                isOnline={onlineUserIds.has(activity.userId)}
              />
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};
