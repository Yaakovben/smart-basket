import { Box, Typography } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StorageIcon from '@mui/icons-material/Storage';
import { headerIconButtonSx, spin } from '../styles/AdminDashboard.styles';

interface AdminDashboardHeaderBarProps {
  isRtl: boolean;
  title: string;
  faithTitle: string;
  isRefreshing: boolean;
  onBack: () => void;
  onOpenDbHealth: () => void;
  onOpenFaith: () => void;
  onOpenPriceSync: () => void;
  onRefresh: () => void;
}

// שורת ניווט עליונה: חזרה, כותרת, וכפתורי כלים (DB, חיזוק יומי, מחירים, רענון)
export const AdminDashboardHeaderBar = ({
  isRtl, title, faithTitle, isRefreshing,
  onBack, onOpenDbHealth, onOpenFaith, onOpenPriceSync, onRefresh,
}: AdminDashboardHeaderBarProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, position: 'relative', zIndex: 1 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box onClick={onBack} role="button" tabIndex={0} sx={headerIconButtonSx(36)}>
        {isRtl ? <ArrowForwardIcon /> : <ArrowBackIcon />}
      </Box>
      <Typography sx={{ color: 'white', fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
        {title}
      </Typography>
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
      {/* MongoDB - ראשון ב-DOM = ימני קיצוני ב-RTL */}
      <Box onClick={onOpenDbHealth} role="button" tabIndex={0} aria-label="שימוש ב-MongoDB" sx={headerIconButtonSx(44)}>
        <StorageIcon sx={{ fontSize: 26 }} />
      </Box>
      <Box onClick={onOpenFaith} role="button" tabIndex={0} aria-label={faithTitle} sx={headerIconButtonSx(44)}>
        <AutoStoriesIcon sx={{ fontSize: 26 }} />
      </Box>
      <Box onClick={onOpenPriceSync} role="button" tabIndex={0} aria-label="ניהול מאגר מחירים" sx={headerIconButtonSx(44)}>
        <StorefrontIcon sx={{ fontSize: 26 }} />
      </Box>
      <Box onClick={onRefresh} role="button" tabIndex={0} sx={headerIconButtonSx(44)}>
        <RefreshIcon sx={{
          fontSize: 26,
          animation: isRefreshing ? `${spin} 1s linear infinite` : 'none',
        }} />
      </Box>
    </Box>
  </Box>
);
