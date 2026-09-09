import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded';
import { adminApi } from '../../../services/api';
import type { LocalImagesResult } from '../../../services/api/admin.api';
import { ConfirmModal } from '../../../global/components';
import { formatMB } from '../helpers/dbHealthHelpers';

interface Props {
  isDark: boolean;
}

// אזהרה על תמונות מוצר ששמורות כ-data URL *בתוך* מסמכי המוצר עצמם, לא
// ב-Cloudinary - קורה כשהעלאה נכשלה (ראו imageUpload.service.ts:
// getLocalImagesStats). אלה תופסות מקום אמיתי ב-DB עצמו, לא רק באחסון
// Cloudinary. עצמאי לגמרי מ-CloudinaryHealth (data prop) - שולף בעצמו.
export const LocalImagesWarningCard = ({ isDark }: Props) => {
  const [info, setInfo] = useState<LocalImagesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  // מצב ההעלאה ל-Cloudinary (רב-מנתי): null=לא רץ, אחרת התקדמות מצטברת.
  const [migrating, setMigrating] = useState<{ migrated: number; failed: number; freed: number } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getLocalImagesInfo()
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClear = async () => {
    const result = await adminApi.clearLocalImages();
    setInfo(result);
    setResultMsg(`נוקו ${result.cleared ?? 0} תמונות, שוחררו ${formatMB(result.totalBytes)} מה-DB.`);
  };

  // מעלה ל-Cloudinary מנה אחר מנה עד שנגמר (השרת מגביל כל קריאה כדי לא
  // לחרוג מ-timeout). שומר את התמונות - לא מוחק.
  const handleMigrate = async () => {
    setResultMsg(null);
    let migrated = 0;
    let failed = 0;
    let freed = 0;
    setMigrating({ migrated, failed, freed });
    try {
      for (let guard = 0; guard < 100; guard += 1) {
        const r = await adminApi.migrateLocalImages();
        migrated += r.migrated;
        failed += r.failed;
        freed += r.freedBytes;
        setMigrating({ migrated, failed, freed });
        if (r.remaining === 0 || r.attempted === 0) break;
      }
    } finally {
      setMigrating(null);
      setResultMsg(
        `הועלו ${migrated} תמונות ל-Cloudinary${failed ? `, ${failed} נכשלו` : ''} · ${formatMB(freed)} שוחררו מה-DB.`,
      );
      load();
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 1.5 }}>
        <CircularProgress size={18} sx={{ color: '#0D9488' }} />
      </Box>
    );
  }

  if (!info || info.count === 0) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, p: 1.5, borderRadius: 2, mt: 2,
        bgcolor: isDark ? 'rgba(16,185,129,0.1)' : '#ECFDF5',
        border: '1px solid', borderColor: isDark ? 'rgba(16,185,129,0.25)' : '#A7F3D0',
      }}>
        <CheckCircleRoundedIcon sx={{ color: '#10B981', fontSize: 18, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 11.5, color: isDark ? '#6EE7B7' : '#047857', fontWeight: 600 }}>
          אין תמונות שמורות מקומית ב-DB - כולן ב-Cloudinary.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{
        p: 1.75, borderRadius: 2, mt: 2,
        bgcolor: isDark ? 'rgba(217,119,6,0.1)' : '#FFFBEB',
        border: '1px solid', borderColor: isDark ? 'rgba(217,119,6,0.3)' : '#FDE68A',
      }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
          <WarningAmberRoundedIcon sx={{ color: '#D97706', fontSize: 18, flexShrink: 0, mt: '1px' }} />
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: isDark ? '#FBBF24' : '#92400E' }}>
              {info.count} תמונות שמורות ישירות ב-DB (לא ב-Cloudinary)
            </Typography>
            <Typography sx={{ fontSize: 11, color: isDark ? '#FCD34D' : '#B45309', mt: 0.25, lineHeight: 1.4 }}>
              תופסות {formatMB(info.totalBytes)} מתוך מכסת ה-DB. אלה תמונות שהעלאתן ל-Cloudinary נכשלה (או שהוא לא היה מוגדר / המכשיר היה אופליין באותו רגע) - נשארו ישירות במסמך המוצר.
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.25 }}>
          {/* פעולה מועדפת: להעלות ל-Cloudinary (שומר את התמונה + משחרר DB) */}
          <Box
            role="button"
            tabIndex={0}
            aria-disabled={!!migrating}
            onClick={() => { if (!migrating) void handleMigrate(); }}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !migrating) void handleMigrate(); }}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.6, borderRadius: '999px',
              bgcolor: '#0D9488', color: '#fff',
              fontSize: 11.5, fontWeight: 700,
              cursor: migrating ? 'default' : 'pointer', opacity: migrating ? 0.7 : 1,
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.12s',
              '&:active': migrating ? {} : { transform: 'scale(0.96)' },
            }}
          >
            {migrating
              ? <CircularProgress size={13} sx={{ color: '#fff' }} />
              : <CloudUploadRoundedIcon sx={{ fontSize: 15 }} />}
            {migrating ? `מעלה… ${migrating.migrated}` : 'העלה ל-Cloudinary'}
          </Box>

          {/* פעולה הרסנית: פשוט למחוק את התמונה */}
          <Box
            role="button"
            tabIndex={0}
            aria-disabled={!!migrating}
            onClick={() => { if (!migrating) setConfirmOpen(true); }}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && !migrating) setConfirmOpen(true); }}
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              px: 1.25, py: 0.6, borderRadius: '999px',
              bgcolor: isDark ? 'rgba(217,119,6,0.18)' : '#FEF3C7',
              border: '1px solid', borderColor: isDark ? 'rgba(217,119,6,0.4)' : '#FCD34D',
              color: isDark ? '#FBBF24' : '#92400E',
              fontSize: 11.5, fontWeight: 700,
              cursor: migrating ? 'default' : 'pointer', opacity: migrating ? 0.5 : 1,
              WebkitTapHighlightColor: 'transparent',
              transition: 'transform 0.12s',
              '&:active': migrating ? {} : { transform: 'scale(0.96)' },
            }}
          >
            <DeleteSweepRoundedIcon sx={{ fontSize: 15 }} />
            מחק מה-DB
          </Box>
        </Box>
      </Box>

      {resultMsg && (
        <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1, textAlign: 'center' }}>
          {resultMsg}
        </Typography>
      )}

      {confirmOpen && (
        <ConfirmModal
          title="לנקות תמונות שמורות מקומית?"
          message={`${info.count} מוצרים יאבדו את התמונה שלהם (המוצר עצמו יישאר, בלי תמונה) - ${formatMB(info.totalBytes)} ישוחררו מה-DB.\nפעולה זו בלתי הפיכה.`}
          confirmText="נקה עכשיו"
          onConfirm={handleClear}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
};
