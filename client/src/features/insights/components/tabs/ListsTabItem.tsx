import { Fragment } from 'react';
import { Box, Typography } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import type { InsightsData } from '../../../../services/api';
import type { PriceListGroup } from '../../../priceComparison/types/priceComparison.types';
import { haptic } from '../../../../global/helpers';
import { fadeIn } from '../insightsShared';

// פלטת צבעים קבועה לחברי קבוצה - טורקיז ראשון (תואם לאפליקציה), שאר הצבעים לבידול בלבד
const MEMBER_PALETTE = ['#14B8A6', '#0D9488', '#3B82F6', '#22C55E', '#A16207', '#EC4899', '#EF4444'];

const formatILS = (n: number) => `₪${Math.round(n).toLocaleString('he-IL')}`;

type GroupStat = InsightsData['groupStats'][number];

interface SectionHeaderInfo { emoji: string; label: string; count: number }

interface ListsTabItemProps {
  list: PriceListGroup;
  index: number;
  sectionHeader: SectionHeaderInfo | null;
  group: GroupStat | undefined;
  currentUserName: string | null;
  isDark: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (listId: string) => void;
}

// כרטיס רשימה בודד בטאב "רשימות" - כולל חלוקת פעילות בין חברי קבוצה,
// "התרומה שלך", השוואה מול הממוצע, ורשימת חברים מדורגת. קובץ נפרד כי
// הלוגיקה כאן עשירה (חישובי אחוזים, מדליות, הרחבה/צמצום רשימת חברים).
export const ListsTabItem = ({
  list: L, index: idx, sectionHeader, group: g, currentUserName, isDark, isExpanded, onToggleExpand, onNavigate,
}: ListsTabItemProps) => {
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

  const shouldCollapse = sortedMembers.length > 4;
  const membersToShow = shouldCollapse && !isExpanded ? sortedMembers.slice(0, 3) : sortedMembers;
  const hiddenMembersCount = sortedMembers.length - membersToShow.length;

  return (
    <Fragment>
      {sectionHeader && (
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.6,
          mt: idx === 0 ? 0 : 0.5, mb: -0.5, px: 0.25,
        }}>
          <Typography sx={{ fontSize: 13 }}>{sectionHeader.emoji}</Typography>
          <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.3 }}>
            {sectionHeader.label}
          </Typography>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
            · {sectionHeader.count}
          </Typography>
        </Box>
      )}
      <Box
        role="button"
        tabIndex={0}
        // ניווט בלחיצה אחת - היה דורש לחיצה כפולה (350ms) בלי שום רמז ויזואלי
        // לכך, מה שגרם לכרטיס שנראה לגמרי לחיץ (cursor:pointer, hover, active)
        // "לא להגיב" בלחיצה ראשונה. עקבי עכשיו עם כל כרטיס לחיץ אחר באפליקציה.
        onClick={() => {
          haptic('medium');
          onNavigate(L.listId);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            haptic('light');
            onNavigate(L.listId);
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
            {/* סיכום פעילות + הערכת מחיר (מהתאמת המוצרים למאגר המחירים -
                נתון שכבר מחושב לטאב "מחירים" אבל לא הוצג פה בכלל). מוצג
                לכל סוגי הרשימות, כולל פרטיות שאין להן שום תובנה אחרת. */}
            {L.isGroup && g && memberTotalAdded > 0 ? (
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                <b>{memberTotalAdded}</b> נוספו · <b>{memberTotalPurchased}</b> נקנו
                <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', ml: 0.5 }}>
                  ({purchasedPct}%)
                </Typography>
                {L.estimatedTotal > 0 && (
                  <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', ml: 0.5 }}>
                    · הערכה {formatILS(L.estimatedTotal)}
                  </Typography>
                )}
              </Typography>
            ) : L.pendingCount > 0 ? (
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                <b>{L.pendingCount}</b> פריטים ממתינים לקנייה
                {L.estimatedTotal > 0 && (
                  <Typography component="span" sx={{ fontSize: 11, color: 'text.disabled', ml: 0.5 }}>
                    · הערכה {formatILS(L.estimatedTotal)}
                  </Typography>
                )}
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
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'white', lineHeight: 1 }}>
                {myPct}%
              </Typography>
            </Box>
          </Box>
        )}

        {/* השוואה מול ממוצע החברים - מוצג רק כשיש 2+ חברים פעילים אחרים. */}
        {L.isGroup && g?.userContribution && sortedMembers.length >= 3 && (() => {
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
        })()}

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
                  return <Box key={mi} title={`${m.name}: ${Math.round(pct)}%`} sx={{ width: `${pct}%`, bgcolor: MEMBER_PALETTE[mi % MEMBER_PALETTE.length] }} />;
                })}
              </Box>
            </Box>

            {/* רשימת חברים עם מי/מה/כמה (מוגבלת ל-3 ראשונים אם יש מעל 4) */}
            <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {membersToShow.map((m, mi) => {
                const color = MEMBER_PALETTE[mi % MEMBER_PALETTE.length];
                const totalForMember = m.added + m.purchased;
                const pct = memberTotalActivity > 0 ? Math.round((totalForMember / memberTotalActivity) * 100) : 0;
                const initial = m.name.charAt(0).toUpperCase();
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
                  onToggleExpand();
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
    </Fragment>
  );
};
