import { Box, Typography, Paper, InputAdornment, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { ClearableTextField } from '../../../global/components';
import type { TranslationKeys } from '../../../global/i18n/translations';
import type { LoginActivity, Language } from '../../../global/types';
import type { UserWithLastLogin } from '../types';
import { UsersTable } from './UsersTable';
import { RecentActivityFeed } from './RecentActivityFeed';
import { AdminDashboardLoadingSkeleton } from './AdminDashboardLoadingSkeleton';

interface AdminDashboardContentProps {
  error: string | null;
  loading: boolean;
  isDark: boolean;
  onRetry: () => void;
  t: (key: TranslationKeys) => string;
  userSearch: string;
  setUserSearch: (value: string) => void;
  filteredUsers: UserWithLastLogin[];
  activities: LoginActivity[];
  language: Language;
  onlineUserIds: Set<string>;
  onUserDeleted: () => void;
}

// אזור התוכן הראשי מתחת לכותרת: שגיאה, חיפוש, טבלת משתמשים ופיד פעילות
export const AdminDashboardContent = ({
  error, loading, isDark, onRetry, t,
  userSearch, setUserSearch, filteredUsers, activities, language, onlineUserIds, onUserDeleted,
}: AdminDashboardContentProps) => (
  <Box sx={{ px: 2, mt: -4, position: 'relative', zIndex: 2 }}>
    {/* שגיאה */}
    {error && !loading && (
      <Paper sx={{
        p: 3,
        textAlign: 'center',
        bgcolor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
        border: '1px solid',
        borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FCA5A5',
        borderRadius: 3,
        mb: 2
      }}>
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        <Button
          variant="contained"
          onClick={onRetry}
          sx={{ bgcolor: 'primary.main', '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2 }}
        >
          {t('tryAgain')}
        </Button>
      </Paper>
    )}

    {/* חיפוש */}
    {!loading && (
      <ClearableTextField
        fullWidth
        size="small"
        placeholder={t('searchCustomer')}
        value={userSearch}
        onChange={(e) => setUserSearch(e.target.value)}
        onClear={() => setUserSearch('')}
        sx={{
          mb: 2,
          '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'white',
            boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
            border: 'none',
            '& fieldset': { border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' },
            '&:hover fieldset': { borderColor: 'primary.main' },
            '&.Mui-focused fieldset': { borderColor: 'primary.main', borderWidth: 1.5 },
          },
          '& .MuiOutlinedInput-input': { color: isDark ? '#E5E7EB' : undefined, '&::placeholder': { color: isDark ? '#6B7280' : undefined, opacity: 1 } },
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: isDark ? '#6B7280' : '#9CA3AF' }} />
            </InputAdornment>
          )
        }}
      />
    )}

    {/* טבלת משתמשים */}
    {loading ? (
      <AdminDashboardLoadingSkeleton />
    ) : (
      <UsersTable
        users={filteredUsers}
        activities={activities}
        language={language}
        onlineUserIds={onlineUserIds}
        isDark={isDark}
        onUserDeleted={onUserDeleted}
      />
    )}

    {/* פיד פעילות אחרונה */}
    {!loading && activities.length > 0 && (
      <RecentActivityFeed activities={activities} language={language} isDark={isDark} />
    )}

    {/* ריווח תחתון */}
    <Box sx={{ height: 32 }} />
  </Box>
);
