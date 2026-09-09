import { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import DeleteSweepRoundedIcon from '@mui/icons-material/DeleteSweepRounded';
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
              תופסות {formatMB(info.totalBytes)} מתוך מכסת ה-DB. אלה תמונות שהעלאתן ל-Cloudinary נכשלה (או שהוא לא היה מוגדר באותו רגע) - נשארו ישירות במסמך המוצר.
            </Typography>
          </Box>
        </Box>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => setConfirmOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setConfirmOpen(true); }}
          sx={{
            mt: 1.25, display: 'inline-flex', alignItems: 'center', gap: 0.5,
            px: 1.25, py: 0.6, borderRadius: '999px',
            bgcolor: isDark ? 'rgba(217,119,6,0.18)' : '#FEF3C7',
            border: '1px solid', borderColor: isDark ? 'rgba(217,119,6,0.4)' : '#FCD34D',
            color: isDark ? '#FBBF24' : '#92400E',
            fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            transition: 'transform 0.12s',
            '&:active': { transform: 'scale(0.96)' },
          }}
        >
          <DeleteSweepRoundedIcon sx={{ fontSize: 15 }} />
          נקה תמונות אלה מה-DB
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
