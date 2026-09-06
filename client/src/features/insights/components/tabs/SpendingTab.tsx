/**
 * SpendingTab - הטאב "הוצאות" של עמוד התובנות.
 * מציג הוצאה חודשית משוערת, פילוח לפי קטגוריה, וצפי לסוף החודש -
 * מבוסס על spending שכבר מחושב בשרת (server/api/src/services/spending.service.ts).
 */

import { memo, useState, useMemo } from 'react';
import { Box, Typography, Paper, Skeleton, keyframes } from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import CheckIcon from '@mui/icons-material/Check';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import type { InsightsData } from '../../../../services/api';
import { CATEGORY_ICONS, CATEGORY_TRANSLATION_KEYS, CATEGORY_COLORS } from '../../../../global/constants';
import { haptic } from '../../../../global/helpers';
import {
  fadeIn, AnimatedNumber, StatCard, SectionCard, HeroInsight, InsightsEmptyState, CategoryDonut,
} from '../insightsShared';

interface Props {
  data: InsightsData;
  isDark: boolean;
  t: (key: string) => string;
  // true אחרי שהתשובה האמיתית הראשונה מהשרת חזרה במאונט הזה (לא cache).
  // עד אז, אם עדיין אין פילוח-לפי-רשימה תקין, מציגים skeleton במקומו כדי
  // שהמקטע לא "ייעלם ואז יופיע פתאום" ברגע שה-fetch האמיתי מסתיים.
  dataFresh?: boolean;
}

/* אנימציית כניסה לכרטיסי הרשימות */
const slideIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

/* ממשק לרשימה מפולחת */
interface ListBreakdownItem {
  listId: string;
  name: string;
  icon: string;
  amount: number;
  percentage: number;
}

interface ListBreakdownSectionProps {
  listBreakdown: ListBreakdownItem[];
  filteredListBreakdown: ListBreakdownItem[];
  filteredTotal: number;
  selectedListIds: Set<string> | null;
  isListSelected: (id: string) => boolean;
  toggleList: (id: string) => void;
  setSelectedListIds: (v: Set<string> | null) => void;
  isDark: boolean;
  t: (key: string) => string;
  LIST_PALETTE: string[];
}

/* טולטיפ מותאם לתרשים המגמה */
interface TrendTooltipProps {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  isDark: boolean;
}
const TrendTooltip = memo(({ active, payload, label, isDark }: TrendTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      px: 1.5, py: 1,
      borderRadius: '10px',
      bgcolor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
      boxShadow: isDark ? '0 4px 16px rgba(0,0,0,0.5)' : '0 4px 16px rgba(0,0,0,0.12)',
      pointerEvents: 'none',
    }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mb: 0.25 }}>{label}</Typography>
      <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#0D9488', fontVariantNumeric: 'tabular-nums' }}>
        {formatILS(payload[0].value)}
      </Typography>
    </Box>
  );
});
TrendTooltip.displayName = 'TrendTooltip';

/* תרשים מגמת הוצאות חודשית */
interface MonthlyTrendChartProps {
  trend: { label: string; total: number; monthNum: number; year: number }[];
  currentMonthNum: number;
  currentYear: number;
  isDark: boolean;
  growthPct: number | null;
  hasBaseline: boolean;
}
const MonthlyTrendChart = memo(({ trend, currentMonthNum, currentYear, isDark, growthPct, hasBaseline }: MonthlyTrendChartProps) => {
  // הצגה רק אם יש לפחות 2 חודשים עם נתונים
  const monthsWithData = trend.filter(m => m.total > 0).length;
  if (monthsWithData < 2) return null;

  const BAR_COLOR = '#0D9488';
  const BAR_COLOR_CURRENT = '#14B8A6';
  const BAR_BG = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';

  const growthUp = hasBaseline && growthPct !== null && growthPct > 0;
  const growthDown = hasBaseline && growthPct !== null && growthPct < 0;
  const growthColor = !hasBaseline || growthPct === null ? '#94A3B8'
    : growthUp ? '#EF4444'
    : growthDown ? '#22C55E'
    : '#94A3B8';

  return (
    <Box sx={{ mb: 2, animation: `${fadeIn} 0.4s ease both` }}>
      <Box sx={{
        borderRadius: '18px', overflow: 'hidden',
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: '1.5px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
        p: 2,
      }}>
        {/* כותרת */}
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', mb: 1.5 }}>
          📈 מגמת הוצאות חודשית
        </Typography>

        {/* תרשים */}
        <Box sx={{ bgcolor: BAR_BG, borderRadius: '12px', p: 1, pb: 0 }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trend} margin={{ top: 8, right: 4, left: -28, bottom: 0 }} barCategoryGap="28%">
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 600, fill: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => v === 0 ? '' : `₪${Math.round(v / 1000)}K`}
                width={44}
              />
              <Tooltip
                content={<TrendTooltip isDark={isDark} />}
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)', radius: 6 }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {trend.map((entry) => {
                  const isCurrent = entry.monthNum === currentMonthNum && entry.year === currentYear;
                  return (
                    <Cell
                      key={`${entry.year}-${entry.monthNum}`}
                      fill={isCurrent ? BAR_COLOR_CURRENT : BAR_COLOR}
                      opacity={isCurrent ? 1 : 0.55}
                    />
                  );
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Box>

        {/* שינוי מול חודש קודם */}
        {hasBaseline && growthPct !== null && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, mt: 1.25 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>שינוי לעומת חודש קודם:</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 800, color: growthColor, fontVariantNumeric: 'tabular-nums' }}>
              {growthPct > 0 ? '+' : ''}{growthPct}%
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
});
MonthlyTrendChart.displayName = 'MonthlyTrendChart';

/* קומפוננטת פילוח לפי רשימה - עיצוב נקי וברור */
const ListBreakdownSection = memo(({
  listBreakdown,
  filteredListBreakdown,
  filteredTotal,
  selectedListIds,
  isListSelected,
  toggleList,
  setSelectedListIds,
  isDark,
  t,
  LIST_PALETTE,
}: ListBreakdownSectionProps) => {
  const allSelected = selectedListIds === null;
  const grandTotal = listBreakdown.reduce((s, l) => s + l.amount, 0);

  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2, borderRadius: '18px', overflow: 'hidden',
        bgcolor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
        border: '1.5px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
      }}
    >
      {/* כותרת + סכום כולל */}
      <Box sx={{
        px: 2, pt: 1.75, pb: 1.5,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
      }}>
        <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary' }}>
          {t('listSpendingBreakdownTitle')}
        </Typography>
        <Box sx={{ textAlign: 'left' }}>
          <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#0D9488', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            {formatILS(allSelected ? grandTotal : filteredTotal)}
          </Typography>
          {!allSelected && (
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textAlign: 'center', mt: 0.2 }}>
              מסונן
            </Typography>
          )}
        </Box>
      </Box>

      {/* כפתורי סינון - ברורים ומובנים */}
      <Box sx={{ px: 2, py: 1.25, display: 'flex', flexWrap: 'wrap', gap: 0.6, borderBottom: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
        <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.disabled', alignSelf: 'center', mr: 0.25 }}>
          סנן:
        </Typography>
        {/* כפתור הכל */}
        <Box
          component="button"
          onClick={() => { haptic('light'); setSelectedListIds(null); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.4,
            px: 1.1, py: 0.45,
            borderRadius: '20px', border: '1.5px solid',
            cursor: 'pointer', fontSize: 11.5, fontWeight: 700,
            transition: 'all 0.18s ease',
            bgcolor: allSelected ? '#0D9488' : 'transparent',
            borderColor: '#0D9488',
            color: allSelected ? '#fff' : '#0D9488',
          }}
        >
          {allSelected && <CheckIcon sx={{ fontSize: 12 }} />}
          הכל
        </Box>

        {/* כפתור לכל רשימה */}
        {listBreakdown.map((list, idx) => {
          const color = LIST_PALETTE[idx % LIST_PALETTE.length];
          const selected = isListSelected(list.listId);
          return (
            <Box
              key={list.listId}
              component="button"
              onClick={() => toggleList(list.listId)}
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.5,
                px: 1.1, py: 0.45, maxWidth: 150,
                borderRadius: '20px', border: '1.5px solid',
                cursor: 'pointer', fontSize: 11.5, fontWeight: selected ? 700 : 500,
                transition: 'all 0.18s ease',
                bgcolor: selected ? color : 'transparent',
                borderColor: color,
                color: selected ? '#fff' : color,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}
            >
              {selected && <CheckIcon sx={{ fontSize: 12, flexShrink: 0 }} />}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{list.icon} {list.name}</span>
            </Box>
          );
        })}
      </Box>

      {/* שורות הרשימות */}
      {filteredListBreakdown.length > 0 ? (
        <Box sx={{ px: 2, py: 1, display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filteredListBreakdown.map((list, i) => {
            const origIdx = listBreakdown.findIndex(l => l.listId === list.listId);
            const color = LIST_PALETTE[origIdx % LIST_PALETTE.length];
            const base = allSelected ? grandTotal : filteredTotal;
            const pct = base > 0 ? Math.round((list.amount / base) * 100) : 0;

            return (
              <Box
                key={list.listId}
                sx={{
                  py: 1.4,
                  borderBottom: i < filteredListBreakdown.length - 1 ? '1px solid' : 'none',
                  borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  animation: `${slideIn} 0.3s ease ${i * 0.05}s both`,
                }}
              >
                {/* שורה עליונה: נקודת צבע + אייקון + שם + סכום */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.85 }}>
                  {/* נקודת זיהוי צבעונית */}
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>{list.icon}</Typography>
                  <Typography sx={{
                    flex: 1, fontSize: 14, fontWeight: 700, color: 'text.primary',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {list.name}
                  </Typography>
                  <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 900, color: 'text.primary', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                      {formatILS(list.amount)}
                    </Typography>
                    <Typography sx={{ fontSize: 10.5, fontWeight: 700, color, textAlign: 'center', mt: 0.1 }}>
                      {pct}%
                    </Typography>
                  </Box>
                </Box>

                {/* בר אופקי */}
                <Box sx={{
                  height: 6, borderRadius: 3,
                  bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                  overflow: 'hidden', ml: 2.75,
                }}>
                  <Box sx={{
                    height: '100%', borderRadius: 3, bgcolor: color,
                    width: `${pct}%`,
                    transition: 'width 0.6s cubic-bezier(0.4,0,0.2,1)',
                  }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Typography sx={{ fontSize: 13, color: 'text.secondary', textAlign: 'center', py: 3 }}>
          בחר לפחות רשימה אחת
        </Typography>
      )}
    </Paper>
  );
});
ListBreakdownSection.displayName = 'ListBreakdownSection';

const formatILS = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
const MoneyValue = ({ amount }: { amount: number }) => <>₪<AnimatedNumber value={Math.round(amount)} /></>;

export const SpendingTab = memo(({ data, isDark, t, dataFresh = false }: Props) => {
  const { spending } = data;
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  // null = כל הרשימות נבחרות; Set = רק הרשימות שבסט
  const [selectedListIds, setSelectedListIds] = useState<Set<string> | null>(null);

    // הפלטה של צבעים לרשימות - צבעים שונים וברורים זה מזה
  const LIST_PALETTE = ['#0D9488', '#7C3AED', '#EA580C', '#0284C7', '#16A34A', '#DC2626'];

  // הרשימות המסוננות לפי הבחירה
  const filteredListBreakdown = useMemo(() => {
    if (!spending.listBreakdown) return [];
    if (selectedListIds === null) return spending.listBreakdown;
    return spending.listBreakdown.filter(l => selectedListIds.has(l.listId));
  }, [spending.listBreakdown, selectedListIds]);

  // סכום כולל של הרשימות המסוננות (לחישוב אחוזים יחסיים)
  const filteredTotal = useMemo(
    () => filteredListBreakdown.reduce((sum, l) => sum + l.amount, 0),
    [filteredListBreakdown],
  );

  const toggleList = (listId: string) => {
    haptic('light');
    setSelectedListIds(prev => {
      const allIds = spending.listBreakdown!.map(l => l.listId);
      // אם "הכל נבחר" - עוברים למצב שבו רק הנוכחי מוסר
      const current = prev === null ? new Set(allIds) : new Set(prev);
      if (current.has(listId)) {
        current.delete(listId);
        // אם לא נשארה אף רשימה - מחזירים לברירת מחדל (הכל)
        if (current.size === 0) return null;
      } else {
        current.add(listId);
        // אם כל הרשימות נבחרות שוב - מחזירים null (הכל)
        if (current.size === allIds.length) return null;
      }
      return current;
    });
  };

  const isListSelected = (listId: string) =>
    selectedListIds === null || selectedListIds.has(listId);

  // הגנה: אם data הגיע מ-cache מקומי ישן (מלפני שהתווסף שדה spending), הוא
  // עלול להיות undefined לרגע עד שהנתונים הטריים מהשרת דורסים אותו - בלי
  // ההגנה הזו זו קריסה (Cannot read properties of undefined).
  if (!spending || !spending.enabled) {
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="🧾"
        floatingItems={['💰', '📊', '🛒', '📈']}
        title={t('priceDbNotLoadedTitle')}
        description={t('priceDbNotLoadedDesc')}
      />
    );
  }

  if (spending.monthTotal === null) {
    // הבחנה בין "לא סימנת שום מוצר כנקנה" לבין "סימנת מוצרים אבל אף אחד מהם
    // עדיין לא מזוהה עם מחיר" - במקרה השני זו הודעה מטעה שאתה לא קנית כלום.
    const purchasedButNoPrices = spending.monthUnmatchedCount > 0;
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="🧾"
        floatingItems={['💰', '📊', '🛒', '📈']}
        title={purchasedButNoPrices ? t('purchasesNoPricesTitle') : t('noPurchasesThisMonthTitle')}
        description={purchasedButNoPrices
          ? t('purchasesNoPricesDesc').replace('{count}', String(spending.monthUnmatchedCount))
          : t('noPurchasesThisMonthDesc')}
      />
    );
  }

  const growth = spending.monthGrowthPct;
  const hasGrowth = spending.hasBaseline && growth !== null;
  const growthUp = hasGrowth && growth! > 0;
  const growthDown = hasGrowth && growth! < 0;
  // בהוצאות "עלייה" היא לא-רצויה ולהפך מטאב הפעילות (שם עלייה בפעילות חיובית) -
  // לכן הצבעים הפוכים: יותר הוצאה = אדום, פחות הוצאה = ירוק.
  const growthColor = !hasGrowth ? '#94A3B8' : growthUp ? '#EF4444' : growthDown ? '#22C55E' : '#94A3B8';
  const GrowthIcon = growthUp ? TrendingUpIcon : growthDown ? TrendingDownIcon : TrendingFlatIcon;

  // בסיס לחישוב הצפי - קצב יומי × ימים שנותרו. מוצג כטקסט מתחת לשורת
  // הסטטיסטיקה כדי שהמספר לא יראה "משום מקום".
  const dailyRate = spending.monthTotal / Math.max(1, spending.daysElapsed);
  const daysLeft = Math.max(0, spending.daysInMonth - spending.daysElapsed);

  const donutItems = spending.categoryBreakdown.slice(0, 6).map(c => {
    const key = CATEGORY_TRANSLATION_KEYS[c.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
    return {
      category: c.category,
      count: c.amount,
      percentage: c.percentage,
      color: CATEGORY_COLORS[c.category as keyof typeof CATEGORY_COLORS] || '#6B7280',
      icon: CATEGORY_ICONS[c.category as keyof typeof CATEGORY_ICONS] || '📦',
      label: key ? t(key) : c.category,
    };
  });

  const topCategoryLabel = spending.topCategory
    ? (() => {
        const key = CATEGORY_TRANSLATION_KEYS[spending.topCategory!.category as keyof typeof CATEGORY_TRANSLATION_KEYS];
        return key ? t(key) : spending.topCategory!.category;
      })()
    : null;
  const topCategoryIcon = spending.topCategory
    ? (CATEGORY_ICONS[spending.topCategory.category as keyof typeof CATEGORY_ICONS] || '📦')
    : null;

  const totalSeen = spending.monthMatchedCount + spending.monthUnmatchedCount;

  return (
    <>
      <HeroInsight
        icon="🧾"
        text={(() => {
          const [p1, p2] = t('spentThisMonth').split('{amount}');
          return <>{p1}<b>{formatILS(spending.monthTotal)}</b>{p2}</>;
        })()}
        accent="#14B8A6"
        isDark={isDark}
      />

      <SectionCard title={t('monthSummaryTitle')} isDark={isDark}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
          <StatCard
            value={<MoneyValue amount={spending.monthTotal} />}
            label={t('spentThisMonthLabel')}
            color="#14B8A6"
            bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
            border="rgba(20,184,166,0.15)"
          />
          <StatCard
            value={spending.projectedMonthTotal !== null ? <MoneyValue amount={spending.projectedMonthTotal} /> : '—'}
            label={t('projectedMonthEndLabel')}
            color="#0D9488"
            bg={isDark ? 'rgba(13,148,136,0.08)' : 'rgba(13,148,136,0.05)'}
            border="rgba(13,148,136,0.15)"
          />
          <Paper elevation={0} sx={{
            p: 1.5, borderRadius: '14px', textAlign: 'center',
            bgcolor: isDark ? `${growthColor}14` : `${growthColor}0D`,
            border: `1.5px solid ${growthColor}26`,
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.25 }}>
              <GrowthIcon sx={{ fontSize: 16, color: growthColor }} />
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: growthColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {!hasGrowth ? '—' : `${growth! > 0 ? '+' : ''}${growth}%`}
              </Typography>
            </Box>
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 700, mt: 0.5, letterSpacing: 0.3 }}>
              {t('vsLastMonth')}
            </Typography>
          </Paper>
        </Box>
        {spending.projectedMonthTotal !== null && daysLeft > 0 && (
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textAlign: 'center', mt: 1.25 }}>
            {(() => {
              const [p1, rest] = t('projectionRateHint').split('{rate}');
              const [p2, p3] = rest.split('{days}');
              return <>{p1}<b>{formatILS(dailyRate)}</b>{p2}<b>{daysLeft}</b>{p3}</>;
            })()}
          </Typography>
        )}
      </SectionCard>

      {/* תרשים מגמת הוצאות 6 חודשים */}
      {spending.monthlyTrend && (
        <MonthlyTrendChart
          trend={spending.monthlyTrend}
          currentMonthNum={new Date().getMonth()}
          currentYear={new Date().getFullYear()}
          isDark={isDark}
          growthPct={spending.monthGrowthPct}
          hasBaseline={spending.hasBaseline}
        />
      )}

      {spending.topCategory && topCategoryLabel && (
        <Box sx={{
          mb: 2, p: 1.5, borderRadius: '14px',
          background: 'linear-gradient(135deg, #F59E0B, #DC2626)',
          color: 'white',
          display: 'flex', alignItems: 'center', gap: 1.25,
          boxShadow: '0 4px 14px rgba(220,38,38,0.28)',
          animation: `${fadeIn} 0.45s ease 0.1s both`,
        }}>
          <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>{topCategoryIcon}</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4 }}>
              {t('topSpendingCategoryLabel')}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}>
              {topCategoryLabel}
            </Typography>
            <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
              {t('spendingCategoryPctLine').replace('{amount}', formatILS(spending.topCategory.amount)).replace('{pct}', String(spending.topCategory.percentage))}
            </Typography>
          </Box>
        </Box>
      )}

      {donutItems.length > 0 && (
        <SectionCard title={t('categorySpendingBreakdownTitle')} isDark={isDark}>
          <Box sx={{ mb: 2 }}>
            <CategoryDonut
              items={donutItems}
              isDark={isDark}
              selected={highlightedCategory}
              onSelect={(cat) => setHighlightedCategory(prev => prev === cat ? null : cat)}
            />
          </Box>
          {/* בר מחולק אופקי - השוואה מהירה של כל הקטגוריות בבת אחת (עקבי עם טאב הרגלים) */}
          <Box sx={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
            {spending.categoryBreakdown.map(cat => {
              const color = CATEGORY_COLORS[cat.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
              return <Box key={cat.category} sx={{ width: `${cat.percentage}%`, bgcolor: color, transition: 'width 0.8s ease' }} />;
            })}
          </Box>
          {/* רשימה עם סכום ₪ אמיתי לכל קטגוריה - לא רק אחוזים */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
            {spending.categoryBreakdown.map(cat => {
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
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                    {formatILS(cat.amount)}
                  </Typography>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'left' }}>{cat.percentage}%</Typography>
                </Box>
              );
            })}
          </Box>
        </SectionCard>
      )}

      {/* פילוח לפי רשימה - מוצג רק כשיש יותר מרשימה אחת עם הוצאות. אם עדיין
          אין תשובה טרייה מהשרת (ראו dataFresh) וגם אין עדיין נתון תקף
          מה-cache - מציגים skeleton במקום שהמקטע פשוט לא יהיה שם, כדי שלא
          "יקפוץ" פנימה ברגע שהתשובה האמיתית מגיעה. */}
      {spending.listBreakdown && spending.listBreakdown.length > 1 ? (
        <ListBreakdownSection
          listBreakdown={spending.listBreakdown}
          filteredListBreakdown={filteredListBreakdown}
          filteredTotal={filteredTotal}
          selectedListIds={selectedListIds}
          isListSelected={isListSelected}
          toggleList={toggleList}
          setSelectedListIds={setSelectedListIds}
          isDark={isDark}
          t={t}
          LIST_PALETTE={LIST_PALETTE}
        />
      ) : !dataFresh && (
        <SectionCard title={t('listSpendingBreakdownTitle')} isDark={isDark}>
          {[0, 1, 2].map(i => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <Skeleton variant="circular" width={28} height={28} />
              <Skeleton variant="text" width={`${60 - i * 12}%`} height={18} />
            </Box>
          ))}
        </SectionCard>
      )}

      <Box sx={{
        display: 'flex', alignItems: 'flex-start', gap: 0.75,
        px: 1.25, py: 1, borderRadius: '10px',
        bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)',
        border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
      }}>
        <Typography sx={{ fontSize: 12, flexShrink: 0, lineHeight: 1.4 }}>ℹ️</Typography>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled', lineHeight: 1.6 }}>
          {spending.disclaimer}
          {totalSeen > 0 && t('seenItemsSuffix').replace('{matched}', String(spending.monthMatchedCount)).replace('{total}', String(totalSeen))}
        </Typography>
      </Box>
    </>
  );
});

SpendingTab.displayName = 'SpendingTab';
