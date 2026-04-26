import { memo, useState } from 'react';
import { Box, Typography, Paper, Collapse, Link, keyframes } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UpdateIcon from '@mui/icons-material/Update';
import InventoryIcon from '@mui/icons-material/Inventory2';
import GroupIcon from '@mui/icons-material/Group';
import type { PriceComparisonData, PriceMatch, PriceListGroup } from '../types/priceComparison.types';
import { BetaBadge } from './BetaBadge';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;
const slideDown = keyframes`from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return 'לא ידוע';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'זה עתה';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `לפני ${mins || 1} דק'`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `לפני ${hours} שעות`;
  const days = Math.floor(hours / 24);
  return `לפני ${days} ימים`;
};

const confidenceLabel = (c: number) => c >= 0.75 ? 'גבוה' : c >= 0.5 ? 'בינוני' : 'נמוך';
const confidenceColor = (c: number) => c >= 0.75 ? '#14B8A6' : c >= 0.5 ? '#F59E0B' : '#EF4444';

// שורת פריט שזוהה
const MatchedRow = memo(({ m, isDark }: { m: PriceMatch; isDark?: boolean }) => {
  const [open, setOpen] = useState(false);
  const subtotal = m.price * m.userQuantity;
  const confColor = confidenceColor(m.matchConfidence);

  return (
    <Box sx={{
      borderRadius: '10px',
      bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.035)',
      border: '1px solid',
      borderColor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)',
      overflow: 'hidden',
    }}>
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1, p: 1, cursor: 'pointer',
          '&:active': { opacity: 0.85 },
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 16, color: '#14B8A6', flexShrink: 0, mt: 0.2 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
            {m.userProductName}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>זוהה כ:</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontWeight: 500, lineHeight: 1.3, flex: 1 }}>
              {m.itemName}
            </Typography>
            <Box sx={{
              bgcolor: `${confColor}20`, color: confColor,
              fontSize: 9, fontWeight: 800, px: 0.6, py: 0.15, borderRadius: '4px',
            }}>
              {confidenceLabel(m.matchConfidence)}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.4 }}>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontFamily: 'monospace' }}>₪{m.price.toFixed(2)}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>×</Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>{m.userQuantity}</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>=</Typography>
            <Typography sx={{ fontSize: 12, color: '#0D9488', fontFamily: 'monospace', fontWeight: 900 }}>₪{subtotal.toFixed(2)}</Typography>
          </Box>
        </Box>
        <ExpandMoreIcon sx={{
          fontSize: 16, color: 'text.disabled', flexShrink: 0, mt: 0.25,
          transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>
      <Collapse in={open}>
        <Box sx={{
          px: 1, pb: 1, pt: 0.6,
          borderTop: '1px dashed',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)',
          animation: `${slideDown} 0.25s ease`,
        }}>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 0.5, lineHeight: 1.5 }}>
            בירקנו את השם שכתבת למילים והשוונו למאגר. ירוק = מילה שנמצאה במוצר:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 0.75 }}>
            {m.userTokens.map(tok => {
              const hit = m.matchedTokens.includes(tok);
              return (
                <Box key={tok} sx={{
                  fontSize: 9.5, px: 0.6, py: 0.15,
                  bgcolor: hit ? 'rgba(20,184,166,0.18)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  color: hit ? '#0D9488' : 'text.disabled',
                  fontWeight: hit ? 700 : 500, borderRadius: '4px',
                }}>
                  {hit && '✓ '}{tok}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px' }}>
            {m.manufacturerName && (
              <>
                <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 600 }}>יצרן:</Typography>
                <Typography sx={{ fontSize: 9.5, color: 'text.secondary' }}>{m.manufacturerName}</Typography>
              </>
            )}
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 600 }}>ברקוד:</Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontFamily: 'monospace' }}>{m.barcode || '-'}</Typography>
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 600 }}>ודאות:</Typography>
            <Typography sx={{ fontSize: 9.5, fontWeight: 700, color: confColor }}>
              {confidenceLabel(m.matchConfidence)} ({Math.round(m.matchConfidence * 100)}%)
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
});
MatchedRow.displayName = 'MatchedRow';

// שורת פריט שלא זוהה
const UnmatchedRow = memo(({ m, isDark }: { m: PriceMatch; isDark?: boolean }) => (
  <Box sx={{
    display: 'flex', alignItems: 'center', gap: 1, p: 1, borderRadius: '10px',
    bgcolor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(148,163,184,0.04)',
    border: '1px dashed', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.25)',
  }}>
    <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>{m.userProductName}</Typography>
      <Typography sx={{ fontSize: 10, color: 'text.disabled', lineHeight: 1.4 }}>
        לא נמצאה התאמה · נסה שם מפורט יותר
      </Typography>
    </Box>
    <Typography sx={{ fontSize: 10.5, color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}>₪?</Typography>
  </Box>
));
UnmatchedRow.displayName = 'UnmatchedRow';

// כרטיס רשימה - מראה סה"כ + ניתן לפתוח לראות פריטים (open נשלט מבחוץ לצורך אקורדיון)
interface ListCardProps {
  group: PriceListGroup;
  isDark?: boolean;
  open: boolean;
  onToggle: () => void;
}
const ListCard = memo(({ group, isDark, open, onToggle }: ListCardProps) => {
  const coverage = group.pendingCount > 0 ? Math.round((group.matchedCount / group.pendingCount) * 100) : 0;
  const matched = group.matches.filter(m => m.matched);
  const unmatched = group.matches.filter(m => !m.matched);

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: '14px', overflow: 'hidden', mb: 1,
        border: '1px solid',
        borderColor: isDark ? `${group.listColor}30` : `${group.listColor}25`,
        bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
      }}
    >
      {/* כותרת הרשימה - תמיד גלויה */}
      <Box
        onClick={onToggle}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, p: 1.5,
          cursor: 'pointer', '&:active': { opacity: 0.9 },
          background: isDark
            ? `linear-gradient(135deg, ${group.listColor}15, ${group.listColor}05)`
            : `linear-gradient(135deg, ${group.listColor}12, ${group.listColor}03)`,
        }}
      >
        <Box sx={{
          width: 40, height: 40, flexShrink: 0,
          borderRadius: '12px', fontSize: 20,
          bgcolor: isDark ? `${group.listColor}25` : `${group.listColor}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid', borderColor: `${group.listColor}35`,
        }}>
          {group.listIcon}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: 'text.primary', lineHeight: 1.25 }}>
              {group.listName}
            </Typography>
            {group.isGroup && (
              <GroupIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            )}
          </Box>
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.15 }}>
            {group.pendingCount} פריטים · {group.matchedCount} זוהו{group.unmatchedCount > 0 ? ` · ${group.unmatchedCount} לא זוהו` : ''}
          </Typography>
          {/* פס כיסוי זעיר */}
          <Box sx={{ mt: 0.5, height: 3, borderRadius: 1.5, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <Box sx={{ height: '100%', width: `${coverage}%`, bgcolor: group.listColor, transition: 'width 0.6s ease' }} />
          </Box>
        </Box>
        <Box sx={{ textAlign: 'left', flexShrink: 0 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 900, color: '#0D9488', fontFamily: 'monospace', lineHeight: 1 }}>
            ₪{group.estimatedTotal.toFixed(2)}
          </Typography>
          <Typography sx={{ fontSize: 9, color: 'text.disabled', mt: 0.25 }}>
            כיסוי {coverage}%
          </Typography>
        </Box>
        <ExpandMoreIcon sx={{
          fontSize: 18, color: 'text.disabled', flexShrink: 0,
          transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      {/* פירוט פריטים - נפתח בלחיצה */}
      <Collapse in={open}>
        <Box sx={{ p: 1.25, borderTop: '1px solid', borderTopColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
          {matched.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {matched.map((m, i) => <MatchedRow key={i} m={m} isDark={isDark} />)}
            </Box>
          )}
          {unmatched.length > 0 && (
            <>
              <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', mt: matched.length > 0 ? 1 : 0, mb: 0.5 }}>
                לא זוהו ({unmatched.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {unmatched.map((m, i) => <UnmatchedRow key={i} m={m} isDark={isDark} />)}
              </Box>
            </>
          )}
          {group.pendingCount === 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled', textAlign: 'center', py: 1 }}>
              אין פריטים ברשימה
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
});
ListCard.displayName = 'ListCard';

export const PriceComparisonCard = memo(({ data, loading, isDark }: Props) => {
  // אקורדיון: רק רשימה אחת פתוחה בו-זמנית
  const [openListId, setOpenListId] = useState<string | null>(null);

  if (loading || !data) return null;

  const freshness = formatRelative(data.lastUpdatedISO);
  const hasLists = data.lists.length > 0;
  const globalCoverage = data.totalPending > 0 ? Math.round((data.totalMatched / data.totalPending) * 100) : 0;

  return (
    <Paper
      sx={{
        p: 2, borderRadius: '18px', mb: 2,
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.15)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.1), rgba(20,184,166,0.02) 60%)'
          : 'linear-gradient(135deg, rgba(20,184,166,0.06), rgba(20,184,166,0.01) 60%)',
        animation: `${fadeIn} 0.5s ease 0.45s both`,
      }}
      elevation={0}
    >
      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25, lineHeight: 1.5 }}>
        כמה יעלה כל אחת מהרשימות שלך באושר עד? חישבנו לפי הפריטים שעדיין לא סומנו כנקנו.
      </Typography>

      {/* מקור + טריות */}
      <Box sx={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.25,
        p: 1, borderRadius: '8px',
        bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
          <InventoryIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.primary' }}>{data.chainName}</Typography>
          {data.totalPrices > 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              · {data.totalPrices.toLocaleString()} מוצרים במאגר
            </Typography>
          )}
        </Box>
        {data.lastUpdatedISO && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, ml: 'auto' }}>
            <UpdateIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>עודכן {freshness}</Typography>
          </Box>
        )}
      </Box>

      {/* מצבים ריקים */}
      {!data.enabled && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.05)',
          border: '1px solid rgba(245,158,11,0.2)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.primary', lineHeight: 1.6 }}>
            ⏳ המאגר עדיין לא נטען. ייבוא ראשוני יתבצע בקרוב.
          </Typography>
        </Box>
      )}

      {data.enabled && !hasLists && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
            אין כרגע פריטים שטרם נקנו ברשימות שלך.
          </Typography>
        </Box>
      )}

      {/* רשימות */}
      {data.enabled && hasLists && (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            {data.lists.map(g => (
              <ListCard
                key={g.listId}
                group={g}
                isDark={isDark}
                open={openListId === g.listId}
                onToggle={() => setOpenListId(prev => prev === g.listId ? null : g.listId)}
              />
            ))}
          </Box>

          {/* סיכום-על */}
          {data.grandTotal !== null && (
            <Box sx={{
              mt: 1, p: 1.5, borderRadius: '14px',
              background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
              boxShadow: '0 3px 12px rgba(20,184,166,0.3)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'white' }}>
                    סה״כ כל הרשימות ({data.lists.length})
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', mt: 0.1 }}>
                    {data.totalMatched} מתוך {data.totalPending} פריטים תומחרו · {data.totalUnmatched > 0 ? `${data.totalUnmatched} לא זוהו` : 'הכל זוהה'}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 19, fontWeight: 900, color: 'white', fontFamily: 'monospace' }}>
                  ₪{data.grandTotal.toFixed(2)}
                </Typography>
              </Box>
              <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.25)', overflow: 'hidden' }}>
                <Box sx={{ height: '100%', width: `${globalCoverage}%`, bgcolor: 'white', transition: 'width 0.8s ease' }} />
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Footer */}
      <Box sx={{
        mt: 1.5, pt: 1.25,
        borderTop: '1px dashed',
        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.5 }}>{data.disclaimer}</Typography>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.5 }}>
          מקור:{' '}
          <Link href={data.sourceUrl} target="_blank" rel="noopener" sx={{ color: '#0D9488', fontWeight: 600, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
            {data.sourceName} ↗
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
