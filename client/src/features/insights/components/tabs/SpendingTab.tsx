/**
 * SpendingTab - הטאב "הוצאות" של עמוד התובנות.
 * מציג הוצאה חודשית משוערת, פילוח לפי קטגוריה, וצפי לסוף החודש -
 * מבוסס על spending שכבר מחושב בשרת (server/api/src/services/spending.service.ts).
 */

import { memo, useState, useMemo } from 'react';
import { Box, Typography, Paper, Chip } from '@mui/material';
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
}

const formatILS = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;
const MoneyValue = ({ amount }: { amount: number }) => <>₪<AnimatedNumber value={Math.round(amount)} /></>;

export const SpendingTab = memo(({ data, isDark, t }: Props) => {
  const { spending } = data;
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  // null = כל הרשימות נבחרות; Set = רק הרשימות שבסט
  const [selectedListIds, setSelectedListIds] = useState<Set<string> | null>(null);

  // הפלטה של צבעים לרשימות (עקבית בכל הקומפוננטה)
  const LIST_PALETTE = ['#0D9488', '#14B8A6', '#2DD4BF', '#5EEAD4', '#99F6E4', '#CCFBF1'];

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
    return (
      <InsightsEmptyState
        isDark={isDark}
        accent="#14B8A6"
        mainEmoji="🧾"
        floatingItems={['💰', '📊', '🛒', '📈']}
        title={t('noPurchasesThisMonthTitle')}
        description={t('noPurchasesThisMonthDesc')}
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

      {/* פילוח לפי רשימה - מוצג רק כשיש יותר מרשימה אחת עם הוצאות */}
      {spending.listBreakdown && spending.listBreakdown.length > 1 && (
        <SectionCard title={t('listSpendingBreakdownTitle')} isDark={isDark}>

          {/* chips לסינון רשימות */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1.5, alignItems: 'center' }}>
            {/* כפתורי בחר הכל / נקה הכל */}
            <Chip
              label={selectedListIds === null ? 'הכל נבחר' : 'בחר הכל'}
              size="small"
              onClick={() => { haptic('light'); setSelectedListIds(null); }}
              sx={{
                fontSize: 11, fontWeight: 700, height: 26,
                bgcolor: selectedListIds === null ? '#0D9488' : (isDark ? 'rgba(13,148,136,0.15)' : 'rgba(13,148,136,0.1)'),
                color: selectedListIds === null ? '#fff' : '#0D9488',
                border: '1.5px solid',
                borderColor: '#0D9488',
                '&:hover': { bgcolor: selectedListIds === null ? '#0b7a70' : 'rgba(13,148,136,0.22)' },
                cursor: 'pointer',
              }}
            />
            {/* chip לכל רשימה */}
            {spending.listBreakdown.map((list, idx) => {
              const color = LIST_PALETTE[idx % LIST_PALETTE.length];
              const selected = isListSelected(list.listId);
              return (
                <Chip
                  key={list.listId}
                  label={`${list.icon} ${list.name}`}
                  size="small"
                  onClick={() => toggleList(list.listId)}
                  sx={{
                    fontSize: 11, fontWeight: selected ? 700 : 500, height: 26,
                    maxWidth: 140,
                    bgcolor: selected ? `${color}22` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                    color: selected ? color : 'text.secondary',
                    border: '1.5px solid',
                    borderColor: selected ? `${color}60` : 'transparent',
                    opacity: selected ? 1 : 0.55,
                    transition: 'all 0.2s',
                    '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                    '&:hover': { opacity: 1, bgcolor: `${color}22` },
                    cursor: 'pointer',
                  }}
                />
              );
            })}
          </Box>

          {/* בר אופקי מחולק לפי הרשימות המסוננות */}
          {filteredListBreakdown.length > 0 ? (
            <>
              <Box sx={{ display: 'flex', height: 8, borderRadius: 2, overflow: 'hidden', mb: 1.5 }}>
                {filteredListBreakdown.map((list) => {
                  // מציאת האינדקס המקורי לצורך שמירה על צבע עקבי
                  const origIdx = spending.listBreakdown!.findIndex(l => l.listId === list.listId);
                  const color = LIST_PALETTE[origIdx % LIST_PALETTE.length];
                  // אחוז יחסי מתוך הסכום המסונן
                  const pct = filteredTotal > 0 ? (list.amount / filteredTotal) * 100 : 0;
                  return (
                    <Box key={list.listId} sx={{ width: `${pct}%`, bgcolor: color, transition: 'width 0.6s ease' }} />
                  );
                })}
              </Box>
              {/* שורות רשימות */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                {filteredListBreakdown.map((list) => {
                  const origIdx = spending.listBreakdown!.findIndex(l => l.listId === list.listId);
                  const color = LIST_PALETTE[origIdx % LIST_PALETTE.length];
                  const relativePct = filteredTotal > 0 ? Math.round((list.amount / filteredTotal) * 100) : 0;
                  return (
                    <Box
                      key={list.listId}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 0.75,
                        px: 0.75, py: 0.6, borderRadius: '8px',
                      }}
                    >
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: 14 }}>{list.icon}</Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {list.name}
                      </Typography>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', fontVariantNumeric: 'tabular-nums' }}>
                        {formatILS(list.amount)}
                      </Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'left' }}>
                        {/* כשמסונן - מציג אחוז יחסי לסכום המסונן; כשהכל נבחר - האחוז המקורי */}
                        {selectedListIds === null ? list.percentage : relativePct}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              {/* סכום כולל מסונן - מוצג רק כשמסוננים */}
              {selectedListIds !== null && filteredListBreakdown.length > 0 && (
                <Box sx={{
                  mt: 1, pt: 1,
                  borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  px: 0.75,
                }}>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
                    סה"כ מסונן
                  </Typography>
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0D9488', fontVariantNumeric: 'tabular-nums' }}>
                    {formatILS(filteredTotal)}
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            /* מצב שבו לא נבחרה אף רשימה */
            <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', py: 2 }}>
              בחר לפחות רשימה אחת להצגה
            </Typography>
          )}
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
