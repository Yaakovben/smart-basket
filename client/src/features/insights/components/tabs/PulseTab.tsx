/**
 * PulseTab - הטאב "דופק" של עמוד התובנות.
 * הופרד מ-InsightsPage כדי להפחית את גודל הקובץ הראשי ולשפר תחזוקה.
 *
 * State לוקאלי כאן (לא משותף עם טאבים אחרים):
 *  - scoreExplained: האם כרטיס הציון מורחב
 *  - selectedWeekday: איזה יום ב-heatmap נבחר (אם בכלל)
 *  - selectedWeekIdx: איזה שבוע ב-bar chart נבחר
 */

import { memo, useState } from 'react';
import { Box, Typography, Paper, CircularProgress } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import {
  fadeIn, dayLabels, scoreEmoji,
  AnimatedNumber, SectionCard, HeroInsight, InsightsEmptyState,
  PersonalityCard, ScoreTrendBadge, useScoreDelta,
} from '../insightsShared';

interface Props {
  data: InsightsData;
  isDark: boolean;
  t: (key: string) => string;
}

// פורמט תאריך יחסי קצר
const formatRelativeDate = (iso: string | null): string => {
  if (!iso) return '—';
  const diff = new Date(iso).getTime() - Date.now();
  const absDays = Math.round(Math.abs(diff) / 86400000);
  if (absDays === 0) return 'היום';
  if (absDays === 1) return diff > 0 ? 'מחר' : 'אתמול';
  if (diff > 0) return `בעוד ${absDays} ימים`;
  return `לפני ${absDays} ימים`;
};

export const PulseTab = memo(({ data, isDark, t }: Props) => {
  const {
    shoppingScore, streaks, shoppingFrequency, monthComparison,
    weeklyTrends, weekdayActivity, hourlyActivity, upcomingNeeds, anomalies, stats,
    shoppingPersonality,
  } = data;

  // State לוקאלי לטאב הזה
  const [scoreExplained, setScoreExplained] = useState(false);
  const [selectedWeekday, setSelectedWeekday] = useState<number | null>(null);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState<number | null>(null);

  // הפרש הציון מהביקור הקודם - מוצג כתווית ליד הציון
  const scoreDelta = useScoreDelta(shoppingScore);

  const now = Date.now();
  // הערה: ה-`,1` ב-Math.max מונע חלוקה ב-0 כשאין כלל פעילות. זה גם הסיבה
  // שהגרפים מוצגים רק כשיש לפחות שבוע/יום אחד עם ערך > 0 (ראה תנאי הרינדור),
  // אחרת בר אחד קטנטן ייראה ויזואלית מקסימלי.
  const maxWeeklyTrend = Math.max(...(weeklyTrends || []).map(w => Math.max(w.added, w.purchased)), 1);
  const maxWeekday = Math.max(...(weekdayActivity || []), 1);
  const bestDayIdx = weekdayActivity ? weekdayActivity.indexOf(maxWeekday) : -1;

  const hasGrowthBaseline = monthComparison?.hasBaseline ?? false;
  const growth = monthComparison?.productsGrowth ?? 0;
  const growthPositive = hasGrowthBaseline && growth > 0;
  const growthNegative = hasGrowthBaseline && growth < 0;
  const growthColor = !hasGrowthBaseline ? '#94A3B8' : growthPositive ? '#22C55E' : growthNegative ? '#EF4444' : '#94A3B8';
  const GrowthIcon = growthPositive ? TrendingUpIcon : growthNegative ? TrendingDownIcon : TrendingFlatIcon;

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

  // כותרת אישית - ממקדת על הסטריק או התחזית
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

  // מומנטום שבועי - השוואה לשבוע הקודם
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

      {/* כרטיס אישיות הקונה - הזהות הוויזואלית של המשתמש. מוצג רק אם יש פעילות
          אמיתית כדי לא לתת ל"מתחיל" ברירת מחדל ריקה. */}
      {shoppingPersonality && stats.totalProducts >= 5 && (
        <PersonalityCard personality={shoppingPersonality} isDark={isDark} />
      )}

      {/* כרטיס "מומנטום שבועי" */}
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

      {/* קלף "צפויות עכשיו" */}
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

      {/* קלף "אנומליות" */}
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

      {/* כרטיס ציון */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, gap: 0.75 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 800 }}>📈 ציון הקנייה שלך</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <ScoreTrendBadge delta={scoreDelta} />
            <Typography sx={{
              fontSize: 10, fontWeight: 700, color: 'text.disabled',
              transition: 'transform 0.2s ease',
              transform: scoreExplained ? 'rotate(180deg)' : 'rotate(0deg)',
            }}>▼</Typography>
          </Box>
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

      {/* סטריק + חודש + תדירות */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
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
        <Paper elevation={0} sx={{
          p: 1.25, borderRadius: '12px', textAlign: 'center',
          bgcolor: isDark ? `${growthColor}14` : `${growthColor}0D`,
          border: `1px solid ${growthColor}26`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
            <GrowthIcon sx={{ fontSize: 18, color: growthColor }} />
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: growthColor, lineHeight: 1 }}>
              {!hasGrowthBaseline ? '—' : `${growth > 0 ? '+' : ''}${growth}%`}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', fontWeight: 700, mt: 0.35 }}>
            {hasGrowthBaseline ? 'לעומת חודש שעבר' : 'אין עדיין חודש להשוואה'}
          </Typography>
        </Paper>
        <Paper elevation={0} sx={{
          p: 1.25, borderRadius: '12px', textAlign: 'center',
          bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)',
          border: '1px solid rgba(20,184,166,0.15)',
        }}>
          <Typography sx={{ fontSize: 20, fontWeight: 800, color: '#14B8A6', lineHeight: 1 }}>
            {shoppingFrequency?.avgDaysBetween
              ? (shoppingFrequency.avgDaysBetween === 1 ? 'יום' : `${shoppingFrequency.avgDaysBetween} ימים`)
              : '—'}
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

      {/* מגמה שבועית - רק אם יש לפחות שבוע אחד עם פעילות.
          בלי הבדיקה הזו `Math.max(..., 1)` יגרום לבר זעיר אחד להראות מקסימלי. */}
      {weeklyTrends && weeklyTrends.length > 0 && weeklyTrends.some(w => w.added + w.purchased > 0) && (
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
                  <Box sx={{
                    height: `${(w.purchased / maxWeeklyTrend) * 100}%`,
                    bgcolor: isSelected ? '#0D9488' : '#14B8A6',
                    borderRadius: '3px 3px 0 0', minHeight: w.purchased > 0 ? 3 : 0,
                    transition: 'background 0.2s ease',
                  }} />
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
          {selectedWeekIdx !== null && weeklyTrends[selectedWeekIdx] && (
            <Box sx={{
              p: 1, borderRadius: '10px', mb: 0.75,
              bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
              border: '1px solid rgba(245,158,11,0.2)',
              animation: `${fadeIn} 0.2s ease both`,
            }}>
              <Typography sx={{ fontSize: 11.5, color: 'text.primary' }}>
                שבוע שהתחיל ב-<b>{weeklyTrends[selectedWeekIdx].week}</b>:
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

      {/* heatmap ימים */}
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

      {/* Heatmap לפי שעה - 24 משבצות */}
      {hourlyActivity && hourlyActivity.some(v => v > 0) && (() => {
        const maxHour = Math.max(...hourlyActivity, 1);
        const peakHour = hourlyActivity.indexOf(maxHour);
        const buckets = [
          { label: 'בוקר', from: 5, to: 11, emoji: '🌅' },
          { label: 'צהריים', from: 12, to: 16, emoji: '☀️' },
          { label: 'ערב', from: 17, to: 22, emoji: '🌆' },
          { label: 'לילה', from: 23, to: 4, emoji: '🌙' },
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
            <Box sx={{
              display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '3px', mb: 1.5,
            }}>
              {hourlyActivity.map((count, h) => {
                const intensity = count / maxHour;
                const isPeak = h === peakHour && count > 0;
                const bg = count === 0
                  ? (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')
                  : `rgba(20,184,166,${0.18 + intensity * 0.65})`;
                return (
                  <Box key={h} title={`${h}:00 — ${count} פעולות`} sx={{
                    aspectRatio: '1', borderRadius: '5px', bgcolor: bg,
                    border: isPeak ? '1.5px solid #14B8A6' : '1px solid transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, fontWeight: count > 0 ? 800 : 600,
                    color: intensity > 0.5 ? '#fff' : (count === 0 ? 'text.disabled' : '#0F766E'),
                    fontVariantNumeric: 'tabular-nums', transition: 'transform 0.1s',
                    cursor: count > 0 ? 'help' : 'default',
                    '&:hover': count > 0 ? { transform: 'scale(1.15)' } : {},
                  }}>
                    {h}
                  </Box>
                );
              })}
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.6 }}>
              {buckets.map((b, i) => {
                const isWinner = i === peakBucketIdx && bucketTotals[i] > 0;
                const total = bucketTotals.reduce((a, c) => a + c, 0);
                const pct = total > 0 ? Math.round((bucketTotals[i] / total) * 100) : 0;
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
                      color: isWinner ? '#14B8A6' : 'text.secondary', mt: 0.3,
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
});

PulseTab.displayName = 'PulseTab';
