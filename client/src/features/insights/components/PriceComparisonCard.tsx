import { memo } from 'react';
import { Box, Typography, Paper, keyframes } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { PriceComparisonData } from '../../../services/api';

const fadeIn = keyframes`from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}`;

interface Props {
  data: PriceComparisonData | null;
  loading?: boolean;
  isDark?: boolean;
}

export const PriceComparisonCard = memo(({ data, loading, isDark }: Props) => {
  // בזמן טעינה - לא מציגים כלום כדי לא להלחיץ את העמוד
  if (loading || !data) return null;

  const hasMatches = data.matchedCount > 0;

  return (
    <Paper
      sx={{
        p: 2, borderRadius: '16px', mb: 2,
        border: '1px solid',
        borderColor: isDark ? 'rgba(20,184,166,0.2)' : 'rgba(20,184,166,0.15)',
        background: isDark
          ? 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(20,184,166,0.02))'
          : 'linear-gradient(135deg, rgba(20,184,166,0.05), rgba(20,184,166,0.015))',
        animation: `${fadeIn} 0.5s ease 0.45s both`,
      }}
      elevation={0}
    >
      {/* כותרת עם BETA */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.25 }}>
        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>🛒 השוואת מחירים</Typography>
        <Box sx={{
          bgcolor: '#14B8A6', borderRadius: '8px', px: 0.75, py: 0.25,
          display: 'inline-flex', alignItems: 'center', gap: 0.5,
          boxShadow: '0 2px 6px rgba(20,184,166,0.35)',
        }}>
          <Typography sx={{ fontSize: 9, fontWeight: 900, color: 'white', letterSpacing: 1 }}>🧪 BETA</Typography>
        </Box>
      </Box>

      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 1.5 }}>
        ברשת <b>{data.chainName}</b>
        {data.totalPrices > 0 && ` · ${data.totalPrices.toLocaleString()} מוצרים במאגר`}
      </Typography>

      {/* מצב 1: עדיין לא טענו נתונים */}
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
            {data.topMatches.map((m, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  p: 1, borderRadius: '10px',
                  bgcolor: isDark ? 'rgba(20,184,166,0.05)' : 'rgba(20,184,166,0.03)',
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
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      זוהה כ: {m.itemName}
                    </Typography>
                  )}
                </Box>
                {m.matched ? (
                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#0D9488', flexShrink: 0 }}>
                    ₪{m.price.toFixed(2)}
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: 10.5, color: 'text.disabled', flexShrink: 0 }}>
                    לא נמצא
                  </Typography>
                )}
              </Box>
            ))}
          </Box>

          {/* סה"כ משוער */}
          {data.estimatedBasketTotal !== null && (
            <Box sx={{
              mt: 1.5, p: 1.25, borderRadius: '10px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              bgcolor: '#14B8A6',
              boxShadow: '0 2px 8px rgba(20,184,166,0.25)',
            }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'white' }}>
                סה"כ משוער לסל
              </Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 900, color: 'white' }}>
                ₪{data.estimatedBasketTotal.toFixed(2)}
              </Typography>
            </Box>
          )}
        </>
      )}

      {/* Disclaimer */}
      <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 1.25, lineHeight: 1.4 }}>
        {data.disclaimer}
      </Typography>
    </Paper>
  );
});

PriceComparisonCard.displayName = 'PriceComparisonCard';
