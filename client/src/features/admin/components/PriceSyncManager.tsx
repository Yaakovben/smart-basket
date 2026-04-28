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
import DeleteIcon from '@mui/icons-material/Delete';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import { TextField, IconButton } from '@mui/material';
import { Modal } from '../../../global/components';
import { useSettings } from '../../../global/context/SettingsContext';
import { haptic } from '../../../global/helpers';
import { priceComparisonApi, type PriceSyncStatus } from '../../priceComparison';

interface Props {
  onClose: () => void;
}

const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`;

// פורמט גיל סנכרון - מציג זמן יחסי קצר + שעה אבסולוטית, כדי שאדמין
// יבין במבט אחד "מתי בדיוק" קרה הסנכרון, לא רק "לפני כמה זמן".
const formatAge = (hours: number | null, completedAt?: string | null): string => {
  if (hours === null) return 'לא ידוע';
  const relative = hours < 1
    ? `לפני ${Math.round(hours * 60)} דק'`
    : hours < 24
      ? `לפני ${hours.toFixed(1)} שעות`
      : `לפני ${Math.floor(hours / 24)} ימים`;
  if (!completedAt) return relative;
  const d = new Date(completedAt);
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  const date = sameDay ? 'היום' : d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  return `${relative} · ${date} ${time}`;
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
  // ייבוא המוני של סניפים מטקסט CSV
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkChainId, setBulkChainId] = useState('shufersal');
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleBulkImport = async () => {
    // פורמט: שורה לסניף - storeName,city,address,lat,lng
    const lines = bulkText.trim().split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    const parsed: Array<{ chainId: string; storeName: string; city: string; address: string; lat: number; lng: number }> = [];
    const parseErrors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.trim());
      if (parts.length < 5) {
        parseErrors.push(`שורה ${i + 1}: צריך 5 ערכים מופרדים בפסיק`);
        continue;
      }
      const [storeName, city, address, latStr, lngStr] = parts;
      const lat = parseFloat(latStr);
      const lng = parseFloat(lngStr);
      if (!storeName || !Number.isFinite(lat) || !Number.isFinite(lng)) {
        parseErrors.push(`שורה ${i + 1}: שם או lat/lng לא תקפים`);
        continue;
      }
      parsed.push({ chainId: bulkChainId, storeName, city, address, lat, lng });
    }

    if (parsed.length === 0) {
      setFeedback({ msg: `לא נמצאו שורות תקפות. ${parseErrors.slice(0, 2).join('; ')}`, tone: 'error' });
      return;
    }

    setBulkLoading(true);
    haptic('medium');
    const res = await priceComparisonApi.bulkAddBranches(parsed);
    setBulkLoading(false);
    setFeedback({
      msg: res.success
        ? `✓ נוספו ${res.success_count} סניפים` + (res.failed_count ? `, ${res.failed_count} נכשלו` : '')
        : `שגיאה: ${res.message}`,
      tone: res.success ? 'info' : 'error',
    });
    if (res.success) {
      setBulkText('');
      setBulkOpen(false);
      load();
      setChainBranches(new Map());
    }
  };

  // השלמת כתובות חסרות (reverse geocoding לסניפים בלי city/address)
  const [fillingAddrs, setFillingAddrs] = useState(false);
  const handleFillAddresses = async () => {
    haptic('medium');
    setFillingAddrs(true);
    setFeedback(null);
    try {
      const res = await priceComparisonApi.fillMissingAddresses();
      setFeedback({
        msg: res.success ? `✓ ${res.message}` : `שגיאה: ${res.message}`,
        tone: res.success ? 'info' : 'error',
      });
      load();
      setChainBranches(new Map());
    } finally {
      setFillingAddrs(false);
    }
  };

  // מחיקה של סניפי seed לא-מאומתים (לא OSM ולא ידני)
  const handleCleanup = async () => {
    if (!confirm('למחוק את כל הסניפים מה-seed הישן? יישארו רק סניפים מ-OSM ומהוספה ידנית.')) return;
    haptic('medium');
    const res = await priceComparisonApi.cleanupUnverifiedBranches();
    setFeedback({
      msg: res.success ? `✓ נמחקו ${res.deletedCount} סניפים לא-מאומתים` : `שגיאה: ${res.message}`,
      tone: res.success ? 'info' : 'error',
    });
    load();
    setChainBranches(new Map());
  };

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
  const totalBranchesWithCoords = chains.reduce((s, c) => s + (c.branchesWithCoords ?? 0), 0);

  // פילטר לפי סטטוס - לזיהוי מהיר של רשתות עם בעיות
  const [statusFilter, setStatusFilter] = useState<'all' | 'errors' | 'no_branches' | 'no_prices'>('all');
  const filteredChains = chains.filter(c => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'errors') return !!c.lastSyncError;
    if (statusFilter === 'no_branches') return !c.branchCount || c.branchCount === 0;
    if (statusFilter === 'no_prices') return c.count === 0;
    return true;
  });
  const errorCount = chains.filter(c => !!c.lastSyncError).length;
  const noBranchCount = chains.filter(c => !c.branchCount || c.branchCount === 0).length;
  const noPriceCount = chains.filter(c => c.count === 0).length;

  // הרחבת רשת - בלחיצה טוענים את הסניפים שלה
  const [expandedChain, setExpandedChain] = useState<string | null>(null);
  const [chainBranches, setChainBranches] = useState<Map<string, Awaited<ReturnType<typeof priceComparisonApi.getBranchesByChain>>['branches']>>(new Map());
  const [loadingChain, setLoadingChain] = useState<string | null>(null);
  // טופס הוספת סניף ידנית - פעיל לכל רשת בנפרד
  const [addingBranch, setAddingBranch] = useState<string | null>(null);
  const [newBranch, setNewBranch] = useState({ storeName: '', city: '', address: '', lat: '', lng: '' });
  const refreshChainBranches = async (chainId: string) => {
    try {
      const res = await priceComparisonApi.getBranchesByChain(chainId);
      setChainBranches(prev => new Map(prev).set(chainId, res.branches));
    } catch { /* ignore */ }
  };
  const handleAddBranch = async (chainId: string) => {
    const lat = parseFloat(newBranch.lat);
    const lng = parseFloat(newBranch.lng);
    if (!newBranch.storeName.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      setFeedback({ msg: 'חובה: שם, lat, lng תקפים', tone: 'error' });
      return;
    }
    haptic('medium');
    const res = await priceComparisonApi.upsertBranch({
      chainId, storeName: newBranch.storeName.trim(),
      city: newBranch.city.trim(), address: newBranch.address.trim(),
      lat, lng,
    });
    if (res.success) {
      setNewBranch({ storeName: '', city: '', address: '', lat: '', lng: '' });
      setAddingBranch(null);
      await refreshChainBranches(chainId);
      load();
      setFeedback({ msg: '✓ סניף נוסף', tone: 'info' });
    } else {
      setFeedback({ msg: `שגיאה: ${res.message}`, tone: 'error' });
    }
  };
  const handleDeleteBranch = async (chainId: string, branchId: string) => {
    if (!confirm('למחוק את הסניף?')) return;
    haptic('medium');
    const res = await priceComparisonApi.deleteBranch(branchId);
    if (res.success) {
      await refreshChainBranches(chainId);
      load();
    } else {
      setFeedback({ msg: `שגיאה: ${res.message}`, tone: 'error' });
    }
  };

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
            {/* ===== כרטיסי סיכום: מחירים + סניפים + סניפים עם מיקום ===== */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <StatCard
                icon={<StorefrontIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={totalPrices.toLocaleString('he-IL')}
                label="מחירים"
                color="#14B8A6"
                isDark={isDark}
              />
              <StatCard
                icon={<PlaceIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={totalBranches.toLocaleString('he-IL')}
                label="סניפים"
                color="#14B8A6"
                isDark={isDark}
              />
              <StatCard
                icon={<PlaceIcon sx={{ fontSize: 14, color: '#0D9488' }} />}
                value={`${totalBranchesWithCoords}/${totalBranches}`}
                label="עם מיקום"
                color="#14B8A6"
                isDark={isDark}
              />
            </Box>

            {/* מתי עודכן */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5, color: 'text.secondary' }}>
              <ScheduleIcon sx={{ fontSize: 13 }} />
              <Typography sx={{ fontSize: 11.5 }}>
                עודכן {formatAge(status?.ageHours ?? null, status?.lastUpdatedISO)}
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
                  bgcolor: isDark ? 'rgba(20,184,166,0.12)' : 'rgba(20,184,166,0.07)',
                  border: '1px solid', borderColor: isDark ? 'rgba(94,234,212,0.35)' : 'rgba(20,184,166,0.2)',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.85 }}>
                    <SyncIcon sx={{ fontSize: 17, color: '#14B8A6', animation: `${spin} 1.8s linear infinite` }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: '#14B8A6', flex: 1 }}>
                      {prog?.active ? 'סנכרון מחירים' : branchActive ? 'סנכרון סניפים' : 'סנכרון פעיל'}
                    </Typography>
                    {total > 0 && (
                      <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#14B8A6', fontVariantNumeric: 'tabular-nums' }}>
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
                      '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg, #14B8A6, #5EEAD4)' },
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

            {/* ===== כפתור יחיד מרכזי + ניקוי seed ===== */}
            {!syncActive && (
              <>
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
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <Button
                  size="small"
                  onClick={() => setBulkOpen(v => !v)}
                  sx={{
                    fontSize: 11, color: '#14B8A6', textTransform: 'none',
                    minHeight: 0, py: 0.4, px: 1,
                    '&:hover': { bgcolor: 'rgba(20,184,166,0.05)' },
                  }}
                >
                  📥 ייבוא המוני
                </Button>
                <Button
                  size="small"
                  onClick={handleFillAddresses}
                  disabled={fillingAddrs}
                  startIcon={fillingAddrs ? <CircularProgress size={11} sx={{ color: '#0EA5E9' }} /> : null}
                  sx={{
                    fontSize: 11, color: '#0EA5E9', textTransform: 'none',
                    minHeight: 0, py: 0.4, px: 1,
                    '&:hover': { bgcolor: 'rgba(14,165,233,0.05)' },
                    '& .MuiButton-startIcon': { marginInlineEnd: 0.4 },
                  }}
                >
                  🌐 השלם כתובות חסרות
                </Button>
                <Button
                  size="small"
                  onClick={handleCleanup}
                  sx={{
                    fontSize: 11, color: '#DC2626', textTransform: 'none',
                    minHeight: 0, py: 0.4, px: 1,
                    '&:hover': { bgcolor: 'rgba(220,38,38,0.05)' },
                  }}
                >
                  🗑️ נקה seed
                </Button>
              </Box>

              {/* טופס ייבוא המוני */}
              {bulkOpen && (
                <Box sx={{
                  p: 1.25, borderRadius: '12px',
                  bgcolor: isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)',
                  border: '1px solid', borderColor: 'rgba(20,184,166,0.25)',
                  display: 'flex', flexDirection: 'column', gap: 0.75,
                }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#14B8A6' }}>
                    ייבוא המוני סניפים
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.5 }}>
                    כל שורה: <code style={{ background: 'rgba(0,0,0,0.05)', padding: '0 4px' }}>שם, עיר, כתובת, lat, lng</code>
                  </Typography>
                  {/* בחירת רשת */}
                  <select
                    value={bulkChainId}
                    onChange={e => setBulkChainId(e.target.value)}
                    style={{
                      padding: '6px 8px', fontSize: 12, borderRadius: 8,
                      border: '1px solid rgba(20,184,166,0.3)',
                      background: isDark ? '#1e1b3a' : 'white',
                      color: isDark ? 'white' : 'black',
                    }}
                  >
                    {chains.map(c => (
                      <option key={c.chainId} value={c.chainId}>{c.chainName}</option>
                    ))}
                  </select>
                  <TextField
                    multiline minRows={4} maxRows={10}
                    placeholder={'שופרסל בני ברק, בני ברק, רבי עקיבא 50, 32.0858, 34.8330\nשופרסל אלעד, אלעד, שמעון בן שטח 12, 32.0525, 34.9520'}
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                    sx={{
                      '& textarea': { fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5 },
                      '& .MuiInputBase-root': { p: 0.75 },
                    }}
                  />
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small" variant="contained"
                      onClick={handleBulkImport}
                      disabled={bulkLoading || !bulkText.trim()}
                      startIcon={bulkLoading ? <CircularProgress size={12} sx={{ color: 'white' }} /> : null}
                      sx={{
                        flex: 1, fontSize: 12, py: 0.6, textTransform: 'none',
                        bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' },
                      }}
                    >
                      {bulkLoading ? 'מייבא...' : `ייבא ל-${chains.find(c => c.chainId === bulkChainId)?.chainName}`}
                    </Button>
                    <Button size="small" onClick={() => { setBulkOpen(false); setBulkText(''); }}
                      sx={{ fontSize: 12, color: 'text.secondary', textTransform: 'none' }}>
                      ביטול
                    </Button>
                  </Box>
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled', lineHeight: 1.45 }}>
                    💡 איך לקבל lat,lng: גוגל מפס → לחיצה ימנית על המקום → המספרים מופיעים → העתק
                  </Typography>
                </Box>
              )}
              </>
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

            {/* ===== פילטר רשתות לפי סטטוס - לזיהוי מהיר של בעיות ===== */}
            {chains.length > 0 && (errorCount > 0 || noBranchCount > 0 || noPriceCount > 0) && (() => {
              const FilterChip = ({ value, label, count, color }: { value: typeof statusFilter; label: string; count?: number; color?: string }) => {
                const active = statusFilter === value;
                const bg = active ? (color ? `${color}22` : 'rgba(20,184,166,0.18)') : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)');
                const border = active ? (color || '#14B8A6') : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
                const txt = active ? (color || '#0F766E') : 'text.primary';
                return (
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => { haptic('light'); setStatusFilter(value); }}
                    sx={{
                      display: 'inline-flex', alignItems: 'center', gap: 0.4,
                      px: 1, py: 0.4, borderRadius: '999px',
                      cursor: 'pointer', userSelect: 'none',
                      WebkitTapHighlightColor: 'transparent',
                      bgcolor: bg, border: '1px solid', borderColor: border,
                      transition: 'all 0.12s',
                    }}
                  >
                    <Typography sx={{ fontSize: 11, fontWeight: active ? 800 : 700, color: txt }}>
                      {label}
                    </Typography>
                    {count !== undefined && count > 0 && (
                      <Typography sx={{
                        fontSize: 10, fontWeight: 800,
                        color: active ? (color || '#0F766E') : 'text.disabled',
                        fontVariantNumeric: 'tabular-nums',
                      }}>
                        {count}
                      </Typography>
                    )}
                  </Box>
                );
              };
              return (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.6, px: 0.25 }}>
                  <FilterChip value="all" label="הכל" count={chains.length} />
                  {errorCount > 0 && <FilterChip value="errors" label="עם שגיאות" count={errorCount} color="#EF4444" />}
                  {noBranchCount > 0 && <FilterChip value="no_branches" label="ללא סניפים" count={noBranchCount} color="#F59E0B" />}
                  {noPriceCount > 0 && <FilterChip value="no_prices" label="ללא מחירים" count={noPriceCount} color="#F59E0B" />}
                </Box>
              );
            })()}

            {/* ===== רשימת רשתות ===== */}
            {filteredChains.length > 0 && (
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
                    {filteredChains.length} {filteredChains.length === chains.length ? 'רשתות' : `מתוך ${chains.length} רשתות`} · לחיצה תציג סניפים
                  </Typography>
                </Box>
                {filteredChains.map((c) => {
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
                          bgcolor: isExpanded ? (isDark ? 'rgba(20,184,166,0.06)' : 'rgba(20,184,166,0.04)') : 'transparent',
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
                            <Typography sx={{ fontSize: 10.5, color: c.branchCount && c.branchCount > 0 ? '#14B8A6' : 'text.disabled', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
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
                              <CircularProgress size={16} sx={{ color: '#14B8A6' }} />
                            </Box>
                          ) : (
                            // הצגנו תמיד את הכותרת + כפתור "הוסף סניף" - גם כשהמאגר ריק.
                            // אחרת אדמין שרוצה להוסיף לרשת בלי סניפים תקוע. הודעת הריקנות
                            // מוצגת בענף הפנימי (~30 שורות מתחת).
                            <>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.6 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 800, color: 'text.disabled', flex: 1, letterSpacing: 0.3 }}>
                                  {branchList && branchList.length > 0
                                    ? `${branchList.length} סניפים · ${branchList.filter(b => b.hasCoords).length} עם מיקום`
                                    : 'אין סניפים — לחץ "הוסף סניף" כדי להתחיל'}
                                </Typography>
                                <Button
                                  size="small"
                                  startIcon={<AddCircleIcon sx={{ fontSize: 14 }} />}
                                  onClick={() => setAddingBranch(addingBranch === c.chainId ? null : c.chainId)}
                                  sx={{
                                    fontSize: 10.5, fontWeight: 800, color: '#14B8A6', textTransform: 'none',
                                    minHeight: 0, py: 0.3, px: 1, borderRadius: '6px',
                                    '& .MuiButton-startIcon': { marginInlineEnd: 0.4 },
                                  }}
                                >
                                  הוסף סניף
                                </Button>
                              </Box>

                              {/* טופס הוספת סניף ידני */}
                              {addingBranch === c.chainId && (
                                <Box sx={{
                                  p: 1, mb: 0.6, borderRadius: '8px',
                                  bgcolor: isDark ? 'rgba(20,184,166,0.08)' : 'rgba(20,184,166,0.04)',
                                  border: '1px dashed', borderColor: 'rgba(20,184,166,0.3)',
                                  display: 'flex', flexDirection: 'column', gap: 0.6,
                                }}>
                                  <TextField size="small" placeholder="שם הסניף *" value={newBranch.storeName}
                                    onChange={e => setNewBranch(p => ({ ...p, storeName: e.target.value }))}
                                    sx={{ '& input': { fontSize: 12, py: 0.6 } }} />
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <TextField size="small" placeholder="עיר" value={newBranch.city}
                                      onChange={e => setNewBranch(p => ({ ...p, city: e.target.value }))}
                                      sx={{ flex: 1, '& input': { fontSize: 12, py: 0.6 } }} />
                                    <TextField size="small" placeholder="כתובת" value={newBranch.address}
                                      onChange={e => setNewBranch(p => ({ ...p, address: e.target.value }))}
                                      sx={{ flex: 1, '& input': { fontSize: 12, py: 0.6 } }} />
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <TextField size="small" placeholder="lat *" value={newBranch.lat}
                                      onChange={e => setNewBranch(p => ({ ...p, lat: e.target.value }))}
                                      sx={{ flex: 1, '& input': { fontSize: 11, py: 0.6, fontFamily: 'monospace' } }} />
                                    <TextField size="small" placeholder="lng *" value={newBranch.lng}
                                      onChange={e => setNewBranch(p => ({ ...p, lng: e.target.value }))}
                                      sx={{ flex: 1, '& input': { fontSize: 11, py: 0.6, fontFamily: 'monospace' } }} />
                                  </Box>
                                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                                    <Button size="small" variant="contained" onClick={() => handleAddBranch(c.chainId)}
                                      sx={{ flex: 1, fontSize: 11.5, py: 0.5, textTransform: 'none', bgcolor: '#14B8A6', '&:hover': { bgcolor: '#0D9488' } }}>
                                      שמור
                                    </Button>
                                    <Button size="small" onClick={() => setAddingBranch(null)}
                                      sx={{ fontSize: 11.5, py: 0.5, textTransform: 'none', color: 'text.secondary' }}>
                                      ביטול
                                    </Button>
                                  </Box>
                                  <Typography sx={{ fontSize: 9, color: 'text.disabled', textAlign: 'center' }}>
                                    טיפ: גוגל מפס → לחיצה ימנית על הכתובת → "What's here?" → העתק lat,lng
                                  </Typography>
                                </Box>
                              )}

                              {!branchList || branchList.length === 0 ? (
                                <Typography sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', py: 1 }}>
                                  אין סניפים במאגר עדיין
                                </Typography>
                              ) : (
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.35, maxHeight: 240, overflowY: 'auto' }}>
                                  {branchList.map(b => {
                                    // תג מקור הנתונים - osm/geocoded/portal/ידני
                                    const sourceTag =
                                      b.storeId.startsWith('osm-') ? { label: 'OSM', color: '#0EA5E9' }
                                      : b.storeId.startsWith('manual-bulk-') ? { label: 'מאומת', color: '#10B981' }
                                      : b.storeId.startsWith('manual-') ? { label: 'ידני', color: '#10B981' }
                                      : b.coordSource === 'geocoded' ? { label: 'מקורב', color: '#F59E0B' }
                                      : { label: 'seed', color: '#94A3B8' };
                                    const fullAddress = [b.address, b.city].filter(Boolean).join(', ') || 'כתובת חסרה';
                                    return (
                                      <Box key={b.id} sx={{
                                        display: 'flex', alignItems: 'flex-start', gap: 0.75,
                                        p: 1, borderRadius: '8px',
                                        bgcolor: isDark ? 'rgba(255,255,255,0.025)' : 'white',
                                        border: '1px solid',
                                        borderColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)',
                                      }}>
                                        <Box sx={{
                                          width: 26, height: 26, borderRadius: '8px',
                                          flexShrink: 0,
                                          bgcolor: b.hasCoords ? 'rgba(20,184,166,0.12)' : 'rgba(148,163,184,0.12)',
                                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                          <PlaceIcon sx={{ fontSize: 14, color: b.hasCoords ? '#14B8A6' : 'text.disabled' }} />
                                        </Box>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                            <Typography sx={{ fontSize: 12, fontWeight: 800, color: 'text.primary', lineHeight: 1.25, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                              {b.storeName}
                                            </Typography>
                                            <Box sx={{
                                              px: 0.6, py: 0.1, borderRadius: '4px',
                                              fontSize: 8.5, fontWeight: 800, letterSpacing: 0.3,
                                              bgcolor: `${sourceTag.color}1A`,
                                              color: sourceTag.color,
                                              flexShrink: 0,
                                            }}>
                                              {sourceTag.label}
                                            </Box>
                                          </Box>
                                          <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25, lineHeight: 1.35 }}>
                                            📍 {fullAddress}
                                          </Typography>
                                          {b.hasCoords && (
                                            <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.15, fontFamily: 'monospace' }}>
                                              {b.lat?.toFixed(5)}, {b.lng?.toFixed(5)}
                                            </Typography>
                                          )}
                                        </Box>
                                        {/* כפתור 'פתח במפה' - חשוב מאוד! גם אם הכתובת חסרה,
                                            אפשר לראות מיד איפה הסניף ב-Google Maps. */}
                                        {b.hasCoords && (
                                          <IconButton
                                            size="small"
                                            onClick={() => {
                                              haptic('light');
                                              window.open(
                                                `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}`,
                                                '_blank',
                                                'noopener,noreferrer'
                                              );
                                            }}
                                            aria-label="פתח במפה"
                                            title="פתח ב-Google Maps לזיהוי הסניף"
                                            sx={{
                                              width: 26, height: 26, flexShrink: 0,
                                              color: '#1A73E8',
                                              '&:hover': { bgcolor: 'rgba(26,115,232,0.1)' },
                                            }}
                                          >
                                            <OpenInNewIcon sx={{ fontSize: 13 }} />
                                          </IconButton>
                                        )}
                                        <IconButton
                                          size="small"
                                          onClick={() => handleDeleteBranch(c.chainId, b.id)}
                                          aria-label="מחק"
                                          sx={{
                                            width: 26, height: 26, flexShrink: 0,
                                            color: '#DC2626',
                                            '&:hover': { bgcolor: 'rgba(220,38,38,0.1)' },
                                          }}
                                        >
                                          <DeleteIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              )}
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
