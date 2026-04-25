/**
 * PriceSyncManager - ניהול מאגר מחירים וסניפים
 *
 * עמוד אחד, פשוט ונקי:
 *  1. סיכום: כמה מחירים, כמה סניפים, מתי עודכן
 *  2. כפתור אחד: 'רענן עכשיו' (מחירים + סניפים יחד)
 *  3. רשימת רשתות: לחיצה על שורה מציגה את הסניפים שלה
 */

import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Button, CircularProgress, LinearProgress, Collapse, keyframes } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import SyncIcon from '@mui/icons-material/Sync';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';
import { priceComparisonApi, type PriceSyncStatus } from '../../priceComparison';

interface Props {
  onClose: () => void;
}

const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`;

const formatAge = (hours: number | null): string => {
  if (hours === null) return 'לא ידוע';
  if (hours < 1) return `לפני ${Math.round(hours * 60)} דק'`;
  if (hours < 24) return `לפני ${hours.toFixed(1)} שעות`;
  return `לפני ${Math.floor(hours / 24)} ימים`;
};

// תרגום קודי שגיאה טכניים לעברית
const humanizeError = (raw: string): { msg: string; severity: 'soft' | 'hard' } => {
  if (/no_price_file_found/i.test(raw)) return { msg: 'הרשת לא פרסמה מחירים היום', severity: 'soft' };
  if (/no_stores_file_found/i.test(raw)) return { msg: 'הרשת לא פרסמה קובץ סניפים', severity: 'soft' };
  if (/no_stores_in_file/i.test(raw)) return { msg: 'קובץ הסניפים ריק', severity: 'soft' };
  if (/adapter_has_no_stores_support/i.test(raw)) return { msg: 'אין תמיכה בסניפים', severity: 'soft' };
  if (/401|unauthorized|login|invalid.*user/i.test(raw)) return { msg: 'משתמש/סיסמה לא תקפים', severity: 'hard' };
  if (/timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(raw)) return { msg: 'תקלת רשת זמנית', severity: 'soft' };
  if (/rate.?limit|too.?many/i.test(raw)) return { msg: 'חריגת קצב', severity: 'soft' };
  return { msg: raw.substring(0, 60), severity: 'hard' };
};

// ===== כרטיס מטריקה - מספר גדול עם תיאור =====
const StatCard = ({ icon, value, label, color, isDark }: {
  icon: React.ReactNode; value: string | number; label: string; color: string; isDark: boolean;
}) => (
  <Box sx={{
    flex: 1,
    p: 1.5, borderRadius: '14px',
    bgcolor: isDark ? `${color}1A` : `${color}10`,
    border: '1px solid', borderColor: `${color}33`,
    textAlign: 'center',
  }}>
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.4, mb: 0.4 }}>
      {icon}
      <Typography sx={{ fontSize: 10.5, fontWeight: 700, color, letterSpacing: 0.3 }}>
        {label}
      </Typography>
    </Box>
    <Typography sx={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
      {value}
    </Typography>
  </Box>
);

export const PriceSyncManager = ({ onClose }: Props) => {
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';
  const [status, setStatus] = useState<PriceSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ msg: string; tone: 'info' | 'error' } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await priceComparisonApi.getStatus();
      setStatus(data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // poll בזמן סנכרון פעיל - מחירים או סניפים
  const syncActive = !!status?.syncInProgress || !!status?.branchSync?.active || refreshing;
  useEffect(() => {
    if (!syncActive) return;
    const interval = setInterval(load, 3_000);
    return () => clearInterval(interval);
  }, [syncActive, load]);

  // הצגת תוצאה כשסנכרון סניפים מסתיים
  const lastBranchCompletedAt = status?.branchSync?.completedAt;
  useEffect(() => {
    if (!lastBranchCompletedAt || status?.branchSync?.active) return;
    const bs = status?.branchSync;
    if (!bs) return;
    if (bs.error) setFeedback({ msg: `שגיאה: ${bs.error}`, tone: 'error' });
    else if (bs.totalUpserted > 0) setFeedback({ msg: `✓ ${bs.totalUpserted} סניפים עודכנו`, tone: 'info' });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastBranchCompletedAt]);

  // פעולה אחת: רענון מחירים + סניפים יחד
  const handleRefresh = async () => {
    haptic('medium');
    setRefreshing(true);
    setFeedback(null);
    try {
      // רץ במקביל
      await Promise.allSettled([
        priceComparisonApi.refresh(),
        priceComparisonApi.refreshBranches(),
      ]);
      setFeedback({ msg: 'סנכרון החל - יתעדכן אוטומטית', tone: 'info' });
      setTimeout(load, 2000);
    } catch {
      setFeedback({ msg: 'שגיאה בהפעלת סנכרון', tone: 'error' });
    } finally {
      setRefreshing(false);
    }
  };

  const totalPrices = status?.totalPrices ?? 0;
  const chains = status?.chains ?? [];
  const totalBranches = chains.reduce((s, c) => s + (c.branchCount ?? 0), 0);

  // הרחבת רשת - בלחיצה טוענים את הסניפים שלה
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [chainBranches, setChainBranches] = useState<Map<string, Awaited<ReturnType<typeof priceComparisonApi.getBranchesByChain>>['branches']>>(new Map());
  const [loadingChain, setLoadingChain] = useState<string | null>(null);
  const toggleChain = async (chainId: string) => {
    haptic('light');
    if (expandedChain === chainId) { setExpandedChain(null); return; }
    setExpandedChain(chainId);
    if (chainBranches.has(chainId)) return;
    setLoadingChain(chainId);
    try {
      const res = await priceComparisonApi.getBranchesByChain(chainId);
      setChainBranches(prev => new Map(prev).set(chainId, res.branches));
    } catch {
      setChainBranches(prev => new Map(prev).set(chainId, []));
    } finally { setLoadingChain(null); }
  };

  return (
    <Modal title="ניהול מאגר" onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#14B8A6' }} />
          </Box>
        ) : (
          <>
            {/* ===== כרטיסי סיכום: מחירים + סניפים ===== */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatCard
                icon={<StorefrontIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={totalPrices.toLocaleString('he-IL')}
                label="מחירים"
                color="#14B8A6"
                isDark={isDark}
              />
              <StatCard
                icon={<PlaceIcon sx={{ fontSize: 14, color: '#7C3AED' }} />}
                value={totalBranches.toLocaleString('he-IL')}
                label="סניפים"
                color="#7C3AED"
                isDark={isDark}
              />
            </Box>

            {/* מתי עודכן */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'text.secondary' }}>
              <ScheduleIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: 11.5 }}>
                עודכן {formatAge(status?.ageHours ?? null)}
              </Typography>
            </Box>

            {/* ===== באנר פרוגרס בזמן סנכרון פעיל ===== */}
            {syncActive && (() => {
              const prog = status?.syncProgress;
              const total = prog?.totalChains ?? 0;
              const done = prog?.completedChains ?? 0;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const branchActive = !!status?.branchSync?.active;
              return (
                <Box sx={{
                  p: 1.5, borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(124,58,237,0.12)' : 'rgba(124,58,237,0.07)',
                  border: '1px solid', borderColor: isDark ? 'rgba(167,139,250,0.35)' : 'rgba(124,58,237,0.2)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.85 }}>
                    <SyncIcon sx={{ fontSize: 17, color: '#7C3AED', animation: `${spin} 1.8s linear infinite` }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#7C3AED', flex: 1 }}>
                      {prog?.active ? 'סנכרון מחירים' : branchActive ? 'סנכרון סניפים' : 'סנכרון פעיל'}
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
                      '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #7C3AED, #A78BFA)' },
                    }}
                  />
                  {total > 0 && prog?.currentChainName && done < total && (
                    <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.6 }}>
                      רשת {done}/{total} · {prog.currentChainName}
                    </Typography>
                  )}
                </Box>
              );
            })()}

            {/* ===== כפתור יחיד מרכזי ===== */}
            {!syncActive && (
              <Button
                variant="contained"
                onClick={handleRefresh}
                startIcon={<RefreshIcon />}
                sx={{
                  py: 1.5, borderRadius: '12px',
                  textTransform: 'none', fontWeight: 800, fontSize: 14.5,
                  background: 'linear-gradient(135deg, #14B8A6, #0D9488)',
                  boxShadow: '0 3px 12px rgba(20,184,166,0.28)',
                  '&:hover': { background: 'linear-gradient(135deg, #0D9488, #0B7C72)' },
                  '& .MuiButton-startIcon': { marginInlineEnd: '10px' },
                }}
              >
                רענן עכשיו (מחירים + סניפים)
              </Button>
            )}

            {/* פידבק */}
            {feedback && (
              <Box sx={{
                px: 1.5, py: 1, borderRadius: '10px',
                bgcolor: feedback.tone === 'error' ? '#EF444415' : '#10B98115',
                border: '1px solid',
                borderColor: feedback.tone === 'error' ? '#EF444444' : '#10B98144',
              }}>
                <Typography sx={{
                  fontSize: 12, fontWeight: 600,
                  color: feedback.tone === 'error' ? '#B91C1C' : '#0F766E',
                  wordBreak: 'break-word',
                }}>
                  {feedback.msg}
                </Typography>
              </Box>
            )}

            {/* ===== רשימת רשתות ===== */}
            {chains.length > 0 && (
              <Box sx={{
                borderRadius: '12px',
                border: '1px solid', borderColor: 'divider',
                overflow: 'hidden',
              }}>
                <Box sx={{
                  px: 2, py: 1,
                  bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)',
                  borderBottom: '1px solid', borderColor: 'divider',
                }}>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 800, color: 'text.secondary', letterSpacing: 0.4 }}>
                    {chains.length} רשתות · לחיצה תציג סניפים
                  </Typography>
                </Box>
                {chains.map((c) => {
                  const humanError = c.lastSyncError ? humanizeError(c.lastSyncError) : null;
                  const isHardError = humanError?.severity === 'hard';
                  const isSoftError = humanError?.severity === 'soft';
                  const isEmpty = c.count === 0;
                  const statusColor = isHardError ? '#EF4444' : isSoftError ? '#94A3B8' : isEmpty ? '#F59E0B' : '#10B981';
                  const isExpanded = expandedChain === c.chainId;
                  const isLoadingThis = loadingChain === c.chainId;
                  const branchList = chainBranches.get(c.chainId);

                  return (
                    <Box key={c.chainId} sx={{ borderBottom: '1px solid', borderColor: 'divider', '&:last-child': { borderBottom: 'none' } }}>
                      {/* שורת רשת - לחיצה פותחת */}
                      <Box
                        onClick={() => toggleChain(c.chainId)}
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1,
                          px: 2, py: 1.1,
                          cursor: 'pointer', userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          bgcolor: isExpanded ? (isDark ? 'rgba(124,58,237,0.06)' : 'rgba(124,58,237,0.04)') : 'transparent',
                          '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.02)' },
                          transition: 'background-color 0.12s',
                        }}
                      >
                        {/* אייקון סטטוס */}
                        {isHardError ? <ErrorOutlineIcon sx={{ fontSize: 16, color: statusColor }} />
                          : isSoftError ? <PauseCircleOutlineIcon sx={{ fontSize: 16, color: statusColor }} />
                          : <CheckCircleIcon sx={{ fontSize: 15, color: statusColor }} />}

                        {/* שם + נתונים */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.2 }}>
                            {c.chainName}
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.25, mt: 0.3, alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 10.5, color: c.count > 0 ? '#0F766E' : 'text.disabled', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              💰 {c.count > 0 ? `${c.count.toLocaleString('he-IL')} מחירים` : 'אין מחירים'}
                            </Typography>
                            <Typography sx={{ fontSize: 10.5, color: c.branchCount && c.branchCount > 0 ? '#7C3AED' : 'text.disabled', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                              📍 {c.branchCount && c.branchCount > 0 ? `${c.branchCount} סניפים` : 'אין סניפים'}
                            </Typography>
                          </Box>
                          {humanError && (
                            <Typography sx={{ fontSize: 10, color: isHardError ? '#B91C1C' : 'text.secondary', mt: 0.3 }}>
                              {humanError.msg}
                            </Typography>
                          )}
                        </Box>

                        <ExpandMoreIcon sx={{
                          fontSize: 18, color: 'text.disabled',
                          transition: 'transform 0.2s',
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0)',
                        }} />
                      </Box>

                      {/* פאנל הרחבה - רשימת סניפים */}
                      <Collapse in={isExpanded} timeout={200} unmountOnExit>
                        <Box sx={{
                          px: 1.5, py: 1,
                          bgcolor: isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)',
                        }}>
                          {isLoadingThis ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
                              <CircularProgress size={16} sx={{ color: '#7C3AED' }} />
                            </Box>
                          ) : !branchList || branchList.length === 0 ? (
                            <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', py: 1.5 }}>
                              אין סניפים במאגר
                            </Typography>
                          ) : (
                            <>
                              <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.disabled', mb: 0.6, letterSpacing: 0.3 }}>
                                {branchList.length} סניפים · {branchList.filter(b => b.hasCoords).length} עם מיקום
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, maxHeight: 240, overflowY: 'auto' }}>
                                {branchList.map(b => (
                                  <Box key={b.id} sx={{
                                    display: 'flex', alignItems: 'flex-start', gap: 0.6,
                                    px: 1, py: 0.5, borderRadius: '6px',
                                    bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'white',
                                    border: '1px solid',
                                    borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
                                  }}>
                                    <PlaceIcon sx={{ fontSize: 11, color: b.hasCoords ? '#7C3AED' : 'text.disabled', mt: 0.2, flexShrink: 0 }} />
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: 'text.primary', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {b.storeName}
                                      </Typography>
                                      {(b.city || b.address) && (
                                        <Typography sx={{ fontSize: 9.5, color: 'text.secondary', mt: 0.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          {[b.city, b.address].filter(Boolean).join(' · ')}
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                ))}
                              </Box>
                            </>
                          )}
                        </Box>
                      </Collapse>
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* הסבר קומפקטי */}
            <Typography sx={{ fontSize: 10, color: 'text.disabled', textAlign: 'center', lineHeight: 1.5, mt: 0.5 }}>
              סנכרון אוטומטי כל 6 שעות. כפתור 'רענן עכשיו' מחזיק מחירים + סניפים במקביל.
            </Typography>
          </>
        )}
      </Box>
    </Modal>
  );
};
