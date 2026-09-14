import { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { adminApi } from '../../../services/api';
import { ConfirmModal } from '../../../global/components';

interface Props { isDark: boolean }

type ScanResult = { orphanCount: number; totalCloudinaryResources: number; referencedCount: number; orphanPublicIds: string[] };
type DeleteResult = { orphanCount: number; deleted: number; failed: number };

export const CloudinaryOrphanCard = ({ isDark }: Props) => {
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scan, setScan] = useState<ScanResult | null>(null);
  const [result, setResult] = useState<DeleteResult | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async () => {
    setScanning(true);
    setScan(null);
    setResult(null);
    setError(null);
    try {
      const data = await adminApi.scanCloudinaryOrphans();
      setScan(data);
    } catch {
      setError('שגיאה בסריקה — נסה שוב');
    } finally {
      setScanning(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const data = await adminApi.deleteCloudinaryOrphans();
      setResult(data);
      setScan(null);
    } catch {
      setError('שגיאה במחיקה');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Box sx={{
      p: 1.75, borderRadius: 2, mt: 2,
      bgcolor: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
      border: '1px solid', borderColor: 'divider',
    }}>
      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
        🧹 ניקוי יתומים מ-Cloudinary
      </Typography>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1.25, lineHeight: 1.5 }}>
        תמונות ב-Cloudinary שאין להן מוצר מתאים ב-DB (נמחק, נכשל, נשכח). אינן נגישות לאף משתמש אך תופסות אחסון ו-credits.
      </Typography>

      {/* תוצאת סריקה */}
      {scan && !result && (
        <Box sx={{ mb: 1.25, p: 1.25, borderRadius: '8px', bgcolor: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', border: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: scan.orphanCount > 0 ? (isDark ? '#FBBF24' : '#B45309') : (isDark ? '#6EE7B7' : '#047857') }}>
            {scan.orphanCount === 0
              ? '✓ אין יתומים — Cloudinary נקי'
              : `נמצאו ${scan.orphanCount} יתומים מתוך ${scan.totalCloudinaryResources} קבצים`}
          </Typography>
          {scan.orphanCount > 0 && (
            <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.25 }}>
              {scan.referencedCount} קבצים מוכרים · {scan.orphanCount} ללא הפניה
            </Typography>
          )}
        </Box>
      )}

      {/* תוצאת מחיקה */}
      {result && (
        <Box sx={{ mb: 1.25, display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <CheckCircleRoundedIcon sx={{ fontSize: 16, color: '#10B981' }} />
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: isDark ? '#6EE7B7' : '#047857' }}>
            נמחקו {result.deleted} יתומים{result.failed > 0 ? ` · ${result.failed} נכשלו` : ''}
          </Typography>
        </Box>
      )}

      {error && (
        <Typography sx={{ fontSize: 11, color: 'error.main', mb: 1 }}>{error}</Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {/* כפתור סריקה */}
        <Box
          role="button" tabIndex={0}
          onClick={() => { if (!scanning && !deleting) void handleScan(); }}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !scanning && !deleting) void handleScan(); }}
          sx={{
            display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1.25, py: 0.6, borderRadius: '999px',
            bgcolor: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0',
            color: 'text.primary',
            fontSize: 11.5, fontWeight: 700,
            cursor: scanning || deleting ? 'default' : 'pointer',
            opacity: scanning || deleting ? 0.6 : 1,
            transition: 'transform 0.12s',
            '&:active': scanning || deleting ? {} : { transform: 'scale(0.96)' },
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          {scanning ? <CircularProgress size={13} sx={{ color: 'text.secondary' }} /> : <SearchRoundedIcon sx={{ fontSize: 15 }} />}
          {scanning ? 'סורק…' : 'סרוק'}
        </Box>

        {/* כפתור מחיקה — מופיע רק אחרי סריקה עם תוצאות */}
        {scan && scan.orphanCount > 0 && !result && (
          <Box
            role="button" tabIndex={0}
            onClick={() => { if (!deleting) setConfirmOpen(true); }}
            onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !deleting) setConfirmOpen(true); }}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.6, borderRadius: '999px',
              bgcolor: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
              border: '1px solid', borderColor: isDark ? 'rgba(239,68,68,0.35)' : '#FECACA',
              color: isDark ? '#FCA5A5' : '#B91C1C',
              fontSize: 11.5, fontWeight: 700,
              cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.6 : 1,
              transition: 'transform 0.12s',
              '&:active': deleting ? {} : { transform: 'scale(0.96)' },
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {deleting ? <CircularProgress size={13} sx={{ color: 'inherit' }} /> : <DeleteSweepRoundedIcon sx={{ fontSize: 15 }} />}
            {deleting ? 'מוחק…' : `מחק ${scan.orphanCount}`}
          </Box>
        )}
      </Box>

      {confirmOpen && scan && (
        <ConfirmModal
          title={`למחוק ${scan.orphanCount} יתומים מ-Cloudinary?`}
          message={`${scan.orphanCount} קבצים ב-Cloudinary שאין להם מוצר מתאים ב-DB ייחמקו לצמיתות. פעולה זו בלתי הפיכה.`}
          confirmText="מחק לצמיתות"
          onConfirm={() => { setConfirmOpen(false); void handleDelete(); }}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </Box>
  );
};
