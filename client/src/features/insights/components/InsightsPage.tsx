import { useState, useEffect, memo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, Tabs, Tab, LinearProgress, keyframes } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, authApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, BetaRibbon, priceComparisonApi, type PriceComparisonData } from '../../priceComparison';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { haptic } from '../../../global/helpers';

const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;
// מעבר טאבים: שילוב של fade + slide קטן — תחושת מעבר חלק בלי להסיח את העין
const tabEnter = keyframes`from{opacity:0;transform:translateY(12px) scale(0.99)}to{opacity:1;transform:translateY(0) scale(1)}`;

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
// משתמש ב-gradient עדין במקום צבע אחיד + tabular-nums כדי שמספרים שמתאנמים יתייצבו ברוחב
const StatCard = ({ value, label, color, bg, border }: {
  value: React.ReactNode; label: string; color: string; bg: string; border: string;
}) => (
  <Paper elevation={0} sx={{
    p: 1.25, borderRadius: '12px', textAlign: 'center',
    // גרדיאנט 45° עדין מ-bg לשקוף ב-5% - משווה עומק עדין לכרטיסים שטוחים
    background: `linear-gradient(135deg, ${bg}, ${bg} 55%, transparent 130%)`,
    border: `1px solid ${border}`,
    transition: 'transform 0.15s ease, box-shadow 0.2s ease',
  }}>
    <Typography sx={{
      fontSize: 20, fontWeight: 900, color, lineHeight: 1,
      fontVariantNumeric: 'tabular-nums',
    }}>{value}</Typography>
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

// ===== שורת כותרת אישית בראש כל טאב — מסגור חם אחד, לא עמוס =====
// מקבלת טקסט עשיר (עם <b> לדגשים) ואייקון. תפקידה להרגיש כמו "שלום אישי",
// לא כמו דף סטטיסטי. מופיעה לפני תוכן הטאב ומוסיפה אופי לכל טאב.
const HeroInsight = ({ icon, text, accent, isDark }: {
  icon: string;
  text: React.ReactNode;
  accent: string;
  isDark: boolean;
}) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1.25,
    px: 1.5, py: 1.25, mb: 1.75, borderRadius: '14px',
    background: isDark
      ? `linear-gradient(135deg, ${accent}18, ${accent}06 75%)`
      : `linear-gradient(135deg, ${accent}12, ${accent}03 75%)`,
    border: '1px solid', borderColor: isDark ? `${accent}2A` : `${accent}22`,
    animation: `${fadeIn} 0.4s ease both`,
  }}>
    <Box sx={{
      width: 36, height: 36, flexShrink: 0,
      borderRadius: '10px', bgcolor: isDark ? `${accent}28` : `${accent}18`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 19,
    }}>
      {icon}
    </Box>
    <Typography sx={{
      flex: 1, fontSize: 13, color: 'text.primary', lineHeight: 1.5,
      '& b': { color: accent, fontWeight: 800 },
    }}>
      {text}
    </Typography>
  </Box>
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
  // שם המשתמש הנוכחי - משמש לסימון "אתה" על שורה של המשתמש ברשימת חברי קבוצה
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  // רשימות שפתוחות להצגת כל החברים (כשיש מעל 4)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());
  // האם מוצג הסבר ציון בטאב דופק
  const [scoreExplained, setScoreExplained] = useState(false);
  // יום נבחר ב-heatmap (לחיצה מדגישה ומציגה פרטים)
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  // שבוע נבחר בגרף המגמה (לחיצה מציגה פרטים)
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);

  useEffect(() => {
    insightsApi.getInsights().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
    priceComparisonApi.getComparison().then(setPriceData).catch(() => {});
    // שליפת שם המשתמש - לא חוסם שום דבר, נכשל בשקט
    authApi.getProfile().then(u => setCurrentUserName(u?.name ?? null)).catch(() => {});
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
        // Padding-top מוגדל לפנות מקום לריבון BETA בגודל lg מעל שורת הכותרת
        // בלי שיידרוס כפתור או את ה-pill של הציון.
        p: { xs: 'max(70px, env(safe-area-inset-top) + 38px) 16px 22px', sm: '74px 20px 26px' },
        borderRadius: '0 0 24px 24px',
        position: 'relative', overflow: 'hidden',
        mb: 2,
      }}>
        {/* ריבון BETA גדול (lg) בצד שמאל פיזית. רכיב BetaRibbon משתמש ב-style prop
            כדי לעקוף את ה-RTL-flip של MUI, אז "top-left" אכן מופיע בצד השמאלי הוויזואלי. */}
        <BetaRibbon corner="top-left" offsetTop={4} size="lg" />
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
            <Typography sx={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
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
      <Box sx={{ px: 2, animation: `${tabEnter} 0.32s cubic-bezier(0.25, 0.8, 0.25, 1) both` }} key={tab}>

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

          // כותרת אישית — מנוסחת אנושית, לא רשימת מספרים
          const groupsCount = groupStats.length;
          const heroText = groupsCount > 0
            ? <><b>{stats.totalLists}</b> רשימות · <b>{stats.totalProducts}</b> פריטים · פעיל ב-<b>{groupsCount}</b> {groupsCount === 1 ? 'קבוצה' : 'קבוצות'}</>
            : <>יש לך <b>{stats.totalLists}</b> רשימות עם <b>{stats.totalProducts}</b> פריטים</>;

          return (
            <>
              <HeroInsight icon="👋" text={heroText} accent="#8B5CF6" isDark={isDark} />
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
                  label={'פריטים בסה"כ'}
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
                  // חישוב התרומה של המשתמש הנוכחי ברשימה הזו (לטקסט "התרומה שלך")
                  const myStats = currentUserName ? members.find(m => m.name === currentUserName) : undefined;
                  const myRank = myStats ? sortedMembers.findIndex(m => m.name === currentUserName) + 1 : 0;
                  const myPct = myStats && memberTotalActivity > 0
                    ? Math.round(((myStats.added + myStats.purchased) / memberTotalActivity) * 100)
                    : 0;

                  // תובנה כוללת לקבוצה - אחת מ-3 אפשרויות לפי הנתונים
                  let insight: { label: string; color: string; emoji: string } | null = null;
                  if (L.isGroup && sortedMembers.length > 1 && memberTotalActivity > 0) {
                    const topPct = ((sortedMembers[0].added + sortedMembers[0].purchased) / memberTotalActivity) * 100;
                    if (purchasedPct >= 70) {
                      insight = { label: 'קצב מעולה', color: '#22C55E', emoji: '⚡' };
                    } else if (topPct >= 55) {
                      insight = { label: `עיקר על ${sortedMembers[0].name}`, color: '#F59E0B', emoji: '👑' };
                    } else if (topPct <= 45) {
                      insight = { label: 'קבוצה מאוזנת', color: '#8B5CF6', emoji: '⚖️' };
                    }
                  }

                  const isExpanded = expandedLists.has(L.listId);
                  const shouldCollapse = sortedMembers.length > 4;
                  const membersToShow = shouldCollapse && !isExpanded ? sortedMembers.slice(0, 3) : sortedMembers;
                  const hiddenMembersCount = sortedMembers.length - membersToShow.length;

                  return (
                    <Box
                      key={L.listId}
                      role="button"
                      tabIndex={0}
                      onClick={() => { haptic('light'); navigate(`/list/${L.listId}`); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          haptic('light');
                          navigate(`/list/${L.listId}`);
                        }
                      }}
                      sx={{
                        p: 1.5, borderRadius: '14px', cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isDark ? `${L.listColor}28` : `${L.listColor}22`,
                        background: isDark
                          ? `linear-gradient(135deg, ${L.listColor}14, transparent 75%)`
                          : `linear-gradient(135deg, ${L.listColor}0A, transparent 75%)`,
                        animation: `${fadeIn} 0.35s ease ${idx * 0.06}s both`,
                        transition: 'opacity 0.1s, box-shadow 0.2s ease',
                        userSelect: 'none',
                        outline: 'none',
                        WebkitTapHighlightColor: 'transparent',
                        '&:hover': {
                          boxShadow: isDark ? `0 4px 16px ${L.listColor}25` : `0 4px 14px ${L.listColor}20`,
                        },
                        '&:active': { opacity: 0.85 },
                        '&:focus-visible': { boxShadow: `0 0 0 2px ${L.listColor}` },
                      }}
                    >
                      {/* Header: icon + name + members badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                          width: 46, height: 46, flexShrink: 0, borderRadius: '12px', fontSize: 22,
                          bgcolor: `${L.listColor}28`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1.5px solid', borderColor: `${L.listColor}45`,
                          boxShadow: `0 2px 8px ${L.listColor}20`,
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
                          ) : L.pendingCount > 0 ? (
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                              <b>{L.pendingCount}</b> פריטים ממתינים לקנייה
                            </Typography>
                          ) : (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.2 }}>
                              רשימה פעילה
                            </Typography>
                          )}
                        </Box>
                        {/* תובנת קבוצה - pill בצד, רק אם יש תובנה משמעותית */}
                        {insight && (
                          <Box sx={{
                            display: 'inline-flex', alignItems: 'center', gap: 0.3, flexShrink: 0,
                            px: 0.85, py: 0.35, borderRadius: '999px',
                            bgcolor: isDark ? `${insight.color}20` : `${insight.color}14`,
                            border: `1px solid ${insight.color}35`,
                          }}>
                            <Typography sx={{ fontSize: 11 }}>{insight.emoji}</Typography>
                            <Typography sx={{ fontSize: 10, fontWeight: 800, color: insight.color, whiteSpace: 'nowrap' }}>
                              {insight.label}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      {/* התרומה שלך - מוצג רק אם המשתמש הוא חבר בקבוצה ויש פעילות */}
                      {L.isGroup && myStats && memberTotalActivity > 0 && (
                        <Box sx={{
                          mt: 1.25, p: 1, borderRadius: '10px',
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          bgcolor: isDark ? `${L.listColor}14` : `${L.listColor}0C`,
                          border: '1px solid', borderColor: `${L.listColor}35`,
                        }}>
                          <Typography sx={{ fontSize: 16 }}>
                            {myRank === 1 ? '🏆' : myRank === 2 ? '⭐' : myRank === 3 ? '🔥' : '👤'}
                          </Typography>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, lineHeight: 1 }}>
                              התרומה שלך {myRank > 0 ? `· מקום ${myRank}` : ''}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: L.listColor, lineHeight: 1.3, mt: 0.2 }}>
                              הוספת <b>{myStats.added}</b> · קנית <b>{myStats.purchased}</b>
                            </Typography>
                          </Box>
                          <Box sx={{
                            minWidth: 44, textAlign: 'center',
                            px: 0.75, py: 0.35, borderRadius: '8px',
                            bgcolor: L.listColor,
                          }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                              {myPct}%
                            </Typography>
                          </Box>
                        </Box>
                      )}

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

                          {/* רשימת חברים עם מי/מה/כמה (מוגבלת ל-3 ראשונים אם יש מעל 4) */}
                          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {membersToShow.map((m, mi) => {
                              const color = memberPalette[mi % memberPalette.length];
                              const totalForMember = m.added + m.purchased;
                              const pct = memberTotalActivity > 0 ? Math.round((totalForMember / memberTotalActivity) * 100) : 0;
                              const initial = m.name.charAt(0).toUpperCase();
                              // יעילות: כמה מהמוצרים שהוסיף, הוא בעצמו סימן כנקנו
                              // מדליה ל-3 הראשונים
                              const medal = mi === 0 ? '🥇' : mi === 1 ? '🥈' : mi === 2 ? '🥉' : null;
                              // זיהוי המשתמש הנוכחי
                              const isMe = currentUserName && m.name === currentUserName;
                              return (
                                <Box key={mi} sx={{
                                  display: 'flex', alignItems: 'center', gap: 0.9,
                                  px: 0.6, py: 0.55, borderRadius: '8px',
                                  bgcolor: isDark ? `${color}12` : `${color}0A`,
                                  border: isMe ? `2px solid ${color}` : `1px solid ${isDark ? `${color}22` : `${color}18`}`,
                                  position: 'relative',
                                }}>
                                  {/* אווטאר-אות */}
                                  <Box sx={{
                                    width: 26, height: 26, flexShrink: 0, position: 'relative',
                                    borderRadius: '50%',
                                    bgcolor: color, color: 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 11, fontWeight: 800, boxShadow: `0 2px 6px ${color}50`,
                                  }}>
                                    {initial}
                                    {/* מדליה קטנה בפינה */}
                                    {medal && (
                                      <Box sx={{
                                        position: 'absolute', bottom: -4, right: -4,
                                        fontSize: 12, lineHeight: 1,
                                      }}>{medal}</Box>
                                    )}
                                  </Box>
                                  {/* שם + תג "אתה" */}
                                  <Box sx={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Typography sx={{
                                      fontSize: 12.5, fontWeight: 700,
                                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                    }}>{m.name}</Typography>
                                    {isMe && (
                                      <Box sx={{
                                        fontSize: 9, fontWeight: 800,
                                        px: 0.5, py: 0.1, borderRadius: '4px',
                                        bgcolor: color, color: 'white',
                                        letterSpacing: 0.3,
                                      }}>אתה</Box>
                                    )}
                                  </Box>
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
                          {/* כפתור הרחבה אם יש מעל 4 חברים */}
                          {shouldCollapse && (
                            <Box
                              component="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                haptic('light');
                                setExpandedLists(prev => {
                                  const next = new Set(prev);
                                  if (next.has(L.listId)) next.delete(L.listId);
                                  else next.add(L.listId);
                                  return next;
                                });
                              }}
                              sx={{
                                mt: 0.5, width: '100%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5,
                                px: 1, py: 0.6, borderRadius: '8px',
                                cursor: 'pointer', border: 'none', outline: 'none', font: 'inherit',
                                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                color: 'text.secondary',
                                transition: 'background 0.15s ease, opacity 0.1s',
                                '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                                '&:active': { opacity: 0.75 },
                              }}
                            >
                              <Typography sx={{ fontSize: 11.5, fontWeight: 700 }}>
                                {isExpanded ? 'הסתר' : `הצג עוד ${hiddenMembersCount} חברים`}
                              </Typography>
                              <Typography sx={{ fontSize: 10, transition: 'transform 0.2s ease', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                ▼
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}

                      {/* קבוצה עם חבר יחיד או בלי פעילות */}
                      {L.isGroup && (!sortedMembers.length || memberTotalActivity === 0) && (
                        <Box sx={{ mt: 1.25, py: 1.5, textAlign: 'center', borderRadius: '10px',
                          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                          border: '1px dashed',
                          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                        }}>
                          <Typography sx={{ fontSize: 18, mb: 0.25 }}>👥</Typography>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled', fontWeight: 600 }}>
                            אין עדיין פעילות של חברים
                          </Typography>
                        </Box>
                      )}

                    </Box>
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
        {tab === 'habits' && (() => {
          // כותרת אישית לטאב הרגלים — ממקד על המוצר הכי נפוץ
          const hero = topProducts[0];
          const heroText = hero
            ? <>הכוכב שלך: <b>{hero.name}</b> — קנית <b>×{hero.count}</b></>
            : <>טוב להכיר — עוד מעט תראה את הכוכב שלך</>;
          return (
          <>
            <HeroInsight icon="🛒" text={heroText} accent="#F59E0B" isDark={isDark} />
            {/* שורת סטטיסטיקת על */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
              <StatCard
                value={<AnimatedNumber value={stats.totalPurchased} />}
                label={'נקנו בסה"כ'}
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
                {/* Top 3 - פודיום עם גבהים שונים ואנימציה staggered */}
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, mb: topProducts.length > 3 ? 1.75 : 0 }}>
                  {[1, 0, 2].map(mapIdx => {
                    const p = topProducts[mapIdx];
                    if (!p) return <Box key={mapIdx} sx={{ flex: 1 }} />;
                    const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const categoryColor = CATEGORY_COLORS[p.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const categoryKey = CATEGORY_TRANSLATION_KEYS[p.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    const categoryLabel = categoryKey ? t(categoryKey) : p.category;
                    const medal = ['🥇', '🥈', '🥉'][mapIdx];
                    const pct = topProductsTotalCount > 0 ? Math.round((p.count / topProductsTotalCount) * 100) : 0;
                    // פודיום: ראשון גבוה יותר
                    const elevation = mapIdx === 0 ? 0 : mapIdx === 1 ? 8 : 14;
                    const accent = mapIdx === 0 ? '#FBBF24' : mapIdx === 1 ? '#A1A1AA' : '#D97706';
                    return (
                      <Box
                        key={mapIdx}
                        sx={{
                          flex: 1, textAlign: 'center', mt: `${elevation}px`,
                          p: 1.25, borderRadius: '12px',
                          bgcolor: isDark ? `${accent}10` : `${accent}08`,
                          border: '1px solid', borderColor: `${accent}30`,
                          borderBottom: `3px solid ${categoryColor}`,
                          cursor: 'default',
                          animation: `${fadeIn} 0.4s ease ${0.1 + mapIdx * 0.08}s both`,
                          transition: 'transform 0.15s ease',
                          '&:active': { transform: 'translateY(1px)' },
                        }}
                      >
                        <Typography sx={{ fontSize: 18, mb: 0.25 }}>{medal}</Typography>
                        <Typography sx={{ fontSize: 20, mb: 0.25 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.name}
                        </Typography>
                        {/* תווית קטגוריה */}
                        <Typography sx={{
                          fontSize: 9, color: categoryColor, fontWeight: 700, mt: 0.2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {categoryLabel}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 0.35, mt: 0.35 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 900, color: accent }}>×{p.count}</Typography>
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
          );
        })()}

        {/* ===== דופק ===== */}
        {tab === 'pulse' && (() => {
          // כותרת אישית לטאב דופק — ממקדת על הסטריק או התחזית
          const hasStreak = streaks && streaks.currentWeeks > 0;
          const hasPrediction = shoppingFrequency?.predictedNextDate;
          let heroIcon = '💪';
          let heroText: React.ReactNode = <>ממשיכים לעקוב אחרי ההתקדמות שלך</>;
          if (hasStreak) {
            heroIcon = '🔥';
            heroText = <>אתה <b>{streaks.currentWeeks} שבועות</b> ברצף — המשך כך!</>;
          } else if (hasPrediction) {
            const days = Math.max(0, Math.floor((new Date(shoppingFrequency.predictedNextDate!).getTime() - Date.now()) / 86_400_000));
            heroIcon = '🛒';
            heroText = days === 0
              ? <>הקנייה הבאה צפויה <b>היום</b></>
              : days === 1
              ? <>הקנייה הבאה צפויה <b>מחר</b></>
              : <>הקנייה הבאה צפויה <b>בעוד {days} ימים</b></>;
          }
          return (
          <>
            <HeroInsight icon={heroIcon} text={heroText} accent="#14B8A6" isDark={isDark} />
            {/* כרטיס ציון - לחיץ, מציג הסבר מפורט */}
            <Box
              role="button"
              tabIndex={0}
              onClick={() => { haptic('light'); setScoreExplained(v => !v); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  haptic('light');
                  setScoreExplained(v => !v);
                }
              }}
              sx={{
                p: 2, mb: 2, borderRadius: '16px', cursor: 'pointer',
                border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                bgcolor: 'background.paper',
                userSelect: 'none', outline: 'none',
                WebkitTapHighlightColor: 'transparent',
                transition: 'opacity 0.1s, box-shadow 0.2s ease',
                '&:hover': { boxShadow: isDark ? '0 4px 16px rgba(20,184,166,0.15)' : '0 4px 14px rgba(20,184,166,0.1)' },
                '&:active': { opacity: 0.9 },
                '&:focus-visible': { boxShadow: '0 0 0 2px #14B8A6' },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 800 }}>📈 ציון הקנייה שלך</Typography>
                <Typography sx={{
                  fontSize: 10, fontWeight: 700, color: 'text.disabled',
                  transition: 'transform 0.2s ease',
                  transform: scoreExplained ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>▼</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ position: 'relative', width: 92, height: 92, flexShrink: 0 }}>
                  <CircularProgress variant="determinate" value={100} size={92} thickness={4}
                    sx={{ color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', position: 'absolute' }} />
                  <CircularProgress variant="determinate" value={shoppingScore} size={92} thickness={4}
                    sx={{ color: '#14B8A6', position: 'absolute', '& .MuiCircularProgress-circle': { strokeLinecap: 'round', transition: 'stroke-dashoffset 1s ease' } }} />
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{scoreEmoji(shoppingScore)}</Typography>
                    <Typography sx={{ fontSize: 22, fontWeight: 900, color: 'text.primary', lineHeight: 1, mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
                      <AnimatedNumber value={shoppingScore} />
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                    {stats.completionRate}% השלמה
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}>
                    {scoreExplained ? 'לחץ כדי לסגור' : 'הציון מבוסס על פעילות שלך · לחץ להרחבה'}
                  </Typography>
                </Box>
              </Box>
              {scoreExplained && (
                <Box sx={{
                  mt: 1.5, pt: 1.5, borderTop: '1px dashed',
                  borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  animation: `${fadeIn} 0.2s ease both`,
                }}>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.7, mb: 1 }}>
                    הציון (0-100) מחושב מ-3 מדדים:
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#22C55E' }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                        <b>יחס השלמה</b> — כמה מהפריטים שנוספו באמת נקנו
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#F59E0B' }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                        <b>רצף שבועות</b> — האם אתה פעיל באופן קבוע
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#8B5CF6' }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                        <b>גיוון קטגוריות</b> — האם אתה קונה מגוון מוצרים
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

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

            {/* מגמה שבועית - בארים לחיצים */}
            {weeklyTrends && weeklyTrends.length > 0 && (
              <SectionCard title="📊 מגמה שבועית" isDark={isDark}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: 70, mb: 0.75 }}>
                  {weeklyTrends.map((w, i) => {
                    const isSelected = selectedWeekIdx === i;
                    const hasActivity = w.added + w.purchased > 0;
                    return (
                      <Box
                        key={i}
                        onClick={() => {
                          if (!hasActivity) return;
                          haptic('light');
                          setSelectedWeekIdx(prev => prev === i ? null : i);
                        }}
                        sx={{
                          flex: 1, display: 'flex', flexDirection: 'column', gap: '2px',
                          height: '100%', justifyContent: 'flex-end',
                          cursor: hasActivity ? 'pointer' : 'default',
                          borderRadius: '4px',
                          p: isSelected ? '3px 2px' : '3px 0',
                          bgcolor: isSelected ? (isDark ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.1)') : 'transparent',
                          transition: 'background 0.2s ease',
                          '&:active': hasActivity ? { opacity: 0.8 } : {},
                        }}
                      >
                        <Box sx={{
                          height: `${(w.purchased / maxWeeklyTrend) * 100}%`,
                          bgcolor: isSelected ? '#F59E0B' : '#22C55E',
                          borderRadius: '3px 3px 0 0', minHeight: w.purchased > 0 ? 3 : 0,
                          transition: 'background 0.2s ease',
                        }} />
                        <Box sx={{
                          height: `${((w.added - w.purchased) / maxWeeklyTrend) * 100}%`,
                          bgcolor: isSelected
                            ? (isDark ? 'rgba(245,158,11,0.5)' : 'rgba(245,158,11,0.4)')
                            : (isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)'),
                          borderRadius: '3px 3px 0 0', minHeight: w.added - w.purchased > 0 ? 2 : 0,
                          transition: 'background 0.2s ease',
                        }} />
                      </Box>
                    );
                  })}
                </Box>
                {/* תוויות שבועות */}
                <Box sx={{ display: 'flex', gap: '4px', mb: 0.75 }}>
                  {weeklyTrends.map((w, i) => (
                    <Typography key={i} sx={{
                      flex: 1, fontSize: 8.5, textAlign: 'center',
                      color: selectedWeekIdx === i ? '#F59E0B' : 'text.disabled',
                      fontWeight: selectedWeekIdx === i ? 800 : 600,
                    }}>
                      {w.week}
                    </Typography>
                  ))}
                </Box>
                {/* פרטי השבוע הנבחר */}
                {selectedWeekIdx !== null && weeklyTrends[selectedWeekIdx] && (
                  <Box sx={{
                    p: 1, borderRadius: '10px', mb: 0.75,
                    bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    animation: `${fadeIn} 0.2s ease both`,
                  }}>
                    <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                      שבוע <b>{weeklyTrends[selectedWeekIdx].week}</b>:
                      {' '}<b>{weeklyTrends[selectedWeekIdx].added}</b> נוספו ·
                      {' '}<b>{weeklyTrends[selectedWeekIdx].purchased}</b> נקנו
                    </Typography>
                  </Box>
                )}
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

            {/* heatmap ימים - לחיץ, מראה יום שיא + יום שנבחר */}
            {weekdayActivity && weekdayActivity.some(v => v > 0) && (
              <SectionCard title="📅 פעילות לפי ימים" isDark={isDark}>
                <Box sx={{ display: 'flex', gap: 0.75, justifyContent: 'space-between', mb: 1 }}>
                  {weekdayActivity.map((count, i) => {
                    const intensity = count / maxWeekday;
                    const isBest = i === bestDayIdx && count > 0;
                    const isSelected = selectedWeekday === i;
                    return (
                      <Box
                        key={i}
                        onClick={() => {
                          if (count === 0) return;
                          haptic('light');
                          setSelectedWeekday(prev => prev === i ? null : i);
                        }}
                        sx={{
                          flex: 1, textAlign: 'center',
                          cursor: count > 0 ? 'pointer' : 'default',
                          transition: 'transform 0.12s ease',
                          '&:active': count > 0 ? { transform: 'scale(0.93)' } : {},
                        }}
                      >
                        <Box sx={{
                          aspectRatio: '1 / 1', borderRadius: '10px',
                          bgcolor: count === 0
                            ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)')
                            : `rgba(20,184,166,${0.18 + intensity * 0.6})`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          mb: 0.5,
                          border: isSelected ? '2px solid #F59E0B' : isBest ? '1.5px solid #14B8A6' : '1.5px solid transparent',
                          boxShadow: isSelected ? '0 2px 12px rgba(245,158,11,0.45)' : isBest ? '0 2px 10px rgba(20,184,166,0.4)' : 'none',
                          transition: 'border 0.2s, box-shadow 0.2s',
                        }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 800, color: count > 0 ? 'white' : 'text.disabled' }}>
                            {count}
                          </Typography>
                        </Box>
                        <Typography sx={{
                          fontSize: 10, fontWeight: 700,
                          color: isSelected ? '#F59E0B' : isBest ? '#14B8A6' : 'text.secondary',
                        }}>
                          {dayLabels[i]}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
                {/* פרטי היום הנבחר */}
                {selectedWeekday !== null && weekdayActivity[selectedWeekday] > 0 && (
                  <Box sx={{
                    p: 1, borderRadius: '10px', mt: 0.5,
                    bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
                    border: '1px solid rgba(245,158,11,0.2)',
                    animation: `${fadeIn} 0.2s ease both`,
                  }}>
                    <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                      יום <b>{dayLabels[selectedWeekday]}</b>: <b>{weekdayActivity[selectedWeekday]}</b> פעולות — {Math.round((weekdayActivity[selectedWeekday] / maxWeekday) * 100)}% מיום השיא
                    </Typography>
                  </Box>
                )}
              </SectionCard>
            )}
          </>
          );
        })()}

      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
