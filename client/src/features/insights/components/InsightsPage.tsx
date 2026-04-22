import { useState, useEffect, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, Tabs, Tab, LinearProgress, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupIcon from '@mui/icons-material/Group';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, BetaRibbon, priceComparisonApi, type PriceComparisonData } from '../../priceComparison';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';

const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;

type InsightTab = 'price' | 'lists' | 'habits' | 'pulse';

// ספירה אנימטיבית
const AnimatedNumber = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = Date.now();
    const dur = 700;
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

const scoreEmoji = (s: number) => s >= 90 ? '🏆' : s >= 80 ? '🔥' : s >= 60 ? '💪' : s >= 40 ? '📈' : '🌱';

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [data, setData] = useState<InsightsData | null>(null);
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<InsightTab>('price');

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

  const { topProducts, categoryBreakdown, stats, groupStats, shoppingScore, streaks, weeklyTrends } = data;
  const maxWeeklyTrend = Math.max(...(weeklyTrends || []).map(w => Math.max(w.added, w.purchased)), 1);
  const groupStatsByName = new Map(groupStats.map(g => [g.name, g]));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 5 }}>
      {/* ===== הדר גרדיאנט עם ריבון BETA אלכסוני ===== */}
      <Box sx={{
        background: isDark ? 'linear-gradient(160deg, #312E81, #5B21B6, #7C3AED)' : 'linear-gradient(160deg, #6D28D9, #7C3AED, #A78BFA)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 22px', sm: '48px 20px 26px' },
        borderRadius: '0 0 24px 24px',
        position: 'relative', overflow: 'hidden',
        mb: 2,
      }}>
        <BetaRibbon corner="top-left" offsetTop={52} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', width: 36, height: 36 }}>
            <ArrowForwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: -0.5 }}>
              💡 {t('insights')}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'rgba(255,255,255,0.6)', mt: 0.15 }}>
              הנתונים עשויים להיות חלקיים · עובדים על שיפורים
            </Typography>
          </Box>
          {/* ציון ב-pill קומפקטי */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '14px',
            px: 1.25, py: 0.75,
            border: '1px solid rgba(255,255,255,0.15)',
          }}>
            <Typography sx={{ fontSize: 14 }}>{scoreEmoji(shoppingScore)}</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1 }}>
              <AnimatedNumber value={shoppingScore} />
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* ===== טאבים ===== */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: '999px',
            p: 0.4,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              minHeight: 38,
              '& .MuiTabs-flexContainer': { gap: 0.25 },
              '& .MuiTab-root': {
                minHeight: 34,
                fontSize: 12.5,
                fontWeight: 700,
                textTransform: 'none',
                color: 'text.secondary',
                borderRadius: '999px',
                minWidth: 0,
                px: 0.5,
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                '&.Mui-selected': {
                  color: 'white',
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                  boxShadow: '0 2px 8px rgba(20,184,166,0.3)',
                },
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab value="price" label="💰 מחירים" />
            <Tab value="lists" label="📋 רשימות" />
            <Tab value="habits" label="🏆 הרגלים" />
            <Tab value="pulse" label="📈 דופק" />
          </Tabs>
        </Paper>
      </Box>

      {/* ===== תוכן לפי טאב ===== */}
      <Box sx={{ px: 2, animation: `${fadeIn} 0.3s ease both` }} key={tab}>

        {/* ===== מחירים ===== */}
        {tab === 'price' && (
          <PriceComparisonCard data={priceData} isDark={isDark} />
        )}

        {/* ===== רשימות ===== */}
        {tab === 'lists' && (
          <>
            {(priceData?.lists && priceData.lists.length > 0) || groupStats.length > 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {priceData?.lists && priceData.lists.length > 0 ? (
                  priceData.lists.map(L => {
                    const matchGroup = L.isGroup ? groupStatsByName.get(L.listName) : undefined;
                    return (
                      <Paper key={L.listId} elevation={0} sx={{
                        p: 1.5, borderRadius: '14px',
                        border: '1px solid',
                        borderColor: isDark ? `${L.listColor}25` : `${L.listColor}20`,
                        background: isDark
                          ? `linear-gradient(135deg, ${L.listColor}12, transparent 70%)`
                          : `linear-gradient(135deg, ${L.listColor}08, transparent 70%)`,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: matchGroup ? 1 : 0 }}>
                          <Box sx={{
                            width: 40, height: 40, flexShrink: 0, borderRadius: '12px', fontSize: 20,
                            bgcolor: `${L.listColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid', borderColor: `${L.listColor}35`,
                          }}>{L.listIcon}</Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                              <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{L.listName}</Typography>
                              {L.isGroup && <GroupIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                            </Box>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.15 }}>
                              {L.pendingCount} פריטים · {L.matchedCount} תומחרו{L.unmatchedCount > 0 ? ` · ${L.unmatchedCount} לא` : ''}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                            {L.estimatedTotal > 0 ? (
                              <>
                                <Typography sx={{ fontSize: 15, fontWeight: 900, color: '#0D9488', fontFamily: 'monospace', lineHeight: 1 }}>
                                  ₪{L.estimatedTotal.toFixed(0)}
                                </Typography>
                                <Typography sx={{ fontSize: 9, color: 'text.disabled', mt: 0.2 }}>משוער</Typography>
                              </>
                            ) : (
                              <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>אין תמחור</Typography>
                            )}
                          </Box>
                        </Box>
                        {matchGroup && (matchGroup.topContributor || (matchGroup.topBuyer && matchGroup.topBuyer.count > 0)) && (
                          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.25 }}>
                            {matchGroup.topContributor && (
                              <Box sx={{
                                flex: 1, p: 0.75, borderRadius: '8px',
                                bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.06)',
                                border: '1px solid rgba(20,184,166,0.12)',
                                display: 'flex', alignItems: 'center', gap: 0.5,
                              }}>
                                <Typography sx={{ fontSize: 12 }}>✏️</Typography>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>הכי מוסיף</Typography>
                                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#14B8A6', lineHeight: 1.2 }}>
                                    {matchGroup.topContributor.name} ({matchGroup.topContributor.count})
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                            {matchGroup.topBuyer && matchGroup.topBuyer.count > 0 && (
                              <Box sx={{
                                flex: 1, p: 0.75, borderRadius: '8px',
                                bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.06)',
                                border: '1px solid rgba(245,158,11,0.12)',
                                display: 'flex', alignItems: 'center', gap: 0.5,
                              }}>
                                <Typography sx={{ fontSize: 12 }}>🛒</Typography>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1 }}>הכי קונה</Typography>
                                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', lineHeight: 1.2 }}>
                                    {matchGroup.topBuyer.name} ({matchGroup.topBuyer.count})
                                  </Typography>
                                </Box>
                              </Box>
                            )}
                          </Box>
                        )}
                      </Paper>
                    );
                  })
                ) : (
                  groupStats.map((g, gi) => (
                    <Paper key={gi} elevation={0} sx={{
                      p: 1.5, borderRadius: '14px',
                      border: '1px solid', borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)',
                      background: isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.03)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{
                          width: 40, height: 40, flexShrink: 0, borderRadius: '12px', fontSize: 20,
                          bgcolor: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{g.icon}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>{g.name}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{g.membersCount} חברים</Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography sx={{ fontSize: 40, mb: 1, animation: `${float} 2s ease infinite` }}>📋</Typography>
                <Typography sx={{ fontSize: 14, fontWeight: 600 }}>אין רשימות פעילות</Typography>
              </Box>
            )}
          </>
        )}

        {/* ===== הרגלים: מוצרים + קטגוריות ===== */}
        {tab === 'habits' && (
          <>
            {/* מוצרים מובילים */}
            {topProducts.length > 0 && (
              <Paper elevation={0} sx={{
                p: 2, mb: 2, borderRadius: '16px',
                border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>🏆 המוצרים הנפוצים שלך</Typography>

                <Box sx={{ display: 'flex', gap: 1, mb: topProducts.length > 3 ? 1.5 : 0 }}>
                  {topProducts.slice(0, 3).map((p, i) => {
                    const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const medal = ['🥇', '🥈', '🥉'][i];
                    return (
                      <Box key={i} sx={{
                        flex: 1, textAlign: 'center',
                        p: 1.25, borderRadius: '12px',
                        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      }}>
                        <Typography sx={{ fontSize: 16, mb: 0.25 }}>{medal}</Typography>
                        <Typography sx={{ fontSize: 18, mb: 0.25 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: '#14B8A6', mt: 0.25 }}>×{p.count}</Typography>
                      </Box>
                    );
                  })}
                </Box>

                {topProducts.slice(3, 8).map((p, i) => {
                  const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                  const maxCount = topProducts[0].count;
                  return (
                    <Box key={i} sx={{ mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                        <Typography sx={{ fontSize: 11, width: 16, color: 'text.disabled', textAlign: 'center' }}>{i + 4}</Typography>
                        <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#14B8A6' }}>×{p.count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
                        sx={{ height: 3, borderRadius: 2, ml: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 2 } }} />
                    </Box>
                  );
                })}
              </Paper>
            )}

            {/* קטגוריות */}
            {categoryBreakdown.length > 0 && (
              <Paper elevation={0} sx={{
                p: 2, borderRadius: '16px',
                border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>📊 פילוח קטגוריות</Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
                  {categoryBreakdown.slice(0, 6).map(cat => {
                    const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    return (
                      <Box key={cat.category} sx={{
                        display: 'inline-flex', alignItems: 'center', gap: 0.5,
                        px: 1, py: 0.6, borderRadius: '9px',
                        bgcolor: `${color}10`, border: `1px solid ${color}25`,
                      }}>
                        <Typography sx={{ fontSize: 13 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{key ? t(key) : cat.category}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color }}>{cat.percentage}%</Typography>
                      </Box>
                    );
                  })}
                </Box>

                {categoryBreakdown.map(cat => {
                  const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                  return (
                    <LinearProgress key={cat.category} variant="determinate" value={cat.percentage}
                      sx={{ height: 4, borderRadius: 2, mb: 0.4, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
                  );
                })}
              </Paper>
            )}
          </>
        )}

        {/* ===== דופק ===== */}
        {tab === 'pulse' && (
          <>
            {/* ציון + השלמה */}
            <Paper elevation={0} sx={{
              p: 2, mb: 2, borderRadius: '16px',
              border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              textAlign: 'center',
            }}>
              <Typography sx={{ fontSize: 32, mb: 0.25 }}>{scoreEmoji(shoppingScore)}</Typography>
              <Typography sx={{ fontSize: 40, fontWeight: 900, color: '#14B8A6', lineHeight: 1 }}>
                <AnimatedNumber value={shoppingScore} />
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, mt: 0.5 }}>
                ציון קנייה · {stats.completionRate}% השלמה
              </Typography>
            </Paper>

            {/* סטטיסטיקות מהירות */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
              <Paper elevation={0} sx={{ textAlign: 'center', p: 1.25, borderRadius: '12px', bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#8B5CF6', lineHeight: 1 }}>
                  <AnimatedNumber value={stats.totalLists} />
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>📋 רשימות</Typography>
              </Paper>
              <Paper elevation={0} sx={{ textAlign: 'center', p: 1.25, borderRadius: '12px', bgcolor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>
                  <AnimatedNumber value={stats.totalPurchased} />
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>✅ נקנו</Typography>
              </Paper>
              <Paper elevation={0} sx={{ textAlign: 'center', p: 1.25, borderRadius: '12px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>
                  🔥{streaks?.currentWeeks || 0}
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>
                  סטריק · שיא {streaks?.longestWeeks || 0}
                </Typography>
              </Paper>
            </Box>

            {/* מגמה שבועית */}
            {weeklyTrends && weeklyTrends.length > 0 && (
              <Paper elevation={0} sx={{
                p: 2, borderRadius: '16px',
                border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
              }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>📊 מגמה שבועית</Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 70, mb: 1 }}>
                  {weeklyTrends.map((w, i) => (
                    <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', height: '100%', justifyContent: 'flex-end' }}>
                      <Box sx={{
                        height: `${(w.purchased / maxWeeklyTrend) * 100}%`,
                        bgcolor: '#22C55E', borderRadius: '3px 3px 0 0', minHeight: w.purchased > 0 ? 3 : 0,
                      }} />
                      <Box sx={{
                        height: `${((w.added - w.purchased) / maxWeeklyTrend) * 100}%`,
                        bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)',
                        borderRadius: '3px 3px 0 0', minHeight: w.added - w.purchased > 0 ? 2 : 0,
                      }} />
                    </Box>
                  ))}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: '#22C55E' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>נקנו</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>ממתינים</Typography>
                  </Box>
                </Box>
              </Paper>
            )}
          </>
        )}

      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
