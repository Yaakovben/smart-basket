import { memo, useState } from 'react';
import { Box, Typography, Paper } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import type { InsightsData } from '../../../../services/api';
import type { PriceComparisonData } from '../../../priceComparison';
import { haptic } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import {
  AnimatedNumber, StatCard, HeroInsight, InsightsEmptyState, GroupLeadershipHero, fadeIn,
} from '../insightsShared';
import { ListsTabItem } from './ListsTabItem';

interface ListsTabProps {
  isDark: boolean;
  stats: InsightsData['stats'];
  groupStats: InsightsData['groupStats'];
  priceData: PriceComparisonData | null;
  currentUserName: string | null;
  onNavigateHome: () => void;
  onNavigateToList: (listId: string) => void;
}

// טאב "רשימות" של עמוד התובנות - סקירת פעילות בכל הרשימות/קבוצות, כולל
// חלוקת תרומה בין חברים. הכרטיס הבודד לכל רשימה חי ב-ListsTabItem.
//
// priceData כאן הוא allListsPriceData (ראו useInsightsData) - גרסה לא-מסוננת
// ייעודית לטאב הזה, לא ה-priceData הרגיל שמסונן לפי selectedListId בטאב
// "מחירים". שימוש בגרסה המסוננת גרם לטאב הזה (שאמור להראות הכל) להציג
// רשימה/קבוצה אחת בלבד כשהייתה רשימה ספציפית נבחרת בטאב האחר.
export const ListsTab = memo(({ isDark, stats, groupStats, priceData, currentUserName, onNavigateHome, onNavigateToList }: ListsTabProps) => {
  const { t } = useSettings();
  // רשימות שפתוחות להצגת כל החברים (כשיש מעל 4)
  const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set());

  const groupStatsByName = new Map(groupStats.map(g => [g.name, g]));
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
      title={t('noActiveLists')}
      description={t('noActiveListsDesc')}
      tips={[t('tipPrivateLists'), t('tipSharedGroups'), t('tipRealtimeNotifications')]}
      ctaLabel={t('toMyLists')}
      ctaIcon={<HomeIcon sx={{ fontSize: 18 }} />}
      onCtaClick={() => { haptic('medium'); onNavigateHome(); }}
    />
  );

  // כותרת אישית — מנוסחת אנושית, לא רשימת מספרים
  const groupsCount = groupStats.length;
  const heroText = groupsCount > 0
    ? (() => {
        const groupWord = groupsCount === 1 ? t('groupWordSingle') : t('groupWordPlural');
        const [p1, rest] = t('heroListsProductsGroups').split('{lists}');
        const [p2, rest2] = rest.split('{products}');
        const [p3, rest3] = rest2.split('{count}');
        const [p4, p5] = rest3.split('{groupWord}');
        return <>{p1}<b>{stats.totalLists}</b>{p2}<b>{stats.totalProducts}</b>{p3}<b>{groupsCount}</b>{p4}{groupWord}{p5}</>;
      })()
    : (() => {
        const [p1, rest] = t('heroListsWithProducts').split('{lists}');
        const [p2, p3] = rest.split('{products}');
        return <>{p1}<b>{stats.totalLists}</b>{p2}<b>{stats.totalProducts}</b>{p3}</>;
      })();

  // מציאת המוסיף החזק ביותר בכל הקבוצות יחד - ייחודי לטאב רשימות
  const allMembers = groupStats.flatMap(g => g.memberBreakdown.map(m => ({ ...m, group: g.name })));
  const topContributor = allMembers.length > 0
    ? allMembers.reduce((best, m) => m.added > best.added ? m : best, allMembers[0])
    : null;

  // "מוסיף" מול "קונה בפועל" - שני תפקידים שונים שיכולים להיות אנשים שונים.
  // מוצג רק כשזה מעניין (מישהו אחר עם קנייה משמעותית), לא סתם חוזר על אותו שם.
  const topBuyer = allMembers.length > 0
    ? allMembers.reduce((best, m) => m.purchased > best.purchased ? m : best, allMembers[0])
    : null;
  const showTopBuyerContrast = !!(
    topBuyer && topBuyer.purchased > 0 && topContributor && topBuyer.name !== topContributor.name
  );

  // ספירת קבוצות שבהן המשתמש הנוכחי מוביל (rank=1).
  // מוביל = הוסיף הכי הרבה. רק קבוצות עם פעילות אמיתית נספרות.
  const leadingGroupsCount = currentUserName
    ? groupStats.filter(g => {
        const sortedByAdded = [...g.memberBreakdown].sort((a, b) => b.added - a.added);
        return sortedByAdded[0]?.name === currentUserName && sortedByAdded[0].added > 0;
      }).length
    : 0;

  return (
    <>
      <HeroInsight icon="👋" text={heroText} accent="#14B8A6" isDark={isDark} />

      {/* Leadership Hero - מציג סטטוס מנהיגות בכל הקבוצות יחד */}
      {groupStats.length > 0 && (
        <GroupLeadershipHero
          leadingCount={leadingGroupsCount}
          totalGroups={groupStats.length}
          isDark={isDark}
        />
      )}

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
              {t('topContributionTitle')}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}>
              {topContributor.name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
              {(() => {
                const [p1, rest] = t('addedItemsGroupLine').split('{count}');
                const [p2, p3] = rest.split('{group}');
                return <>{p1}<b>{topContributor.added}</b>{p2}{topContributor.group}{p3}</>;
              })()}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ניגוד "מוסיף" מול "קונה" - רק כשזה מישהו אחר, מדגיש שהוספה לרשימה
          וקנייה בפועל הם לא תמיד אותו אדם */}
      {showTopBuyerContrast && topBuyer && (
        <Box sx={{
          mb: 1.75, p: 1.5, borderRadius: '14px',
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          color: 'white',
          display: 'flex', alignItems: 'center', gap: 1.25,
          boxShadow: '0 4px 14px rgba(217,119,6,0.3)',
          animation: `${fadeIn} 0.45s ease 0.15s both`,
        }}>
          <Typography sx={{ fontSize: 28, lineHeight: 1, flexShrink: 0 }}>🛍️</Typography>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.9, letterSpacing: 0.4 }}>
              {t('actualBuyerTitle')}
            </Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 800, lineHeight: 1.2, mt: 0.15 }}>
              {topBuyer.name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, opacity: 0.85, mt: 0.15 }}>
              {(() => {
                const [p1, rest] = t('boughtItemsGroupLine').split('{count}');
                const [p2, p3] = rest.split('{group}');
                return <>{p1}<b>{topBuyer.purchased}</b>{p2}{topBuyer.group}{p3}</>;
              })()}
            </Typography>
          </Box>
        </Box>
      )}

      {/* שורת סטטיסטיקה ממוקדת-פעילות - פלטה אחידה בצבע האפליקציה */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 1.75 }}>
        <StatCard
          value={<AnimatedNumber value={stats.totalLists} />}
          label={t('lists')}
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
        <StatCard
          value={<AnimatedNumber value={stats.totalProducts} />}
          label={t('itemsTotalLabel')}
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
        <StatCard
          value={uniqueMembers.size > 0 ? <AnimatedNumber value={uniqueMembers.size} /> : '—'}
          label={t('activeMembersLabel')}
          color="#14B8A6"
          bg={isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)'}
          border="rgba(20,184,166,0.15)"
        />
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
        {listsToShow ? (() => {
          // מיון לפי פרטיות → קבוצות. רשימות פרטיות בראש, קבוצות אחריהן.
          // שמירה על סדר היחסי בכל קבוצה (stable sort של JS).
          const sorted = [...listsToShow].sort((a, b) => {
            if (a.isGroup === b.isGroup) return 0;
            return a.isGroup ? 1 : -1;
          });
          return sorted;
        })().map((L, idx, arr) => {
          // הוספת כותרת סקציה לפני הפריט הראשון של כל סוג
          const prevList = idx > 0 ? arr[idx - 1] : null;
          const isFirstPrivate = !L.isGroup && (idx === 0 || prevList?.isGroup);
          const isFirstGroup = L.isGroup && (idx === 0 || !prevList?.isGroup);
          const sectionHeader = isFirstPrivate
            ? { emoji: '🔒', label: t('tipPrivateLists'), count: arr.filter(x => !x.isGroup).length }
            : isFirstGroup
              ? { emoji: '👥', label: t('groups'), count: arr.filter(x => x.isGroup).length }
              : null;
          return (
            <ListsTabItem
              key={L.listId}
              list={L}
              index={idx}
              sectionHeader={sectionHeader}
              group={L.isGroup ? groupStatsByName.get(L.listName) : undefined}
              currentUserName={currentUserName}
              isDark={isDark}
              isExpanded={expandedLists.has(L.listId)}
              onToggleExpand={() => setExpandedLists(prev => {
                const next = new Set(prev);
                if (next.has(L.listId)) next.delete(L.listId);
                else next.add(L.listId);
                return next;
              })}
              onNavigate={onNavigateToList}
            />
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
                    {t('membersCountLabel').replace('{count}', String(g.membersCount))}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          ))
        )}
      </Box>
    </>
  );
});
ListsTab.displayName = 'ListsTab';
