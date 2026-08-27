import { Box, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { AiProviderStatus } from '../../../services/api/admin.api';

interface AdminAiProviderPanelProps {
  provider: AiProviderStatus;
  isDark: boolean;
}

const fmtDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;

const statRow = (label: string, value: React.ReactNode, isDark: boolean) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6 }}>
    <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: isDark ? '#E5E7EB' : 'text.primary' }}>{value}</Typography>
  </Box>
);

// כרטיס פירוט ספק ה-AI היחיד (Groq - אין יותר ספק גיבוי) - מודל, פעילות
// אחרונה, ומכסת ה-rate-limit כפי שהספק עצמו מחזיר (לא ניחוש שלנו).
export const AdminAiProviderPanel = ({ provider, isDark }: AdminAiProviderPanelProps) => {
  const rl = provider.rateLimit;
  const hasError = !!provider.lastError;

  return (
    <Box sx={{
      p: 2, borderRadius: 3, mb: 1.5,
      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#FFF',
      border: '1px solid', borderColor: 'divider',
    }}>
      {/* כותרת: שם + תפקיד + מצב הגדרה */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{provider.name}</Typography>
        <Box sx={{
          px: 0.7, py: 0.1, borderRadius: '999px',
          bgcolor: provider.role === 'primary' ? (isDark ? 'rgba(13,148,136,0.18)' : '#CCFBF1') : (isDark ? 'rgba(148,163,184,0.18)' : '#E5E7EB'),
        }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: provider.role === 'primary' ? '#0D9488' : (isDark ? '#9CA3AF' : '#475569') }}>
            {provider.role === 'primary' ? 'ראשי' : 'גיבוי'}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }} />
        {provider.configured ? (
          <CheckCircleIcon sx={{ fontSize: 16, color: '#10B981' }} />
        ) : (
          <HelpOutlineIcon sx={{ fontSize: 16, color: isDark ? '#6B7280' : '#9CA3AF' }} />
        )}
        <Typography sx={{ fontSize: 11, color: provider.configured ? '#10B981' : (isDark ? '#6B7280' : '#9CA3AF'), fontWeight: 700 }}>
          {provider.configured ? 'מוגדר ופעיל' : 'לא מוגדר'}
        </Typography>
      </Box>

      {!provider.configured && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', pb: 0.5 }}>
          אין מפתח API מוגדר בשרת לספק הזה.
        </Typography>
      )}

      {provider.configured && (
        <>
          {statRow('מודל פעיל', provider.model ?? '—', isDark)}
          {provider.role === 'primary' && (
            <>
              {statRow('המודל נבדק לאחרונה', fmtDateTime(provider.modelResolvedAt) ?? '—', isDark)}
              {statRow('בדיקה אוטומטית הבאה', fmtDateTime(provider.nextModelCheckAt) ?? '—', isDark)}
            </>
          )}
          {statRow('בקשות שטופלו (מאז עליית השרת)', provider.requestCount.toLocaleString('he-IL'), isDark)}
          {statRow('פעם אחרונה שהצליח', fmtDateTime(provider.lastSuccessAt) ?? 'עדיין לא נעשה בו שימוש', isDark)}

          {/* מכסת rate-limit - מהספק עצמו, לא הערכה שלנו */}
          {rl ? (
            <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFB' }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.3, mb: 0.5 }}>
                מכסת שימוש (מהספק)
              </Typography>
              {(rl.remainingRequests !== null || rl.limitRequests !== null) &&
                statRow('בקשות שנותרו', `${rl.remainingRequests ?? '?'} מתוך ${rl.limitRequests ?? '?'}`, isDark)}
              {rl.resetRequests && statRow('בקשות מתאפסות בעוד', rl.resetRequests, isDark)}
              {(rl.remainingTokens !== null || rl.limitTokens !== null) &&
                statRow('טוקנים שנותרו', `${rl.remainingTokens ?? '?'} מתוך ${rl.limitTokens ?? '?'}`, isDark)}
              {rl.resetTokens && statRow('טוקנים מתאפסים בעוד', rl.resetTokens, isDark)}
            </Box>
          ) : (
            <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>
              אין עדיין נתוני מכסה - יופיעו אחרי הבקשה הראשונה לספק הזה.
            </Typography>
          )}

          {hasError && (
            <Box sx={{ mt: 1, p: 1.25, borderRadius: 2, bgcolor: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2', border: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.25)' : '#FECACA' }}>
              <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'flex-start' }}>
                <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 17, flexShrink: 0, mt: '1px' }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: '#B91C1C', opacity: 0.75, mb: 0.15 }}>
                    שגיאה אחרונה{fmtDateTime(provider.lastErrorAt) ? ` · ${fmtDateTime(provider.lastErrorAt)}` : ''}
                  </Typography>
                  {/* הסבר קריא - למה זה כנראה קרה, לא רק קוד שגיאה */}
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#B91C1C', lineHeight: 1.4 }}>
                    {provider.lastErrorReason ?? 'שגיאה לא מזוהה'}
                  </Typography>
                </Box>
              </Box>
              {/* פרטים טכניים גולמיים - למי שצריך לחפור עמוק יותר */}
              {provider.lastError && (
                <Typography sx={{
                  fontSize: 10, color: '#B91C1C', opacity: 0.65, mt: 0.75, pt: 0.75,
                  borderTop: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)',
                  fontFamily: 'monospace', wordBreak: 'break-word', direction: 'ltr', textAlign: 'left',
                }}>
                  {provider.lastError}
                </Typography>
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};
