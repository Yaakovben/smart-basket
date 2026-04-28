import { useState, useEffect, memo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, Tabs, Tab, LinearProgress, Button, Skeleton } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupIcon from '@mui/icons-material/Group';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, authApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, BetaRibbon, priceComparisonApi, useUserLocation, type PriceComparisonData } from '../../priceComparison';
import { InsightsLoader } from './InsightsLoader';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { haptic, safeStorage } from '../../../global/helpers';
import {
  float, fadeIn, tabEnter, dayLabels, scoreEmoji,
  AnimatedNumber, StatCard, SectionCard, HeroInsight, InsightsEmptyState,
} from './insightsShared';

type InsightTab = 'price' | 'lists' | 'habits' | 'pulse';

// Cache מקומי - מאפשר הצגה מיידית של תובנות בזמן שהשרת מחשב.
// תוקף: 24 שעות (הנתונים לא משתנים הרבה בין פתיחות).
const INSIGHTS_CACHE_KEY = 'sb_insights_cache_v1';
const PRICE_CACHE_KEY = 'sb_price_cache_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
interface CachedEnvelope<T> { data: T; at: number }
const readCache = <T,>(key: string): T | null => {
  const c = safeStorage.getJSON<CachedEnvelope<T> | null>(key, null);
  if (!c || typeof c !== 'object' || !c.at) return null;
  if (Date.now() - c.at > CACHE_TTL_MS) return null;
  return c.data;
};
const writeCache = <T,>(key: string, data: T): void => {
  safeStorage.setJSON(key, { data, at: Date.now() });
};

export const InsightsPage = memo(() => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';
  // מאתחלים מה-cache המקומי - הדף נראה מלא מיד, והרענון רץ ברקע.
  const [data, setData] = useState<InsightsData | null>(() => readCache<InsightsData>(INSIGHTS_CACHE_KEY));
  const [priceData, setPriceData] = useState<PriceComparisonData | null>(() => readCache<PriceComparisonData>(PRICE_CACHE_KEY));
  // loading ראשוני רק אם אין cache - כך אין מסך ריק בפתיחות חוזרות.
  const [loading, setLoading] = useState(() => readCache<InsightsData>(INSIGHTS_CACHE_KEY) === null);
  const [error, setError] = useState(false);
  // הטאב נשמר ב-URL (?tab=lists) כדי ש"חזור" מדף הרשימה יחזיר אותנו לטאב הנכון.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');
  const validTabs: InsightTab[] = ['price', 'lists', 'habits', 'pulse'];
  const tab: InsightTab = validTabs.includes(tabFromUrl as InsightTab) ? (tabFromUrl as InsightTab) : 'price';
  const setTab = (v: InsightTab) => {
    if (v !== tab) haptic('light'); // פידבק מישוש בכל שינוי טאב - תחושה מעודנת
    // replace (ולא push) - מעבר טאבים לא יוצר היסטוריה מצטברת
    setSearchParams(v === 'price' ? {} : { tab: v }, { replace: true });
  };
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
  // loading של מחירים - לא מראה לודר כשיש cache, רק בדיקה רקעית.
  const [priceLoading, setPriceLoading] = useState(() => readCache<PriceComparisonData>(PRICE_CACHE_KEY) === null);
  // שגיאת טעינה של השוואת מחירים - מוצגת במקום "אין נתונים" שמטעה
  const [priceError, setPriceError] = useState(false);
  // רשימה ספציפית נבחרת - null = כל הרשימות. נשמר בנפרד כדי שבורר הרשימות
  // יישאר זמין גם כשהתוצאה מצומצמת לרשימה אחת.
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  // רשימה מלאה של כל הרשימות של המשתמש - נשמר מהטעינה הראשונית.
  const [allUserLists, setAllUserLists] = useState<{ id: string; name: string; icon: string }[]>([]);
  // קטגוריה מודגשת בטאב הרגלים - מוגדרת בלחיצה על מוצר מוביל, מסמנת
  // חיבור ויזואלי בין סקציית המוצרים לסקציית הקטגוריות.
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);
  // "עכשיו" מחושב פעם אחת בטעינה - טקסט "לפני Xי'" לא חייב להתעדכן בזמן
  // אמת, והשארת Date.now ברנדר מפרה טהרת רנדר (React Compiler).
  const [now] = useState(() => Date.now());

  // מיקום המשתמש (אופציונלי) - כשהוא קיים, השרת מצרף סניף קרוב + מרחק לכל רשת.
  const { location: userLocation, status: locationStatus, requestLocation, resetDenied: resetLocationDenied } = useUserLocation();

  // Safety-net: אם בפתיחת העמוד ה-body במצב scroll-lock (נשאר מפופאפ קודם שלא ניקה), משחררים.
  // זה מונע מצב שהמשתמש נכנס לטאב המחירים ולא יכול לגלול בכלל.
  useEffect(() => {
    if (document.body.style.position === 'fixed') {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    }
  }, []);

  // רענון insights ברקע - תמיד רץ, מעדכן cache מקומי לפעם הבאה.
  useEffect(() => {
    insightsApi.getInsights()
      .then(res => { setData(res); writeCache(INSIGHTS_CACHE_KEY, res); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // שליפת שם המשתמש - לא חוסם שום דבר, נכשל בשקט
    authApi.getProfile().then(u => setCurrentUserName(u?.name ?? null)).catch(() => {});
  }, []);

  // טעינה/רענון של השוואת מחירים - רץ כשהטאב 'price', selectedListId או userLocation משתנים.
  // ה-cache המקומי מראה נתונים מיד; הבקשה הזו מרעננת ברקע.
  useEffect(() => {
    if (tab !== 'price') return;
    // השהיה של 300ms - מעבר מהיר בין רשימות/שינויי מיקום לא יפוצצו את השרת בפניות חופפות.
    // הניקוי בתחילת הטיימר מבטל בקשה קודמת אם הערך השתנה.
    const timer = window.setTimeout(() => {
      setPriceLoading(true);
      setPriceError(false);
      priceComparisonApi.getComparison(selectedListId ?? undefined, userLocation ?? undefined)
        .then(res => {
          setPriceData(res);
          writeCache(PRICE_CACHE_KEY, res);
          // מעדכנים את allUserLists רק כשאין listId ספציפי - ככה כל רשימות המשתמש
          // נשמרות כששמים סינון ולא מוחלפות בתוצאה המצומצמת של רשימה אחת.
          if (selectedListId === null && res?.lists && res.lists.length > 0) {
            setAllUserLists(res.lists.map(l => ({ id: l.listId, name: l.listName, icon: l.listIcon })));
          }
        })
        .catch(() => { setPriceError(true); })
        .finally(() => setPriceLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [tab, selectedListId, userLocation]);

  if (loading) return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* הדר: באנר עליון עם כותרת וטאבים - שלד שזהה למבנה האמיתי */}
      <Box sx={{
        background: 'linear-gradient(135deg, #14B8A6, #10B981)',
        p: '48px 16px 16px',
        borderRadius: '0 0 24px 24px',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Skeleton variant="circular" width={40} height={40} sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
          <Skeleton variant="rounded" width={140} height={26} sx={{ bgcolor: 'rgba(255,255,255,0.2)', borderRadius: '8px' }} />
          <Box sx={{ width: 40 }} />
        </Box>
        <Box sx={{ display: 'flex', gap: 0.75, bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '12px', p: 0.5 }}>
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} variant="rounded" width="25%" height={34} sx={{ bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '8px' }} />
          ))}
        </Box>
      </Box>
      {/* תוכן: כרטיסי השוואת מחירים - שלד */}
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        <Skeleton variant="rounded" height={48} sx={{ borderRadius: '12px' }} />
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: '14px' }} />
        ))}
      </Box>
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
    upcomingNeeds, anomalies, categoryCycles, hourlyActivity,
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
    const diff = now - new Date(iso).getTime();
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
      {/* ===== הדר גרדיאנט קומפקטי + ריבון BETA אלכסוני ===== */}
      <Box sx={{
        // הדר בצבעי האפליקציה - טורקיז במקום סגול, אחיד עם שאר המסכים
        background: isDark ? 'linear-gradient(160deg, #134E4A, #0F766E, #0D9488)' : 'linear-gradient(160deg, #0D9488, #14B8A6, #5EEAD4)',
        // Padding-top הוקטן (50px במקום 70px) - חוסך 20px לתוכן.
        p: { xs: 'max(50px, env(safe-area-inset-top) + 20px) 16px 16px', sm: '54px 20px 18px' },
        borderRadius: '0 0 24px 24px',
        position: 'relative', overflow: 'hidden',
        mb: 1.5,
      }}>
        {/* ריבון BETA בגודל lg - קטן יותר מ-xl, פחות דומיננטי בכותרת */}
        <BetaRibbon corner="top-left" offsetTop={2} size="lg" />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <IconButton onClick={() => navigate(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', width: 36, height: 36 }}>
            <ArrowForwardIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Box sx={{ flex: 1, textAlign: 'center' }}>
            {/* פונט הוקטן 22 → 18, סבטייטל הוסר - מיותר בכל טעינה */}
            <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'white', letterSpacing: -0.3 }}>
              💡 {t('insights')}
            </Typography>
          </Box>
          <Box sx={{ width: 36, flexShrink: 0 }} />
        </Box>
      </Box>

      {/* ===== טאבים ===== */}
      <Box sx={{ px: 2, mb: 2 }}>
        <Paper elevation={0} sx={{
          borderRadius: '999px', p: 0.4,
          border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
          bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          backdropFilter: 'blur(8px)',
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
                transition: 'all 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
                // אפקט עידוד עדין כשמרחפים מעל טאב לא פעיל
                '&:hover:not(.Mui-selected)': {
                  color: 'text.primary',
                  bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                },
                '&:active:not(.Mui-selected)': { transform: 'scale(0.96)' },
                '&.Mui-selected': {
                  color: 'white',
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                  boxShadow: '0 3px 10px rgba(20,184,166,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
                  transform: 'translateY(-0.5px)',
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

      {/* ===== Hero card - תובנת היום, ניסוח חיובי וברור ===== */}
      {(() => {
        type Insight = { emoji: string; title: string; subtitle?: string; gradient: string };
        let insight: Insight | null = null;
        // טאב מחירים: כרטיס Hero של PriceComparisonCard כבר מציג 'הזול ב-X' באופן בולט -
        // אין צורך בכרטיס "תובנת היום" נוסף שיציג אותו דבר. מדלגים כדי למנוע כפילות.
        if (tab === 'price') {
          insight = null;
        } else if (tab === 'lists' && groupStats?.[0]) {
          const top = groupStats[0];
          insight = {
            emoji: '📋',
            title: `${top.name} — הכי פעילה`,
            subtitle: top.topContributor ? `${top.topContributor.name} מוסיף הכי הרבה` : `${top.membersCount} חברים`,
            gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
          };
        } else if (tab === 'habits' && topProducts?.[0]) {
          const top = topProducts[0];
          insight = {
            emoji: '🏆',
            title: `${top.name} — מוצר השבוע`,
            subtitle: `הוספתם ${top.count} פעמים`,
            gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
          };
        } else if (tab === 'pulse' && shoppingScore !== undefined) {
          const label = shoppingScore >= 80 ? 'אלוף!' : shoppingScore >= 60 ? 'בדרך הנכונה' : shoppingScore >= 40 ? 'מתפתחים' : 'יש לאן לצמוח';
          insight = {
            emoji: shoppingScore >= 80 ? '🎯' : shoppingScore >= 60 ? '📈' : '🌱',
            title: `${shoppingScore}/100`,
            subtitle: label,
            gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)',
          };
        }
        if (!insight) return null;
        return (
          <Box sx={{ px: 2, mb: 1.5 }} key={`insight-${tab}`}>
            <Box sx={{
              p: 2.25, borderRadius: '20px',
              background: insight.gradient,
              boxShadow: '0 10px 30px rgba(0,0,0,0.22)',
              color: 'white',
              display: 'flex', alignItems: 'center', gap: 1.75,
              animation: `${fadeIn} 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both`,
              position: 'relative', overflow: 'hidden',
              minHeight: 84,
              // עומק רב-שכבתי - 2 גרדיאנטים רדיאליים, נותן תחושת קלף יוקרתי
              '&::before': {
                content: '""', position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.22), transparent 55%), radial-gradient(circle at bottom left, rgba(0,0,0,0.15), transparent 50%)',
                pointerEvents: 'none',
              },
              // ברק עליון עדין
              '&::after': {
                content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '50%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent)',
                pointerEvents: 'none',
              },
            }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: '16px',
                bgcolor: 'rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 30, flexShrink: 0,
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.12)',
                position: 'relative', zIndex: 1,
              }}>
                {insight.emoji}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0, position: 'relative', zIndex: 1 }}>
                <Typography sx={{ fontSize: 19, fontWeight: 900, lineHeight: 1.2, letterSpacing: '-0.02em' }}>
                  {insight.title}
                </Typography>
                {insight.subtitle && (
                  <Typography sx={{ fontSize: 12.5, opacity: 0.92, mt: 0.5, fontWeight: 500 }}>
                    {insight.subtitle}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        );
      })()}

      {/* ===== תוכן לפי טאב ===== */}
      <Box sx={{ px: 2, animation: `${tabEnter} 0.32s cubic-bezier(0.25, 0.8, 0.25, 1) both` }} key={tab}>

        {/* ===== מחירים ===== */}
        {tab === 'price' && (
          !priceData ? (
            // אין cache - מצב ראשוני. מציגים לודר/שגיאה/ריק בהתאם.
            priceError ? (
              <Box sx={{ textAlign: 'center', py: 6, px: 3 }}>
                <Box sx={{ fontSize: 48, mb: 1.5 }}>⚠️</Box>
                <Typography sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>שגיאה בטעינת נתוני מחירים</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>בדוק חיבור לאינטרנט ונסה שוב</Typography>
                <Button
                  variant="contained"
                  onClick={() => {
                    setPriceError(false);
                    setPriceLoading(true);
                    priceComparisonApi.getComparison(selectedListId ?? undefined, userLocation ?? undefined)
                      .then(res => { setPriceData(res); writeCache(PRICE_CACHE_KEY, res); })
                      .catch(() => setPriceError(true))
                      .finally(() => setPriceLoading(false));
                  }}
                  sx={{ borderRadius: '12px', px: 3, py: 1, textTransform: 'none', fontWeight: 700 }}
                >
                  נסה שוב
                </Button>
              </Box>
            ) : priceLoading ? (
              // שלד בצורת כרטיסי השוואת מחירים - תחושה שהמסך כבר שם
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                <Skeleton variant="rounded" height={48} sx={{ borderRadius: '12px' }} />
                {[1, 2, 3, 4].map(i => (
                  <Skeleton key={i} variant="rounded" height={72} sx={{ borderRadius: '14px' }} />
                ))}
              </Box>
            ) : (
              <InsightsLoader text="אין נתוני מחירים כרגע" size="md" />
            )
          ) : (
            <>
              {/* בורר רשימה - מוצג רק אם יש 2+ רשימות */}
              {allUserLists.length > 1 && (
                <Box sx={{ mb: 1.25 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.75, px: 0.5 }}>
                    איזו רשימה להשוות?
                  </Typography>
                  <Box sx={{
                    display: 'flex', flexWrap: 'nowrap', gap: 0.75,
                    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
                    pb: 0.5,
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}>
                    {/* כרטיס "כל הרשימות" */}
                    <Box
                      onClick={() => { haptic('light'); setSelectedListId(null); }}
                      sx={{
                        flexShrink: 0,
                        px: 1.5, py: 0.75,
                        borderRadius: '999px',
                        border: '1.5px solid',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        bgcolor: selectedListId === null
                          ? '#14B8A6'
                          : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,184,166,0.04)'),
                        color: selectedListId === null ? 'white' : 'text.primary',
                        borderColor: selectedListId === null
                          ? '#14B8A6'
                          : (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.2)'),
                        fontSize: 12, fontWeight: 700,
                        transition: 'all 0.15s',
                        '&:active': { transform: 'scale(0.96)' },
                      }}
                    >
                      🛒 כל הרשימות
                    </Box>
                    {allUserLists.map(l => (
                      <Box
                        key={l.id}
                        onClick={() => { haptic('light'); setSelectedListId(l.id); }}
                        sx={{
                          flexShrink: 0,
                          px: 1.5, py: 0.75,
                          borderRadius: '999px',
                          border: '1.5px solid',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 0.5,
                          bgcolor: selectedListId === l.id
                            ? '#14B8A6'
                            : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(20,184,166,0.04)'),
                          color: selectedListId === l.id ? 'white' : 'text.primary',
                          borderColor: selectedListId === l.id
                            ? '#14B8A6'
                            : (isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.2)'),
                          fontSize: 12, fontWeight: 700,
                          transition: 'all 0.15s',
                          maxWidth: 180,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          '&:active': { transform: 'scale(0.96)' },
                        }}
                      >
                        <span>{l.icon}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
              {/* אינדיקטור רענון דיסקרטי - מוצג רק כשיש נתונים וגם רענון רקע בפעולה */}
              {priceLoading && (
                <Box sx={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
                  py: 0.75, mb: 1, borderRadius: '10px',
                  bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.2)',
                }}>
                  <CircularProgress size={12} sx={{ color: '#14B8A6' }} />
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#0D9488' }}>
                    מעדכן נתונים...
                  </Typography>
                </Box>
              )}
              {/* שגיאה עם cache קיים - באנר אזהרה לא-חוסם */}
              {priceError && !priceLoading && (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  px: 1.5, py: 0.85, mb: 1, borderRadius: '10px',
                  bgcolor: '#F59E0B15', border: '1px solid #F59E0B40',
                }}>
                  <Box sx={{ fontSize: 14 }}>⚠️</Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 600, color: '#B45309', flex: 1 }}>
                    לא התקבלו נתונים חדשים - מוצגים נתונים מה-cache
                  </Typography>
                </Box>
              )}
              <PriceComparisonCard
                data={priceData}
                isDark={isDark}
                locationStatus={locationStatus}
                onRequestLocation={requestLocation}
                onResetLocationDenied={resetLocationDenied}
              />
            </>
          )
        )}

        {/* ===== רשימות ===== */}
        {tab === 'lists' && (() => {
          // פלטת צבעים קבועה לחברי קבוצה
          // חברי קבוצה - טורקיז ראשון (תואם לאפליקציה), שאר הצבעים לבידול בלבד
          const memberPalette = ['#14B8A6', '#0D9488', '#3B82F6', '#22C55E', '#A16207', '#EC4899', '#EF4444'];
          // מקור האמת: priceData.lists (כל הרשימות הפעילות עם מטא-דאטה), עם fallback ל-groupStats.
          const listsToShow = priceData?.lists && priceData.lists.length > 0 ? priceData.lists : null;
          const hasAnything = (listsToShow && listsToShow.length > 0) || groupStats.length > 0;
          // חברים ייחודיים בכל הקבוצות — "חברים פעילים"
          const uniqueMembers = new Set<string>();
          groupStats.forEach(g => g.memberBreakdown.forEach(m => uniqueMembers.add(m.name)));

          if (!hasAnything) return (
            <InsightsEmptyState
              isDark={isDark}
              accent="#14B8A6"
              mainEmoji="📋"
              floatingItems={['📝', '✨', '✅', '🎯']}
              title="אין רשימות פעילות"
              description="צור רשימה ראשונה ותתחיל להוסיף מוצרים. כאן תראה את הפעילות בכל הרשימות, חלוקת חברים בקבוצות, וסטטיסטיקות מלאות."
            />
          );

          // כותרת אישית — מנוסחת אנושית, לא רשימת מספרים
          const groupsCount = groupStats.length;
          const heroText = groupsCount > 0
            ? <><b>{stats.totalLists}</b> רשימות · <b>{stats.totalProducts}</b> פריטים · פעיל ב-<b>{groupsCount}</b> {groupsCount === 1 ? 'קבוצה' : 'קבוצות'}</>
            : <>יש לך <b>{stats.totalLists}</b> רשימות עם <b>{stats.totalProducts}</b> פריטים</>;

          // מציאת המוסיף החזק ביותר בכל הקבוצות יחד - ייחודי לטאב רשימות
          const allMembers = groupStats.flatMap(g => g.memberBreakdown.map(m => ({ ...m, group: g.name })));
          const topContributor = allMembers.length > 0
            ? allMembers.reduce((best, m) => m.added > best.added ? m : best, allMembers[0])
            : null;

          return (
            <>
              <HeroInsight icon="👋" text={heroText} accent="#14B8A6" isDark={isDark} />

              {/* כרטיס "שיא תרומה" - ייחודי לטאב רשימות, מדגיש את הזווית הקבוצתית/חברתית */}
              {topContributor && topContributor.added > 0 && (
                <Box sx={{
                  mb: 1.75, p: 1.5, borderRadius: '14px',
                  background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                  color: 'white',
                  display: 'flex', alignItems: 'center', gap: 1.25,
                  boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                  animation: `${fadeIn} 0.45s ease 0.1s both`,
                }}>
                  <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🏆</Typography>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4 }}>
                      שיא תרומה
                    </Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1.2, mt: 0.15 }}>
                      {topContributor.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
                      הוסיף <b>{topContributor.added}</b> פריטים · {topContributor.group}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* שורת סטטיסטיקה ממוקדת-פעילות - פלטה אחידה בצבע האפליקציה */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
                <StatCard
                  value={<AnimatedNumber value={stats.totalLists} />}
                  label="רשימות"
                  color="#14B8A6"
                  bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                  border="rgba(20,184,166,0.15)"
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
                  color="#14B8A6"
                  bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                  border="rgba(20,184,166,0.15)"
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
                      insight = { label: 'קצב מעולה', color: '#14B8A6', emoji: '⚡' };
                    } else if (topPct >= 55) {
                      insight = { label: `עיקר על ${sortedMembers[0].name}`, color: '#0D9488', emoji: '👑' };
                    } else if (topPct <= 45) {
                      insight = { label: 'קבוצה מאוזנת', color: '#14B8A6', emoji: '⚖️' };
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
                                bgcolor: 'rgba(20,184,166,0.14)',
                                border: '1px solid rgba(20,184,166,0.3)',
                              }}>
                                <GroupIcon sx={{ fontSize: 12, color: '#14B8A6' }} />
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#14B8A6' }}>
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

                      {/* השוואה מול ממוצע החברים - מוצג רק כשיש 2+ חברים פעילים אחרים. */}
                      {L.isGroup && g?.userContribution && sortedMembers.length >= 3 && (
                        (() => {
                          const uc = g.userContribution!;
                          const pct = uc.vsAvgAddedPct;
                          // צבע ותווית: <80=מתחת, 80-120=בערך ממוצע, >120=מעל
                          const above = pct > 120;
                          const below = pct < 80;
                          const tone = above ? '#10B981' : below ? '#F59E0B' : '#6B7280';
                          const verdict = above ? `+${pct - 100}% מעל הממוצע` : below ? `${pct - 100}% מתחת לממוצע` : 'בערך כמו הממוצע';
                          const emoji = above ? '🚀' : below ? '🌱' : '⚖️';
                          return (
                            <Box sx={{
                              mt: 0.75, px: 1, py: 0.55, borderRadius: '8px',
                              display: 'flex', alignItems: 'center', gap: 0.65,
                              bgcolor: isDark ? `${tone}18` : `${tone}12`,
                              border: '1px solid', borderColor: `${tone}40`,
                            }}>
                              <Typography sx={{ fontSize: 13, lineHeight: 1 }}>{emoji}</Typography>
                              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: tone, lineHeight: 1.3, flex: 1 }}>
                                {verdict} בהוספות
                              </Typography>
                              {pct < 999 && (
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: tone, fontVariantNumeric: 'tabular-nums' }}>
                                  {pct}%
                                </Typography>
                              )}
                            </Box>
                          );
                        })()
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
          // אין עדיין נתוני קניות - מסך ריק ברור במקום כרטיסי "0"
          const hasAnyActivity = stats.totalPurchased > 0 || topProducts.length > 0 || categoryBreakdown.length > 0;
          if (!hasAnyActivity) {
            return (
              <InsightsEmptyState
                isDark={isDark}
                accent="#14B8A6"
                mainEmoji="🛍️"
                floatingItems={['🥕', '🍞', '🥛', '🍎']}
                title="עוד לא סימנת מוצרים כנקנו"
                description="סמן ✅ על מוצרים שקנית, וכאן יופיעו הרגלי הקנייה שלך - מוצרים חוזרים, ימי שיא, קטגוריות מועדפות וכל מה שמספר עליך."
              />
            );
          }

          return (
          <>
            {/* HeroInsight 'הכוכב שלך' הוסר - כפילות עם כרטיס 'תובנת היום' הגלובלי שכבר מציג מוצר השבוע */}
            {/* שורת סטטיסטיקת על */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
              <StatCard
                value={<AnimatedNumber value={stats.totalPurchased} />}
                label={'נקנו בסה"כ'}
                color="#14B8A6"
                bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                border="rgba(20,184,166,0.15)"
              />
              <StatCard
                value={topCategoryLabel ? <Typography component="span" sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary' }}>{topCategoryLabel}</Typography> : '—'}
                label={topCategory ? `קטגוריה מובילה · ${topCategory.percentage}%` : 'קטגוריה מובילה'}
                color="#14B8A6"
                bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                border="rgba(20,184,166,0.15)"
              />
              <StatCard
                value={bestDayLabel}
                label={`יום שיא${maxWeekday > 0 ? ` · ${maxWeekday} פעולות` : ''}`}
                color="#14B8A6"
                bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
                border="rgba(20,184,166,0.15)"
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
                    const isHighlighted = highlightedCategory === p.category;
                    return (
                      <Box
                        key={mapIdx}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          haptic('light');
                          setHighlightedCategory(prev => prev === p.category ? null : p.category);
                        }}
                        sx={{
                          flex: 1, textAlign: 'center', mt: `${elevation}px`,
                          p: 1.25, borderRadius: '12px',
                          bgcolor: isDark ? `${accent}10` : `${accent}08`,
                          border: '1px solid', borderColor: isHighlighted ? categoryColor : `${accent}30`,
                          borderBottom: `3px solid ${categoryColor}`,
                          cursor: 'pointer',
                          outline: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          userSelect: 'none',
                          boxShadow: isHighlighted ? `0 3px 14px ${categoryColor}55` : 'none',
                          animation: `${fadeIn} 0.4s ease ${0.1 + mapIdx * 0.08}s both`,
                          transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                          '&:active': { transform: 'translateY(1px)' },
                          '&:focus-visible': { boxShadow: `0 0 0 2px ${categoryColor}` },
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
                {/* רשימה קומפקטית - לחיצה על שורה מדגישה, וקליק על מוצר למעלה מדגיש את הקטגוריה המתאימה */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                  {categoryBreakdown.slice(0, 8).map(cat => {
                    const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    const isActive = highlightedCategory === cat.category;
                    return (
                      <Box
                        key={cat.category}
                        onClick={() => {
                          haptic('light');
                          setHighlightedCategory(prev => prev === cat.category ? null : cat.category);
                        }}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 0.75,
                          px: 0.75, py: 0.55, borderRadius: '8px',
                          cursor: 'pointer',
                          bgcolor: isActive ? `${color}14` : 'transparent',
                          border: '1px solid',
                          borderColor: isActive ? `${color}40` : 'transparent',
                          transition: 'background 0.2s, border-color 0.2s',
                          '&:active': { opacity: 0.8 },
                        }}
                      >
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 13 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 12.5, fontWeight: isActive ? 800 : 600, flex: 1 }}>
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

            {/* מחזורי קנייה - איזה קטגוריה כל כמה ימים. מוצג רק עם 2+ קטגוריות שיש להן מחזור משמעותי. */}
            {categoryCycles && categoryCycles.length >= 2 && (
              <SectionCard title="🔄 מחזורי הקנייה שלך" isDark={isDark}>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.25, lineHeight: 1.5 }}>
                  כל כמה ימים אתה קונה כל קטגוריה (מבוסס על ההיסטוריה שלך)
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  {categoryCycles.slice(0, 6).map((c) => {
                    const transKey = CATEGORY_TRANSLATION_KEYS[c.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    const label = transKey ? t(transKey) : c.category;
                    const icon = CATEGORY_ICONS[c.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const catColor = CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    // bar width: יחס למחזור הארוך ביותר (עד 30 יום מקסימום ל-scaling)
                    const maxCycle = Math.max(...categoryCycles.map(x => x.avgDays), 30);
                    const barWidth = Math.min(100, (c.avgDays / maxCycle) * 100);
                    return (
                      <Box key={c.category} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
                        <Box sx={{
                          width: 28, height: 28, borderRadius: '8px',
                          bgcolor: `${catColor}1a`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 15, flexShrink: 0,
                        }}>
                          {icon}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.4 }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.primary' }}>{label}</Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: catColor, fontVariantNumeric: 'tabular-nums' }}>
                              כל {c.avgDays} {c.avgDays === 1 ? 'יום' : 'ימים'}
                            </Typography>
                          </Box>
                          <Box sx={{
                            height: 5, borderRadius: '3px',
                            bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                            overflow: 'hidden',
                          }}>
                            <Box sx={{
                              height: '100%', width: `${barWidth}%`,
                              background: `linear-gradient(90deg, ${catColor}, ${catColor}aa)`,
                              borderRadius: '3px',
                              transition: 'width 0.6s ease',
                            }} />
                          </Box>
                        </Box>
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
          // אין עדיין מספיק נתונים - מסך ריק
          const hasAnyPulseData = shoppingScore > 0 || stats.totalProducts > 0 || (streaks && streaks.currentWeeks > 0);
          if (!hasAnyPulseData) {
            return (
              <InsightsEmptyState
                isDark={isDark}
                accent="#14B8A6"
                mainEmoji="📊"
                floatingItems={['🔥', '⭐', '🎯', '📈']}
                title="עוד אין נתוני פעילות"
                description="הוסף מוצרים לרשימות וסמן כנקנו - כאן יופיעו ציון הקנייה שלך, רצף שבועות פעילים, תחזית הקנייה הבאה, גרפי מגמות ועוד."
              />
            );
          }

          // כותרת אישית לטאב דופק — ממקדת על הסטריק או התחזית
          const hasStreak = streaks && streaks.currentWeeks > 0;
          const hasPrediction = shoppingFrequency?.predictedNextDate;
          let heroIcon = '💪';
          let heroText: React.ReactNode = <>ממשיכים לעקוב אחרי ההתקדמות שלך</>;
          if (hasStreak) {
            heroIcon = '🔥';
            heroText = <>אתה <b>{streaks.currentWeeks} שבועות</b> ברצף — המשך כך!</>;
          } else if (hasPrediction) {
            const days = Math.max(0, Math.floor((new Date(shoppingFrequency.predictedNextDate!).getTime() - now) / 86_400_000));
            heroIcon = '🛒';
            heroText = days === 0
              ? <>הקנייה הבאה צפויה <b>היום</b></>
              : days === 1
              ? <>הקנייה הבאה צפויה <b>מחר</b></>
              : <>הקנייה הבאה צפויה <b>בעוד {days} ימים</b></>;
          }
          // מומנטום שבועי - ייחודי לטאב דופק. מציג שינוי לעומת השבוע הקודם.
          const wt = weeklyTrends || [];
          const lastWeek = wt[wt.length - 1];
          const prevWeek = wt[wt.length - 2];
          const hasMomentumData = lastWeek && prevWeek;
          const purchasedDelta = hasMomentumData ? lastWeek.purchased - prevWeek.purchased : 0;
          const momentumPct = hasMomentumData && prevWeek.purchased > 0
            ? Math.round((purchasedDelta / prevWeek.purchased) * 100)
            : null;
          const momentumUp = purchasedDelta > 0;
          const momentumDown = purchasedDelta < 0;

          return (
          <>
            <HeroInsight icon={heroIcon} text={heroText} accent="#14B8A6" isDark={isDark} />

            {/* כרטיס "מומנטום שבועי" - ייחודי לטאב דופק. השוואה לשבוע שעבר */}
            {hasMomentumData && (lastWeek.purchased > 0 || prevWeek.purchased > 0) && (
              <Box sx={{
                mb: 1.75, p: 1.5, borderRadius: '14px',
                background: momentumUp
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : momentumDown
                  ? 'linear-gradient(135deg, #6366F1, #4F46E5)'
                  : 'linear-gradient(135deg, #14B8A6, #0D9488)',
                color: 'white',
                display: 'flex', alignItems: 'center', gap: 1.25,
                boxShadow: `0 4px 14px ${momentumUp ? 'rgba(16,185,129,0.32)' : 'rgba(79,70,229,0.3)'}`,
                animation: `${fadeIn} 0.45s ease 0.1s both`,
              }}>
                <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>
                  {momentumUp ? '📈' : momentumDown ? '📉' : '⚖️'}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4 }}>
                    מומנטום השבוע
                  </Typography>
                  <Typography sx={{ fontSize: 19, fontWeight: 900, lineHeight: 1.1, mt: 0.15, fontVariantNumeric: 'tabular-nums' }}>
                    {lastWeek.purchased} פריטים{' '}
                    {momentumPct !== null && (
                      <Typography component="span" sx={{ fontSize: 13, fontWeight: 800, opacity: 0.95 }}>
                        ({momentumUp ? '+' : ''}{momentumPct}%)
                      </Typography>
                    )}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
                    {momentumUp
                      ? `עלייה של ${purchasedDelta} מהשבוע הקודם`
                      : momentumDown
                      ? `ירידה של ${Math.abs(purchasedDelta)} מהשבוע הקודם`
                      : 'יציבות מול השבוע הקודם'}
                  </Typography>
                </Box>
              </Box>
            )}

            {/* קלף "צפויות עכשיו" - קטגוריות שצפויות לפי מחזור הקנייה. */}
            {upcomingNeeds && upcomingNeeds.length > 0 && (
              <Box sx={{
                p: 1.75, mb: 2, borderRadius: '16px',
                background: isDark
                  ? 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(20,184,166,0.05))'
                  : 'linear-gradient(135deg, rgba(245,158,11,0.07), rgba(20,184,166,0.04))',
                border: '1px solid',
                borderColor: isDark ? 'rgba(245,158,11,0.25)' : 'rgba(245,158,11,0.2)',
                animation: `${fadeIn} 0.5s ease 0.1s both`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.25 }}>
                  <Typography sx={{ fontSize: 18 }}>🔮</Typography>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'text.primary' }}>
                    צפוי בקרוב לפי המחזור שלך
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                  {upcomingNeeds.map((u) => {
                    const transKey = CATEGORY_TRANSLATION_KEYS[u.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                    const label = transKey ? t(transKey) : u.category;
                    const icon = CATEGORY_ICONS[u.category as keyof typeof CATEGORY_ICONS] || '📦';
                    const overdueText = u.daysOverdue >= 1
                      ? `איחור של ${u.daysOverdue} ימים`
                      : u.daysOverdue === 0
                        ? 'צפוי היום'
                        : u.daysOverdue === -1
                          ? 'צפוי מחר'
                          : `בעוד ${Math.abs(u.daysOverdue)} ימים`;
                    const isOverdue = u.daysOverdue >= 0;
                    return (
                      <Box key={u.category} sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        py: 0.75, px: 1, borderRadius: '10px',
                        bgcolor: isOverdue
                          ? (isDark ? 'rgba(245,158,11,0.12)' : 'rgba(245,158,11,0.08)')
                          : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      }}>
                        <Typography sx={{ fontSize: 18, flexShrink: 0 }}>{icon}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{label}</Typography>
                        <Typography sx={{
                          fontSize: 11, fontWeight: 800,
                          color: isOverdue ? '#D97706' : 'text.secondary',
                          fontVariantNumeric: 'tabular-nums',
                        }}>
                          {overdueText}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            )}

            {/* קלף "אנומליות" - שינויים בהרגלי קנייה */}
            {anomalies && anomalies.length > 0 && (
              <Box sx={{
                p: 1.5, mb: 2, borderRadius: '16px',
                bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)',
                border: '1px solid', borderColor: 'rgba(139,92,246,0.25)',
                animation: `${fadeIn} 0.5s ease 0.15s both`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                  <Typography sx={{ fontSize: 16 }}>👀</Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>
                    שינויים בהרגלים שלך
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  {anomalies.map((a, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.85, py: 0.4, px: 0.6 }}>
                      <Typography sx={{ fontSize: 14, flexShrink: 0 }}>
                        {a.type === 'returning' ? '🔄' : a.type === 'fading' ? '↘️' : '📈'}
                      </Typography>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.4 }}>
                        {a.description}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

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
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14B8A6', opacity: 0.95 }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                        <b>יחס השלמה</b> — כמה מהפריטים שנוספו באמת נקנו
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14B8A6', opacity: 0.7 }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                        <b>רצף שבועות</b> — האם אתה פעיל באופן קבוע
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14B8A6', opacity: 0.45 }} />
                      <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                        <b>גיוון קטגוריות</b> — האם אתה קונה מגוון מוצרים
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            {/* סטריק + חודש + תדירות - אחיד בטורקיז. הצמיחה החודשית שומרת על
                סמיוטיקה (ירוק/אדום) כי הצבע שם נושא משמעות, לא קישוט. */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
              {/* סטריק */}
              <Paper elevation={0} sx={{
                p: 1.25, borderRadius: '12px', textAlign: 'center',
                bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)',
                border: '1px solid rgba(20,184,166,0.15)',
              }}>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#14B8A6', lineHeight: 1 }}>
                  🔥{streaks?.currentWeeks || 0}
                </Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
                  סטריק · שיא {streaks?.longestWeeks || 0}
                </Typography>
              </Paper>

              {/* חודש - שומר ירוק/אדום סמנטי לכיוון השינוי */}
              <Paper elevation={0} sx={{
                p: 1.25, borderRadius: '12px', textAlign: 'center',
                bgcolor: isDark ? `${growthColor}14` : `${growthColor}0D`,
                border: `1px solid ${growthColor}26`,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
                  <GrowthIcon sx={{ fontSize: 18, color: growthColor }} />
                  <Typography sx={{ fontSize: 18, fontWeight: 800, color: growthColor, lineHeight: 1 }}>
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
                bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)',
                border: '1px solid rgba(20,184,166,0.15)',
              }}>
                <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#14B8A6', lineHeight: 1 }}>
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
                          bgcolor: isSelected ? (isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.12)') : 'transparent',
                          transition: 'background 0.2s ease',
                          '&:active': hasActivity ? { opacity: 0.8 } : {},
                        }}
                      >
                        {/* בר נקנו - טורקיז כהה כשנבחר, רגיל כברירת מחדל */}
                        <Box sx={{
                          height: `${(w.purchased / maxWeeklyTrend) * 100}%`,
                          bgcolor: isSelected ? '#0D9488' : '#14B8A6',
                          borderRadius: '3px 3px 0 0', minHeight: w.purchased > 0 ? 3 : 0,
                          transition: 'background 0.2s ease',
                        }} />
                        {/* בר נשארו - גוון בהיר יותר של אותו צבע */}
                        <Box sx={{
                          height: `${((w.added - w.purchased) / maxWeeklyTrend) * 100}%`,
                          bgcolor: isSelected
                            ? (isDark ? 'rgba(20,184,166,0.55)' : 'rgba(20,184,166,0.45)')
                            : (isDark ? 'rgba(20,184,166,0.35)' : 'rgba(20,184,166,0.25)'),
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
                      color: selectedWeekIdx === i ? '#14B8A6' : 'text.disabled',
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
                        role={count > 0 ? 'button' : undefined}
                        tabIndex={count > 0 ? 0 : undefined}
                        aria-label={count > 0 ? `${dayLabels[i]}: ${count} פעולות${isBest ? ' - יום שיא' : ''}` : undefined}
                        onClick={() => {
                          if (count === 0) return;
                          haptic('light');
                          setSelectedWeekday(prev => prev === i ? null : i);
                        }}
                        onKeyDown={(e) => {
                          if (count === 0) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            haptic('light');
                            setSelectedWeekday(prev => prev === i ? null : i);
                          }
                        }}
                        sx={{
                          flex: 1, textAlign: 'center',
                          cursor: count > 0 ? 'pointer' : 'default',
                          transition: 'transform 0.12s ease',
                          '&:focus-visible': { outline: '2px solid #14B8A6', outlineOffset: 2 },
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
                          // נבחר: גוון כהה של טורקיז; שיא: גוון רגיל של טורקיז
                          border: isSelected ? '2px solid #0D9488' : isBest ? '1.5px solid #14B8A6' : '1.5px solid transparent',
                          boxShadow: isSelected ? '0 2px 12px rgba(13,148,136,0.45)' : isBest ? '0 2px 10px rgba(20,184,166,0.4)' : 'none',
                          transition: 'border 0.2s, box-shadow 0.2s',
                        }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 800, color: count > 0 ? 'white' : 'text.disabled' }}>
                            {count}
                          </Typography>
                        </Box>
                        <Typography sx={{
                          fontSize: 10, fontWeight: 700,
                          color: isSelected ? '#0D9488' : isBest ? '#14B8A6' : 'text.secondary',
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

            {/* Heatmap לפי שעה - 24 משבצות, צבע לפי עוצמת הפעילות.
                מסדר את השעות ברמה אנושית: בוקר (5-11), צהריים (12-16), ערב (17-22), לילה (23-4). */}
            {hourlyActivity && hourlyActivity.some(v => v > 0) && (() => {
              const maxHour = Math.max(...hourlyActivity, 1);
              const peakHour = hourlyActivity.indexOf(maxHour);
              // קבוצות שעות לסיכום סקאני
              const buckets = [
                { label: 'בוקר', range: 'בוקר 5-11', from: 5, to: 11, emoji: '🌅' },
                { label: 'צהריים', range: 'צהריים 12-16', from: 12, to: 16, emoji: '☀️' },
                { label: 'ערב', range: 'ערב 17-22', from: 17, to: 22, emoji: '🌆' },
                { label: 'לילה', range: 'לילה 23-4', from: 23, to: 4, emoji: '🌙' },
              ];
              const bucketTotals = buckets.map(b => {
                let total = 0;
                if (b.from <= b.to) {
                  for (let h = b.from; h <= b.to; h++) total += hourlyActivity[h];
                } else {
                  for (let h = b.from; h < 24; h++) total += hourlyActivity[h];
                  for (let h = 0; h <= b.to; h++) total += hourlyActivity[h];
                }
                return total;
              });
              const peakBucketIdx = bucketTotals.indexOf(Math.max(...bucketTotals));
              return (
                <SectionCard title={`🕐 פעילות לפי שעות · שיא ב-${peakHour}:00`} isDark={isDark}>
                  {/* גריד 24 משבצות עם עוצמת צבע. מסודר 6 בשורה. */}
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(12, 1fr)',
                    gap: '3px',
                    mb: 1.5,
                  }}>
                    {hourlyActivity.map((count, h) => {
                      const intensity = count / maxHour;
                      const isPeak = h === peakHour && count > 0;
                      // עוצמת רקע: ריק אפור עדין, אחרת gradient טורקיז
                      const bg = count === 0
                        ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                        : `rgba(20,184,166,${0.18 + intensity * 0.65})`;
                      return (
                        <Box
                          key={h}
                          title={`${h}:00 — ${count} פעולות`}
                          sx={{
                            aspectRatio: '1',
                            borderRadius: '5px',
                            bgcolor: bg,
                            border: isPeak ? '1.5px solid #14B8A6' : '1px solid transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 9,
                            fontWeight: count > 0 ? 800 : 600,
                            color: intensity > 0.5 ? '#fff' : (count === 0 ? 'text.disabled' : '#0F766E'),
                            fontVariantNumeric: 'tabular-nums',
                            transition: 'transform 0.1s',
                            cursor: count > 0 ? 'help' : 'default',
                            '&:hover': count > 0 ? { transform: 'scale(1.15)' } : {},
                          }}
                        >
                          {h}
                        </Box>
                      );
                    })}
                  </Box>
                  {/* legend - 4 buckets לסקירה מהירה */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.6 }}>
                    {buckets.map((b, i) => {
                      const isWinner = i === peakBucketIdx && bucketTotals[i] > 0;
                      const pct = bucketTotals.reduce((a, c) => a + c, 0) > 0
                        ? Math.round((bucketTotals[i] / bucketTotals.reduce((a, c) => a + c, 0)) * 100)
                        : 0;
                      return (
                        <Box key={i} sx={{
                          textAlign: 'center', py: 0.6, px: 0.5, borderRadius: '8px',
                          bgcolor: isWinner
                            ? (isDark ? 'rgba(20,184,166,0.18)' : 'rgba(20,184,166,0.1)')
                            : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)'),
                          border: '1px solid',
                          borderColor: isWinner ? 'rgba(20,184,166,0.4)' : 'transparent',
                        }}>
                          <Typography sx={{ fontSize: 13, lineHeight: 1 }}>{b.emoji}</Typography>
                          <Typography sx={{
                            fontSize: 9.5, fontWeight: 800,
                            color: isWinner ? '#14B8A6' : 'text.secondary',
                            mt: 0.3,
                          }}>{b.label}</Typography>
                          <Typography sx={{ fontSize: 10, fontWeight: 700, color: isWinner ? '#14B8A6' : 'text.disabled', fontVariantNumeric: 'tabular-nums' }}>
                            {pct}%
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </SectionCard>
              );
            })()}
          </>
          );
        })()}

      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
