import { useState, useEffect, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, keyframes, LinearProgress, Tabs, Tab } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, BetaBadge, priceComparisonApi, type PriceComparisonData } from '../../priceComparison';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';

// אנימציות
const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;
const slideIn = keyframes`from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}`;
const scaleIn = keyframes`from{transform:scale(0)}to{transform:scale(1)}`;
const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;

const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : s >= 40 ? '#F97316' : '#EF4444';
const scoreGradient = (s: number) => s >= 80 ? 'linear-gradient(135deg,#22C55E,#10B981)' : s >= 60 ? 'linear-gradient(135deg,#F59E0B,#EAB308)' : s >= 40 ? 'linear-gradient(135deg,#F97316,#EA580C)' : 'linear-gradient(135deg,#EF4444,#DC2626)';

const getScoreData = (s: number) => {
  if (s >= 90) return { emoji: '🏆', title: 'אלוף הקניות!', sub: 'אתה ברמה הגבוהה ביותר' };
  if (s >= 80) return { emoji: '🔥', title: 'מרשים!', sub: 'ממשיך לטפס' };
  if (s >= 60) return { emoji: '💪', title: 'טוב מאוד', sub: 'בדרך הנכונה' };
  if (s >= 40) return { emoji: '📈', title: 'מתקדם', sub: 'יש לאן לצמוח' };
  return { emoji: '🌱', title: 'התחלה', sub: 'כל מסע מתחיל בצעד' };
};

// ספירה אנימטיבית
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 800;
    const tick = () => {
      const p = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);
  return <>{display}</>;
};

type InsightTab = 'overview' | 'products' | 'groups';

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [data, setData] = useState<InsightsData | null>(null);
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<InsightTab>('overview');

  useEffect(() => {
    insightsApi.getInsights().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
    // טעינה עצמאית של השוואת מחירים — לא חוסמת את שאר העמוד, כשלון שקט
    priceComparisonApi.getComparison().then(setPriceData).catch(() => {});
  }, []);

  // מסך טעינה
  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 2 }}>
      <Box sx={{ position: 'relative' }}>
        <CircularProgress size={60} sx={{ color: 'rgba(124,58,237,0.2)' }} />
        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: `${float} 1.5s ease infinite` }}>
          <Typography sx={{ fontSize: 24 }}>💡</Typography>
        </Box>
      </Box>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>מנתח את הנתונים שלך...</Typography>
    </Box>
  );

  // מסך שגיאה / ריק
  if (error || !data || data.stats.totalProducts === 0) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', p: 3 }}>
      <Box sx={{ fontSize: 64, mb: 2, animation: `${float} 2s ease infinite` }}>{error ? '⚠️' : '📊'}</Box>
      <Typography sx={{ fontSize: 20, fontWeight: 800, mb: 1 }}>{error ? t('connectionErrorTitle') : t('noInsightsYet')}</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 3, maxWidth: 280 }}>{error ? t('connectionErrorDesc') : t('noInsightsDesc')}</Typography>
      <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'primary.main', color: 'white', width: 48, height: 48 }}><ArrowForwardIcon /></IconButton>
    </Box>
  );

  const { topProducts, categoryBreakdown, stats, forgotten, smartTips, shoppingScore, groupStats, shoppingPersonality, streaks, monthComparison, weeklyTrends, weekdayActivity } = data;
  const sd = getScoreData(shoppingScore);
  const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  const maxWeekday = Math.max(...(weekdayActivity || []), 1);
  const maxWeeklyTrend = Math.max(...(weeklyTrends || []).map(w => Math.max(w.added, w.purchased)), 1);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: isDark ? 'linear-gradient(160deg, #312E81, #5B21B6, #7C3AED)' : 'linear-gradient(160deg, #6D28D9, #7C3AED, #A78BFA)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 24px', sm: '48px 20px 28px' },
        borderRadius: '0 0 28px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* דקורציה */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)' }} />

        {/* חזרה + כותרת + BETA */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', width: 36, height: 36 }}>
            <ArrowForwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'white', flex: 1, letterSpacing: -0.5 }}>💡 {t('insights')}</Typography>
          <BetaBadge />
        </Box>
        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', mb: 2, fontWeight: 500, textAlign: 'center' }}>
          הנתונים עשויים להיות חלקיים · עובדים על שיפורים
        </Typography>

        {/* ציון */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 2.5,
          bgcolor: 'rgba(255,255,255,0.08)', borderRadius: '20px', p: 2,
          border: '1px solid rgba(255,255,255,0.1)',
          animation: `${fadeIn} 0.6s ease 0.2s both`,
        }}>
          <Box sx={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
            <CircularProgress variant="determinate" value={100} size={72} thickness={4}
              sx={{ color: 'rgba(255,255,255,0.08)', position: 'absolute' }} />
            <CircularProgress variant="determinate" value={shoppingScore} size={72} thickness={4}
              sx={{ color: scoreColor(shoppingScore), position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' } }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                <AnimatedNumber value={shoppingScore} />
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <Typography sx={{ fontSize: 24, animation: `${scaleIn} 0.5s ease 0.5s both` }}>{sd.emoji}</Typography>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{sd.title}</Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{sd.sub}</Typography>
            <Box sx={{
              mt: 1, px: 1, py: 0.25, borderRadius: '6px', display: 'inline-block',
              background: scoreGradient(shoppingScore), opacity: 0.9,
            }}>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'white' }}>
                {stats.completionRate}% השלמה
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* טאבים - עיצוב pill-style מודרני */}
      <Box sx={{ px: 2, mt: -2.5, animation: `${fadeIn} 0.4s ease 0.3s both`, position: 'relative', zIndex: 2 }}>
        <Paper sx={{
          borderRadius: '999px',
          overflow: 'hidden',
          p: 0.5,
          border: '1px solid',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(124,58,237,0.12)',
          boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(124,58,237,0.12)',
          bgcolor: isDark ? 'rgba(30,27,75,0.85)' : 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(12px)',
        }} elevation={0}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTabs-flexContainer': { gap: 0.5 },
              '& .MuiTab-root': {
                minHeight: 36,
                fontSize: 12.5,
                fontWeight: 700,
                textTransform: 'none',
                color: 'text.secondary',
                borderRadius: '999px',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&.Mui-selected': {
                  color: 'white',
                  background: 'linear-gradient(135deg, #7C3AED, #8B5CF6)',
                  boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
                },
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab value="overview" label="📊 סקירה" />
            <Tab value="products" label="🛒 מוצרים" />
            <Tab value="groups" label={`👥 קבוצות${groupStats.length ? ` (${groupStats.length})` : ''}`} />
          </Tabs>
        </Paper>
      </Box>

      {/* תוכן */}
      <Box sx={{ px: 2, mt: 2.5 }} key={tab}>

        {/* ===== סקירה ===== */}
        {tab === 'overview' && (
          <>
            {/* מספרים — כרטיסים בולטים עם רקע גרדיאנטי */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.25, mb: 2 }}>
              {[
                { v: stats.totalLists, l: 'רשימות', e: '📋', c: '#8B5CF6', g: 'linear-gradient(135deg, #8B5CF6, #A78BFA)' },
                { v: stats.totalPurchased, l: 'נקנו', e: '✅', c: '#22C55E', g: 'linear-gradient(135deg, #22C55E, #4ADE80)' },
                { v: stats.avgProductsPerList, l: 'ממוצע', e: '📊', c: '#F59E0B', g: 'linear-gradient(135deg, #F59E0B, #FBBF24)' },
              ].map((s, i) => (
                <Paper key={i} sx={{
                  textAlign: 'center', py: 2, px: 1, borderRadius: '18px',
                  border: '1px solid', borderColor: isDark ? `${s.c}25` : `${s.c}20`,
                  background: isDark ? `linear-gradient(160deg, ${s.c}18, ${s.c}05)` : `linear-gradient(160deg, ${s.c}10, ${s.c}02)`,
                  position: 'relative', overflow: 'hidden',
                  animation: `${slideIn} 0.4s ease ${0.1 + i * 0.1}s both`,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-2px)' },
                }} elevation={0}>
                  {/* דקורציית רקע */}
                  <Box sx={{
                    position: 'absolute', top: -12, left: -12, width: 50, height: 50,
                    borderRadius: '50%', background: s.g, opacity: 0.12, filter: 'blur(8px)',
                  }} />
                  <Typography sx={{ fontSize: 22, mb: 0.5, position: 'relative' }}>{s.e}</Typography>
                  <Typography sx={{ fontSize: 26, fontWeight: 900, color: s.c, lineHeight: 1, position: 'relative' }}>
                    <AnimatedNumber value={typeof s.v === 'number' ? s.v : 0} />
                  </Typography>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 700, mt: 0.5, letterSpacing: 0.3, position: 'relative' }}>{s.l}</Typography>
                </Paper>
              ))}
            </Box>

            {/* תובנות חכמות — עיצוב מחדש: rail בצד שמאל + נקודות ממוספרות */}
            {smartTips.length > 0 && (() => {
              const tipColors = ['#F59E0B', '#8B5CF6', '#14B8A6', '#EC4899'];
              const tipEmojis = ['💡', '🎯', '⭐', '🚀'];
              return (
                <Paper sx={{
                  p: 2, borderRadius: '18px', mb: 2,
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)',
                  background: isDark
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(139,92,246,0.03))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.03), rgba(139,92,246,0.02))',
                  position: 'relative', overflow: 'hidden',
                  animation: `${fadeIn} 0.5s ease 0.4s both`,
                }} elevation={0}>
                  {/* רקע דקורטיבי */}
                  <Box sx={{
                    position: 'absolute', top: -40, right: -40, width: 140, height: 140,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(245,158,11,0.08), transparent 70%)',
                    pointerEvents: 'none',
                  }} />

                  {/* כותרת עם ספירה */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.75, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Typography sx={{ fontSize: 20 }}>✨</Typography>
                      <Typography sx={{ fontSize: 15, fontWeight: 900, letterSpacing: -0.2 }}>תובנות חכמות</Typography>
                    </Box>
                    <Box sx={{
                      fontSize: 10, fontWeight: 800, color: '#F59E0B',
                      bgcolor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                      px: 1, py: 0.25, borderRadius: '8px',
                    }}>
                      {Math.min(smartTips.length, 4)}/{smartTips.length}
                    </Box>
                  </Box>

                  {/* רשימת tips — כל אחד עם צבע שונה, רייל צבעוני בצד שמאל */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25, position: 'relative' }}>
                    {smartTips.slice(0, 4).map((tip, i) => {
                      const color = tipColors[i % tipColors.length];
                      const emoji = tipEmojis[i % tipEmojis.length];
                      return (
                        <Box key={i} sx={{
                          display: 'flex', gap: 1.25,
                          position: 'relative',
                          animation: `${slideIn} 0.4s ease ${0.5 + i * 0.08}s both`,
                        }}>
                          {/* איקון במעגל צבעוני עם גרדיאנט */}
                          <Box sx={{
                            width: 36, height: 36, flexShrink: 0,
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${color}, ${color}DD)`,
                            boxShadow: `0 3px 10px ${color}40`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 16,
                            position: 'relative',
                          }}>
                            {emoji}
                            {/* מספר קטן בתחתית */}
                            <Box sx={{
                              position: 'absolute', bottom: -4, right: -4,
                              width: 16, height: 16, borderRadius: '50%',
                              bgcolor: 'background.paper',
                              border: '2px solid', borderColor: color,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 9, fontWeight: 900, color,
                            }}>
                              {i + 1}
                            </Box>
                          </Box>
                          {/* טקסט */}
                          <Box sx={{
                            flex: 1, pt: 0.35, pb: 0.5,
                            borderBottom: i < Math.min(smartTips.length, 4) - 1 ? '1px dashed' : 'none',
                            borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                          }}>
                            <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.55, fontWeight: 500 }}>
                              {tip}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                </Paper>
              );
            })()}

            {/* השוואת מחירים (ניסיוני) */}
            <PriceComparisonCard data={priceData} isDark={isDark} />

            {/* שכחת */}
            {forgotten.length > 0 && (
              <Paper sx={{
                p: 2, borderRadius: '16px',
                border: '1px solid', borderColor: isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)',
                animation: `${fadeIn} 0.5s ease 0.6s both`,
              }} elevation={0}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 1.5 }}>🤔 {t('maybeForgot')}</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                  {forgotten.map((p, i) => (
                    <Box key={i} sx={{
                      display: 'flex', alignItems: 'center', gap: 0.5,
                      bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: '10px', px: 1.25, py: 0.75,
                      animation: `${scaleIn} 0.3s ease ${0.7 + i * 0.05}s both`,
                    }}>
                      <Typography sx={{ fontSize: 14 }}>{CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦'}</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{p.name}</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>
            )}

            {/* אישיות קנייה */}
            {shoppingPersonality && (
              <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, textAlign: 'center', border: '1px solid', borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)', animation: `${slideIn} 0.4s ease 0.5s both` }} elevation={0}>
                <Typography sx={{ fontSize: 48, mb: 0.5 }}>{shoppingPersonality.emoji}</Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 800, mb: 0.5 }}>{shoppingPersonality.type}</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{shoppingPersonality.description}</Typography>
              </Paper>
            )}

            {/* סטריקים + חודש */}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, mb: 2, animation: `${slideIn} 0.4s ease 0.55s both` }}>
              <Paper sx={{ p: 2, borderRadius: '16px', textAlign: 'center' }} elevation={0}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#F59E0B' }}>🔥 {streaks?.currentWeeks || 0}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>שבועות רצופים</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>שיא: {streaks?.longestWeeks || 0}</Typography>
              </Paper>
              <Paper sx={{ p: 2, borderRadius: '16px', textAlign: 'center' }} elevation={0}>
                <Typography sx={{ fontSize: 28, fontWeight: 800, color: monthComparison?.productsGrowth >= 0 ? '#22C55E' : '#EF4444' }}>
                  {monthComparison?.productsGrowth > 0 ? '📈' : monthComparison?.productsGrowth < 0 ? '📉' : '➡️'} {monthComparison?.productsGrowth || 0}%
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>לעומת חודש שעבר</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{monthComparison?.previousTotal || 0} מוצרים</Typography>
              </Paper>
            </Box>

            {/* מגמות שבועיות */}
            {weeklyTrends && weeklyTrends.length > 0 && (
              <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, animation: `${slideIn} 0.4s ease 0.6s both` }} elevation={0}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>📊 מגמות שבועיות</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 70, mb: 1 }}>
                  {weeklyTrends.map((w, i) => (
                    <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', height: '100%', justifyContent: 'flex-end' }}>
                      <Box sx={{ height: `${(w.purchased / maxWeeklyTrend) * 100}%`, bgcolor: '#22C55E', borderRadius: '3px 3px 0 0', minHeight: w.purchased > 0 ? 3 : 0 }} />
                      <Box sx={{ height: `${((w.added - w.purchased) / maxWeeklyTrend) * 100}%`, bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.25)', borderRadius: '3px 3px 0 0', minHeight: w.added - w.purchased > 0 ? 2 : 0 }} />
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  {weeklyTrends.map((w, i) => (
                    <Typography key={i} sx={{ fontSize: 8, color: 'text.disabled', flex: 1, textAlign: 'center' }}>{w.week}</Typography>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: '#22C55E' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>נקנו</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.25)' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>ממתינים</Typography>
                  </Box>
                </Box>
              </Paper>
            )}

            {/* heatmap ימים בשבוע */}
            {weekdayActivity && (
              <Paper sx={{ p: 2.5, borderRadius: '16px', mb: 2, animation: `${slideIn} 0.4s ease 0.65s both` }} elevation={0}>
                <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 2 }}>📅 פעילות לפי ימים</Typography>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  {weekdayActivity.map((count, i) => {
                    const intensity = count / maxWeekday;
                    return (
                      <Box key={i} sx={{ textAlign: 'center' }}>
                        <Box sx={{
                          width: 36, height: 36, borderRadius: '10px',
                          bgcolor: count === 0 ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                            : `rgba(20,184,166,${0.15 + intensity * 0.6})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mb: 0.5,
                        }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: count > 0 ? 'white' : 'text.disabled' }}>{count}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>{dayLabels[i]}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Paper>
            )}
          </>
        )}

        {/* ===== מוצרים ===== */}
        {tab === 'products' && (
          <>
            {topProducts.length > 0 && (
              <Paper sx={{ p: 2, borderRadius: '16px', mb: 2, border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', animation: `${fadeIn} 0.4s ease` }} elevation={0}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 2 }}>🏆 המוצרים הנפוצים</Typography>
                {/* פודיום top 3 */}
                {topProducts.length >= 3 && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 1, mb: 2.5, height: 100 }}>
                    {[1, 0, 2].map(idx => {
                      const p = topProducts[idx];
                      const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                      const heights = [80, 100, 65];
                      const medals = ['🥈', '🥇', '🥉'];
                      const colors = ['#C0C0C0', '#FFD700', '#CD7F32'];
                      return (
                        <Box key={idx} sx={{
                          flex: 1, maxWidth: 90, textAlign: 'center',
                          animation: `${scaleIn} 0.5s ease ${0.2 + idx * 0.15}s both`,
                        }}>
                          <Typography sx={{ fontSize: 20, mb: 0.5 }}>{medals[idx]}</Typography>
                          <Box sx={{
                            height: heights[idx],
                            borderRadius: '12px 12px 4px 4px',
                            background: `linear-gradient(180deg, ${colors[idx]}30, ${colors[idx]}10)`,
                            border: `1.5px solid ${colors[idx]}40`,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: 0.25, px: 0.5,
                          }}>
                            <Typography sx={{ fontSize: 18 }}>{icon}</Typography>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{p.name}</Typography>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#14B8A6' }}>×{p.count}</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                {/* שאר המוצרים */}
                {topProducts.slice(3, 8).map((p, i) => {
                  const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                  const maxCount = topProducts[0].count;
                  return (
                    <Box key={i} sx={{ mb: 1, animation: `${slideIn} 0.3s ease ${0.4 + i * 0.06}s both` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.disabled', width: 18, textAlign: 'center' }}>{i + 4}</Typography>
                        <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{p.name}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#14B8A6' }}>×{p.count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
                        sx={{ height: 4, borderRadius: 2, ml: 4, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 2 } }} />
                    </Box>
                  );
                })}
              </Paper>
            )}

            {categoryBreakdown.length > 0 && (
              <Paper sx={{ p: 2, borderRadius: '16px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', animation: `${fadeIn} 0.4s ease 0.2s both` }} elevation={0}>
                <Typography sx={{ fontSize: 15, fontWeight: 800, mb: 2 }}>📊 פילוח קטגוריות</Typography>
                {/* דונאט ויזואלי */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {categoryBreakdown.slice(0, 6).map((cat, i) => {
                    const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    return (
                      <Box key={cat.category} sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 1.25, py: 0.75, borderRadius: '10px',
                        bgcolor: `${color}0A`, border: `1px solid ${color}20`,
                        animation: `${scaleIn} 0.3s ease ${0.3 + i * 0.06}s both`,
                      }}>
                        <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{key ? t(key) : cat.category}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color }}>{cat.percentage}%</Typography>
                      </Box>
                    );
                  })}
                </Box>
                {/* פסים */}
                {categoryBreakdown.map((cat) => {
                  const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                  return (
                    <Box key={cat.category} sx={{ mb: 0.75 }}>
                      <LinearProgress variant="determinate" value={cat.percentage}
                        sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 3 } }} />
                    </Box>
                  );
                })}
              </Paper>
            )}
          </>
        )}

        {/* ===== קבוצות ===== */}
        {tab === 'groups' && (
          <>
            {groupStats.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, animation: `${fadeIn} 0.4s ease` }}>
                <Typography sx={{ fontSize: 56, mb: 1.5, animation: `${float} 2s ease infinite` }}>👥</Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>אין קבוצות פעילות</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>צור קבוצה משותפת כדי לראות סטטיסטיקות</Typography>
              </Box>
            ) : groupStats.map((group, gi) => (
              <Paper key={gi} sx={{
                p: 0, borderRadius: '18px', mb: 2.5, overflow: 'hidden',
                border: '1.5px solid', borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.12)',
                animation: `${fadeIn} 0.4s ease ${gi * 0.1}s both`,
              }} elevation={0}>
                {/* כותרת קבוצה עם רקע */}
                <Box sx={{
                  background: isDark ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))' : 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(139,92,246,0.02))',
                  p: 2, borderBottom: '1px solid', borderColor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                      width: 48, height: 48, borderRadius: '14px', fontSize: 24,
                      bgcolor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1.5px solid', borderColor: 'rgba(139,92,246,0.15)',
                    }}>{group.icon}</Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 16, fontWeight: 900 }}>{group.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {group.membersCount} חברים · {group.memberBreakdown.map(m => m.name).join(', ')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ p: 2 }}>

                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {group.topContributor && (
                    <Box sx={{
                      flex: 1, textAlign: 'center', p: 1.25, borderRadius: '12px',
                      background: isDark ? 'rgba(20,184,166,0.08)' : 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(20,184,166,0.02))',
                      border: '1px solid rgba(20,184,166,0.12)',
                    }}>
                      <Typography sx={{ fontSize: 18, mb: 0.25 }}>✏️</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#14B8A6' }}>{group.topContributor.name}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>הוסיף {group.topContributor.count}</Typography>
                    </Box>
                  )}
                  {group.topBuyer && group.topBuyer.count > 0 && (
                    <Box sx={{
                      flex: 1, textAlign: 'center', p: 1.25, borderRadius: '12px',
                      background: isDark ? 'rgba(245,158,11,0.08)' : 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(245,158,11,0.02))',
                      border: '1px solid rgba(245,158,11,0.12)',
                    }}>
                      <Typography sx={{ fontSize: 18, mb: 0.25 }}>🛒</Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#F59E0B' }}>{group.topBuyer.name}</Typography>
                      <Typography sx={{ fontSize: 9, color: 'text.secondary' }}>קנה {group.topBuyer.count}</Typography>
                    </Box>
                  )}
                </Box>

                {group.memberBreakdown.length > 1 && (() => {
                  const total = group.memberBreakdown.reduce((s, x) => s + x.added + x.purchased, 0);
                  const colors = ['#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899', '#3B82F6'];
                  return (
                    <>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 1 }}>חלוקת עבודה</Typography>
                      {/* גרף בר אופקי מחולק */}
                      <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', mb: 1.5 }}>
                        {group.memberBreakdown.map((m, mi) => {
                          const pct = total > 0 ? (m.added + m.purchased) / total * 100 : 0;
                          return <Box key={mi} sx={{ width: `${pct}%`, bgcolor: colors[mi % 5], transition: 'width 0.8s ease' }} />;
                        })}
                      </Box>
                      {/* פירוט לפי חבר */}
                      {group.memberBreakdown.map((m, mi) => {
                        const pct = total > 0 ? Math.round(((m.added + m.purchased) / total) * 100) : 0;
                        return (
                          <Box key={mi} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: colors[mi % 5], flexShrink: 0 }} />
                            <Typography sx={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{m.name}</Typography>
                            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{m.added} הוסיף · {m.purchased} קנה</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: colors[mi % 5], minWidth: 30, textAlign: 'left' }}>{pct}%</Typography>
                          </Box>
                        );
                      })}
                    </>
                  );
                })()}
                </Box>
              </Paper>
            ))}
          </>
        )}
      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
