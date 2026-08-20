import { Box, Typography } from '@mui/material';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import { ShimmerBlock } from '../../../global/components';
import type { AiStatus } from '../../../services/api/admin.api';
import { AdminAiStatusHeader } from './AdminAiStatusHeader';
import { AdminAiProviderPanel } from './AdminAiProviderPanel';

interface Props {
  isDark: boolean;
  data: AiStatus | null;
  loading: boolean;
  refreshing: boolean;
  lastFetchAt: Date | null;
  onRefresh: () => void;
  onClose: () => void;
}

// מסך מלא (לא Dialog) עם כותרת קבועה + גוף גולל בנפרד - אותו מבנה כמו
// DbHealthCard. זה מה שמונע את הבאג שבו התוכן גולל *מתחת* לכותרת ולנתוני
// המכסה שלא מתעדכנים: הכותרת היא flex item קבוע מחוץ לאזור ה-overflow,
// לא absolute/sticky בתוך אזור גלילה.
// data/loading/refreshing מגיעים מ-useAiStatus שמוחזק פעם אחת ב-AdminDashboard
// (לא hook עצמאי כאן) - כך שגם אייקון הסטטוס בכותרת וגם הפאנל הזה חולקים
// את אותם הנתונים בלי לירות שתי קריאות רשת נפרדות לאותו endpoint.
export const AdminAiStatusCard = ({ isDark, data, loading, refreshing, lastFetchAt, onRefresh, onClose }: Props) => {
  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 2000,
      bgcolor: isDark ? '#0F172A' : '#F8FAFC',
      display: 'flex', flexDirection: 'column',
      pt: 'env(safe-area-inset-top)',
    }}>
      <AdminAiStatusHeader
        data={data}
        loading={loading}
        refreshing={refreshing}
        lastFetchAt={lastFetchAt}
        onRefresh={onRefresh}
        onClose={onClose}
      />

      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, pb: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
        {loading && !data && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, py: 2 }}>
            <ShimmerBlock height={160} radius={16} />
            <ShimmerBlock height={160} radius={16} />
          </Box>
        )}

        {!loading && !data && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 4 }}>
            לא ניתן היה לטעון את נתוני ה-AI כרגע.
          </Typography>
        )}

        {data && (
          <>
            {data.fallbackCount > 0 && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
                px: 1.5, py: 1, borderRadius: 2,
                bgcolor: isDark ? 'rgba(245,158,11,0.1)' : '#FFFBEB',
                border: '1px solid', borderColor: isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A',
              }}>
                <SyncAltRoundedIcon sx={{ fontSize: 18, color: '#D97706', flexShrink: 0 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#FCD34D' : '#92400E' }}>
                  {data.fallbackCount} בקשות עברו לספק הגיבוי מאז עליית השרת (הספק הראשי נכשל)
                </Typography>
              </Box>
            )}

            {data.providers.map(p => (
              <AdminAiProviderPanel key={p.name} provider={p} isDark={isDark} />
            ))}

            <Typography sx={{ fontSize: 10.5, color: 'text.disabled', textAlign: 'center', mt: 1 }}>
              נתוני הבקשות/שגיאות הם מזיכרון השרת - מתאפסים בכל הפעלה מחדש של השרת.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
};
