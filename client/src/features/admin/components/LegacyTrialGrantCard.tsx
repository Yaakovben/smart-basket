import { useCallback, useEffect, useState } from 'react';
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import { adminApi } from '../../../services/api/admin.api';
import { PRO_PURPLE, PRO_PURPLE_DARK } from '../../subscription/subscription.styles';

interface Props {
  isDark: boolean;
  // נקרא אחרי ביצוע כדי לרענן את טבלת המשתמשים (התוכניות השתנו בהמון רשומות).
  onChanged: () => void;
}

// כפתור חד-פעמי: מעניק Pro (TRIAL_MONTHS, מהיום) לכל המשתמשים הוותיקים שעוד
// לא קיבלו אותו - אותו מענק שמשתמשים חדשים כבר מקבלים אוטומטית בהרשמה.
// לא נוגע במי שכבר Pro בתשלום שווה-או-טוב-יותר, ובטוח להריץ יותר מפעם אחת
// (משתמש שכבר טופל לא נספר/נוגע שוב).
export const LegacyTrialGrantCard = ({ isDark, onChanged }: Props) => {
  const [eligible, setEligible] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ granted: number; skipped: number } | null>(null);

  const load = useCallback(async () => {
    try {
      setEligible(await adminApi.previewLegacyTrialGrant());
    } catch {
      setEligible(null);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (result === null && (eligible === null || eligible === 0)) return null;

  const run = async () => {
    if (!eligible || busy) return;
    if (!window.confirm(`להעניק Pro במתנה ל-${eligible} משתמשים ותיקים, מהיום? הפעולה לא ניתנת לביטול.`)) return;
    setBusy(true);
    try {
      const r = await adminApi.executeLegacyTrialGrant();
      setResult(r);
      setEligible(0);
      onChanged();
    } catch {
      window.alert('הפעולה נכשלה. אפשר לנסות שוב.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper sx={{
      p: 2, mb: 2, borderRadius: '18px', display: 'flex', alignItems: 'center', gap: 1.25,
      border: '1.5px solid', borderColor: eligible ? PRO_PURPLE : 'divider',
      bgcolor: isDark ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.04)',
    }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: '12px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, #8B5CF6, ${PRO_PURPLE_DARK})`,
      }}>
        <CardGiftcardRoundedIcon sx={{ fontSize: 20, color: '#fff' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 15 }}>Pro במתנה למשתמשים ותיקים</Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
          {result
            ? `בוצע: ${result.granted} קיבלו Pro, ${result.skipped} כבר היו במעמד שווה-או-טוב-יותר.`
            : `${eligible} משתמשים עדיין לא קיבלו את המענק החד-פעמי.`}
        </Typography>
      </Box>
      {!result && (
        <Button
          variant="contained" disabled={busy} onClick={run}
          sx={{ borderRadius: '10px', fontWeight: 800, whiteSpace: 'nowrap', bgcolor: PRO_PURPLE, boxShadow: 'none', '&:hover': { bgcolor: PRO_PURPLE_DARK, boxShadow: 'none' } }}
        >
          {busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'הענק לכולם'}
        </Button>
      )}
    </Paper>
  );
};
