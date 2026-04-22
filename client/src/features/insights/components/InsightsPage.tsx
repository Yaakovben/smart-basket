import { useState, useEffect, memo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, IconButton, CircularProgress, Paper, keyframes, LinearProgress } from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import GroupIcon from '@mui/icons-material/Group';
import { useSettings } from '../../../global/context/SettingsContext';
import { insightsApi, type InsightsData } from '../../../services/api';
import { PriceComparisonCard, BetaRibbon, priceComparisonApi, type PriceComparisonData } from '../../priceComparison';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../global/constants';
import { haptic } from '../../../global/helpers';

// אנימציות
const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;
const scaleIn = keyframes`from{transform:scale(0)}to{transform:scale(1)}`;
const float = keyframes`0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}`;

// הגדרת הקטעים ב-page — משותף ל-chip bar ול-anchors
type SectionId = 'price' | 'lists' | 'habits' | 'pulse';
const SECTIONS: { id: SectionId; label: string; emoji: string; color: string }[] = [
  { id: 'price', label: 'מחירים', emoji: '💰', color: '#0D9488' },
  { id: 'lists', label: 'רשימות', emoji: '📋', color: '#8B5CF6' },
  { id: 'habits', label: 'הרגלים', emoji: '🏆', color: '#F59E0B' },
  { id: 'pulse', label: 'דופק', emoji: '📈', color: '#EF4444' },
];
// גובה משוער של ה-chip bar ה-sticky - משמש ל-scrollMarginTop של הקטעים
const STICKY_NAV_OFFSET = 64;

// אמוג'י לציון - מהיר ויזואלית, ללא צבע נפרד כי יושב על רקע גרדיאנט
const scoreEmoji = (s: number) => s >= 90 ? '🏆' : s >= 80 ? '🔥' : s >= 60 ? '💪' : s >= 40 ? '📈' : '🌱';

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

// ===== כרטיס קטע פנימי — שימוש חוזר =====
const SectionCard = ({
  title, subtitle, icon, children, isDark,
}: {
  title: string;
  subtitle?: string;
  icon: string;
  children: React.ReactNode;
  isDark?: boolean;
}) => (
  <Paper elevation={0} sx={{
    p: 2, mb: 2, borderRadius: '18px',
    border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    animation: `${fadeIn} 0.4s ease both`,
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: subtitle ? 0.25 : 1.5 }}>
      <Typography sx={{ fontSize: 17 }}>{icon}</Typography>
      <Typography sx={{ fontSize: 15, fontWeight: 800 }}>{title}</Typography>
    </Box>
    {subtitle && (
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1.5, lineHeight: 1.5 }}>
        {subtitle}
      </Typography>
    )}
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
  // קטע פעיל כרגע בתצוגה - מסונכרן עם IntersectionObserver למעקב ויזואלי
  const [activeSection, setActiveSection] = useState<SectionId>('price');
  // refs לכל קטע - מאפשר גלילה חלקה בלחיצה על chip
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    price: null, lists: null, habits: null, pulse: null,
  });
  // דגל המנטרל את ה-observer זמנית אחרי קליק, כדי שמעבר ידני לא "יקפוץ" חזרה
  const clickLockRef = useRef(false);

  useEffect(() => {
    insightsApi.getInsights().then(setData).catch(() => setError(true)).finally(() => setLoading(false));
    priceComparisonApi.getComparison().then(setPriceData).catch(() => {});
  }, []);

  // מעקב אחרי הקטע הנראה כרגע — משנה את ה-chip הפעיל
  useEffect(() => {
    if (loading || error) return;
    const observer = new IntersectionObserver(
      entries => {
        if (clickLockRef.current) return;
        // הקטע הכי "מרכזי" במסך (יחס intersection הגבוה ביותר)
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveSection(visible.target.id as SectionId);
      },
      { rootMargin: '-30% 0px -40% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    Object.values(sectionRefs.current).forEach(el => el && observer.observe(el));
    return () => observer.disconnect();
  }, [loading, error]);

  // גלילה חלקה אל קטע - עם ניטרול observer זמני למניעת "קפיצה" תוך כדי גלילה
  const scrollToSection = useCallback((id: SectionId) => {
    haptic('light');
    setActiveSection(id);
    clickLockRef.current = true;
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // שחרור ה-lock אחרי שהגלילה נגמרה (הערכה: ~700ms)
    window.setTimeout(() => { clickLockRef.current = false; }, 700);
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

  const { topProducts, categoryBreakdown, stats, shoppingScore, groupStats, streaks, weeklyTrends } = data;
  const maxWeeklyTrend = Math.max(...(weeklyTrends || []).map(w => Math.max(w.added, w.purchased)), 1);
  // מפה לחיפוש מהיר של נתוני קבוצה לפי שם — לשילוב עם priceData.lists
  const groupStatsByName = new Map(groupStats.map(g => [g.name, g]));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 4 }}>
      {/* ===== Header דק ומעודן ===== */}
      <Box sx={{
        background: isDark ? 'linear-gradient(160deg, #312E81, #5B21B6, #7C3AED)' : 'linear-gradient(160deg, #6D28D9, #7C3AED, #A78BFA)',
        p: { xs: 'max(44px, env(safe-area-inset-top) + 10px) 16px 20px', sm: '48px 20px 24px' },
        borderRadius: '0 0 24px 24px',
        position: 'relative', overflow: 'hidden',
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
          {/* ציון כ-pill קומפקטי בצד — לא שולט יותר על ה-header */}
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 0.5,
            bgcolor: 'rgba(255,255,255,0.15)', borderRadius: '14px',
            px: 1.25, py: 0.75, minWidth: 56,
            border: '1px solid rgba(255,255,255,0.15)',
            animation: `${scaleIn} 0.4s ease 0.2s both`,
          }}>
            <Typography sx={{ fontSize: 14 }}>{scoreEmoji(shoppingScore)}</Typography>
            <Box>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                <AnimatedNumber value={shoppingScore} />
              </Typography>
              <Typography sx={{ fontSize: 8.5, color: 'rgba(255,255,255,0.7)', lineHeight: 1, mt: 0.15 }}>
                {stats.completionRate}% השלמה
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ===== Chip Nav — sticky, מציג קטע פעיל ומקפיץ בין קטעים ===== */}
      <Box sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        bgcolor: isDark ? 'rgba(17,24,39,0.85)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      }}>
        <Box sx={{
          display: 'flex', gap: 0.75, px: 2, py: 1.25,
          overflowX: 'auto',
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
          maskImage: 'linear-gradient(to left, transparent, black 16px, black calc(100% - 16px), transparent)',
          WebkitMaskImage: 'linear-gradient(to left, transparent, black 16px, black calc(100% - 16px), transparent)',
        }}>
          {SECTIONS.map(s => {
            const isActive = activeSection === s.id;
            return (
              <Box
                key={s.id}
                component="button"
                onClick={() => scrollToSection(s.id)}
                sx={{
                  display: 'inline-flex', alignItems: 'center', gap: 0.4,
                  flexShrink: 0, px: 1.25, py: 0.75,
                  borderRadius: '999px',
                  fontSize: 12.5, fontWeight: 700,
                  cursor: 'pointer', border: '1.5px solid',
                  color: isActive ? 'white' : 'text.primary',
                  borderColor: isActive ? s.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                  background: isActive ? `linear-gradient(135deg, ${s.color}, ${s.color}DD)` : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'),
                  boxShadow: isActive ? `0 2px 12px ${s.color}60` : 'none',
                  transition: 'background 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, opacity 0.1s',
                  outline: 'none', font: 'inherit',
                  '&:active': { opacity: 0.8 },
                }}
                aria-current={isActive ? 'true' : undefined}
              >
                <Typography component="span" sx={{ fontSize: 14, lineHeight: 1 }}>{s.emoji}</Typography>
                <Typography component="span" sx={{ fontSize: 12.5, fontWeight: 700, color: 'inherit' }}>{s.label}</Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ===== Content ===== */}
      <Box sx={{ px: 2, mt: 2 }}>

        {/* ===== HERO: השוואת מחירים — הפיצ׳ר המרכזי ===== */}
        <Box
          id="price"
          ref={el => { sectionRefs.current.price = el as HTMLDivElement | null; }}
          sx={{ scrollMarginTop: `${STICKY_NAV_OFFSET}px` }}
        >
          <PriceComparisonCard data={priceData} isDark={isDark} />
        </Box>

        {/* ===== הרשימות שלך — משלב פעילות + סלי עלויות ===== */}
        <Box
          id="lists"
          ref={el => { sectionRefs.current.lists = el as HTMLDivElement | null; }}
          sx={{ scrollMarginTop: `${STICKY_NAV_OFFSET}px` }}
        >
        {(priceData?.lists && priceData.lists.length > 0) || groupStats.length > 0 ? (
          <SectionCard icon="📋" title="הרשימות שלך" subtitle="פעילות, עלויות משוערות ומי תורם" isDark={isDark}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {/* מבנה מאוחד: אם יש priceData.lists - משתמשים בו כמקור אמת. אחרת fallback ל-groupStats */}
              {priceData?.lists && priceData.lists.length > 0 ? (
                priceData.lists.map(L => {
                  const matchGroup = L.isGroup ? groupStatsByName.get(L.listName) : undefined;
                  return (
                    <Box key={L.listId} sx={{
                      p: 1.5, borderRadius: '14px',
                      border: '1px solid',
                      borderColor: isDark ? `${L.listColor}25` : `${L.listColor}20`,
                      background: isDark
                        ? `linear-gradient(135deg, ${L.listColor}12, transparent 70%)`
                        : `linear-gradient(135deg, ${L.listColor}08, transparent 70%)`,
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: matchGroup ? 1 : 0 }}>
                        <Box sx={{
                          width: 38, height: 38, flexShrink: 0, borderRadius: '11px', fontSize: 19,
                          bgcolor: `${L.listColor}25`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid', borderColor: `${L.listColor}35`,
                        }}>{L.listIcon}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                            <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{L.listName}</Typography>
                            {L.isGroup && <GroupIcon sx={{ fontSize: 12, color: 'text.disabled' }} />}
                          </Box>
                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.1 }}>
                            {L.pendingCount} פריטים · {L.matchedCount} תומחרו
                          </Typography>
                        </Box>
                        <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                          {L.estimatedTotal > 0 ? (
                            <>
                              <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#0D9488', fontFamily: 'monospace', lineHeight: 1 }}>
                                ₪{L.estimatedTotal.toFixed(0)}
                              </Typography>
                              <Typography sx={{ fontSize: 9, color: 'text.disabled', mt: 0.25 }}>
                                משוער
                              </Typography>
                            </>
                          ) : (
                            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>אין תמחור</Typography>
                          )}
                        </Box>
                      </Box>
                      {/* אם זו קבוצה - הוספת מידע על תורמים מובילים */}
                      {matchGroup && (matchGroup.topContributor || (matchGroup.topBuyer && matchGroup.topBuyer.count > 0)) && (
                        <Box sx={{ display: 'flex', gap: 1, mt: 0.25 }}>
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
                    </Box>
                  );
                })
              ) : (
                // fallback: אם priceData לא זמין, מציגים רק את הקבוצות מ-insights
                groupStats.map((g, gi) => (
                  <Box key={gi} sx={{
                    p: 1.5, borderRadius: '14px',
                    border: '1px solid', borderColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.15)',
                    background: isDark ? 'rgba(139,92,246,0.05)' : 'rgba(139,92,246,0.03)',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                      <Box sx={{
                        width: 38, height: 38, flexShrink: 0, borderRadius: '11px', fontSize: 19,
                        bgcolor: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{g.icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: 13.5, fontWeight: 800 }}>{g.name}</Typography>
                        <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>{g.membersCount} חברים</Typography>
                      </Box>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </SectionCard>
        ) : null}
        </Box>

        {/* ===== הרגלים: מוצרים + קטגוריות בשני כרטיסים קומפקטיים ===== */}
        <Box
          id="habits"
          ref={el => { sectionRefs.current.habits = el as HTMLDivElement | null; }}
          sx={{ scrollMarginTop: `${STICKY_NAV_OFFSET}px` }}
        >
        {topProducts.length > 0 && (
          <SectionCard icon="🏆" title="המוצרים הנפוצים שלך" subtitle="מה אתה קונה הכי הרבה" isDark={isDark}>
            {/* Top 3 ברצף אופקי ללא פודיום - פשוט ונקי */}
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
                    animation: `${fadeIn} 0.35s ease ${i * 0.08}s both`,
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
            {/* ראנק 4-7 עם פס התקדמות */}
            {topProducts.slice(3, 7).map((p, i) => {
              const icon = CATEGORY_ICONS[p.category as keyof typeof CATEGORY_ICONS] || '📦';
              const maxCount = topProducts[0].count;
              return (
                <Box key={i} sx={{ mb: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.3 }}>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', width: 16, textAlign: 'center' }}>{i + 4}</Typography>
                    <Typography sx={{ fontSize: 13 }}>{icon}</Typography>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color: '#14B8A6' }}>×{p.count}</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(p.count / maxCount) * 100}
                    sx={{ height: 3, borderRadius: 2, ml: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', '& .MuiLinearProgress-bar': { bgcolor: '#14B8A6', borderRadius: 2 } }} />
                </Box>
              );
            })}
          </SectionCard>
        )}

        {categoryBreakdown.length > 0 && (
          <SectionCard icon="📊" title="פילוח קטגוריות" subtitle="איך מתחלקות הקניות שלך" isDark={isDark}>
            {/* צ'יפים עם אחוזים */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5 }}>
              {categoryBreakdown.slice(0, 6).map((cat) => {
                const icon = CATEGORY_ICONS[cat.category as keyof typeof CATEGORY_ICONS] || '📦';
                const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                const key = CATEGORY_TRANSLATION_KEYS[cat.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
                return (
                  <Box key={cat.category} sx={{
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    px: 1, py: 0.6, borderRadius: '9px',
                    bgcolor: `${color}10`, border: `1px solid ${color}25`,
                  }}>
                    <Typography sx={{ fontSize: 13 }}>{icon}</Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700 }}>{key ? t(key) : cat.category}</Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 800, color }}>{cat.percentage}%</Typography>
                  </Box>
                );
              })}
            </Box>
            {/* פסים פשוטים */}
            {categoryBreakdown.map((cat) => {
              const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
              return (
                <LinearProgress key={cat.category} variant="determinate" value={cat.percentage}
                  sx={{ height: 4, borderRadius: 2, mb: 0.4, bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 2 } }} />
              );
            })}
          </SectionCard>
        )}
        </Box>

        {/* ===== דופק: סטטיסטיקות קומפקטיות של פעילות ===== */}
        <Box
          id="pulse"
          ref={el => { sectionRefs.current.pulse = el as HTMLDivElement | null; }}
          sx={{ scrollMarginTop: `${STICKY_NAV_OFFSET}px` }}
        >
        <SectionCard icon="📈" title="הדופק שלך" subtitle="סטריק פעיל ומגמה שבועית" isDark={isDark}>
          {/* שורת סטטיסטיקות: רשימות, נקנו, סטריק */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: weeklyTrends && weeklyTrends.length > 0 ? 1.75 : 0 }}>
            <Box sx={{ textAlign: 'center', p: 1.25, borderRadius: '10px', bgcolor: isDark ? 'rgba(139,92,246,0.08)' : 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.12)' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#8B5CF6', lineHeight: 1 }}>
                <AnimatedNumber value={stats.totalLists} />
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>📋 רשימות</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 1.25, borderRadius: '10px', bgcolor: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.12)' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#22C55E', lineHeight: 1 }}>
                <AnimatedNumber value={stats.totalPurchased} />
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>✅ נקנו</Typography>
            </Box>
            <Box sx={{ textAlign: 'center', p: 1.25, borderRadius: '10px', bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.12)' }}>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', lineHeight: 1 }}>
                🔥{streaks?.currentWeeks || 0}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.25 }}>
                שבועות · שיא {streaks?.longestWeeks || 0}
              </Typography>
            </Box>
          </Box>

          {/* מגמות שבועיות - מיני */}
          {weeklyTrends && weeklyTrends.length > 0 && (
            <>
              <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.secondary', mb: 0.75 }}>
                מגמה שבועית
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 50, mb: 0.5 }}>
                {weeklyTrends.map((w, i) => (
                  <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1px', height: '100%', justifyContent: 'flex-end' }}>
                    <Box sx={{
                      height: `${(w.purchased / maxWeeklyTrend) * 100}%`,
                      bgcolor: '#22C55E', borderRadius: '2px 2px 0 0', minHeight: w.purchased > 0 ? 3 : 0,
                    }} />
                    <Box sx={{
                      height: `${((w.added - w.purchased) / maxWeeklyTrend) * 100}%`,
                      bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)',
                      borderRadius: '2px 2px 0 0', minHeight: w.added - w.purchased > 0 ? 2 : 0,
                    }} />
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', fontSize: 9.5, color: 'text.secondary' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: 0.5, bgcolor: '#22C55E' }} />
                  <Typography sx={{ fontSize: 9.5 }}>נקנו</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Box sx={{ width: 7, height: 7, borderRadius: 0.5, bgcolor: isDark ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.3)' }} />
                  <Typography sx={{ fontSize: 9.5 }}>ממתינים</Typography>
                </Box>
              </Box>
            </>
          )}
        </SectionCard>
        </Box>

      </Box>
    </Box>
  );
});

InsightsPage.displayName = 'InsightsPage';
