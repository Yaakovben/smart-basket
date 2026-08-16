import { useEffect, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Drawer, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import { aiAssistantApi, AiAssistantStreamError } from '../../../../services/api';
import { AiThinkingIndicator } from '../../../aiAssistant/components/AiThinkingIndicator';
import { AiAssistantIcon } from '../../../../global/components';
import { useSettings } from '../../../../global/context/SettingsContext';
import { priceComparisonApi } from '../../../priceComparison/services/priceComparison.api';
import type { PriceListGroup, PriceChainTotal } from '../../../priceComparison/types/priceComparison.types';

interface ListAnalysisDrawerProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  productNames: string[];
}

// ממיר resetAt (ISO string מהשרת) למספר דקות עגול עד האיפוס - אותה לוגיקה
// כמו ב-useAiAssistantChat.ts, לא ייצאנו hook משותף כי זה state קטן מקומי.
function minutesUntil(resetAt: string | null | undefined): number | null {
  if (!resetAt) return null;
  const ms = new Date(resetAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.ceil(ms / 60_000));
}

function buildAnalysisPrompt(listName: string, productNames: string[]): string {
  const items = productNames.slice(0, 40).join(', ');
  return (
    `נתח את רשימת הקניות "${listName}" שמכילה: ${items}.\n` +
    `ענה בעברית בפורמט קצר ומובנה עם 3 סעיפים בלבד:\n` +
    `🛒 **סיכום**: קטגוריות עיקריות ומה בולט ברשימה (משפט אחד).\n` +
    `➕ **מה כדאי להוסיף**: עד 3 מוצרים שכנראה נשכחו לפי ההקשר (שורה קצרה לכל אחד).\n` +
    `💡 **טיפ לחיסכון**: המלצה אחת ספציפית וישימה.\n` +
    `אל תוסיף כותרות נוספות, אל תסביר את עצמך, רק את 3 הסעיפים.`
  );
}

export const ListAnalysisDrawer = memo(({ open, onClose, listId, listName, productNames }: ListAnalysisDrawerProps) => {
  const navigate = useNavigate();
  const { t, settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const ranRef = useRef(false);

  // הערכת מחיר אמיתית (לא ניחוש של ה-AI) - מגיעה ממאגר המחירים הממשלתי,
  // אותו endpoint שמזין את טאב "מחירים" בתובנות. נטענת במקביל לניתוח הטקסטואלי.
  const [priceGroup, setPriceGroup] = useState<PriceListGroup | null>(null);
  const [chainTotals, setChainTotals] = useState<PriceChainTotal[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);

  useEffect(() => {
    if (!open || ranRef.current) return;
    ranRef.current = true;
    setText('');
    setDone(false);
    setError(null);
    setFallback(false);
    setLoading(true);

    const prompt = buildAnalysisPrompt(listName, productNames);
    aiAssistantApi.chatStream(
      [{ role: 'user', content: prompt }],
      (delta) => {
        setLoading(false);
        setText(prev => prev + delta);
      },
      () => setFallback(true)
    )
      .then(() => setDone(true))
      .catch((err) => {
        const status = err instanceof AiAssistantStreamError ? err.status : undefined;
        const minutes = err instanceof AiAssistantStreamError ? minutesUntil(err.resetAt) : null;
        const message = status === 503
          ? t('aiNotConfigured')
          : status === 429
          ? t('aiTooManyMessages') + (minutes ? ` ${t('aiTryAgainInMinutes').replace('{minutes}', String(minutes))}` : '')
          : t('aiGenericError');
        setError(message);
        setLoading(false);
      })
      .finally(() => setLoading(false));

    setPriceLoading(true);
    priceComparisonApi.getComparison(listId)
      .then(res => {
        const group = res.lists?.find(l => l.listId === listId) ?? res.lists?.[0] ?? null;
        setPriceGroup(group ?? null);
        setChainTotals(res.chainTotals ?? []);
      })
      .catch(() => { setPriceGroup(null); setChainTotals([]); })
      .finally(() => setPriceLoading(false));
  }, [open, listId, listName, productNames]);

  // איפוס כשהdrawer נסגר - מוכן לפתיחה הבאה
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      ranRef.current = false;
      setText('');
      setDone(false);
      setError(null);
      setFallback(false);
      setPriceGroup(null);
      setChainTotals([]);
    }, 300);
  };

  const goToChat = () => {
    handleClose();
    navigate('/assistant', {
      state: { initialPrompt: `ספר לי עוד על הרשימה "${listName}" ואיך לשפר אותה` },
    });
  };

  // עיבוד טקסט פשוט: **bold** → מודגש, שורות ריקות → רווח
  const renderText = (raw: string) => {
    return raw.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <Typography key={i} component="p" sx={{
          fontSize: 14.5, lineHeight: 1.75, color: 'text.primary',
          mb: line.trim() === '' ? 0.5 : 0,
        }}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <Box key={j} component="span" sx={{ fontWeight: 800 }}>{part}</Box>
              : part
          )}
        </Typography>
      );
    });
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(2px)' } } }}
      PaperProps={{
        sx: {
          borderRadius: '24px 24px 0 0',
          maxHeight: '75dvh',
          bgcolor: isDark ? '#1E293B' : '#FAFAFA',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        },
      }}
    >
      {/* ידית גרירה */}
      <Box sx={{ pt: 1.25, pb: 0.5, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
      </Box>

      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pb: 1.5, gap: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '12px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
        }}>
          <AiAssistantIcon sx={{ color: 'white', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            ניתוח הרשימה
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {listName}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* תוכן */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}>
            <AiThinkingIndicator />
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>מנתח את הרשימה...</Typography>
          </Box>
        )}
        {error && (
          <Typography sx={{ fontSize: 14, color: 'error.main', py: 2 }}>
            {error}
          </Typography>
        )}

        {/* הערכת מחיר אמיתית - מגיעה ממאגר המחירים הממשלתי, לא ניחוש של ה-AI.
            מוצגת בנפרד וברור מהניתוח הטקסטואלי כדי שלא יתערבבו כמקור אמון.
            המחיר המוצג הוא של הרשת הזולה ביותר (מ-chainTotals) ולא רק אושר עד -
            כי אושר עד הוא ה-BETA_CHAIN_ID שלא בהכרח מכסה את כל המוצרים. */}
        {!priceLoading && (() => {
          // הרשת הזולה ביותר שיש לה לפחות התאמה אחת
          const chainsWithMatches = [...chainTotals]
            .filter(c => c.matchedCount > 0 && c.total > 0)
            .sort((a, b) => a.total - b.total);
          const cheapest = chainsWithMatches[0];
          // פירוט מוצרים - מהרשת הזולה אם יש, אחרת מהרשת הראשית (priceGroup)
          const matchedItems = priceGroup?.matches?.filter(m => m.matched) ?? [];
          // אין שום נתון מחיר - לא מציגים כלום
          if (!cheapest && matchedItems.length === 0) return null;
          const displayTotal = cheapest?.total ?? priceGroup?.estimatedTotal ?? 0;
          const totalItems = (priceGroup?.matchedCount ?? 0) + (priceGroup?.unmatchedCount ?? 0);
          const matchedCount = cheapest?.matchedCount ?? priceGroup?.matchedCount ?? 0;
          return (
            <Box sx={{
              mb: 1.5, borderRadius: '16px', overflow: 'hidden',
              border: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.2)' : '#CCFBF1',
            }}>
              {/* כותרת + סכום */}
              <Box sx={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                px: 2, py: 1.25,
                bgcolor: isDark ? 'rgba(20,184,166,0.12)' : '#CCFBF1',
              }}>
                <Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: isDark ? '#5EEAD4' : '#0F766E', mb: 0.1, letterSpacing: 0.3 }}>
                    עלות משוערת לסל
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: isDark ? '#2DD4BF' : '#0F766E', lineHeight: 1.1 }}>
                    ₪{Math.round(displayTotal)}
                  </Typography>
                  {totalItems > 0 && (
                    <Typography sx={{ fontSize: 10.5, color: isDark ? 'rgba(94,234,212,0.7)' : '#0F766E', opacity: 0.8, mt: 0.2 }}>
                      {matchedCount} מתוך {totalItems} פריטים זוהו
                    </Typography>
                  )}
                </Box>
                <Box sx={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: isDark ? 'rgba(20,184,166,0.15)' : 'rgba(255,255,255,0.6)',
                  fontSize: 22,
                }}>
                  🛒
                </Box>
              </Box>

              {/* השוואה בין רשתות */}
              {chainsWithMatches.length > 1 && (
                <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: isDark ? 'rgba(20,184,166,0.12)' : '#CCFBF1' }}>
                  <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: 'text.secondary', mb: 0.75 }}>
                    השוואת מחירים
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {chainsWithMatches.slice(0, 4).map((c, idx) => (
                      <Box key={c.chainId} sx={{
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        px: 1.25, py: 0.5, borderRadius: '999px',
                        bgcolor: idx === 0
                          ? (isDark ? '#14B8A6' : '#0D9488')
                          : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                      }}>
                        {idx === 0 && (
                          <Typography sx={{ fontSize: 9, color: 'white', fontWeight: 800, lineHeight: 1 }}>
                            הזול
                          </Typography>
                        )}
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: idx === 0 ? 'white' : 'text.primary' }}>
                          {c.chainName}
                        </Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: idx === 0 ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}>
                          ₪{Math.round(c.total)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* פירוט פריטים */}
              {matchedItems.length > 0 && (
                <Box sx={{ px: 2, py: 1, borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                  {matchedItems.slice(0, 4).map(m => (
                    <Box key={m.productId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.35 }}>
                      <Typography sx={{ fontSize: 12, color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, ml: 0.5 }}>
                        {m.userProductName}
                      </Typography>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary', flexShrink: 0 }}>
                        ₪{Math.round(m.price * m.userQuantity)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        })()}

        {text && (
          <Box sx={{
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
            borderRadius: '16px',
            p: 2,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}>
            {renderText(text)}
            {!done && (
              <Box component="span" sx={{
                display: 'inline-block', width: 8, height: 15, bgcolor: '#14B8A6',
                borderRadius: 1, ml: 0.5, animation: 'blink 0.8s step-end infinite',
                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
              }} />
            )}
          </Box>
        )}

        {/* חיווי עדין - הניתוח הזה הגיע ממודל גיבוי (הספק הראשי נכשל/נגמרה
            לו המכסה). אותו חיווי כמו בצ'אט - ראו ChatBubble.tsx. */}
        {fallback && done && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, mt: 0.75, px: 0.5 }}>
            <SyncAltRoundedIcon sx={{ fontSize: 12, color: isDark ? 'rgba(148,163,184,0.7)' : 'rgba(100,116,139,0.7)' }} />
            <Typography sx={{ fontSize: 10.5, fontWeight: 600, color: isDark ? 'rgba(148,163,184,0.85)' : 'rgba(100,116,139,0.85)' }}>
              {t('aiFallbackNotice')}
            </Typography>
          </Box>
        )}
      </Box>

      {/* כפתור המשך */}
      {done && (
        <Box sx={{ px: 2, py: 1.5, pb: 'max(16px, env(safe-area-inset-bottom))', borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ChatRoundedIcon sx={{ fontSize: 17 }} />}
            onClick={goToChat}
            sx={{
              borderRadius: '14px', textTransform: 'none', fontWeight: 700, fontSize: 14,
              borderColor: isDark ? 'rgba(20,184,166,0.4)' : '#99F6E4',
              color: isDark ? '#5EEAD4' : '#0F766E',
              '& .MuiButton-startIcon': { marginInlineEnd: '10px' },
              '&:hover': { bgcolor: isDark ? 'rgba(20,184,166,0.08)' : '#F0FDFA', borderColor: '#14B8A6' },
            }}
          >
            {t('continueChatWithAi')}
          </Button>
        </Box>
      )}
    </Drawer>
  );
});

ListAnalysisDrawer.displayName = 'ListAnalysisDrawer';
