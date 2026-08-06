import { Box, Typography, IconButton, Tabs, Tab, Avatar, Badge, InputAdornment } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import { ClearableTextField } from '../../../global/components';
import { ServerConnectionBanner } from '../../../global/components/ServerConnectionBanner';
import type { User } from '../../../global/types';
import type { TranslationKeys } from '../../../global/i18n/translations';
import { COMMON_STYLES } from '../../../global/helpers';
import { useReliableTap } from '../../../global/hooks';
import { glassButtonSx } from '../helpers/homeStyles';
import type { HomeTab } from '../types/home-types';

interface HomeHeaderProps {
  user: User;
  greeting: { label: string; emoji: string; weekdayMsg: string | null };
  isDark: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  tab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  allCount: number;
  myCount: number;
  groupsCount: number;
  totalUnreadCount: number;
  notificationsLoading: boolean;
  serverConnectionVisible?: boolean;
  onAvatarClick: () => void;
  onNotificationsClick: () => void;
  onSettingsClick: () => void;
  onAssistantClick: () => void;
  t: (key: TranslationKeys) => string;
}

// כותרת מסך הבית: אווטאר + ברכה, כפתורי התראות/הגדרות, חיפוש וטאבים.
export const HomeHeader = ({
  user, greeting, isDark, search, onSearchChange, tab, onTabChange,
  allCount, myCount, groupsCount, totalUnreadCount, notificationsLoading, serverConnectionVisible = false,
  onAvatarClick, onNotificationsClick, onSettingsClick, onAssistantClick, t,
}: HomeHeaderProps) => {
  const notificationsTap = useReliableTap(onNotificationsClick);
  const settingsTap = useReliableTap(onSettingsClick);
  const assistantTap = useReliableTap(onAssistantClick);

  return (
    <Box sx={{
      background: isDark ? COMMON_STYLES.gradients.header.dark : COMMON_STYLES.gradients.header.light,
      p: { xs: 'max(48px, env(safe-area-inset-top) + 12px) 16px 20px', sm: '48px 20px 20px' },
      borderRadius: '0 0 24px 24px',
      flexShrink: 0,
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.3)' : '0 4px 16px rgba(20, 184, 166, 0.15)',
      // מסך זעיר (Qin F21 Pro) - padding מצומצם
      '@media (max-width: 360px)': {
        p: 'max(36px, env(safe-area-inset-top) + 8px) 12px 14px',
        borderRadius: '0 0 18px 18px',
      },
      // מסך זעיר במיוחד ≤320px - דחיסה אגרסיבית גם ב-portrait
      '@media (max-width: 320px)': {
        p: 'max(28px, env(safe-area-inset-top) + 6px) 10px 10px',
        borderRadius: '0 0 14px 14px',
        '& .MuiAvatar-root': { width: '36px !important', height: '36px !important', fontSize: '14px !important' },
        '& .MuiOutlinedInput-root': { minHeight: '34px !important' },
        '& .MuiOutlinedInput-input': { fontSize: '13px !important' },
        '& .MuiTab-root': { minHeight: '28px !important', fontSize: '11.5px !important' },
        '& > .MuiBox-root': { marginBottom: '6px !important' },
      },
      // Landscape - דחיסה מקסימלית
      '@media (orientation: landscape) and (max-height: 500px)': {
        p: 'max(2px, env(safe-area-inset-top) + 2px) 12px 4px',
        borderRadius: '0 0 8px 8px',
        '& .MuiAvatar-root': { width: '26px !important', height: '26px !important', fontSize: '12px !important' },
        '& > .MuiBox-root': { marginBottom: '3px !important' },
        '& .MuiOutlinedInput-root': { minHeight: '28px !important' },
        '& .MuiOutlinedInput-input': { fontSize: '13px !important', py: '2px !important' },
        '& .MuiTab-root': {
          minHeight: '24px !important', py: '0px !important', fontSize: '11.5px !important',
          position: 'relative',
          '&::before': { content: '""', position: 'absolute', inset: '-6px 0' },
        },
        '& [class*="MuiIconButton-root"]': {
          width: '26px !important', height: '26px !important',
          position: 'relative',
          '&::before': { content: '""', position: 'absolute', inset: '-8px' },
        },
        '& [class*="MuiIconButton-root"] .MuiSvgIcon-root': { fontSize: '15px !important' },
      },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar
            onClick={onAvatarClick}
            sx={{ bgcolor: user.avatarColor || 'rgba(255,255,255,0.25)', cursor: 'pointer', width: 44, height: 44, fontSize: 18, border: '2px solid rgba(255,255,255,0.3)' }}
          >
            {user.avatarEmoji || user.name.charAt(0)}
          </Avatar>
          <Box>
            {/* ברכה עם אימוג'י לפי שעה - הופך את הכניסה לאישית יותר */}
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', display: 'flex', alignItems: 'center', gap: 0.4 }}>
              <Box component="span" sx={{ fontSize: 14, lineHeight: 1 }}>{greeting.emoji}</Box>
              {greeting.label}
            </Typography>
            <Typography sx={{ fontSize: 17, fontWeight: 700, color: 'white' }}>{user.name}</Typography>
            {greeting.weekdayMsg && (
              <Typography sx={{
                fontSize: 11, color: 'rgba(255,255,255,0.85)', mt: 0.3,
                fontWeight: 600, letterSpacing: 0.2,
              }}>
                {greeting.weekdayMsg}
              </Typography>
            )}
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {/* אייקון "אין חיבור לשרת" - inline ליד הפעמון, לא overlay צף.
              ServerConnectionBanner מחזיר null בעצמו כשאין בעיה. */}
          <ServerConnectionBanner visible={serverConnectionVisible} />
          {/* useReliableTap: onPointerUp + blur במקום onClick רגיל - אותו
              דפוס בדיוק כמו ב-HomeBottomNav, שם onClick רגיל התגלה כלא אמין
              (לפעמים לא מגיב) על חלק מהמכשירים: focus שנשאר תקוע אחרי לחיצה
              יכול לחסום טאפ הבא, ו-touch-action:manipulation מבטל את עיכוב
              ה-300ms של הדפדפן על טאפים. onClick נשאר כ-fallback להפעלה
              במקלדת (Enter/Space לא יורים pointerup). */}
          <IconButton
            {...notificationsTap}
            sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
          >
            <Badge badgeContent={totalUnreadCount} color="error" invisible={totalUnreadCount === 0} sx={{ '& .MuiBadge-badge': { fontSize: 10, fontWeight: 700, minWidth: 16, height: 16 } }}>
              <NotificationsIcon sx={{ color: 'white', fontSize: 22, opacity: notificationsLoading ? 0.5 : 1, transition: 'opacity 0.2s' }} />
            </Badge>
          </IconButton>
          <IconButton
            {...settingsTap}
            sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
          >
            <SettingsIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
          <IconButton
            {...assistantTap}
            aria-label="עוזר קניות חכם"
            sx={{ ...glassButtonSx, touchAction: 'manipulation' }}
          >
            <AutoAwesomeIcon sx={{ color: 'white', fontSize: 22 }} />
          </IconButton>
        </Box>
      </Box>

      <ClearableTextField
        fullWidth
        placeholder={t('search')}
        value={search}
        onChange={e => onSearchChange(e.target.value)}
        onClear={() => onSearchChange('')}
        size="small"
        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'background.paper', borderRadius: '12px' }, '& .MuiOutlinedInput-input': { fontSize: 16 } }}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'text.disabled' }} /></InputAdornment> }}
      />

      <Tabs
        value={tab}
        onChange={(_, v) => onTabChange(v)}
        variant="fullWidth"
        sx={{
          bgcolor: 'rgba(255,255,255,0.15)',
          borderRadius: { xs: '10px', sm: '12px' },
          p: { xs: 0.5, sm: 0.6 },
          minHeight: 'auto',
          '& .MuiTabs-indicator': { display: 'none' },
          '& .MuiTab-root': {
            borderRadius: { xs: '8px', sm: '10px' },
            py: { xs: 1.25, sm: 1.5 },
            minHeight: 'auto',
            fontSize: { xs: 15, sm: 16 },
            fontWeight: 600,
            color: 'rgba(255,255,255,0.9)',
            textTransform: 'none',
            '&.Mui-selected': { bgcolor: 'background.paper', color: 'primary.main' }
          }
        }}
      >
        <Tab value="all" label={`${t('all')} (${allCount})`} />
        <Tab value="my" label={`${t('myLists')} (${myCount})`} />
        <Tab value="groups" label={`${t('groups')} (${groupsCount})`} />
      </Tabs>
    </Box>
  );
};
