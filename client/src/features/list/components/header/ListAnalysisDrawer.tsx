import { useEffect, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Drawer, Typography, IconButton, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import SyncAltRoundedIcon from '@mui/icons-material/SyncAltRounded';
import { aiAssistantApi, AiAssistantStreamError } from '../../../../services/api';
import { aiErrorText } from '../../../aiAssistant/helpers/aiErrorText';
import { AiThinkingIndicator } from '../../../aiAssistant/components/AiThinkingIndicator';
import { AiAssistantIcon } from '../../../../global/components';
import { renderInlineBold } from '../../../../global/helpers';
import { useSettings } from '../../../../global/context/SettingsContext';
import { priceComparisonApi } from '../../../priceComparison/services/priceComparison.api';
import { getCheapestChain } from '../../../priceComparison/helpers/priceComparisonCardHelpers';
import type { PriceListGroup, PriceChainTotal } from '../../../priceComparison/types/priceComparison.types';

interface ListAnalysisDrawerProps {
  open: boolean;
  onClose: () => void;
  listId: string;
  listName: string;
  productNames: string[];
}

function buildAnalysisPrompt(listName: string, productNames: string[], language: string): string {
  const items = productNames.slice(0, 30).join(', ');
  const isSmallList = productNames.length <= 3;
  if (language !== 'he') {
    const langName = language === 'ru' ? 'Russian' : 'English';
    return (
      `Analyze the shopping list "${listName}" which contains: ${items}.\n` +
      `Use my real history and habits data that already appears in the context (frequent products, products I forgot, categories due for restock, spending by category) - do not invent data and do not write generic answers that would fit any list.\n` +
      (isSmallList
        ? `Note: this list has only ${productNames.length} products - too few for a full, forced analysis. Do not "stretch" content to fill all three sections - if you genuinely have nothing to say in a section (e.g. nothing else to add, or no relevant saving tip for these items), write explicitly "Not enough here to add" instead of a generic filler.\n`
        : '') +
      `If a product name in the list is vague, too generic, or it is unclear what exactly it is (e.g. the result of imprecise text recognition) - do not confidently guess the intent. Briefly note that the name is unclear instead of treating it as a specific, known product.\n` +
      `Answer in ${langName} in a short, structured format with exactly 3 sections:\n` +
      `🛒 **Summary**: what stands out about this specific list - main categories, unusual quantity, or a connection to my usual shopping habits (one concrete sentence, not a generic description).\n` +
      `➕ **What to add**: up to 3 specific missing products - first check against the forgotten products / restock categories in the context, and only if there is no match, suggest by logic (a short line for each + a brief reason).\n` +
      `💡 **Saving tip**: one recommendation that refers specifically to a product or category that IS in this list (e.g. price comparison to the cheapest chain, quantity, alternative brand) - not a generic tip that fits any list.\n` +
      `If there is not enough specific information for a section - say so briefly instead of filling it with generalities.\n` +
      `Do not add extra headings, do not explain yourself, only the 3 sections.`
    );
  }
  return (
    `נתח את רשימת הקניות "${listName}" שמכילה: ${items}.\n` +
    `השתמש בנתוני ההיסטוריה וההרגלים האמיתיים שלי שכבר מופיעים בהקשר (מוצרים שכיחים, מוצרים ששכחתי, קטגוריות לחידוש, הוצאה לפי קטגוריה) - אל תמציא נתונים ואל תכתוב תשובות כלליות שמתאימות לכל רשימה.\n` +
    (isSmallList
      ? `שים לב: ברשימה הזו רק ${productNames.length} מוצרים - זה מעט מדי בשביל ניתוח מלא ומאולץ. אל "תמתח" תוכן כדי למלא את שלושת הסעיפים - אם אין לך מה לומר בסעיף מסוים באמת (למשל אין עוד מה להוסיף, או אין טיפ חיסכון רלוונטי לפריטים האלה), כתוב במפורש "אין לי מספיק כדי להוסיף כאן" במקום המצאה גנרית.\n`
      : '') +
    `אם שם מוצר ברשימה מעורפל, כללי מדי, או לא ברור מה בדיוק הוא (למשל תוצאה של זיהוי טקסט לא מדויק) - אל תנחש בביטחון מה הכוונה. ציין בקצרה שהשם לא ברור במקום להתייחס אליו כאילו זה מוצר ספציפי ומוכר.\n` +
    `ענה בעברית בפורמט קצר ומובנה עם 3 סעיפים בלבד:\n` +
    `🛒 **סיכום**: מה בולט ברשימה הזו ספציפית - קטגוריות עיקריות, כמות חריגה, או קשר להרגלי הקנייה הרגילים שלי (משפט אחד קונקרטי, לא תיאור גנרי).\n` +
    `➕ **מה כדאי להוסיף**: עד 3 מוצרים ספציפיים שחסרים - קודם בדוק מול המוצרים ששכחתי/קטגוריות לחידוש בהקשר, ורק אם אין התאמה תציע לפי הגיון (שורה קצרה לכל אחד + נימוק קצר).\n` +
    `💡 **טיפ לחיסכון**: המלצה אחת שמתייחסת ספציפית למוצר או קטגוריה שכן ברשימה הזו (למשל השוואת מחיר לרשת הזולה, כמות, מותג חלופי) - לא טיפ גנרי שמתאים לכל רשימה.\n` +
    `אם אין מספיק מידע ספציפי לסעיף מסוים - כתוב זאת בקצרה במקום למלא בכלליות.\n` +
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

    const prompt = buildAnalysisPrompt(listName, productNames, settings.language);
    const MAX_ATTEMPTS = 2;

    // מודל ה-reasoning (gpt-oss) לפעמים "נכשל" חד-פעמית - stream ריק/מתנתק
    // באמצע בלי סיבה עקבית. נסיון שקט נוסף (בלי להראות שגיאה קודם) פותר את
    // רוב המקרים במקום להציג "נסה שוב" על תקלה שבפועל הייתה חולפת. 503
    // (לא מוגדר בשרת) ו-429 (מכסה נגמרה) הם תקלות אמיתיות שנסיון נוסף לא
    // יעזור להן - לא חוזרים עליהן.
    const runAnalysis = async (attemptNum: number): Promise<void> => {
      if (attemptNum > 1) {
        setText('');
        setFallback(false);
      }
      try {
        await aiAssistantApi.chatStream(
          [{ role: 'user', content: prompt }],
          (delta) => {
            setLoading(false);
            setText(prev => prev + delta);
          },
          () => setFallback(true)
        );
        setDone(true);
        setLoading(false);
      } catch (err) {
        const status = err instanceof AiAssistantStreamError ? err.status : undefined;
        const isRetryable = status !== 503 && status !== 429;
        if (isRetryable && attemptNum < MAX_ATTEMPTS) {
          await runAnalysis(attemptNum + 1);
          return;
        }
        setError(aiErrorText(err, t));
        setLoading(false);
      }
    };
    runAnalysis(1);

    setPriceLoading(true);
    priceComparisonApi.getComparison(listId)
      .then(res => {
        const group = res.lists?.find(l => l.listId === listId) ?? res.lists?.[0] ?? null;
        setPriceGroup(group ?? null);
        setChainTotals(res.chainTotals ?? []);
      })
      .catch(() => { setPriceGroup(null); setChainTotals([]); })
      .finally(() => setPriceLoading(false));
  }, [open, listId, listName, productNames, settings.language]);

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
      state: { initialPrompt: t('tellMeMoreAboutList').replace('{name}', listName) },
    });
  };

  // עיבוד טקסט פשוט: **bold** → מודגש (renderInlineBold, משותף עם הצ'אט), שורות ריקות → רווח
  const renderText = (raw: string) => {
    return raw.split('\n').map((line, i) => (
      <Typography key={i} component="p" sx={{
        fontSize: 14.5, lineHeight: 1.75, color: 'text.primary',
        mb: line.trim() === '' ? 0.5 : 0,
      }}>
        {renderInlineBold(line, `${i}-`)}
      </Typography>
    ));
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
            {t('listAnalysisTitle')}
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
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>{t('analyzingList')}</Typography>
          </Box>
        )}
        {error && (
          <Typography sx={{ fontSize: 14, color: 'error.main', py: 2 }}>
            {error}
          </Typography>
        )}

        {/* מצב קצה: הבקשה הצליחה (done, אין error) אבל שום טקסט לא חזר -
            בלי זה הדראוור פשוט "מדלג" ישר לכרטיס המחיר בלי שום הסבר,
            ונראה כאילו הניתוח נעלם/לא רץ בכלל. */}
        {done && !text && !error && (
          <Typography sx={{ fontSize: 13, color: 'text.secondary', py: 1.5 }}>
            {t('noAnalysisThisTime')}
          </Typography>
        )}

        {text && (
          <Box sx={{
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
            borderRadius: '16px',
            p: 2,
            mb: 1.5,
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

        {/* הערכת מחיר אמיתית - מגיעה ממאגר המחירים הממשלתי, לא ניחוש של ה-AI.
            מוצגת בנפרד וברור מהניתוח הטקסטואלי כדי שלא יתערבבו כמקור אמון.
            המחיר המוצג הוא של הרשת הזולה ביותר (מ-chainTotals) ולא רק אושר עד -
            כי אושר עד הוא ה-BETA_CHAIN_ID שלא בהכרח מכסה את כל המוצרים. */}
        {!priceLoading && (() => {
          // רשימת תצוגה ממוינת לפי מחיר, אבל "הזולה ביותר" עצמה נקבעת לפי
          // getCheapestChain (אותה פונקציה שמשמשת את טאב "מחירים" בתובנות) -
          // מכסה מלאה קודם, ורק בלי מכסה מלאה - הכי הרבה התאמות ואז הכי זול.
          // בלי זה, רשת שהתאימה פריט זול יחיד (למשל 1 מתוך 5) יכולה להיראות
          // "הזולה ביותר" מול רשת שהתאימה את כל הסל - בדיוק ההפך מהאמת.
          const chainsWithMatches = [...chainTotals]
            .filter(c => c.matchedCount > 0 && c.total > 0)
            .sort((a, b) => a.total - b.total);
          const cheapest = getCheapestChain(chainTotals);
          // פירוט מוצרים - מהרשת הזולה אם יש, אחרת מהרשת הראשית (priceGroup)
          const matchedItems = priceGroup?.matches?.filter(m => m.matched) ?? [];
          // אין שום נתון מחיר - מציגים הודעה מפורשת "לא זוהה" במקום להיעלם
          // בשקט, כדי שהמשתמש יידע שהערכת המחיר פשוט לא זמינה לרשימה הזו
          // (ולא שהיא נשכחה/נכשלה בטעות).
          if (!cheapest && matchedItems.length === 0) {
            return (
              <Box sx={{
                mb: 1.5, px: 2, py: 1.25, borderRadius: '14px',
                bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                display: 'flex', alignItems: 'center', gap: 1,
              }}>
                <Typography sx={{ fontSize: 18 }}>🛒</Typography>
                <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  {t('priceNotIdentifiedForList')}
                </Typography>
              </Box>
            );
          }
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
                    {t('estimatedBasketCost')}
                  </Typography>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: isDark ? '#2DD4BF' : '#0F766E', lineHeight: 1.1 }}>
                    ₪{Math.round(displayTotal)}
                  </Typography>
                  {totalItems > 0 && (
                    <Typography sx={{ fontSize: 10.5, color: isDark ? 'rgba(94,234,212,0.7)' : '#0F766E', opacity: 0.8, mt: 0.2 }}>
                      {t('itemsIdentifiedOfTotal').replace('{matched}', String(matchedCount)).replace('{total}', String(totalItems))}
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
                    {t('priceComparisonShort')}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    {chainsWithMatches.slice(0, 4).map((c) => {
                      const isFairCheapest = c.chainId === cheapest?.chainId;
                      return (
                        <Box key={c.chainId} sx={{
                          display: 'flex', alignItems: 'center', gap: 0.6,
                          px: 1.25, py: 0.5, borderRadius: '999px',
                          bgcolor: isFairCheapest
                            ? (isDark ? '#14B8A6' : '#0D9488')
                            : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        }}>
                          {isFairCheapest && (
                            <Typography sx={{ fontSize: 11, color: 'white', fontWeight: 800, lineHeight: 1 }}>
                              {t('cheapestTag')}
                            </Typography>
                          )}
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: isFairCheapest ? 'white' : 'text.primary' }}>
                            {c.chainName}
                          </Typography>
                          <Typography sx={{ fontSize: 11, fontWeight: 700, color: isFairCheapest ? 'rgba(255,255,255,0.85)' : 'text.secondary' }}>
                            ₪{Math.round(c.total)}
                          </Typography>
                        </Box>
                      );
                    })}
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
