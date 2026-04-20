import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, keyframes, LinearProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
`;
const anim = (d: number) => ({ animation: `${fadeInUp} 0.5s ease ${d}s both` });

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
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <CircularProgress sx={{ color: 'primary.main' }} />
    </Box>
  );

  if (error || !data || data.stats.totalProducts === 0) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', p: 3 }}>
      <Box sx={{ fontSize: 64, mb: 2 }}>{error ? '⚠️' : '📊'}</Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{error ? t('connectionErrorTitle') : t('noInsightsYet')}</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 3 }}>{error ? t('connectionErrorDesc') : t('noInsightsDesc')}</Typography>
      <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'primary.main', color: 'white' }}><ArrowForwardIcon /></IconButton>
    </Box>
  );

  const { topProducts, categoryBreakdown, stats, forgotten, shoppingFrequency, smartTips, hourlyActivity, shoppingScore } = data;
  const maxHourly = Math.max(...hourlyActivity, 1);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: isDark ? 'linear-gradient(135deg, #7C3AED, #4C1D95)' : 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 24px', sm: '48px 20px 28px' },
        borderRadius: '0 0 28px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* באנר גרסה ראשונית */}
        <Box sx={{
          position: 'absolute', top: { xs: 52, sm: 14 }, right: { xs: -28, sm: -24 },
          transform: 'rotate(35deg)',
          bgcolor: 'rgba(255,255,255,0.15)',
          px: 5, py: 0.5,
          fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.8)',
          letterSpacing: 1, textTransform: 'uppercase',
          backdropFilter: 'blur(4px)',
        }}>
          BETA
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 40, height: 40 }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'white', flex: 1 }}>💡 {t('insights')}</Typography>
        </Box>

        {/* ציון קנייה */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2, ...anim(0.1) }}>
          <Box sx={{ position: 'relative', width: 80, height: 80 }}>
            <CircularProgress variant="determinate" value={shoppingScore} size={80} thickness={5}
              sx={{ color: scoreColor(shoppingScore), position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
            <CircularProgress variant="determinate" value={100} size={80} thickness={5}
              sx={{ color: 'rgba(255,255,255,0.1)', position: 'absolute' }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: 'white' }}>{shoppingScore}</Typography>
            </Box>
          </Box>
          <Box>
            <Typography sx={{ fontSize: 16, fontWeight: 700, color: 'white' }}>
              {shoppingScore >= 80 ? '🏆 מצוין!' : shoppingScore >= 60 ? '👍 טוב' : shoppingScore >= 40 ? '📈 ממוצע' : '🌱 התחלה'}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {stats.completionRate}% השלמת רשימות
            </Typography>
          </Box>
        </Box>

        {/* סטטיסטיקות */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, ...anim(0.2) }}>
          {[
            { value: stats.totalLists, label: t('lists'), icon: '📋' },
            { value: stats.totalProducts, label: t('products'), icon: '🛒' },
            { value: stats.totalPurchased, label: t('purchased'), icon: '✅' },
          ].map((s, i) => (
            <Box key={i} sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '14px', p: 1.25, backdropFilter: 'blur(10px)' }}>
              <Typography sx={{ fontSize: 18, mb: 0.25 }}>{s.icon}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ px: 2, mt: 2.5 }}>
        {/* תובנות חכמות */}
        {smartTips.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper', ...anim(0.3) }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AutoAwesomeIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('insights')}</Typography>
            </Box>
            {smartTips.map((tip, i) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: i < smartTips.length - 1 ? 1.5 : 0, alignItems: 'flex-start' }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#F59E0B', mt: 0.8, flexShrink: 0 }} />
                <Typography sx={{ fontSize: 13, color: 'text.secondary', lineHeight: 1.5 }}>{tip}</Typography>
              </Box>
            ))}
          </Paper>
        )}

        {/* הרגלי קנייה */}
        <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper', ...anim(0.4) }} elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarTodayIcon sx={{ color: '#8B5CF6', fontSize: 20 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('shoppingHabits')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            {[
              { value: shoppingFrequency.avgDaysBetween || '—', label: t('avgDaysBetween'), color: '#8B5CF6' },
              { value: stats.mostActiveDay || '—', label: t('mostActiveDay'), color: '#14B8A6' },
              { value: stats.avgProductsPerList || '—', label: t('avgPerList'), color: '#F59E0B' },
            ].map((item, i) => (
              <Box key={i} sx={{ flex: 1, textAlign: 'center', bgcolor: `${item.color}${isDark ? '18' : '0A'}`, borderRadius: '12px', p: 1.25 }}>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 500 }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* פעילות לפי שעה */}
        <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper', ...anim(0.45) }} elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AccessTimeIcon sx={{ color: '#06B6D4', fontSize: 20 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>פעילות לפי שעה</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 60 }}>
            {hourlyActivity.map((count, hour) => (
              <Box key={hour} sx={{
                flex: 1, minWidth: 0,
                height: `${Math.max(4, (count / maxHourly) * 100)}%`,
                bgcolor: count === Math.max(...hourlyActivity) ? '#06B6D4' : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                borderRadius: '3px 3px 0 0',
                transition: 'height 0.8s ease',
              }} />
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>00</Typography>
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>06</Typography>
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>12</Typography>
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>18</Typography>
            <Typography sx={{ fontSize: 9, color: 'text.disabled' }}>23</Typography>
          </Box>
        </Paper>

        {/* מוצרים נפוצים */}
        {topProducts.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper', ...anim(0.5) }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon sx={{ color: '#14B8A6', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('topProducts')}</Typography>
            </Box>
            {topProducts.map((p, i) => {
              const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
              const maxCount = topProducts[0].count;
              return (
                <Box key={i} sx={{ mb: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography sx={{ fontSize: 14, width: 20, textAlign: 'center', fontWeight: 700, color: i < 3 ? '#F59E0B' : 'text.disabled' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                    </Typography>
                    <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#14B8A6' }}>×{p.count}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
                    sx={{ height: 4, borderRadius: 2, ml: 4.5, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 2 } }} />
                </Box>
              );
            })}
          </Paper>
        )}

        {/* פילוח קטגוריות */}
        {categoryBreakdown.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper', ...anim(0.55) }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShoppingCartIcon sx={{ color: '#3B82F6', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('categoryBreakdown')}</Typography>
            </Box>
            {categoryBreakdown.map((cat) => {
              const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
              const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
              const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
              return (
                <Box key={cat.category} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{key ? t(key) : cat.category}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{cat.percentage}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={cat.percentage}
                    sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
                </Box>
              );
            })}
          </Paper>
        )}

        {/* מוצרים שאולי שכחת */}
        {forgotten.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper', ...anim(0.6) }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <LightbulbIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('maybeForgot')}</Typography>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {forgotten.map((p, i) => {
                const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                return (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    bgcolor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)',
                    border: '1px solid', borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)',
                    borderRadius: '10px', px: 1.5, py: 0.75,
                  }}>
                    <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.name}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
