import { useState, useEffect, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, Collapse, LinearProgress, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, priceComparisonApi, type PriceComparisonData } from '../../priceComparison';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { haptic } from '../../../global/helpers';

const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;

// ===== קטע מתקפל - סטטיסטיקה אישית =====
// כותרת שקטה + תוכן קומפקטי שנפתח רק כשהמשתמש מתעניין. לא מתחרה על המיקוד.
const CollapsibleStats = memo(({ data, isDark, t }: {
  data: InsightsData;
  isDark: boolean;
  t: (key: Parameters<ReturnType<typeof useSettings>['t']>[0]) => string;
}) => {
  const [open, setOpen] = useState(false);
  const { topProducts, categoryBreakdown, shoppingScore, streaks, stats } = data;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '16px',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        bgcolor: 'transparent',
        overflow: 'hidden',
      }}
    >
      {/* כותרת - תמיד נראית */}
      <Box
        onClick={() => { haptic('light'); setOpen(v => !v); }}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25,
          px: 2, py: 1.5,
          cursor: 'pointer',
          '&:active': { opacity: 0.8 },
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>
            הסטטיסטיקה שלך
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.1 }}>
            ציון {shoppingScore} · סטריק {streaks?.currentWeeks || 0} שבועות · {stats.completionRate}% השלמה
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{
          fontSize: 20, color: 'text.disabled',
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      <Collapse in={open}>
        <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
          {/* מוצרים מובילים - שורה אחת קומפקטית */}
          {topProducts.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.75, letterSpacing: 0.3 }}>
                המוצרים הנפוצים שלך
              </Typography>
              {topProducts.slice(0, 5).map((p, i) => {
                const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                const maxCount = topProducts[0].count;
                return (
                  <Box key={i} sx={{ mb: 0.6 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.2 }}>
                      <Typography sx={{ fontSize: 12, width: 16, color: 'text.disabled', textAlign: 'center' }}>{i + 1}</Typography>
                      <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary' }}>×{p.count}</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(p.count / maxCount) * 100}
                      sx={{
                        height: 3, borderRadius: 2, ml: 3,
                        bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        '& .MuiLinearProgress-bar': { bgcolor: 'text.secondary', borderRadius: 2, opacity: 0.6 },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}

          {/* קטגוריות - chips שקטים */}
          {categoryBreakdown.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.75, letterSpacing: 0.3 }}>
                לפי קטגוריה
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6 }}>
                {categoryBreakdown.slice(0, 8).map(cat => {
                  const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
                  const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                  const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                  return (
                    <Box key={cat.category} sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.4,
                      px: 0.9, py: 0.4, borderRadius: '8px',
                      bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    }}>
                      <Typography sx={{ fontSize: 12 }}>{icon}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 600 }}>{key ? t(key) : cat.category}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color }}>{cat.percentage}%</Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});
CollapsibleStats.displayName = 'CollapsibleStats';

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [data, setData] = useState<InsightsData | null>(null);
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    insightsApi.getInsights().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
    priceComparisonApi.getComparison().then(setPriceData).catch(() => {});
  }, []);

  // מסך טעינה
  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
      <Box sx={{ position: 'relative' }}>
        <CircularProgress size={56} sx={{ color: 'rgba(20,184,166,0.25)' }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: `${float} 1.5s ease infinite` }}>
          <Typography sx={{ fontSize: 22 }}>💡</Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>מנתח את הנתונים שלך...</Typography>
    </Box>
  );

  // מסך שגיאה / ריק
  if (error || !data || data.stats.totalProducts === 0) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 3 }}>
      <Box sx={{ fontSize: 56, mb: 2, animation: `${float} 2s ease infinite` }}>{error ? '⚠️' : '📊'}</Box>
      <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 1 }}>{error ? t('connectionErrorTitle') : t('noInsightsYet')}</Typography>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', mb: 3, maxWidth: 280 }}>
        {error ? t('connectionErrorDesc') : t('noInsightsDesc')}
      </Typography>
      <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'primary.main', color: 'white', width: 44, height: 44 }}>
        <ArrowForwardIcon />
      </IconButton>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 5 }}>
      {/* ===== פס כותרת מינימלי - ללא גרדיאנט, ללא ציון ענק ===== */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: 2,
        pt: 'max(14px, calc(env(safe-area-inset-top) + 6px))',
        pb: 2,
      }}>
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            width: 38, height: 38,
            '&:active': { opacity: 0.75 },
          }}
        >
          <ArrowForwardIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <Typography sx={{ fontSize: 21, fontWeight: 900, flex: 1, letterSpacing: -0.3 }}>
          {t('insights')}
        </Typography>
        <Box sx={{
          display: 'inline-flex', alignItems: 'center', gap: 0.3,
          px: 0.9, py: 0.35, borderRadius: '999px',
          background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
          boxShadow: '0 2px 8px rgba(20,184,166,0.35)',
        }}>
          <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'white', letterSpacing: 1 }}>
            BETA
          </Typography>
        </Box>
      </Box>

      {/* ===== הכרטיס המרכזי - השוואת המחירים. זה ה-hero של העמוד. ===== */}
      <Box sx={{ px: 2 }}>
        <PriceComparisonCard data={priceData} isDark={isDark} />
      </Box>

      {/* ===== סטטיסטיקה אישית מתקפלת - לא מתחרה על המיקוד ===== */}
      <Box sx={{ px: 2, mt: 1 }}>
        <CollapsibleStats data={data} isDark={isDark} t={t} />
      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
