import { useEffect, useState } from 'react';
import { Box } from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { headerIconButtonSx } from '../styles/AdminDashboard.styles';
import { adminApi } from '../../../services/api/admin.api';

const POLL_MS = 30_000;

interface Props {
  onClick: () => void;
}

// אייקון "ניהול מנוי" בכותרת האדמין, עם נקודה אדומה פועמת כשיש דיווח תשלום
// אמיתי שממתין לאישור (status='reported' בלבד - לא בקשות שנפתחו ועדיין
// לא דווח בהן תשלום, שאינן דורשות שום פעולה מהאדמין). self-fetching כדי
// שהתג יעודכן גם בלי לפתוח את המסך.
export const SubscriptionHeaderIcon = ({ onClick }: Props) => {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      adminApi.getSubscriptionRequests()
        .then((items) => { if (!cancelled) setPendingCount(items.filter((i) => i.status === 'reported').length); })
        .catch(() => { /* התג פשוט לא מוצג */ });
    };
    load();
    const id = window.setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  return (
    <Box
      onClick={onClick} role="button" tabIndex={0}
      aria-label={`ניהול מנוי${pendingCount > 0 ? ` - ${pendingCount} ממתינות לאישור` : ''}`}
      sx={{ ...headerIconButtonSx(44), position: 'relative' }}
    >
      <WorkspacePremiumRoundedIcon sx={{ fontSize: 26 }} />
      {pendingCount > 0 && (
        <Box aria-hidden sx={{
          position: 'absolute', top: 4, insetInlineEnd: 4, width: 11, height: 11, borderRadius: '50%',
          bgcolor: '#FCD34D', border: '2px solid', borderColor: 'rgba(6,78,59,0.9)',
          animation: 'sbAdminIconPing 1.8s ease-out infinite',
          '@keyframes sbAdminIconPing': {
            '0%': { boxShadow: '0 0 0 0 rgba(252,211,77,0.6)' },
            '70%, 100%': { boxShadow: '0 0 0 6px rgba(252,211,77,0)' },
          },
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }} />
      )}
    </Box>
  );
};
