import type { ReactNode } from 'react';
import { Box } from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import { headerIconButtonSx } from '../styles/AdminDashboard.styles';
import { useAdminAlerts } from '../hooks/useAdminAlerts';

// אייקון בכותרת האדמין עם מספר הדברים החדשים מעליו (לא רק נקודה), כדי
// שיהיה ברור כמה מחכים בלי לפתוח את המסך. מעל 99 מוצג "99+".
const HeaderIconWithCount = ({ count, label, color, onClick, children }: {
  count: number;
  label: string;
  color: string;
  onClick: () => void;
  children: ReactNode;
}) => (
  <Box
    onClick={onClick} role="button" tabIndex={0}
    aria-label={count > 0 ? `${label} - ${count} חדשים` : label}
    sx={{ ...headerIconButtonSx(44), position: 'relative' }}
  >
    {children}
    {count > 0 && (
      <Box aria-hidden sx={{
        position: 'absolute', top: 2, insetInlineEnd: 0,
        minWidth: 19, height: 19, px: 0.5, borderRadius: '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: color, color: '#fff', fontSize: 11, fontWeight: 800, lineHeight: 1,
        border: '2px solid', borderColor: 'rgba(6,78,59,0.9)',
        animation: 'sbAdminCountPop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        '@keyframes sbAdminCountPop': { from: { transform: 'scale(0.4)' }, to: { transform: 'scale(1)' } },
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}>
        {count > 99 ? '99+' : count}
      </Box>
    )}
  </Box>
);

// ניהול מנוי: מספר דיווחי התשלום שממתינים לאישור (status='reported' בלבד -
// לא בקשות שנפתחו ועדיין לא דווח בהן תשלום, שאינן דורשות פעולה מהאדמין).
// הרכיב הזה גם מרענן את המספרים כל 30 שניות, בשביל שני האייקונים.
export const SubscriptionHeaderIcon = ({ onClick }: { onClick: () => void }) => {
  const alerts = useAdminAlerts({ poll: true });
  return (
    <HeaderIconWithCount count={alerts?.subscriptionPending ?? 0} label="ניהול מנוי" color="#7C3AED" onClick={onClick}>
      <WorkspacePremiumRoundedIcon sx={{ fontSize: 26 }} />
    </HeaderIconWithCount>
  );
};

// משוב: מספר המשובים שהגיעו מאז הפתיחה האחרונה של המסך (המסך מאפס אותו כשנפתח).
export const FeedbackHeaderIcon = ({ onClick }: { onClick: () => void }) => {
  const alerts = useAdminAlerts();
  return (
    <HeaderIconWithCount
      count={alerts?.feedbackNew ?? 0}
      label="משובי משתמשים"
      color="#EF4444"
      onClick={onClick}
    >
      <RateReviewRoundedIcon sx={{ fontSize: 26 }} />
    </HeaderIconWithCount>
  );
};
