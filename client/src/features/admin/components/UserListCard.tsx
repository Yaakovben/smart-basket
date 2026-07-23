import { Box, Typography } from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useSettings } from '../../../global/context/SettingsContext';
import type { AdminUserList } from '../../../services/api';
import { listCardSx, listCardIconBoxSx, listCardNameSx, listCardProductCountSx } from '../styles/UsersTable.styles';

interface UserListCardProps {
  list: AdminUserList;
  isDark: boolean;
}

// כרטיס רשימה בודד בפרטים המורחבים של שורת משתמש
export const UserListCard = ({ list, isDark }: UserListCardProps) => {
  const { t } = useSettings();
  const progress = list.productCount > 0 ? Math.round((list.purchasedCount / list.productCount) * 100) : 0;

  return (
    <Box sx={listCardSx(isDark)}>
      {/* אייקון רשימה */}
      <Box sx={listCardIconBoxSx(list.isGroup)}>
        {list.isGroup
          ? <GroupIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
          : <ListAltIcon sx={{ fontSize: 16, color: '#14B8A6' }} />
        }
      </Box>

      {/* שם + מידע */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={listCardNameSx(isDark)}>
          {list.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          {list.isGroup ? (
            <>
              <Typography sx={{ fontSize: 10, color: '#9CA3AF' }}>
                {list.membersCount} {t('members')}
              </Typography>
              {list.isOwner && (
                <Typography sx={{ fontSize: 9.5, color: '#14B8A6', fontWeight: 600 }}>
                  {t('owner')}
                </Typography>
              )}
            </>
          ) : (
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>
              {t('privateList')}
            </Typography>
          )}
        </Box>
      </Box>

      {/* מוצרים */}
      <Box sx={{ textAlign: 'center', flexShrink: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShoppingCartIcon sx={{ fontSize: 12, color: '#9CA3AF' }} />
          <Typography sx={listCardProductCountSx(isDark)}>
            {list.productCount}
          </Typography>
        </Box>
        {list.productCount > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, mt: 0.25 }}>
            <CheckCircleIcon sx={{ fontSize: 10, color: '#22C55E' }} />
            <Typography sx={{ fontSize: 9.5, color: '#22C55E', fontWeight: 500 }}>
              {progress}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
