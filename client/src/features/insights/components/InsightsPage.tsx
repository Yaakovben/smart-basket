import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, keyframes, LinearProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;
const anim = (d: number) => ({ animation: `${fadeIn} 0.5s ease ${d}s both` });
const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : s >= 40 ? '#F97316' : '#EF4444';

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    insightsApi.getInsights().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', gap: 2 }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
      <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>מנתח נתונים...</Typography>
    </Box>
  );

  if (error || !data || data.stats.totalProducts === 0) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', p: 3 }}>
      <Typography sx={{ fontSize: 56, mb: 2 }}>{error ? '⚠️' : '📊'}</Typography>
      <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{error ? t('connectionErrorTitle') : t('noInsightsYet')}</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 3 }}>{error ? t('connectionErrorDesc') : t('noInsightsDesc')}</Typography>
      <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'primary.main', color: 'white', width: 48, height: 48 }}><ArrowForwardIcon /></IconButton>
    </Box>
  );

  const { topProducts, categoryBreakdown, stats, forgotten, smartTips, shoppingScore, groupStats } = data;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: isDark ? 'linear-gradient(135deg, #5B21B6, #7C3AED)' : 'linear-gradient(135deg, #7C3AED, #A78BFA)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 28px', sm: '48px 20px 32px' },
        borderRadius: '0 0 28px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />

        {/* כותרת + BETA */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 40, height: 40 }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'white', flex: 1 }}>💡 {t('insights')}</Typography>
          <Box sx={{
            px: 2, py: 0.75, borderRadius: '10px',
            bgcolor: '#14B8A6',
            fontSize: 15, fontWeight: 900, color: 'white',
            letterSpacing: 2,
            transform: 'rotate(-6deg)',
            boxShadow: '0 3px 12px rgba(20,184,166,0.5)',
          }}>
            BETA
          </Box>
        </Box>

        {/* ציון + סטטיסטיקות בשורה אחת */}
        <Box sx={{ display: 'flex', gap: 2, ...anim(0.1) }}>
          {/* ציון */}
          <Box sx={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
            <CircularProgress variant="determinate" value={100} size={80} thickness={4}
              sx={{ color: 'rgba(255,255,255,0.1)', position: 'absolute' }} />
            <CircularProgress variant="determinate" value={shoppingScore} size={80} thickness={4}
              sx={{ color: scoreColor(shoppingScore), position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'white', lineHeight: 1 }}>{shoppingScore}</Typography>
            </Box>
          </Box>
          {/* 3 מספרים */}
          <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
            {[
              { v: stats.totalLists, l: 'רשימות', e: '📋' },
              { v: stats.totalProducts, l: 'מוצרים', e: '🛒' },
              { v: `${stats.completionRate}%`, l: 'הושלמו', e: '✅' },
            ].map((s, i) => (
              <Box key={i} sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '12px', py: 1 }}>
                <Typography sx={{ fontSize: 14, mb: 0.25 }}>{s.e}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{s.v}</Typography>
                <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{s.l}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2, mt: 2.5 }}>
        {/* תובנות חכמות - קומפקטי */}
        {smartTips.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: '16px', mb: 2, ...anim(0.2) }} elevation={0}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>💡 תובנות</Typography>
            {smartTips.slice(0, 4).map((tip, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1, mb: i < smartTips.length - 1 ? 1 : 0, alignItems: 'flex-start' }}>
                <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#F59E0B', mt: 0.75, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>{tip}</Typography>
              </Box>
            ))}
          </Paper>
        )}

        {/* מוצרים נפוצים + קטגוריות - זה ליד זה */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2, ...anim(0.3) }}>
          {/* מוצרים נפוצים - TOP 5 */}
          <Paper sx={{ p: 2, borderRadius: '16px' }} elevation={0}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.5 }}>🏆 {t('topProducts')}</Typography>
            {topProducts.slice(0, 5).map((p, i) => {
              const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: i < 3 ? '#F59E0B' : 'text.disabled', width: 16 }}>
                    {i < 3 ? ['🥇','🥈','🥉'][i] : `${i+1}`}
                  </Typography>
                  <Typography sx={{ fontSize: 12 }}>{icon}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#14B8A6' }}>×{p.count}</Typography>
                </Box>
              );
            })}
          </Paper>

          {/* קטגוריות */}
          <Paper sx={{ p: 2, borderRadius: '16px' }} elevation={0}>
            <Typography sx={{ fontSize: 13, fontWeight: 800, mb: 1.5 }}>📊 {t('categoryBreakdown')}</Typography>
            {categoryBreakdown.slice(0, 5).map((cat) => {
              const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
              const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
              const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
              return (
                <Box key={cat.category} sx={{ mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.25 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{icon} {key ? t(key) : cat.category}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color }}>{cat.percentage}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={cat.percentage}
                    sx={{ height: 5, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
                </Box>
              );
            })}
          </Paper>
        </Box>

        {/* אולי שכחת */}
        {forgotten.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: '16px', mb: 2, ...anim(0.4) }} elevation={0}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>🤔 {t('maybeForgot')}</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {forgotten.map((p, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', gap: 0.5,
                  bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                  border: '1px solid', borderColor: 'rgba(245,158,11,0.15)',
                  borderRadius: '10px', px: 1.25, py: 0.5,
                }}>
                  <Typography sx={{ fontSize: 13 }}>{CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦'}</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{p.name}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        )}

        {/* סטטיסטיקות קבוצות */}
        {groupStats.length > 0 && (
          <Paper sx={{ p: 2, borderRadius: '16px', mb: 2, ...anim(0.5) }} elevation={0}>
            <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>👥 קבוצות</Typography>
            {groupStats.map((group, gi) => (
              <Box key={gi} sx={{
                mb: gi < groupStats.length - 1 ? 2 : 0,
                pb: gi < groupStats.length - 1 ? 2 : 0,
                borderBottom: gi < groupStats.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                  <Typography sx={{ fontSize: 20 }}>{group.icon}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{group.name}</Typography>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{group.membersCount} חברים</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
                  {group.topContributor && (
                    <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.04)', borderRadius: '10px', p: 1 }}>
                      <Typography sx={{ fontSize: 14 }}>✏️</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#14B8A6' }}>{group.topContributor.name}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{group.topContributor.count} הוסיף</Typography>
                    </Box>
                  )}
                  {group.topBuyer && group.topBuyer.count > 0 && (
                    <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.04)', borderRadius: '10px', p: 1 }}>
                      <Typography sx={{ fontSize: 14 }}>🛒</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>{group.topBuyer.name}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>{group.topBuyer.count} קנה</Typography>
                    </Box>
                  )}
                </Box>
                {group.memberBreakdown.length > 1 && group.memberBreakdown.map((m, mi) => {
                  const total = group.memberBreakdown.reduce((s, x) => s + x.added + x.purchased, 0);
                  const pct = total > 0 ? Math.round(((m.added + m.purchased) / total) * 100) : 0;
                  const colors = ['#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899', '#3B82F6'];
                  return (
                    <Box key={mi} sx={{ mb: 0.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{m.name}</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: colors[mi % 5] }}>{pct}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: colors[mi % 5], borderRadius: 2 } }} />
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Paper>
        )}
      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
