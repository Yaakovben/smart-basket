import { useState, useEffect, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, Tabs, Tab, LinearProgress, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, BetaRibbon, priceComparisonApi, type PriceComparisonData } from '../../priceComparison';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';

const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;

type InsightTab = 'price' | 'lists' | 'habits' | 'pulse';

const dayLabels = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

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

// ===== כרטיס סטטיסטיקה קטן - לשימוש חוזר ברחבי העמוד =====
const StatCard = ({ value, label, color, bg, border }: {
  value: React.ReactNode; label: string; color: string; bg: string; border: string;
}) => (
  <Paper elevation={0} sx={{
    p: 1.25, borderRadius: '12px', textAlign: 'center',
    bgcolor: bg, border: `1px solid ${border}`,
  }}>
    <Typography sx={{ fontSize: 20, fontWeight: 900, color, lineHeight: 1 }}>{value}</Typography>
    <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.4 }}>{label}</Typography>
  </Paper>
);

// ===== כרטיס קטע (ספציפי לעמוד) =====
const SectionCard = ({ title, children, isDark }: {
  title: string; children: React.ReactNode; isDark: boolean;
}) => (
  <Paper elevation={0} sx={{
    p: 2, mb: 2, borderRadius: '16px',
    border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    animation: `${fadeIn} 0.35s ease both`,
  }}>
    <Typography sx={{ fontSize: 14, fontWeight: 800, mb: 1.5 }}>{title}</Typography>
    {children}
  </Paper>
);

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

  const {
    topProducts, categoryBreakdown, stats, groupStats, shoppingScore, streaks,
    weeklyTrends, weekdayActivity, monthComparison, shoppingFrequency,
  } = data;

  const maxWeeklyTrend = Math.max(...(weeklyTrends || []).map(w => Math.max(w.added, w.purchased)), 1);
  const maxWeekday = Math.max(...(weekdayActivity || []), 1);
  const groupStatsByName = new Map(groupStats.map(g => [g.name, g]));

  // חישובים ל-habits
  const topCategory = categoryBreakdown[0];
  const topCategoryLabel = topCategory
    ? (CATEGORY_TRANSLATION_KEYS[topCategory.category as keyof typeof CATEGORY_TRANSLATION_KEYS]
        ? t(CATEGORY_TRANSLATION_KEYS[topCategory.category as keyof typeof CATEGORY_TRANSLATION_KEYS])
        : topCategory.category)
    : null;
  const topProductsTotalCount = topProducts.reduce((s, p) => s + p.count, 0);
  const bestDayIdx = weekdayActivity ? weekdayActivity.indexOf(maxWeekday) : -1;
  const bestDayLabel = bestDayIdx >= 0 ? dayLabels[bestDayIdx] : '—';

  // פורמט תאריך יחסי קצר
  const formatRelativeDate = (iso: string | null): string => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const days = Math.floor(Math.abs(diff) / 86_400_000);
    if (diff < 0) return days === 0 ? 'היום' : days === 1 ? 'מחר' : `בעוד ${days}י׳`;
    return days === 0 ? 'היום' : days === 1 ? 'אתמול' : `לפני ${days}י׳`;
  };

  // growth indicator - אייקון וצבע
  const growth = monthComparison?.productsGrowth ?? 0;
  const growthPositive = growth > 0;
  const growthNegative = growth < 0;
  const growthColor = growthPositive ? '#22C55E' : growthNegative ? '#EF4444' : '#94A3B8';
  const GrowthIcon = growthPositive ? TrendingUpIcon : growthNegative ? TrendingDownIcon : TrendingFlatIcon;

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
        <Paper elevation={0} sx={{
          borderRadius: '999px', p: 0.4,
          border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            sx={{
              minHeight: 38,
              '& .MuiTabs-flexContainer': { gap: 0.25 },
              '& .MuiTab-root': {
                minHeight: 34, fontSize: 12.5, fontWeight: 700, textTransform: 'none',
                color: 'text.secondary', borderRadius: '999px', minWidth: 0, px: 0.5,
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
        {tab === 'lists' && (() => {
          // פלטת צבעים קבועה לחברי קבוצה
          const memberPalette = ['#8B5CF6', '#14B8A6', '#F59E0B', '#EC4899', '#3B82F6', '#22C55E', '#EF4444'];
          // מקור האמת: priceData.lists (כל הרשימות הפעילות עם מטא-דאטה), עם fallback ל-groupStats.
          const listsToShow = priceData?.lists && priceData.lists.length > 0 ? priceData.lists : null;
          const hasAnything = (listsToShow && listsToShow.length > 0) || groupStats.length > 0;
          // חברים ייחודיים בכל הקבוצות — "חברים פעילים"
          const uniqueMembers = new Set<string>();
          groupStats.forEach(g => g.memberBreakdown.forEach(m => uniqueMembers.add(m.name)));

          if (!hasAnything) return (
            <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
              <Typography sx={{ fontSize: 40, mb: 1, animation: `${float} 2s ease infinite` }}>📋</Typography>
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>אין רשימות פעילות</Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 0.5 }}>
                צור רשימה כדי לראות פה פעילות
              </Typography>
            </Box>
          );

          return (
            <>
              {/* שורת סטטיסטיקה ממוקדת-פעילות (לא מחירים) */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
                <StatCard
                  value={<AnimatedNumber value={stats.totalLists} />}
                  label="רשימות"
                  color="#8B5CF6"
                  bg={isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)'}
                  border="rgba(139,92,246,0.15)"
                />
                <StatCard
                  value={<AnimatedNumber value={stats.totalProducts} />}
                  label="פריטים בס״ה"
                  color="#14B8A6"
                  bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                  border="rgba(20,184,166,0.15)"
                />
                <StatCard
                  value={uniqueMembers.size > 0 ? <AnimatedNumber value={uniqueMembers.size} /> : '—'}
                  label="חברים פעילים"
                  color="#F59E0B"
                  bg={isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)'}
                  border="rgba(245,158,11,0.15)"
                />
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {listsToShow ? listsToShow.map((L, idx) => {
                  const g = L.isGroup ? groupStatsByName.get(L.listName) : undefined;
                  const members = g?.memberBreakdown || [];
                  const memberTotalAdded = members.reduce((s, m) => s + m.added, 0);
                  const memberTotalPurchased = members.reduce((s, m) => s + m.purchased, 0);
                  const memberTotalActivity = memberTotalAdded + memberTotalPurchased;
                  const purchasedPct = memberTotalAdded > 0 ? Math.round((memberTotalPurchased / memberTotalAdded) * 100) : 0;
                  // מיון החברים לפי סך פעילות יורד
                  const sortedMembers = [...members].sort((a, b) => (b.added + b.purchased) - (a.added + a.purchased));

                  return (
                    <Paper key={L.listId} elevation={0} sx={{
                      p: 1.5, borderRadius: '14px',
                      border: '1px solid',
                      borderColor: isDark ? `${L.listColor}28` : `${L.listColor}22`,
                      background: isDark
                        ? `linear-gradient(135deg, ${L.listColor}14, transparent 75%)`
                        : `linear-gradient(135deg, ${L.listColor}0A, transparent 75%)`,
                      animation: `${fadeIn} 0.35s ease ${idx * 0.06}s both`,
                    }}>
                      {/* Header: icon + name + members badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{
                          width: 44, height: 44, flexShrink: 0, borderRadius: '12px', fontSize: 22,
                          bgcolor: `${L.listColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1.5px solid', borderColor: `${L.listColor}45`,
                        }}>{L.listIcon}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                            <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>{L.listName}</Typography>
                            {L.isGroup ? (
                              <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.25,
                                px: 0.7, py: 0.2, borderRadius: '6px',
                                bgcolor: 'rgba(139,92,246,0.14)',
                                border: '1px solid rgba(139,92,246,0.3)',
                              }}>
                                <GroupIcon sx={{ fontSize: 12, color: '#8B5CF6' }} />
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#8B5CF6' }}>
                                  {g?.membersCount || 0} חברים
                                </Typography>
                              </Box>
                            ) : (
                              <Box sx={{
                                px: 0.7, py: 0.2, borderRadius: '6px',
                                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                              }}>
                                <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: 'text.secondary' }}>פרטית</Typography>
                              </Box>
                            )}
                          </Box>
                          {/* סיכום פעילות — לא מחירים */}
                          {L.isGroup && g && memberTotalAdded > 0 ? (
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                              <b>{memberTotalAdded}</b> נוספו · <b>{memberTotalPurchased}</b> נקנו
                              <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', ml: 0.5 }}>
                                ({purchasedPct}%)
                              </Typography>
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2 }}>
                              רשימה פעילה
                            </Typography>
                          )}
                        </Box>
                      </Box>

                      {/* חלוקת חברים - רק אם יש קבוצה עם יותר מחבר אחד ויש פעילות */}
                      {L.isGroup && sortedMembers.length > 1 && memberTotalActivity > 0 && (
                        <>
                          {/* Stacked bar - תרומה כוללת לפי חבר */}
                          <Box sx={{ mt: 1.25 }}>
                            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 700, mb: 0.4, letterSpacing: 0.3 }}>
                              חלוקת פעילות
                            </Typography>
                            <Box sx={{
                              display: 'flex', height: 7, borderRadius: 2, overflow: 'hidden',
                              boxShadow: isDark ? 'inset 0 1px 0 rgba(255,255,255,0.05)' : 'inset 0 1px 0 rgba(0,0,0,0.04)',
                            }}>
                              {sortedMembers.map((m, mi) => {
                                const pct = ((m.added + m.purchased) / memberTotalActivity) * 100;
                                return <Box key={mi} title={`${m.name}: ${Math.round(pct)}%`} sx={{ width: `${pct}%`, bgcolor: memberPalette[mi % memberPalette.length] }} />;
                              })}
                            </Box>
                          </Box>

                          {/* רשימת חברים מלאה עם מי/מה/כמה */}
                          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {sortedMembers.map((m, mi) => {
                              const color = memberPalette[mi % memberPalette.length];
                              const totalForMember = m.added + m.purchased;
                              const pct = memberTotalActivity > 0 ? Math.round((totalForMember / memberTotalActivity) * 100) : 0;
                              const initial = m.name.charAt(0).toUpperCase();
                              return (
                                <Box key={mi} sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.9,
                                  px: 0.6, py: 0.55, borderRadius: '8px',
                                  bgcolor: isDark ? `${color}12` : `${color}0A`,
                                  border: '1px solid',
                                  borderColor: isDark ? `${color}22` : `${color}18`,
                                }}>
                                  {/* אווטאר-אות */}
                                  <Box sx={{
                                    width: 26, height: 26, flexShrink: 0,
                                    borderRadius: '50%',
                                    bgcolor: color, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 800, boxShadow: `0 2px 6px ${color}50`,
                                  }}>{initial}</Box>
                                  <Typography sx={{
                                    fontSize: 12.5, fontWeight: 700, flex: 1,
                                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                  }}>{m.name}</Typography>
                                  {/* Added badge */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <Typography sx={{ fontSize: 11 }}>✏️</Typography>
                                    <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.primary' }}>{m.added}</Typography>
                                  </Box>
                                  {/* Purchased badge */}
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                                    <Typography sx={{ fontSize: 11 }}>✅</Typography>
                                    <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.primary' }}>{m.purchased}</Typography>
                                  </Box>
                                  {/* Percent pill */}
                                  <Box sx={{
                                    minWidth: 36, textAlign: 'center',
                                    px: 0.5, py: 0.15, borderRadius: '6px',
                                    bgcolor: color,
                                  }}>
                                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: 'white' }}>{pct}%</Typography>
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        </>
                      )}

                      {/* קבוצה עם חבר יחיד או בלי פעילות */}
                      {L.isGroup && (!sortedMembers.length || memberTotalActivity === 0) && (
                        <Typography sx={{ mt: 1, fontSize: 11, color: 'text.disabled', textAlign: 'center', py: 0.5 }}>
                          אין עדיין פעילות של חברים
                        </Typography>
                      )}
                    </Paper>
                  );
                }) : (
                  // Fallback: רק groupStats
                  groupStats.map((g, gi) => (
                    <Paper key={gi} elevation={0} sx={{
                      p: 1.5, borderRadius: '14px',
                      border: '1px solid', borderColor: isDark ? 'rgba(139,92,246,0.22)' : 'rgba(139,92,246,0.18)',
                      background: isDark ? 'rgba(139,92,246,0.06)' : 'rgba(139,92,246,0.04)',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Box sx={{
                          width: 44, height: 44, flexShrink: 0, borderRadius: '12px', fontSize: 22,
                          bgcolor: 'rgba(139,92,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>{g.icon}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 14.5, fontWeight: 800 }}>{g.name}</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            {g.membersCount} חברים
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))
                )}
              </Box>
            </>
          );
        })()}

        {/* ===== הרגלים ===== */}
        {tab === 'habits' && (
          <>
            {/* שורת סטטיסטיקת על */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
              <StatCard
                value={<AnimatedNumber value={stats.totalPurchased} />}
                label="נקנו בס״ה"
                color="#22C55E"
                bg={isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)'}
                border="rgba(34,197,94,0.15)"
              />
              <StatCard
                value={topCategoryLabel ? <Typography component="span" sx={{ fontSize: 14, fontWeight: 900, color: 'text.primary' }}>{topCategoryLabel}</Typography> : '—'}
                label={topCategory ? `קטגוריה מובילה · ${topCategory.percentage}%` : 'קטגוריה מובילה'}
                color="#14B8A6"
                bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                border="rgba(20,184,166,0.15)"
              />
              <StatCard
                value={bestDayLabel}
                label={`יום שיא${maxWeekday > 0 ? ` · ${maxWeekday} פעולות` : ''}`}
                color="#F59E0B"
                bg={isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)'}
                border="rgba(245,158,11,0.15)"
              />
            </Box>

            {/* מוצרים נפוצים */}
            {topProducts.length > 0 && (
              <SectionCard title="🏆 המוצרים הנפוצים שלך" isDark={isDark}>
                {/* Top 3 */}
                <Box sx={{ display: 'flex', gap: 1, mb: topProducts.length > 3 ? 1.75 : 0 }}>
                  {topProducts.slice(0, 3).map((p, i) => {
                    const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const medal = ['🥇', '🥈', '🥉'][i];
                    const pct = topProductsTotalCount > 0 ? Math.round((p.count / topProductsTotalCount) * 100) : 0;
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
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.35, mt: 0.35 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 900, color: '#14B8A6' }}>×{p.count}</Typography>
                          <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>· {pct}%</Typography>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
                {/* ראנק 4-8 */}
                {topProducts.slice(3, 8).map((p, i) => {
                  const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                  const maxCount = topProducts[0].count;
                  const pct = topProductsTotalCount > 0 ? Math.round((p.count / topProductsTotalCount) * 100) : 0;
                  return (
                    <Box key={i} sx={{ mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                        <Typography sx={{ fontSize: 11, width: 16, color: 'text.disabled', textAlign: 'center' }}>{i + 4}</Typography>
                        <Typography sx={{ fontSize: 14 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>{pct}%</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#14B8A6', minWidth: 32, textAlign: 'left' }}>×{p.count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
                        sx={{ height: 3, borderRadius: 2, ml: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 2 } }} />
                    </Box>
                  );
                })}
              </SectionCard>
            )}

            {/* פילוח קטגוריות - בר מחולק אחד במקום שתי ויזואליזציות */}
            {categoryBreakdown.length > 0 && (
              <SectionCard title="📊 פילוח קטגוריות" isDark={isDark}>
                {/* בר מחולק אופקי - הכל בבת אחת */}
                <Box sx={{ display: 'flex', height: 10, borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
                  {categoryBreakdown.map(cat => {
                    const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    return <Box key={cat.category} sx={{ width: `${cat.percentage}%`, bgcolor: color, transition: 'width 0.8s ease' }} />;
                  })}
                </Box>
                {/* רשימה קומפקטית עם נקודה צבעונית + שם + % */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  {categoryBreakdown.slice(0, 8).map(cat => {
                    const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    return (
                      <Box key={cat.category} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1 }}>
                          {key ? t(key) : cat.category}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{cat.count}</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color, minWidth: 36, textAlign: 'left' }}>{cat.percentage}%</Typography>
                      </Box>
                    );
                  })}
                </Box>
              </SectionCard>
            )}
          </>
        )}

        {/* ===== דופק ===== */}
        {tab === 'pulse' && (
          <>
            {/* כרטיס ציון עם progress ring */}
            <SectionCard title="📈 ציון הקנייה שלך" isDark={isDark}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {/* Progress ring */}
                <Box sx={{ position: 'relative', width: 88, height: 88, flexShrink: 0 }}>
                  <CircularProgress
                    variant="determinate"
                    value={100}
                    size={88} thickness={5}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', position: 'absolute' }}
                  />
                  <CircularProgress
                    variant="determinate"
                    value={shoppingScore}
                    size={88} thickness={5}
                    sx={{ color: '#14B8A6', position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' } }}
                  />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{scoreEmoji(shoppingScore)}</Typography>
                    <Typography sx={{ fontSize: 20, fontWeight: 900, color: 'text.primary', lineHeight: 1, mt: 0.15 }}>
                      <AnimatedNumber value={shoppingScore} />
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                    {stats.completionRate}% השלמה
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, lineHeight: 1.55 }}>
                    הציון מחושב לפי יחס פריטים שנקנו מול שנוספו, רצף שבועות פעילות, וגיוון קטגוריות.
                  </Typography>
                </Box>
              </Box>
            </SectionCard>

            {/* מגמה + סטריק + חודש - שורה של 3 */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
              {/* סטריק */}
              <Paper elevation={0} sx={{
                p: 1.25, borderRadius: '12px', textAlign: 'center',
                bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                border: '1px solid rgba(245,158,11,0.15)',
              }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>
                  🔥{streaks?.currentWeeks || 0}
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
                  סטריק · שיא {streaks?.longestWeeks || 0}
                </Typography>
              </Paper>

              {/* חודש */}
              <Paper elevation={0} sx={{
                p: 1.25, borderRadius: '12px', textAlign: 'center',
                bgcolor: isDark ? `${growthColor}18` : `${growthColor}10`,
                border: `1px solid ${growthColor}30`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                  <GrowthIcon sx={{ fontSize: 18, color: growthColor }} />
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: growthColor, lineHeight: 1 }}>
                    {growth > 0 ? '+' : ''}{growth}%
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
                  לעומת חודש שעבר
                </Typography>
              </Paper>

              {/* תדירות קנייה */}
              <Paper elevation={0} sx={{
                p: 1.25, borderRadius: '12px', textAlign: 'center',
                bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)',
                border: '1px solid rgba(139,92,246,0.15)',
              }}>
                <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#8B5CF6', lineHeight: 1 }}>
                  {shoppingFrequency?.avgDaysBetween ? `${shoppingFrequency.avgDaysBetween}י׳` : '—'}
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
                  בין קניות בממוצע
                </Typography>
              </Paper>
            </Box>

            {/* תחזית קנייה הבאה */}
            {shoppingFrequency && (shoppingFrequency.lastShoppingDate || shoppingFrequency.predictedNextDate) && (
              <Paper elevation={0} sx={{
                p: 1.5, mb: 2, borderRadius: '14px',
                bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)',
                border: '1px solid rgba(20,184,166,0.15)',
                display: 'flex', alignItems: 'center', gap: 1.5,
              }}>
                <Typography sx={{ fontSize: 22 }}>🛒</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    קנייה אחרונה: <b>{formatRelativeDate(shoppingFrequency.lastShoppingDate)}</b>
                  </Typography>
                  {shoppingFrequency.predictedNextDate && (
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0D9488', mt: 0.15 }}>
                      הבאה צפויה: {formatRelativeDate(shoppingFrequency.predictedNextDate)}
                    </Typography>
                  )}
                </Box>
              </Paper>
            )}

            {/* מגמה שבועית */}
            {weeklyTrends && weeklyTrends.length > 0 && (
              <SectionCard title="📊 מגמה שבועית" isDark={isDark}>
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
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: '#22C55E' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>נקנו</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)' }} />
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>ממתינים</Typography>
                  </Box>
                </Box>
              </SectionCard>
            )}

            {/* heatmap ימים - מראה יום שיא */}
            {weekdayActivity && weekdayActivity.some(v => v > 0) && (
              <SectionCard title="📅 פעילות לפי ימים" isDark={isDark}>
                <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'space-between' }}>
                  {weekdayActivity.map((count, i) => {
                    const intensity = count / maxWeekday;
                    const isBest = i === bestDayIdx && count > 0;
                    return (
                      <Box key={i} sx={{ flex: 1, textAlign: 'center' }}>
                        <Box sx={{
                          aspectRatio: '1 / 1', borderRadius: '10px',
                          bgcolor: count === 0
                            ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                            : `rgba(20,184,166,${0.18 + intensity * 0.6})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mb: 0.5,
                          border: isBest ? '1.5px solid #14B8A6' : 'none',
                          boxShadow: isBest ? '0 2px 10px rgba(20,184,166,0.4)' : 'none',
                        }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 800, color: count > 0 ? 'white' : 'text.disabled' }}>
                            {count}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: isBest ? '#14B8A6' : 'text.secondary' }}>
                          {dayLabels[i]}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </SectionCard>
            )}
          </>
        )}

      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
