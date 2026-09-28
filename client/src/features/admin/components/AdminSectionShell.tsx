import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { DbHealthHeader } from './DbHealthHeader';
import { PullRefreshArea } from '../../../global/components/PullRefreshArea';
import { adminPageSx } from '../styles/adminPage.styles';

// המכל המשותף של כל עמוד אזור בדף המנהל: כותרת קבועה עם כפתור חזרה ותוכן שנגלל.
interface Props {
  title: string;
  onBack: () => void;
  isDark: boolean;
  icon?: ReactNode;
  // כשמועבר: רענון אמיתי בגרירה של התוכן (מחזיר true בהצלחה)
  onRefresh?: () => Promise<boolean>;
  children: ReactNode;
}

const contentSx = {
  display: 'flex', flexDirection: 'column',
  // ילדים לא מתכווצים לגובה המסך: בלי זה תוכן ארוך נחתך ומוסתר במקום להיגלל
  '& > *': { flexShrink: 0 },
  p: 2, pb: 'calc(24px + env(safe-area-inset-bottom))',
} as const;

export const AdminSectionShell = ({ title, onBack, isDark, icon, onRefresh, children }: Props) => (
  <Box sx={adminPageSx(isDark)}>
    <DbHealthHeader onClose={onBack} icon={icon} title={title} />
    {onRefresh ? (
      <PullRefreshArea onRefresh={onRefresh} sx={contentSx}>{children}</PullRefreshArea>
    ) : (
      <Box sx={{ ...contentSx, flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </Box>
    )}
  </Box>
);
