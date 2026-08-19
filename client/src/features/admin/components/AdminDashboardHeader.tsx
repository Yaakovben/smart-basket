import { Box } from '@mui/material';
import type { TranslationKeys } from '../../../global/i18n/translations';
import type { DashboardStats, UserFilter } from '../types';
import { AdminDashboardHeaderBar } from './AdminDashboardHeaderBar';
import { AdminDashboardStatCards } from './AdminDashboardStatCards';

interface AdminDashboardHeaderProps {
  isDark: boolean;
  isRtl: boolean;
  title: string;
  faithTitle: string;
  isRefreshing: boolean;
  onBack: () => void;
  onOpenDbHealth: () => void;
  onOpenFaith: () => void;
  onOpenPriceSync: () => void;
  onOpenPush: () => void;
  onOpenAiStatus: () => void;
  onRefresh: () => void;
  userFilter: UserFilter;
  onlineCount: number;
  stats: DashboardStats;
  loading?: boolean;
  onFilterClick: (filter: UserFilter) => void;
  onSelectAll: () => void;
  t: (key: TranslationKeys) => string;
}

// כותרת הדשבורד: רקע גרדיאנט, שורת ניווט עליונה וכרטיסי סטטיסטיקה לחיצים
export const AdminDashboardHeader = ({
  isDark, isRtl, title, faithTitle, isRefreshing,
  onBack, onOpenDbHealth, onOpenFaith, onOpenPriceSync, onOpenPush, onOpenAiStatus, onRefresh,
  userFilter, onlineCount, stats, loading, onFilterClick, onSelectAll, t,
}: AdminDashboardHeaderProps) => (
  <Box
    sx={{
      background: isDark
        ? 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)'
        : 'linear-gradient(135deg, #0F766E 0%, #14B8A6 50%, #2DD4BF 100%)',
      pt: 'max(env(safe-area-inset-top), 16px)',
      pb: 8,
      px: 2,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <AdminDashboardHeaderBar
      isRtl={isRtl}
      title={title}
      faithTitle={faithTitle}
      isRefreshing={isRefreshing}
      onBack={onBack}
      onOpenDbHealth={onOpenDbHealth}
      onOpenFaith={onOpenFaith}
      onOpenPriceSync={onOpenPriceSync}
      onOpenPush={onOpenPush}
      onOpenAiStatus={onOpenAiStatus}
      onRefresh={onRefresh}
    />
    <AdminDashboardStatCards
      userFilter={userFilter}
      onlineCount={onlineCount}
      stats={stats}
      loading={loading}
      onFilterClick={onFilterClick}
      onSelectAll={onSelectAll}
      t={t}
    />
  </Box>
);
