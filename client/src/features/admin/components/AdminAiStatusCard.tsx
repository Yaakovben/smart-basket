import { Box, Typography } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { ShimmerBlock } from '../../../global/components';
import type { AiStatus, AiDailyBudget } from '../../../services/api/admin.api';
import { AdminAiStatusHeader } from './AdminAiStatusHeader';
import { AdminAiProviderPanel } from './AdminAiProviderPanel';

// שעות עגולות עד resetAt, לפחות 1. null אם אין/עבר.
function hoursUntil(resetAt: string | null): number | null {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.round(ms / 3_600_000));
}

// כרטיס "מכסה יומית משותפת" - כמה קריאות AI חיצוניות בוצעו היום מול התקציב.
// מגן על המכסה החינמית של הספק (משותפת לכל האפליקציה). מעל התקציב הלקוחות
// מקבלים 429 + "חוזר בעוד X שעות" במקום שהמכסה של הספק תישרף לגמרי.
const AiBudgetCard = ({ budget, isDark }: { budget: AiDailyBudget; isDark: boolean }) => {
  const unlimited = budget.limit <= 0;
  const pct = unlimited ? 0 : Math.min(100, Math.round((budget.usedToday / budget.limit) * 100));
  const hrs = hoursUntil(budget.resetAt);
  const tone = budget.exceeded ? '#EF4444' : pct >= 80 ? '#D97706' : '#0D9488';

  return (
    <Box sx={{
      mb: 1.5, p: 1.75, borderRadius: 2.5,
      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#fff',
      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 0.75 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary' }}>מכסה יומית משותפת (AI)</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: tone }}>
          {unlimited ? 'ללא הגבלה' : `${budget.usedToday.toLocaleString()} / ${budget.limit.toLocaleString()}`}
        </Typography>
      </Box>

      {!unlimited && (
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <Box sx={{ height: '100%', width: `${pct}%`, bgcolor: tone, borderRadius: 3, transition: 'width 0.3s' }} />
        </Box>
      )}

      {budget.exceeded ? (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, mt: 1,
          px: 1, py: 0.6, borderRadius: 1.5,
          bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2',
        }}>
          <ErrorOutlineIcon sx={{ fontSize: 15, color: '#EF4444', flexShrink: 0 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#FCA5A5' : '#B91C1C' }}>
            המכסה נגמרה - הלקוחות מקבלים "חוזר בעוד {hrs ?? '—'} שעות". מתחדשת בחצות UTC.
          </Typography>
        </Box>
      ) : (
        <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.75 }}>
          משותף לכל המשתמשים · מתאפס בחצות UTC{hrs ? ` (בעוד ~${hrs} ש')` : ''}
        </Typography>
      )}
    </Box>
  );
};

interface Props {
  isDark: boolean;
  data: AiStatus | null;
  loading: boolean;
  refreshing: boolean;
  lastFetchAt: Date | null;
  refreshError: string | null;
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
export const AdminAiStatusCard = ({ isDark, data, loading, refreshing, lastFetchAt, refreshError, onRefresh, onClose }: Props) => {
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
        {refreshError && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
            px: 1.5, py: 1, borderRadius: 2,
            bgcolor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
            border: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.3)' : '#FECACA',
          }}>
            <ErrorOutlineIcon sx={{ fontSize: 18, color: '#EF4444', flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#FCA5A5' : '#B91C1C' }}>
              {refreshError}
            </Typography>
          </Box>
        )}

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
            {data.dailyBudget && <AiBudgetCard budget={data.dailyBudget} isDark={isDark} />}

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
