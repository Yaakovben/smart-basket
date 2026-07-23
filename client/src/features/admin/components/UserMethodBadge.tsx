import { Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import EmailIcon from '@mui/icons-material/Email';
import { EVENT_COLORS } from '../helpers/usersTableHelpers';
import { methodBadgeSx } from '../styles/UsersTable.styles';

interface UserMethodBadgeProps {
  method: string;
  size?: number;
}

// אייקון שיטה בתוך עיגול צבעוני
export const UserMethodBadge = ({ method, size = 28 }: UserMethodBadgeProps) => {
  const color = method === 'google' ? EVENT_COLORS.google : method === 'app_open' ? EVENT_COLORS.app_open : EVENT_COLORS.login;
  const iconSize = size * 0.5;
  return (
    <Box sx={methodBadgeSx(size, color)}>
      {method === 'google' && <GoogleIcon sx={{ fontSize: iconSize, color }} />}
      {method === 'app_open' && <PhoneAndroidIcon sx={{ fontSize: iconSize, color }} />}
      {method === 'email' && <EmailIcon sx={{ fontSize: iconSize, color }} />}
    </Box>
  );
};
