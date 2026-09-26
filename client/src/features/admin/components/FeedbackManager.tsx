import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import { adminApi, type AdminFeedback } from '../../../services/api/admin.api';
import { DbHealthHeader } from './DbHealthHeader';
import { adminPageSx } from '../styles/adminPage.styles';

interface Props {
  isDark: boolean;
  onClose: () => void;
}

const STAR_COLOR = '#F59E0B';

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const StarsRow = ({ rating }: { rating: number }) => (
  <Box sx={{ display: 'flex', gap: '1px' }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <StarRoundedIcon key={n} sx={{ fontSize: 16, color: n <= rating ? STAR_COLOR : 'action.disabledBackground' }} />
    ))}
  </Box>
);

// מסך אדמין לצפייה במשובי משתמשים (דירוג 1-5 + טקסט חופשי) - נשלחים
// מפופאפ המשוב החד-פעמי בקליינט (ראו FeedbackPopup/useFeedbackPopup).
// תצוגה בלבד, בלי פעולות - זה לא תור שדורש טיפול כמו בקשות מנוי.
export const FeedbackManager = ({ isDark, onClose }: Props) => {
  const [items, setItems] = useState<AdminFeedback[] | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await adminApi.getFeedback());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const avgRating = items && items.length > 0
    ? Math.round((items.reduce((sum, f) => sum + f.rating, 0) / items.length) * 10) / 10
    : null;

  return (
    <Box sx={adminPageSx(isDark)}>
      <DbHealthHeader
        onClose={onClose}
        icon={<RateReviewRoundedIcon sx={{ color: STAR_COLOR }} />}
        title="משובי משתמשים"
        meta={items && items.length > 0
          ? <Typography sx={{ fontSize: 11, fontWeight: 800, color: 'text.secondary' }}>{items.length} משובים · ממוצע {avgRating}★</Typography>
          : undefined}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', p: 2 }}>
        {error ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
            לא הצלחנו לטעון את המשובים.
          </Typography>
        ) : items === null ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={22} /></Box>
        ) : items.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
            עדיין לא התקבלו משובים.
          </Typography>
        ) : (
          items.map((f) => (
            <Box key={f.id} sx={{
              display: 'flex', flexDirection: 'column', gap: 0.6, p: 1.5, mb: 1.25, borderRadius: '14px',
              bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
              border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                <StarsRow rating={f.rating} />
                <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{fmtDateTime(f.createdAt)}</Typography>
              </Box>
              {f.message && (
                <Typography sx={{ fontSize: 13.5, lineHeight: 1.5 }}>{f.message}</Typography>
              )}
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                {f.user?.name ?? '?'} {f.user?.email ? `· ${f.user.email}` : ''}
              </Typography>
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
};
