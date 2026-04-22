import { memo, useState } from 'react';
import { Box, Typography, Paper, Collapse, Link, keyframes } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import UpdateIcon from '@mui/icons-material/Update';
import InventoryIcon from '@mui/icons-material/Inventory2';
import type { PriceComparisonData, PriceMatch } from '../types/priceComparison.types';
import { BetaBadge } from './BetaBadge';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;
const slideDown = keyframes`from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
}

// פורמט "לפני X זמן" בעברית
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

// שורה של פריט שזוהה - מציגה במפורש למה המערכת התאימה
const MatchedRow = memo(({ m, isDark }: { m: PriceMatch; isDark?: boolean }) => {
  const [open, setOpen] = useState(false);
  const subtotal = m.price * m.userQuantity;
  const confColor = confidenceColor(m.matchConfidence);

  return (
    <Box
      sx={{
        borderRadius: '12px',
        bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.035)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)',
        overflow: 'hidden',
        transition: 'background 0.2s',
      }}
    >
      <Box
        onClick={() => setOpen(v => !v)}
        sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1,
          p: 1.25, cursor: 'pointer',
          '&:active': { opacity: 0.85 },
        }}
      >
        <CheckCircleIcon sx={{ fontSize: 18, color: '#14B8A6', flexShrink: 0, mt: 0.25 }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* שם המוצר כפי שנכתב ע״י המשתמש */}
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: 'text.primary', lineHeight: 1.3 }}>
            {m.userProductName}
          </Typography>

          {/* מה זוהה במאגר - זה החלק הקריטי לשקיפות */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.35, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>
              זוהה כ:
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 500, lineHeight: 1.3 }}>
              {m.itemName}
            </Typography>
            <Box sx={{
              bgcolor: `${confColor}20`, color: confColor,
              fontSize: 9, fontWeight: 800, px: 0.6, py: 0.15,
              borderRadius: '4px',
            }}>
              ודאות {confidenceLabel(m.matchConfidence)}
            </Box>
          </Box>

          {/* נוסחת מחיר ברורה */}
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>
              ₪{m.price.toFixed(2)}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>×</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace', fontWeight: 600 }}>
              {m.userQuantity}
            </Typography>
            <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>=</Typography>
            <Typography sx={{ fontSize: 13, color: '#0D9488', fontFamily: 'monospace', fontWeight: 900 }}>
              ₪{subtotal.toFixed(2)}
            </Typography>
          </Box>
        </Box>
        <ExpandMoreIcon sx={{
          fontSize: 18, color: 'text.disabled', flexShrink: 0, mt: 0.25,
          transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }} />
      </Box>

      {/* פרטי ההתאמה המורחבים */}
      <Collapse in={open}>
        <Box sx={{
          px: 1.25, pb: 1.25, pt: 0.75,
          borderTop: '1px dashed',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)',
          animation: `${slideDown} 0.25s ease`,
        }}>
          {/* איך הותאם - ויזואליזציה של המילים */}
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
            איך זוהה?
          </Typography>
          <Typography sx={{ fontSize: 10, color: 'text.secondary', mb: 0.6, lineHeight: 1.5 }}>
            בירקנו את שם המוצר שכתבת למילים והשוונו למאגר. המילים הירוקות הן אלו שנמצאו במוצר של הרשת:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35, mb: 1 }}>
            {m.userTokens.map(tok => {
              const hit = m.matchedTokens.includes(tok);
              return (
                <Box key={tok} sx={{
                  fontSize: 10, px: 0.75, py: 0.25,
                  bgcolor: hit ? 'rgba(20,184,166,0.18)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  color: hit ? '#0D9488' : 'text.disabled',
                  fontWeight: hit ? 700 : 500,
                  borderRadius: '5px',
                }}>
                  {hit && '✓ '}{tok}
                </Box>
              );
            })}
          </Box>

          {/* פרטים נוספים */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px' }}>
            {m.manufacturerName && (
              <>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>יצרן:</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{m.manufacturerName}</Typography>
              </>
            )}
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>ברקוד:</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace' }}>
              {m.barcode || 'לא זמין'}
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>רמת ודאות:</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: confColor }}>
              {confidenceLabel(m.matchConfidence)} ({Math.round(m.matchConfidence * 100)}%)
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
});
MatchedRow.displayName = 'MatchedRow';

// שורה של פריט שלא זוהה
const UnmatchedRow = memo(({ m, isDark }: { m: PriceMatch; isDark?: boolean }) => (
  <Box
    sx={{
      display: 'flex', alignItems: 'center', gap: 1,
      p: 1.25, borderRadius: '12px',
      bgcolor: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(148,163,184,0.04)',
      border: '1px dashed',
      borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(148,163,184,0.25)',
    }}
  >
    <HelpOutlineIcon sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary' }}>
        {m.userProductName}
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mt: 0.25, lineHeight: 1.4 }}>
        לא נמצאה התאמה במאגר הרשת · נסה שם מפורט יותר
      </Typography>
    </Box>
    <Typography sx={{ fontSize: 11, color: 'text.disabled', fontFamily: 'monospace', flexShrink: 0 }}>
      ₪?
    </Typography>
  </Box>
));
UnmatchedRow.displayName = 'UnmatchedRow';

export const PriceComparisonCard = memo(({ data, loading, isDark }: Props) => {
  if (loading || !data) return null;

  const hasMatches = data.matchedCount > 0;
  const freshness = formatRelative(data.lastUpdatedISO);
  const matched = data.topMatches.filter(m => m.matched);
  const unmatched = data.topMatches.filter(m => !m.matched);
  const totalChecked = data.topMatches.length;
  const coverage = totalChecked > 0 ? Math.round((matched.length / totalChecked) * 100) : 0;

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
      {/* כותרת + שאלה מובילה */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.4 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
      </Box>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.25, lineHeight: 1.5 }}>
        כמה יעלה לך הסל באושר עד? בדקנו את הפריטים שעדיין לא סימנת כנקנו.
      </Typography>

      {/* בלוק מקור + טריות */}
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

      {/* מצב 1: מאגר לא נטען */}
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

      {/* מצב 2: יש מאגר אבל אין התאמות */}
      {data.enabled && !hasMatches && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
            עדיין לא זיהינו התאמות לפריטים שלך. נסה להשתמש בשמות מפורטים יותר (לדוג׳ "עגבניה שרי" במקום "עגבניה").
          </Typography>
        </Box>
      )}

      {/* מצב 3: יש התאמות - ההצגה המלאה */}
      {data.enabled && hasMatches && (
        <>
          {/* בלוק סטטיסטיקה - היקף ברור */}
          <Box sx={{
            p: 1.25, mb: 1.25, borderRadius: '12px',
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5,
            bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.05)',
            border: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(20,184,166,0.12)',
          }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>
                {totalChecked}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                פריטים נבדקו
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center', borderInlineStart: '1px solid', borderInlineEnd: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: '#14B8A6', lineHeight: 1 }}>
                {matched.length}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                ✓ זוהו
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'text.disabled', lineHeight: 1 }}>
                {unmatched.length}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                לא זוהו
              </Typography>
            </Box>
          </Box>

          {/* הסבר היקף - כולל מקור הרשימות */}
          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mb: 1, lineHeight: 1.5, px: 0.25 }}>
            📋 הפריטים נלקחו מכל הרשימות שלך (פרטיות וקבוצתיות) שעדיין לא סומנו כנקנו.
            לחיצה על פריט חושפת איך זוהה.
          </Typography>

          {/* פריטים שזוהו */}
          {matched.length > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 1 }}>
              {matched.map((m, i) => <MatchedRow key={i} m={m} isDark={isDark} />)}
            </Box>
          )}

          {/* פריטים שלא זוהו */}
          {unmatched.length > 0 && (
            <>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, color: 'text.secondary', mt: 1, mb: 0.6, px: 0.25 }}>
                לא זוהו במאגר ({unmatched.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, mb: 1 }}>
                {unmatched.map((m, i) => <UnmatchedRow key={i} m={m} isDark={isDark} />)}
              </Box>
            </>
          )}

          {/* סיכום סופי */}
          {data.estimatedBasketTotal !== null && (
            <Box sx={{ mt: 1.25 }}>
              <Box sx={{
                p: 1.5, borderRadius: '14px',
                background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                boxShadow: '0 3px 12px rgba(20,184,166,0.3)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                  <Box>
                    <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'white' }}>
                      סה״כ משוער ({matched.length} פריטים)
                    </Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.85)', mt: 0.1 }}>
                      כיסוי {coverage}% מהרשימה · פריטים שלא זוהו לא נכללים
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 900, color: 'white', fontFamily: 'monospace' }}>
                    ₪{data.estimatedBasketTotal.toFixed(2)}
                  </Typography>
                </Box>
                {/* פס כיסוי ויזואלי */}
                <Box sx={{
                  height: 4, borderRadius: 2, bgcolor: 'rgba(255,255,255,0.2)', overflow: 'hidden',
                }}>
                  <Box sx={{
                    height: '100%', width: `${coverage}%`, bgcolor: 'white',
                    transition: 'width 0.8s ease',
                  }} />
                </Box>
              </Box>
            </Box>
          )}
        </>
      )}

      {/* Footer - מקור ו-disclaimer */}
      <Box sx={{
        mt: 1.5, pt: 1.25,
        borderTop: '1px dashed',
        borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.5 }}>
          {data.disclaimer}
        </Typography>
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
