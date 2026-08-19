import { useEffect, useState } from 'react';
import {
  Box, Typography, IconButton, CircularProgress, Chip,
  LinearProgress, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { adminApi } from '../../../services/api/admin.api';

interface ProviderStatus {
  name: string;
  configured: boolean;
  model: string | null;
  modelCachedAt: number | null;
  nextRefreshAt: number | null;
  rateLimitRequests: number | null;
  rateLimitRemainingRequests: number | null;
  rateLimitResetRequests: string | null;
  rateLimitTokens: number | null;
  rateLimitRemainingTokens: number | null;
  rateLimitResetTokens: string | null;
}

interface AiStatus {
  providers: ProviderStatus[];
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `לפני ${diff} שניות`;
  if (diff < 3600) return `לפני ${Math.floor(diff / 60)} דקות`;
  return `לפני ${Math.floor(diff / 3600)} שעות`;
}

function formatTimeUntil(ts: number): string {
  const diff = Math.floor((ts - Date.now()) / 1000);
  if (diff <= 0) return 'עכשיו';
  if (diff < 60) return `עוד ${diff} שניות`;
  if (diff < 3600) return `עוד ${Math.floor(diff / 60)} דקות`;
  return `עוד ${Math.floor(diff / 3600)} שעות`;
}

function parseResetDuration(s: string | null): string {
  if (!s) return '—';
  const match = s.match(/(\d+)([smh])/);
  if (!match) return s;
  const [, n, unit] = match;
  const map: Record<string, string> = { s: 'שניות', m: 'דקות', h: 'שעות' };
  return `עוד ${n} ${map[unit] ?? unit}`;
}

function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.round(((total - used) / total) * 100) : 0;
  const remaining = total > 0 ? total - used : 0;
  const color = pct > 50 ? '#10B981' : pct > 20 ? '#F59E0B' : '#EF4444';
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{label}</Typography>
        <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
          {remaining.toLocaleString()} / {total.toLocaleString()}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 6,
          borderRadius: 3,
          bgcolor: 'rgba(255,255,255,0.08)',
          '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 },
        }}
      />
    </Box>
  );
}

function ProviderCard({ p, isDark }: { p: ProviderStatus; isDark: boolean }) {
  const isGroq = p.name === 'Groq';
  const hasRateData = p.rateLimitRequests !== null && p.rateLimitRequests > 0;

  return (
    <Box sx={{
      borderRadius: 3,
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
      bgcolor: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(248,250,252,0.9)',
      p: 2,
      mb: 2,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', flex: 1, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {p.name}
          {isGroq
            ? <Chip label="ראשי" size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18, bgcolor: '#0F766E', color: 'white' }} />
            : <Chip label="גיבוי" size="small" sx={{ ml: 1, fontSize: '0.65rem', height: 18, bgcolor: '#6366F1', color: 'white' }} />}
        </Typography>
        {p.configured
          ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 20 }} />
          : <CancelIcon sx={{ color: '#EF4444', fontSize: 20 }} />}
      </Box>

      {!p.configured && (
        <Typography variant="caption" sx={{ color: '#EF4444' }}>לא מוגדר — מפתח API חסר</Typography>
      )}

      {p.configured && (
        <>
          <Box sx={{
            mb: 1.5, p: 1.5, borderRadius: 2,
            bgcolor: isDark ? 'rgba(15,118,110,0.1)' : 'rgba(15,118,110,0.06)',
            border: '1px solid',
            borderColor: isDark ? 'rgba(15,118,110,0.25)' : 'rgba(15,118,110,0.15)',
          }}>
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', display: 'block', mb: 0.3 }}>
              מודל פעיל
            </Typography>
            <Typography sx={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#14B8A6', fontWeight: 600, wordBreak: 'break-all' }}>
              {p.model ?? 'לא נטען עדיין'}
            </Typography>
            {isGroq && p.modelCachedAt && p.modelCachedAt > 0 && (
              <Box sx={{ display: 'flex', gap: 2, mt: 0.8, flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                  עודכן: {formatTimeAgo(p.modelCachedAt)}
                </Typography>
                {p.nextRefreshAt && (
                  <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                    רענון אוטומטי: {formatTimeUntil(p.nextRefreshAt)}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          {isGroq && (
            hasRateData ? (
              <>
                <UsageBar
                  used={p.rateLimitRequests! - p.rateLimitRemainingRequests!}
                  total={p.rateLimitRequests!}
                  label="בקשות לדקה (נותרו / מקסימום)"
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
                  <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                    מתאפס: {parseResetDuration(p.rateLimitResetRequests)}
                  </Typography>
                </Box>
                <UsageBar
                  used={p.rateLimitTokens! - p.rateLimitRemainingTokens!}
                  total={p.rateLimitTokens!}
                  label="טוקנים לדקה (נותרו / מקסימום)"
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                    מתאפס: {parseResetDuration(p.rateLimitResetTokens)}
                  </Typography>
                </Box>
              </>
            ) : (
              <Box sx={{ p: 1, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                  נתוני מכסה יוצגו אחרי שיישלח שיחת AI ראשונה
                </Typography>
              </Box>
            )
          )}
        </>
      )}
    </Box>
  );
}

interface Props {
  onClose: () => void;
  isDark: boolean;
}

export const AiStatusCard = ({ onClose, isDark }: Props) => {
  const [status, setStatus] = useState<AiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.getAiStatus();
      setStatus(data);
    } catch {
      setError('שגיאה בטעינת מצב ה-AI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Box
      sx={{
        position: 'fixed', inset: 0, zIndex: 1300,
        bgcolor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <Box
        onClick={e => e.stopPropagation()}
        sx={{
          width: '100%', maxWidth: 480,
          maxHeight: '85dvh', overflowY: 'auto',
          borderRadius: '20px 20px 0 0',
          bgcolor: isDark ? '#0F1419' : '#FFFFFF',
          pb: 'calc(24px + env(safe-area-inset-bottom))',
        }}
      >
        {/* כותרת */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1.5,
          p: 2.5, pb: 2,
          borderBottom: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
          position: 'sticky', top: 0,
          bgcolor: isDark ? '#0F1419' : '#FFFFFF',
          zIndex: 1,
        }}>
          <Box sx={{
            width: 40, height: 40, borderRadius: '12px',
            background: 'linear-gradient(135deg, #0F766E, #14B8A6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <SmartToyIcon sx={{ color: 'white', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
              מצב AI
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
              ספקים, מודלים ומכסות
            </Typography>
          </Box>
          <Tooltip title="רענן">
            <span>
              <IconButton onClick={load} size="small" disabled={loading} sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton onClick={onClose} size="small" sx={{ color: isDark ? '#64748B' : '#94A3B8' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ p: 2 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#14B8A6' }} />
            </Box>
          )}

          {error && !loading && (
            <Typography color="error" sx={{ textAlign: 'center', py: 4 }}>{error}</Typography>
          )}

          {!loading && status && status.providers.map(p => (
            <ProviderCard key={p.name} p={p} isDark={isDark} />
          ))}

          {!loading && status && (
            <Box sx={{
              p: 1.5, borderRadius: 2,
              bgcolor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.05)',
              border: '1px solid',
              borderColor: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
            }}>
              <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#64748B', lineHeight: 1.7, display: 'block' }}>
                המודל נבחר אוטומטית — הגדול ביותר שזמין ב-Groq כרגע. המכסה מתאפסת כל דקה. אם Groq נכשל — המערכת עוברת ל-NVIDIA NIM אוטומטית בלי שהמשתמש ירגיש.
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};
