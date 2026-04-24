/**
 * PriceSyncManager - מודאל אדמין לניהול מאגר המחירים.
 *
 * מציג:
 *  - סטטוס נוכחי: מתי עודכן, כמה מוצרים בכל רשת
 *  - כפתור "רענן עכשיו" שמפעיל סנכרון ידני (POST /api/price-comparison/refresh)
 *  - רענון אוטומטי של הסטטוס כל 10 שניות בזמן סנכרון פעיל
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, LinearProgress, keyframes } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PlaceIcon from '@mui/icons-material/Place';
import SyncIcon from '@mui/icons-material/Sync';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';
import { priceComparisonApi, type PriceSyncStatus } from '../../priceComparison';

interface Props {
  onClose: () => void;
}

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const formatAge = (hours: number | null): string => {
  if (hours === null) return 'לא ידוע';
  if (hours < 1) return `לפני ${Math.round(hours * 60)} דק'`;
  if (hours < 24) return `לפני ${hours.toFixed(1)} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
};

// תרגום קודי שגיאה טכניים לעברית קריאה. שגיאות נפוצות מהפורטל
// בד"כ אומרות שהרשת לא פרסמה קובץ היום - לא תקלה אצלנו.
const humanizeError = (raw: string): { msg: string; severity: 'soft' | 'hard' } => {
  if (/no_price_file_found/i.test(raw)) return { msg: 'הרשת לא פרסמה מחירים היום', severity: 'soft' };
  if (/no_stores_file_found/i.test(raw)) return { msg: 'הרשת לא פרסמה קובץ סניפים', severity: 'soft' };
  if (/no_stores_in_file/i.test(raw)) return { msg: 'קובץ הסניפים ריק', severity: 'soft' };
  if (/adapter_has_no_stores_support/i.test(raw)) return { msg: 'אין תמיכה בסניפים לרשת זו', severity: 'soft' };
  if (/401|unauthorized|login|invalid.*user/i.test(raw)) return { msg: 'משתמש/סיסמה לא תקפים בפורטל', severity: 'hard' };
  if (/timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) return { msg: 'תקלת רשת זמנית - ננסה שוב בסנכרון הבא', severity: 'soft' };
  if (/rate.?limit|too.?many/i.test(raw)) return { msg: 'חריגת קצב מהפורטל', severity: 'soft' };
  return { msg: raw, severity: 'hard' };
};

export const PriceSyncManager = ({ onClose }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [status, setStatus] = useState<PriceSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // הודעת פידבק אינליין (במקום toast) - הכי פשוט ואין תלות ב-props
  const [feedback, setFeedback] = useState<{ msg: string; tone: 'info' | 'error' } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await priceComparisonApi.getStatus();
      setStatus(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // רענון אוטומטי כל 3 שניות בזמן סנכרון פעיל - נותן תחושת פרוגרס רציף
  useEffect(() => {
    if (!status?.syncInProgress) return;
    const interval = setInterval(load, 3_000);
    return () => clearInterval(interval);
  }, [status?.syncInProgress, load]);

  const handleRefresh = async () => {
    haptic('medium');
    setRefreshing(true);
    setFeedback(null);
    try {
      const res = await priceComparisonApi.refresh();
      setFeedback({ msg: res.message || 'סנכרון החל', tone: 'info' });
      // רענון הסטטוס אחרי 2 שניות כדי שהדגל syncInProgress יקפוץ
      setTimeout(load, 2000);
    } catch {
      setFeedback({ msg: 'שגיאה בהפעלת סנכרון', tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const totalPrices = status?.totalPrices ?? 0;
  const chains = status?.chains ?? [];
  const syncActive = !!status?.syncInProgress || refreshing;

  // אגרגציות של סניפים - מוצג כהתקדמות במהלך הסנכרון
  const totalBranches = chains.reduce((s, c) => s + (c.branchCount ?? 0), 0);
  const totalBranchesWithCoords = chains.reduce((s, c) => s + (c.branchesWithCoords ?? 0), 0);
  const coordsPct = totalBranches > 0
    ? Math.round((totalBranchesWithCoords / totalBranches) * 100)
    : 0;

  // סיכום הצלחות/כשלונות - מחושב מתוצאות הסנכרון האחרון
  const chainOutcome = (c: typeof chains[number]) => {
    if (c.lastSyncError) return humanizeError(c.lastSyncError).severity === 'hard' ? 'failed' : 'skipped';
    if (c.count > 0) return 'ok';
    return 'empty';
  };
  const successCount = chains.filter(c => chainOutcome(c) === 'ok').length;
  const failedCount = chains.filter(c => chainOutcome(c) === 'failed').length;
  const skippedCount = chains.filter(c => chainOutcome(c) === 'skipped').length;

  return (
    <Modal title="ניהול מאגר מחירים" onClose={onClose}>
      {/* גובה קבוע כמו ב-DailyFaithManager - הפופאפ לא מתארך מעבר לזה */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: 'min(70vh, 580px)', overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#14B8A6' }} />
          </Box>
        ) : (
          <>
            {/* כרטיס סטטוס - סה"כ + מתי עודכן */}
            <Box sx={{
              p: 1.75,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
              color: 'white',
              boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                <StorefrontIcon sx={{ fontSize: 22 }} />
                <Typography sx={{ fontSize: 13, fontWeight: 700, opacity: 0.9 }}>
                  סה"כ מוצרים במאגר
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 32, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                {totalPrices.toLocaleString('he-IL')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, opacity: 0.9 }}>
                <ScheduleIcon sx={{ fontSize: 13 }} />
                <Typography sx={{ fontSize: 11.5 }}>
                  עודכן {formatAge(status?.ageHours ?? null)}
                </Typography>
              </Box>
            </Box>

            {/* באנר התקדמות - עם אחוז אמיתי ושם הרשת הנוכחית */}
            {syncActive && (() => {
              const prog = status?.syncProgress;
              const total = prog?.totalChains ?? 0;
              const done = prog?.completedChains ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <Box sx={{
                  p: 1.5, borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.2)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.85 }}>
                    <SyncIcon sx={{ fontSize: 18, color: '#7C3AED', animation: `${spin} 1.8s linear infinite` }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#7C3AED', flex: 1 }}>
                      סנכרון פעיל
                    </Typography>
                    {total > 0 && (
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#7C3AED', fontVariantNumeric: 'tabular-nums' }}>
                        {pct}%
                      </Typography>
                    )}
                  </Box>
                  <LinearProgress
                    variant={total > 0 ? 'determinate' : 'indeterminate'}
                    value={pct}
                    sx={{
                      height: 6, borderRadius: 3,
                      bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      '& .MuiLinearProgress-bar': {
                        background: 'linear-gradient(90deg, #7C3AED, #A78BFA)',
                      },
                    }}
                  />
                  {total > 0 ? (
                    <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.75, lineHeight: 1.5 }}>
                      רשת <b>{done} מתוך {total}</b>
                      {prog?.currentChainName && done < total && ` · מעבד כעת: ${prog.currentChainName}`}
                    </Typography>
                  ) : (
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.75, lineHeight: 1.5 }}>
                      מתחיל סנכרון... יכול לקחת 3-5 דקות.
                    </Typography>
                  )}
                </Box>
              );
            })()}

            {/* סיכום סניפים - מוצג רק אם יש נתונים */}
            {totalBranches > 0 && (
              <Box sx={{
                p: 1.5, borderRadius: '12px',
                bgcolor: isDark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.18)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <PlaceIcon sx={{ fontSize: 18, color: '#059669' }} />
                  <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: 'text.primary', flex: 1 }}>
                    סניפים במאגר
                  </Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>
                    {totalBranches}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary', flex: 1 }}>
                    עם קואורדינטות תקפות
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: coordsPct >= 80 ? '#059669' : '#F59E0B' }}>
                    {totalBranchesWithCoords} ({coordsPct}%)
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={coordsPct}
                  sx={{
                    height: 4, borderRadius: 2, mt: 0.5,
                    bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: coordsPct >= 80 ? '#10B981' : '#F59E0B',
                    },
                  }}
                />
                {coordsPct < 80 && (
                  <Typography sx={{ fontSize: 10, color: 'text.disabled', mt: 0.6, lineHeight: 1.45 }}>
                    סניפים ללא קואורדינטות יקבלו מיקום אוטומטית בסנכרונים הבאים (20 לריצה)
                  </Typography>
                )}
              </Box>
            )}

            {/* כפתור רענון - נסתר בזמן סנכרון פעיל כדי שהבאנר יהיה החיווי היחיד */}
            {!syncActive && (
              <Button
                variant="contained"
                onClick={handleRefresh}
                startIcon={<RefreshIcon />}
                sx={{
                  py: 1.5,
                  borderRadius: '12px',
                  textTransform: 'none',
                  fontWeight: 700,
                  fontSize: 14.5,
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                  boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0D9488, #0B7C72)',
                  },
                  '& .MuiButton-startIcon': { marginInlineEnd: '10px' },
                  '& .MuiButton-startIcon svg': { fontSize: 20 },
                }}
              >
                רענן מחירים עכשיו
              </Button>
            )}

            {/* פידבק אינליין */}
            {feedback && (
              <Box sx={{
                px: 1.5, py: 1, borderRadius: '10px',
                bgcolor: feedback.tone === 'error' ? '#EF444422' : '#14B8A622',
                border: '1px solid',
                borderColor: feedback.tone === 'error' ? '#EF444455' : '#14B8A655',
              }}>
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: feedback.tone === 'error' ? '#B91C1C' : '#0F766E' }}>
                  {feedback.msg}
                </Typography>
              </Box>
            )}

            {/* כרטיס סיכום הצלחות/כישלונות - מופיע רק אחרי סנכרון */}
            {chains.length > 0 && !syncActive && (successCount + failedCount + skippedCount > 0) && (
              <Box sx={{
                display: 'flex', gap: 1,
                p: 1, borderRadius: '12px',
                bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)',
              }}>
                <Box sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: '10px',
                  bgcolor: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                  <Typography sx={{ fontSize: 17, fontWeight: 900, color: '#059669', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {successCount}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#065F46', mt: 0.3 }}>
                    ✓ הצליחו
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: '10px',
                  bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <Typography sx={{ fontSize: 17, fontWeight: 900, color: '#DC2626', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {failedCount}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#991B1B', mt: 0.3 }}>
                    ✗ נכשלו
                  </Typography>
                </Box>
                <Box sx={{ flex: 1, textAlign: 'center', p: 1, borderRadius: '10px',
                  bgcolor: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' }}>
                  <Typography sx={{ fontSize: 17, fontWeight: 900, color: '#475569', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {skippedCount}
                  </Typography>
                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: '#334155', mt: 0.3 }}>
                    ⏸ דילוגים
                  </Typography>
                </Box>
              </Box>
            )}

            {/* חלוקה לפי רשת */}
            {chains.length > 0 && (
              <Box sx={{
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
              }}>
                <Box sx={{
                  px: 2, py: 1,
                  bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>
                    {chains.length} רשתות פעילות
                  </Typography>
                </Box>
                {chains.map((c) => {
                  const rawError = c.lastSyncError;
                  const humanError = rawError ? humanizeError(rawError) : null;
                  // שגיאה "רכה" (הרשת לא פרסמה) נראית כאזהרה אמיתית-צבעונית עדינה;
                  // שגיאה "קשה" (משתמש לא תקף וכו') באדום.
                  const isSoftError = humanError?.severity === 'soft';
                  const isHardError = humanError?.severity === 'hard';
                  const isEmpty = c.count === 0;
                  const statusColor = isHardError ? '#EF4444'
                    : isSoftError ? '#94A3B8'
                    : isEmpty ? '#F59E0B'
                    : '#14B8A6';
                  return (
                    <Box
                      key={c.chainId}
                      sx={{
                        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                        gap: 1,
                        px: 2, py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        '&:last-child': { borderBottom: 'none' },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flex: 1, minWidth: 0 }}>
                        {isHardError ? (
                          <ErrorOutlineIcon sx={{ fontSize: 15, color: statusColor, mt: 0.25 }} />
                        ) : isSoftError ? (
                          <PauseCircleOutlineIcon sx={{ fontSize: 15, color: statusColor, mt: 0.25 }} />
                        ) : (
                          <CheckCircleIcon sx={{ fontSize: 14, color: statusColor, mt: 0.3 }} />
                        )}
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.primary' }}>
                            {c.chainName}
                          </Typography>
                          {/* סיכום ברור של מה עבד ומה לא */}
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.35, alignItems: 'center' }}>
                            {/* מחירים */}
                            {c.count > 0 ? (
                              <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.3,
                                px: 0.6, py: 0.2, borderRadius: '6px',
                                bgcolor: 'rgba(16,185,129,0.1)',
                                fontSize: 10, fontWeight: 700, color: '#059669',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                ✓ {c.count.toLocaleString('he-IL')} מחירים
                              </Box>
                            ) : (
                              <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.3,
                                px: 0.6, py: 0.2, borderRadius: '6px',
                                bgcolor: isHardError ? 'rgba(239,68,68,0.1)' : 'rgba(148,163,184,0.12)',
                                fontSize: 10, fontWeight: 700,
                                color: isHardError ? '#DC2626' : '#64748B',
                              }}>
                                ✗ אין מחירים
                              </Box>
                            )}
                            {/* סניפים */}
                            {!!c.branchCount && c.branchCount > 0 ? (
                              <Box sx={{
                                display: 'inline-flex', alignItems: 'center', gap: 0.3,
                                px: 0.6, py: 0.2, borderRadius: '6px',
                                bgcolor: 'rgba(124,58,237,0.1)',
                                fontSize: 10, fontWeight: 700, color: '#7C3AED',
                                fontVariantNumeric: 'tabular-nums',
                              }}>
                                <PlaceIcon sx={{ fontSize: 10 }} />
                                {c.branchCount} סניפים
                                {typeof c.branchesWithCoords === 'number' && c.branchesWithCoords < c.branchCount
                                  ? ` (${c.branchesWithCoords})`
                                  : ''}
                              </Box>
                            ) : c.count > 0 ? (
                              <Box
                                title={c.storesError ? humanizeError(c.storesError).msg : undefined}
                                sx={{
                                  display: 'inline-flex', alignItems: 'center', gap: 0.3,
                                  px: 0.6, py: 0.2, borderRadius: '6px',
                                  bgcolor: 'rgba(148,163,184,0.12)',
                                  fontSize: 10, fontWeight: 700, color: '#64748B',
                                }}
                              >
                                ✗ אין סניפים{c.storesError ? ` · ${humanizeError(c.storesError).msg}` : ''}
                              </Box>
                            ) : null}
                          </Box>
                          {/* שגיאה - רק אם יש */}
                          {humanError && (
                            <Typography sx={{
                              fontSize: 10.5,
                              color: isHardError ? '#B91C1C' : 'text.secondary',
                              mt: 0.4, wordBreak: 'break-word',
                            }}>
                              {humanError.msg}
                            </Typography>
                          )}
                          {!humanError && isEmpty && (
                            <Typography sx={{ fontSize: 10.5, color: '#D97706', mt: 0.4 }}>
                              טרם סונכרן בהצלחה
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* הסבר */}
            <Box sx={{
              p: 1.25, borderRadius: '10px',
              bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
              border: '1px dashed',
              borderColor: 'divider',
            }}>
              <Typography sx={{ fontSize: 10.5, color: 'text.secondary', lineHeight: 1.6 }}>
                סנכרון אוטומטי רץ כל 6 שעות. הכפתור מאפשר לרענן מיד בלי לחכות.
                התהליך יכול לקחת 2-5 דקות. השאר את המודאל פתוח כדי לראות את הסטטוס מתעדכן.
              </Typography>
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
};
