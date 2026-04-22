import { memo, useState } from 'react';
import { Box, Typography, Paper, Collapse, Link, keyframes } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import UpdateIcon from '@mui/icons-material/Update';
import InventoryIcon from '@mui/icons-material/Inventory2';
import type { PriceComparisonData, PriceMatch } from '../../../services/api';
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

// פריט בודד עם אפשרות הרחבה להצגת פרטי ההתאמה
const MatchRow = memo(({ m, isDark }: { m: PriceMatch; isDark?: boolean }) => {
  const [open, setOpen] = useState(false);
  const clickable = m.matched;

  return (
    <Box
      sx={{
        borderRadius: '10px',
        bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.035)',
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.08)',
        overflow: 'hidden',
        transition: 'background 0.2s',
        '&:hover': clickable ? { bgcolor: isDark ? 'rgba(20,184,166,0.1)' : 'rgba(20,184,166,0.06)' } : {},
      }}
    >
      <Box
        onClick={clickable ? () => setOpen(v => !v) : undefined}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          p: 1, cursor: clickable ? 'pointer' : 'default',
        }}
      >
        {m.matched ? (
          <CheckCircleIcon sx={{ fontSize: 16, color: '#14B8A6', flexShrink: 0 }} />
        ) : (
          <HelpOutlineIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {m.userProductName}
          </Typography>
          {m.matched && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                ↔ {m.itemName}
              </Typography>
              {/* תג דיוק */}
              <Box sx={{
                bgcolor: `${confidenceColor(m.matchConfidence)}20`,
                color: confidenceColor(m.matchConfidence),
                fontSize: 9, fontWeight: 800, px: 0.6, py: 0.15,
                borderRadius: '4px', flexShrink: 0,
              }}>
                {Math.round(m.matchConfidence * 100)}%
              </Box>
            </Box>
          )}
        </Box>
        {m.matched ? (
          <>
            <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0D9488', flexShrink: 0 }}>
              ₪{m.price.toFixed(2)}
            </Typography>
            <ExpandMoreIcon sx={{
              fontSize: 16, color: 'text.disabled', flexShrink: 0,
              transition: 'transform 0.25s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }} />
          </>
        ) : (
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', flexShrink: 0 }}>
            לא נמצא
          </Typography>
        )}
      </Box>

      {/* פרטי השקיפות המורחבים */}
      <Collapse in={open}>
        <Box sx={{
          p: 1.25,
          pt: 0.5,
          borderTop: '1px dashed',
          borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
          bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.5)',
          animation: `${slideDown} 0.25s ease`,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.75 }}>
            <InfoOutlinedIcon sx={{ fontSize: 12, color: 'text.disabled' }} />
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', letterSpacing: 0.3 }}>
              איך התאמנו?
            </Typography>
          </Box>

          {/* המילים שלך */}
          <Box sx={{ mb: 0.75 }}>
            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', fontWeight: 600, mb: 0.25 }}>
              המילים שלך:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.35 }}>
              {m.userTokens.map(tok => (
                <Box key={tok} sx={{
                  fontSize: 9.5, px: 0.6, py: 0.15,
                  bgcolor: m.matchedTokens.includes(tok) ? 'rgba(20,184,166,0.18)' : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                  color: m.matchedTokens.includes(tok) ? '#0D9488' : 'text.disabled',
                  fontWeight: m.matchedTokens.includes(tok) ? 700 : 500,
                  borderRadius: '4px',
                }}>
                  {m.matchedTokens.includes(tok) && '✓ '}{tok}
                </Box>
              ))}
            </Box>
          </Box>

          {/* פירוט נוסף */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 10px', mt: 0.75 }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>ברקוד:</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace' }}>{m.barcode || '-'}</Typography>

            {m.manufacturerName && (
              <>
                <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>יצרן:</Typography>
                <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{m.manufacturerName}</Typography>
              </>
            )}

            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>רמת דיוק:</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: confidenceColor(m.matchConfidence) }}>
              {confidenceLabel(m.matchConfidence)} ({Math.round(m.matchConfidence * 100)}%)
            </Typography>

            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>כמות ברשימה:</Typography>
            <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>×{m.userQuantity}</Typography>

            <Typography sx={{ fontSize: 10, color: 'text.disabled', fontWeight: 600 }}>סה״כ משוער:</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#0D9488' }}>
              ₪{(m.price * m.userQuantity).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
});
MatchRow.displayName = 'MatchRow';

export const PriceComparisonCard = memo(({ data, loading, isDark }: Props) => {
  if (loading || !data) return null;

  const hasMatches = data.matchedCount > 0;
  const freshness = formatRelative(data.lastUpdatedISO);

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
        position: 'relative',
        overflow: 'hidden',
      }}
      elevation={0}
    >
      {/* דקורציית רקע */}
      <Box sx={{
        position: 'absolute', top: -30, left: -30, width: 110, height: 110,
        borderRadius: '50%', bgcolor: 'rgba(20,184,166,0.06)', pointerEvents: 'none',
      }} />

      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, position: 'relative' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <BetaBadge size="sm" />
      </Box>

      {/* שורת מקור + טריות */}
      <Box sx={{
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1,
        mb: 1.5, position: 'relative',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, fontSize: 11, color: 'text.secondary' }}>
          <InventoryIcon sx={{ fontSize: 12 }} />
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{data.chainName}</Typography>
          {data.totalPrices > 0 && (
            <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
              · {data.totalPrices.toLocaleString()} מוצרים
            </Typography>
          )}
        </Box>
        {data.lastUpdatedISO && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.35, fontSize: 11, color: 'text.disabled' }}>
            <UpdateIcon sx={{ fontSize: 12 }} />
            <Typography sx={{ fontSize: 11 }}>עודכן {freshness}</Typography>
          </Box>
        )}
      </Box>

      {/* מצב 1: לא טעון */}
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

      {/* מצב 2: יש נתונים אבל אין התאמות */}
      {data.enabled && !hasMatches && (
        <Box sx={{
          p: 1.5, borderRadius: '12px',
          bgcolor: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.06)',
        }}>
          <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.6 }}>
            עדיין לא זיהינו התאמות למוצרים שלך. המערכת לומדת — ככל שתשתמש/י יותר,
            ההתאמות ישתפרו.
          </Typography>
        </Box>
      )}

      {/* מצב 3: יש התאמות */}
      {data.enabled && hasMatches && (
        <>
          <Typography sx={{ fontSize: 10.5, color: 'text.disabled', mb: 1, fontStyle: 'italic' }}>
            💡 לחצ/י על כל שורה כדי לראות איך התאמנו
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {data.topMatches.map((m, i) => <MatchRow key={i} m={m} isDark={isDark} />)}
          </Box>

          {/* סה"כ משוער + כמה התאמות */}
          {data.estimatedBasketTotal !== null && (
            <Box sx={{
              mt: 1.5, p: 1.25, borderRadius: '12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
              boxShadow: '0 3px 12px rgba(20,184,166,0.3)',
            }}>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'white' }}>
                  סה"כ משוער לסל
                </Typography>
                <Typography sx={{ fontSize: 9.5, color: 'rgba(255,255,255,0.8)' }}>
                  בהתבסס על {data.matchedCount} התאמות
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 17, fontWeight: 900, color: 'white' }}>
                ₪{data.estimatedBasketTotal.toFixed(2)}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* בלוק שקיפות - מקור + disclaimer */}
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
