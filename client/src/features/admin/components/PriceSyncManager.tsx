/**
 * PriceSyncManager - מודאל אדמין לניהול מאגר המחירים.
 *
 * מציג:
 *  - סטטוס נוכחי: מתי עודכן, כמה מוצרים בכל רשת
 *  - כפתור "רענן עכשיו" שמפעיל סנכרון ידני (POST /api/price-comparison/refresh)
 *  - רענון אוטומטי של הסטטוס כל 10 שניות בזמן סנכרון פעיל
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, keyframes } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ScheduleIcon from '@mui/icons-material/Schedule';
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

  // רענון אוטומטי כל 10 שניות אם סנכרון פעיל
  useEffect(() => {
    if (!status?.syncInProgress) return;
    const interval = setInterval(load, 10_000);
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

  return (
    <Modal title="ניהול מאגר מחירים" onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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

            {/* כפתור רענון */}
            <Button
              variant="contained"
              onClick={handleRefresh}
              disabled={syncActive}
              startIcon={
                syncActive ? (
                  <CircularProgress size={18} sx={{ color: 'white' }} />
                ) : (
                  <RefreshIcon sx={{ animation: 'none' }} />
                )
              }
              sx={{
                py: 1.5,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: 14.5,
                background: syncActive
                  ? 'linear-gradient(135deg, #6B7280, #4B5563)'
                  : 'linear-gradient(135deg, #14B8A6, #0D9488)',
                boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #0D9488, #0B7C72)',
                },
                '& .MuiButton-startIcon': {
                  marginInlineEnd: '10px',
                },
                '& .MuiButton-startIcon svg': {
                  fontSize: 20,
                  animation: syncActive ? 'none' : `${spin} 0s`,
                },
              }}
            >
              {syncActive ? 'סנכרון פעיל... (יתעדכן אוטומטית)' : 'רענן מחירים עכשיו'}
            </Button>

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
                  const hasError = !!c.lastSyncError;
                  const isEmpty = c.count === 0;
                  const statusColor = hasError ? '#EF4444' : isEmpty ? '#F59E0B' : '#14B8A6';
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
                        <CheckCircleIcon sx={{ fontSize: 14, color: statusColor, mt: 0.3 }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                            {c.chainName}
                          </Typography>
                          {hasError && (
                            <Typography sx={{ fontSize: 10.5, color: '#B91C1C', mt: 0.25, wordBreak: 'break-word' }}>
                              שגיאת סנכרון: {c.lastSyncError}
                            </Typography>
                          )}
                          {!hasError && isEmpty && (
                            <Typography sx={{ fontSize: 10.5, color: '#D97706', mt: 0.25 }}>
                              טרם סונכרן בהצלחה
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.secondary', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                        {c.count.toLocaleString('he-IL')}
                      </Typography>
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
