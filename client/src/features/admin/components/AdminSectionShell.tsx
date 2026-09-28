import { Box } from '@mui/material';
import type { ReactNode } from 'react';
import { DbHealthHeader } from './DbHealthHeader';
import { adminPageSx } from '../styles/adminPage.styles';

// המכל המשותף של כל עמוד אזור בדף המנהל: כותרת קבועה עם כפתור חזרה ותוכן שנגלל.
interface Props {
  title: string;
  onBack: () => void;
  isDark: boolean;
  icon?: ReactNode;
  children: ReactNode;
}

export const AdminSectionShell = ({ title, onBack, isDark, icon, children }: Props) => (
  <Box sx={adminPageSx(isDark)}>
    <DbHealthHeader onClose={onBack} icon={icon} title={title} />
    <Box sx={{
      flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', WebkitOverflowScrolling: 'touch',
      display: 'flex', flexDirection: 'column',
      // ילדים לא מתכווצים לגובה המסך: בלי זה תוכן ארוך נחתך ומוסתר במקום להיגלל
      '& > *': { flexShrink: 0 },
      p: 2, pb: 'calc(24px + env(safe-area-inset-bottom))',
    }}>
      {children}
    </Box>
  </Box>
);
