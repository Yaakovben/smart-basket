import { memo, useCallback, useState } from 'react';
import { Box, Typography, Paper, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSettings } from '../../../global/context/SettingsContext';
import { getRelativeTime } from '../../../global/helpers';
import type { UserWithLastLogin } from '../types';
import type { LoginActivity, Language } from '../../../global/types';
import { useUserRowDetails } from '../hooks/useUserRowDetails';
import { UserRowExpandedContent } from './UserRowExpandedContent';
import {
  userRowPaperSx, userRowMainSx, avatarCircleSx, onlineDotSx, userNameSx, lastSeenSx,
  loginCountBoxSx, expandArrowSx,
} from '../styles/UsersTable.styles';

interface UserRowProps {
  user: UserWithLastLogin;
  language: Language;
  isOnline: boolean;
  userActivities: LoginActivity[];
  isDark: boolean;
}

export const UserRow = memo(({ user, language, isOnline, userActivities, isDark }: UserRowProps) => {
  const { t, settings } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  const { showDetails, userLists, detailsLoading, listsSummary, handleShowDetails } = useUserRowDetails(user.id);
  const isGoogle = user.registrationMethod === 'google';
  const isRtl = settings.language === 'he';

  const toggleExpand = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const lastActivity = user.lastAppOpenAt && user.lastLoginAt
    ? (new Date(user.lastAppOpenAt) > new Date(user.lastLoginAt) ? user.lastAppOpenAt : user.lastLoginAt)
    : user.lastAppOpenAt || user.lastLoginAt;

  return (
    <Paper sx={userRowPaperSx(isOnline, isDark, isRtl)}>
      {/* שורה ראשית */}
      <Box onClick={toggleExpand} sx={userRowMainSx(isDark)}>
        {/* אווטאר עם נקודת אונליין */}
        <Box sx={{ position: 'relative', flexShrink: 0 }}>
          <Box sx={avatarCircleSx(user.avatarColor, isOnline, isDark, !!user.avatarEmoji)}>
            {user.avatarEmoji || user.name.charAt(0).toUpperCase()}
          </Box>
          {/* נקודת אונליין על האווטאר */}
          <Box sx={onlineDotSx(isRtl, isOnline, isDark)} />
        </Box>

        {/* שם + נראה לאחרונה */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={userNameSx(isDark)}>
            {user.name}
          </Typography>
          <Typography sx={lastSeenSx(isDark)}>
            {lastActivity
              ? getRelativeTime(lastActivity, language)
              : t('neverLoggedIn')
            }
          </Typography>
        </Box>

        {/* מספר כניסות */}
        <Box sx={loginCountBoxSx}>
          <Typography sx={{ fontSize: 15, fontWeight: 700, color: '#14B8A6', lineHeight: 1 }}>
            {user.totalLogins}
          </Typography>
          <Typography sx={{ fontSize: 8.5, color: '#6B7280', lineHeight: 1.3, fontWeight: 500 }}>
            {t('logins')}
          </Typography>
        </Box>

        {/* חץ הרחבה */}
        <IconButton size="small" sx={{ p: 0.25 }}>
          <ExpandMoreIcon sx={expandArrowSx(isExpanded)} />
        </IconButton>
      </Box>

      {/* אזור מורחב */}
      <Collapse in={isExpanded}>
        <UserRowExpandedContent
          user={user}
          language={language}
          isDark={isDark}
          isRtl={isRtl}
          isGoogle={isGoogle}
          userActivities={userActivities}
          showDetails={showDetails}
          userLists={userLists}
          detailsLoading={detailsLoading}
          listsSummary={listsSummary}
          onShowDetails={handleShowDetails}
        />
      </Collapse>
    </Paper>
  );
});

UserRow.displayName = 'UserRow';
