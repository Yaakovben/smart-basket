import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS } from '../../../global/constants';

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insightsApi.getInsights()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  if (!data || data.stats.totalProducts === 0) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', p: 3 }}>
        <Box sx={{ fontSize: 64, mb: 2 }}>📊</Box>
        <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{t('noInsightsYet')}</Typography>
        <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 3 }}>{t('noInsightsDesc')}</Typography>
        <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}>
          <ArrowForwardIcon />
        </IconButton>
      </Box>
    );
  }

  const { topProducts, categoryBreakdown, stats, forgotten, shoppingFrequency } = data;

  return (
    <Box sx={{
      minHeight: '100vh',
      bgcolor: 'background.default',
      pb: 4,
    }}>
      {/* Header */}
      <Box sx={{
        background: isDark ? 'linear-gradient(135deg, #7C3AED, #5B21B6)' : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 20px', sm: '48px 20px 24px' },
        borderRadius: '0 0 24px 24px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
            <ArrowForwardIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white' }}>
              💡 {t('insights')}
            </Typography>
          </Box>
        </Box>

        {/* כרטיס סטטיסטיקות */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1 }}>
          {[
            { value: stats.totalLists, label: t('lists'), icon: '📋' },
            { value: stats.totalProducts, label: t('products'), icon: '🛒' },
            { value: stats.totalPurchased, label: t('purchased'), icon: '✅' },
          ].map((s, i) => (
            <Box key={i} sx={{ textAlign: 'center', bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '14px', p: 1.5, backdropFilter: 'blur(10px)' }}>
              <Typography sx={{ fontSize: 22, mb: 0.25 }}>{s.icon}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ px: 2, mt: 2.5 }}>
        {/* הרגלי קנייה */}
        <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper' }} elevation={0}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <CalendarTodayIcon sx={{ color: '#8B5CF6', fontSize: 20 }} />
            <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('shoppingHabits')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.06)', borderRadius: '12px', p: 1.5 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#8B5CF6' }}>
                {shoppingFrequency.avgDaysBetween || '—'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>{t('avgDaysBetween')}</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.06)', borderRadius: '12px', p: 1.5 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#14B8A6' }}>
                {stats.mostActiveDay || '—'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>{t('mostActiveDay')}</Typography>
            </Box>
            <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', borderRadius: '12px', p: 1.5 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>
                {stats.avgProductsPerList || '—'}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500 }}>{t('avgPerList')}</Typography>
            </Box>
          </Box>
        </Paper>

        {/* מוצרים נפוצים */}
        {topProducts.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper' }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TrendingUpIcon sx={{ color: '#14B8A6', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('topProducts')}</Typography>
            </Box>
            {topProducts.map((p, i) => {
              const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1, borderBottom: i < topProducts.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 16, width: 24, textAlign: 'center', fontWeight: 700, color: i < 3 ? '#F59E0B' : 'text.disabled' }}>
                    {i + 1}
                  </Typography>
                  <Typography sx={{ fontSize: 18 }}>{icon}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{p.name}</Typography>
                  <Box sx={{ bgcolor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.08)', px: 1.5, py: 0.25, borderRadius: '8px' }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#14B8A6' }}>×{p.count}</Typography>
                  </Box>
                </Box>
              );
            })}
          </Paper>
        )}

        {/* פילוח קטגוריות */}
        {categoryBreakdown.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper' }} elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <ShoppingCartIcon sx={{ color: '#3B82F6', fontSize: 20 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700 }}>{t('categoryBreakdown')}</Typography>
            </Box>
            {categoryBreakdown.map((cat, i) => {
              const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
              const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
              const colors = ['#14B8A6', '#8B5CF6', '#F59E0B', '#3B82F6', '#EC4899', '#EF4444', '#10B981', '#06B6D4', '#6B7280'];
              const color = colors[i % colors.length];
              return (
                <Box key={cat.category} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{key ? t(key) : cat.category}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{cat.percentage}%</Typography>
                  </Box>
                  <Box sx={{ height: 6, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', borderRadius: '3px', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${cat.percentage}%`, bgcolor: color, borderRadius: '3px', transition: 'width 0.8s ease' }} />
                  </Box>
                </Box>
              );
            })}
          </Paper>
        )}

        {/* מוצרים שאולי שכחת */}
        {forgotten.length > 0 && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, bgcolor: 'background.paper' }} elevation={0}>
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
                    border: '1px solid',
                    borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)',
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
