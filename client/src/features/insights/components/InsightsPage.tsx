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
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;
const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
`;
const anim = (d: number) => ({ animation: `${fadeInUp} 0.6s ease ${d}s both` });

const scoreColor = (s: number) => s >= 80 ? '#22C55E' : s >= 60 ? '#F59E0B' : s >= 40 ? '#F97316' : '#EF4444';
const scoreEmoji = (s: number) => s >= 90 ? '🏆' : s >= 80 ? '🔥' : s >= 60 ? '💪' : s >= 40 ? '📈' : '🌱';
const scoreText = (s: number) => s >= 90 ? 'מושלם!' : s >= 80 ? 'מצוין!' : s >= 60 ? 'טוב מאוד' : s >= 40 ? 'ממוצע' : 'בתחילת הדרך';

// כרטיס סעיף
const SectionCard = ({ children, delay, isDark }: { children: React.ReactNode; delay: number; isDark: boolean }) => (
  <Paper sx={{
    p: 2.5, borderRadius: '20px', mb: 2,
    bgcolor: 'background.paper',
    border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    ...anim(delay),
  }} elevation={0}>
    {children}
  </Paper>
);

// כותרת סעיף
const SectionTitle = ({ icon, title, color }: { icon: React.ReactNode; title: string; color: string }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 2 }}>
    <Box sx={{ width: 32, height: 32, borderRadius: '10px', bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </Box>
    <Typography sx={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.3 }}>{title}</Typography>
  </Box>
);

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
      <Typography sx={{ fontSize: 14, color: 'text.secondary', fontWeight: 500 }}>מנתח את הנתונים שלך...</Typography>
    </Box>
  );

  if (error || !data || data.stats.totalProducts === 0) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', p: 3 }}>
      <Box sx={{ fontSize: 64, mb: 2 }}>{error ? '⚠️' : '📊'}</Box>
      <Typography sx={{ fontSize: 18, fontWeight: 700, mb: 1 }}>{error ? t('connectionErrorTitle') : t('noInsightsYet')}</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.secondary', textAlign: 'center', mb: 3 }}>{error ? t('connectionErrorDesc') : t('noInsightsDesc')}</Typography>
      <IconButton onClick={() => navigate(-1)} sx={{ bgcolor: 'primary.main', color: 'white', width: 48, height: 48 }}><ArrowForwardIcon /></IconButton>
    </Box>
  );

  const { topProducts, categoryBreakdown, stats, forgotten, shoppingFrequency, smartTips, hourlyActivity, shoppingScore, groupStats } = data;
  const maxHourly = Math.max(...hourlyActivity, 1);
  const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* Header */}
      <Box sx={{
        background: isDark
          ? 'linear-gradient(135deg, #5B21B6, #7C3AED, #6D28D9)'
          : 'linear-gradient(135deg, #7C3AED, #8B5CF6, #A78BFA)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 28px', sm: '48px 20px 32px' },
        borderRadius: '0 0 32px 32px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* עיגולים דקורטיביים */}
        <Box sx={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -20, left: -20, width: 80, height: 80, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.04)' }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.15)', width: 40, height: 40 }}>
            <ArrowForwardIcon />
          </IconButton>
          <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'white', flex: 1, letterSpacing: -0.5 }}>💡 {t('insights')}</Typography>
          <Box sx={{
            px: 1.5, py: 0.25, borderRadius: '6px',
            bgcolor: '#14B8A6',
            fontSize: 11, fontWeight: 900, color: 'white',
            letterSpacing: 1.5,
            transform: 'rotate(-8deg)',
            boxShadow: '0 2px 8px rgba(20,184,166,0.4)',
          }}>
            BETA
          </Box>
        </Box>

        {/* ציון קנייה - מרכזי ודרמטי */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3, ...anim(0.1) }}>
          <Box sx={{ position: 'relative', width: 90, height: 90, animation: `${pulse} 3s ease-in-out infinite` }}>
            <CircularProgress variant="determinate" value={100} size={90} thickness={4}
              sx={{ color: 'rgba(255,255,255,0.1)', position: 'absolute' }} />
            <CircularProgress variant="determinate" value={shoppingScore} size={90} thickness={4}
              sx={{ color: scoreColor(shoppingScore), position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Typography sx={{ fontSize: 28, fontWeight: 900, color: 'white', lineHeight: 1 }}>{shoppingScore}</Typography>
              <Typography sx={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>ציון</Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'white', mb: 0.5 }}>
              {scoreEmoji(shoppingScore)} {scoreText(shoppingScore)}
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
              {stats.completionRate}% מהמוצרים נקנו
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', mt: 0.5 }}>
              {stats.totalPurchased} מתוך {stats.totalProducts} מוצרים
            </Typography>
          </Box>
        </Box>

        {/* סטטיסטיקות - כרטיסים מעוגלים */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.25, ...anim(0.2) }}>
          {[
            { value: stats.totalLists, label: 'רשימות', icon: '📋', color: '#A78BFA' },
            { value: stats.totalProducts, label: 'מוצרים', icon: '🛒', color: '#22D3EE' },
            { value: stats.totalPurchased, label: 'נקנו', icon: '✅', color: '#34D399' },
          ].map((s, i) => (
            <Box key={i} sx={{
              textAlign: 'center', bgcolor: 'rgba(255,255,255,0.12)', borderRadius: '16px', p: 1.5,
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <Typography sx={{ fontSize: 20, mb: 0.5 }}>{s.icon}</Typography>
              <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'white' }}>{s.value}</Typography>
              <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: 600, letterSpacing: 0.5 }}>{s.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box sx={{ px: 2, mt: 3 }}>
        {/* תובנות חכמות */}
        {smartTips.length > 0 && (
          <SectionCard delay={0.3} isDark={isDark}>
            <SectionTitle icon={<AutoAwesomeIcon sx={{ color: '#F59E0B', fontSize: 18 }} />} title="תובנות חכמות" color="#F59E0B" />
            {smartTips.map((tip, i) => (
              <Box key={i} sx={{
                display: 'flex', gap: 1.5, mb: i < smartTips.length - 1 ? 1.5 : 0,
                alignItems: 'flex-start',
                p: 1.25, borderRadius: '12px',
                bgcolor: isDark ? 'rgba(245,158,11,0.06)' : 'rgba(245,158,11,0.04)',
              }}>
                <Typography sx={{ fontSize: 16, mt: -0.25 }}>💡</Typography>
                <Typography sx={{ fontSize: 13.5, color: 'text.primary', lineHeight: 1.6, fontWeight: 500 }}>{tip}</Typography>
              </Box>
            ))}
          </SectionCard>
        )}

        {/* הרגלי קנייה */}
        <SectionCard delay={0.4} isDark={isDark}>
          <SectionTitle icon={<CalendarTodayIcon sx={{ color: '#8B5CF6', fontSize: 18 }} />} title={t('shoppingHabits')} color="#8B5CF6" />
          <Box sx={{ display: 'flex', gap: 1.25 }}>
            {[
              { value: shoppingFrequency.avgDaysBetween || '—', label: t('avgDaysBetween'), color: '#8B5CF6', icon: '📅' },
              { value: stats.mostActiveDay || '—', label: t('mostActiveDay'), color: '#14B8A6', icon: '📆' },
              { value: stats.avgProductsPerList || '—', label: t('avgPerList'), color: '#F59E0B', icon: '📊' },
            ].map((item, i) => (
              <Box key={i} sx={{
                flex: 1, textAlign: 'center', borderRadius: '16px', p: 1.5,
                bgcolor: `${item.color}${isDark ? '12' : '08'}`,
                border: '1px solid', borderColor: `${item.color}15`,
              }}>
                <Typography sx={{ fontSize: 16, mb: 0.5 }}>{item.icon}</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 900, color: item.color, lineHeight: 1 }}>{item.value}</Typography>
                <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </SectionCard>

        {/* פעילות לפי שעה */}
        <SectionCard delay={0.45} isDark={isDark}>
          <SectionTitle icon={<AccessTimeIcon sx={{ color: '#06B6D4', fontSize: 18 }} />} title="שעות השיא שלך" color="#06B6D4" />
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 70, mb: 1 }}>
            {hourlyActivity.map((count, hour) => {
              const isPeak = hour === peakHour && count > 0;
              return (
                <Box key={hour} sx={{
                  flex: 1, minWidth: 0,
                  height: `${Math.max(6, (count / maxHourly) * 100)}%`,
                  bgcolor: isPeak ? '#06B6D4' : count > 0
                    ? (isDark ? 'rgba(6,182,212,0.3)' : 'rgba(6,182,212,0.2)')
                    : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  borderRadius: '4px 4px 0 0',
                  transition: 'height 1s ease',
                  position: 'relative',
                }}>
                  {isPeak && (
                    <Typography sx={{ position: 'absolute', top: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 800, color: '#06B6D4' }}>
                      {count}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            {[0, 6, 12, 18, 23].map(h => (
              <Typography key={h} sx={{ fontSize: 10, color: h === peakHour ? '#06B6D4' : 'text.disabled', fontWeight: h === peakHour ? 700 : 400 }}>{String(h).padStart(2, '0')}</Typography>
            ))}
          </Box>
          {peakHour > 0 && (
            <Box sx={{ mt: 1.5, p: 1, borderRadius: '10px', bgcolor: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.04)', textAlign: 'center' }}>
              <Typography sx={{ fontSize: 12, color: '#06B6D4', fontWeight: 600 }}>
                ⏰ שעת השיא שלך: {String(peakHour).padStart(2, '0')}:00
              </Typography>
            </Box>
          )}
        </SectionCard>

        {/* מוצרים נפוצים */}
        {topProducts.length > 0 && (
          <SectionCard delay={0.5} isDark={isDark}>
            <SectionTitle icon={<TrendingUpIcon sx={{ color: '#14B8A6', fontSize: 18 }} />} title={t('topProducts')} color="#14B8A6" />
            {topProducts.map((p, i) => {
              const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
              const maxCount = topProducts[0].count;
              const isTop3 = i < 3;
              return (
                <Box key={i} sx={{ mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Box sx={{
                      width: 28, height: 28, borderRadius: '8px',
                      bgcolor: isTop3 ? `${['#FFD700', '#C0C0C0', '#CD7F32'][i]}15` : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: isTop3 ? 16 : 12,
                      fontWeight: 700,
                      color: isTop3 ? ['#FFD700', '#9CA3AF', '#CD7F32'][i] : 'text.disabled',
                    }}>
                      {isTop3 ? ['🥇', '🥈', '🥉'][i] : i + 1}
                    </Box>
                    <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, flex: 1 }}>{p.name}</Typography>
                    <Box sx={{ px: 1, py: 0.25, borderRadius: '6px', bgcolor: 'rgba(20,184,166,0.1)' }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#14B8A6' }}>×{p.count}</Typography>
                    </Box>
                  </Box>
                  <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
                    sx={{ height: 5, borderRadius: 3, ml: 5.5, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 3 } }} />
                </Box>
              );
            })}
          </SectionCard>
        )}

        {/* פילוח קטגוריות */}
        {categoryBreakdown.length > 0 && (
          <SectionCard delay={0.55} isDark={isDark}>
            <SectionTitle icon={<ShoppingCartIcon sx={{ color: '#3B82F6', fontSize: 18 }} />} title={t('categoryBreakdown')} color="#3B82F6" />
            {categoryBreakdown.map((cat) => {
              const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
              const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
              const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
              return (
                <Box key={cat.category} sx={{ mb: 1.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: '8px', bgcolor: `${color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                        {icon}
                      </Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{key ? t(key) : cat.category}</Typography>
                    </Box>
                    <Typography sx={{ fontSize: 13, fontWeight: 800, color }}>{cat.percentage}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={cat.percentage}
                    sx={{ height: 7, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 4 } }} />
                </Box>
              );
            })}
          </SectionCard>
        )}

        {/* מוצרים שאולי שכחת */}
        {forgotten.length > 0 && (
          <SectionCard delay={0.6} isDark={isDark}>
            <SectionTitle icon={<LightbulbIcon sx={{ color: '#F59E0B', fontSize: 18 }} />} title={t('maybeForgot')} color="#F59E0B" />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {forgotten.map((p, i) => {
                const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                return (
                  <Box key={i} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.75,
                    bgcolor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)',
                    border: '1.5px solid', borderColor: isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.12)',
                    borderRadius: '12px', px: 1.5, py: 1,
                    transition: 'all 0.15s',
                    '&:active': { transform: 'scale(0.95)' },
                  }}>
                    <Typography sx={{ fontSize: 16 }}>{icon}</Typography>
                    <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{p.name}</Typography>
                  </Box>
                );
              })}
            </Box>
          </SectionCard>
        )}

        {/* סטטיסטיקות קבוצות */}
        {groupStats.length > 0 && (
          <SectionCard delay={0.65} isDark={isDark}>
            <SectionTitle icon={<Typography sx={{ fontSize: 18 }}>👥</Typography>} title="סטטיסטיקות קבוצות" color="#8B5CF6" />
            {groupStats.map((group, gi) => (
              <Box key={gi} sx={{
                mb: gi < groupStats.length - 1 ? 2.5 : 0,
                pb: gi < groupStats.length - 1 ? 2.5 : 0,
                borderBottom: gi < groupStats.length - 1 ? '1px solid' : 'none',
                borderColor: 'divider',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '14px', bgcolor: isDark ? 'rgba(139,92,246,0.15)' : 'rgba(139,92,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {group.icon}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{group.name}</Typography>
                    <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{group.membersCount} חברים</Typography>
                  </Box>
                </Box>

                {/* מדליות */}
                <Box sx={{ display: 'flex', gap: 1.25, mb: 2 }}>
                  {group.topContributor && (
                    <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.06)', borderRadius: '14px', p: 1.5, border: '1px solid', borderColor: 'rgba(20,184,166,0.1)' }}>
                      <Typography sx={{ fontSize: 20, mb: 0.5 }}>✏️</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#14B8A6' }}>{group.topContributor.name}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>הוסיף {group.topContributor.count} מוצרים</Typography>
                    </Box>
                  )}
                  {group.topBuyer && group.topBuyer.count > 0 && (
                    <Box sx={{ flex: 1, textAlign: 'center', bgcolor: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', borderRadius: '14px', p: 1.5, border: '1px solid', borderColor: 'rgba(245,158,11,0.1)' }}>
                      <Typography sx={{ fontSize: 20, mb: 0.5 }}>🛒</Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#F59E0B' }}>{group.topBuyer.name}</Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', mt: 0.25 }}>קנה {group.topBuyer.count} מוצרים</Typography>
                    </Box>
                  )}
                </Box>

                {/* חלוקת עבודה */}
                {group.memberBreakdown.length > 1 && group.memberBreakdown.map((m, mi) => {
                  const total = group.memberBreakdown.reduce((s, x) => s + x.added + x.purchased, 0);
                  const memberTotal = m.added + m.purchased;
                  const pct = total > 0 ? Math.round((memberTotal / total) * 100) : 0;
                  const colors = ['#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899', '#3B82F6'];
                  return (
                    <Box key={mi} sx={{ mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{m.name}</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: colors[mi % 5] }}>{pct}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={pct}
                        sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: colors[mi % 5], borderRadius: 3 } }} />
                    </Box>
                  );
                })}
              </Box>
            ))}
          </SectionCard>
        )}
      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
