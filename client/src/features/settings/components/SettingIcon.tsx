import type { ComponentType } from 'react';
import { Box } from '@mui/material';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import HelpRoundedIcon from '@mui/icons-material/HelpRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import CleaningServicesRoundedIcon from '@mui/icons-material/CleaningServicesRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import { useSettings } from '../../../global/context/SettingsContext';

// אייקון וקטורי אחיד לכל שורה במסך ההגדרות: אריח מעוגל ברקע רך, והאייקון
// בצבע של אותה משפחה. במקום אימוג'ים, שנראים שונה בכל מכשיר ולא אחידים ביניהם.
export type SettingIconName =
  | 'notifications' | 'darkMode' | 'language' | 'admin' | 'subscription'
  | 'help' | 'about' | 'terms' | 'clearCache' | 'delete';

const ICONS: Record<SettingIconName, { Icon: ComponentType<{ sx?: object }>; color: string }> = {
  notifications: { Icon: NotificationsRoundedIcon, color: '#F59E0B' },
  darkMode: { Icon: DarkModeRoundedIcon, color: '#6366F1' },
  language: { Icon: LanguageRoundedIcon, color: '#0EA5E9' },
  admin: { Icon: AdminPanelSettingsRoundedIcon, color: '#0D9488' },
  subscription: { Icon: WorkspacePremiumRoundedIcon, color: '#7C3AED' },
  help: { Icon: HelpRoundedIcon, color: '#3B82F6' },
  about: { Icon: InfoRoundedIcon, color: '#64748B' },
  terms: { Icon: DescriptionRoundedIcon, color: '#0891B2' },
  clearCache: { Icon: CleaningServicesRoundedIcon, color: '#F97316' },
  delete: { Icon: DeleteRoundedIcon, color: '#EF4444' },
};

export const SettingIcon = ({ name }: { name: SettingIconName }) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const { Icon, color } = ICONS[name];
  return (
    <Box component="span" aria-hidden sx={{
      width: 32, height: 32, borderRadius: '10px', flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      bgcolor: `${color}${isDark ? '2E' : '1A'}`,
    }}>
      <Icon sx={{ fontSize: 19, color }} />
    </Box>
  );
};
