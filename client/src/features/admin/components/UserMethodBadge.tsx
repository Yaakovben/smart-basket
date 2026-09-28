import { Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import PhoneIphoneIcon from '@mui/icons-material/PhoneIphone';
import AddToHomeScreenIcon from '@mui/icons-material/AddToHomeScreen';
import LanguageIcon from '@mui/icons-material/Language';
import EmailIcon from '@mui/icons-material/Email';
import type { LoginActivity } from '../../../global/types';
import { methodColor } from '../helpers/loginActivityHelpers';
import { methodBadgeSx } from '../styles/UsersTable.styles';

// אייקון הרישום: בכניסה, סמל השיטה (גוגל או אימייל). בפתיחה, סמל המקום
// שממנו נפתחה (דפדפן, מסך הבית, אפליקציה), כדי שיהיה ברור במבט.
export const ActivityIcon = ({ method, platform, size, color }: {
  method: string; platform?: LoginActivity['platform']; size: number; color: string;
}) => {
  const sx = { fontSize: size, color };
  if (method === 'google') return <GoogleIcon sx={sx} />;
  if (method === 'email') return <EmailIcon sx={sx} />;
  if (platform === 'browser') return <LanguageIcon sx={sx} />;
  if (platform === 'pwa') return <AddToHomeScreenIcon sx={sx} />;
  if (platform === 'ios') return <PhoneIphoneIcon sx={sx} />;
  return <PhoneAndroidIcon sx={sx} />;
};

interface UserMethodBadgeProps {
  method: string;
  platform?: LoginActivity['platform'];
  size?: number;
}

// אייקון שיטה בתוך עיגול צבעוני
export const UserMethodBadge = ({ method, platform, size = 28 }: UserMethodBadgeProps) => {
  const color = methodColor(method);
  return (
    <Box sx={methodBadgeSx(size, color)}>
      <ActivityIcon method={method} platform={platform} size={size * 0.5} color={color} />
    </Box>
  );
};
