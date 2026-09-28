import { useState } from 'react';
import { Box, Typography, Switch } from '@mui/material';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { useAdminAlerts, setAdminPush } from '../hooks/useAdminAlerts';

interface Props {
  // איזה תחום המתג שולט בו: מנויים או משוב, כל אחד בנפרד
  kind: 'pushOnSubscription' | 'pushOnFeedback';
  label: string;
  hint: string;
  // צבע המתג כשהוא פעיל (סגול במנויים, כמו כל מה שקשור למנוי)
  color: string;
  isDark: boolean;
}

// מתג "התראת פוש על דברים חדשים" בראש מסך המנויים או המשוב.
// ההתראה נשלחת לכל האדמינים שהפעילו התראות במכשיר שלהם.
export const AdminPushToggle = ({ kind, label, hint, color, isDark }: Props) => {
  const alerts = useAdminAlerts();
  const [failed, setFailed] = useState(false);
  const checked = alerts?.[kind] ?? true;

  const toggle = (value: boolean) => {
    setFailed(false);
    setAdminPush(kind, value).catch(() => setFailed(true));
  };

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.25, mb: 2, p: 1.5, borderRadius: '16px',
      // מופעל = צבוע בבירור (רקע גוון, מסגרת ואריח אייקון בצבע התחום, מתג מלא).
      // כבוי = אפור ושקט. כך רואים במבט אחד אם ההתראה פעילה.
      bgcolor: checked ? `${color}${isDark ? '26' : '12'}` : 'background.paper',
      border: '1.5px solid',
      borderColor: checked ? `${color}${isDark ? '80' : '55'}` : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)'),
      transition: 'background-color 0.2s ease, border-color 0.2s ease',
    }}>
      <Box sx={{
        width: 38, height: 38, borderRadius: '12px', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: checked ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)'),
        boxShadow: checked ? `0 4px 12px ${color}55` : 'none',
        transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
      }}>
        <NotificationsActiveRoundedIcon sx={{ fontSize: 21, color: checked ? '#fff' : 'text.disabled' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 800, color: checked ? color : 'text.primary' }}>{label}</Typography>
        <Typography sx={{ fontSize: 12, color: failed ? 'error.main' : 'text.secondary', lineHeight: 1.4 }}>
          {failed ? 'השמירה נכשלה, נסה שוב' : hint}
        </Typography>
      </Box>
      <Switch
        checked={checked}
        disabled={!alerts}
        onChange={(e) => toggle(e.target.checked)}
        inputProps={{ 'aria-label': label }}
        sx={{
          '& .MuiSwitch-switchBase.Mui-checked': { color: '#fff' },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: color, opacity: 1 },
        }}
      />
    </Box>
  );
};
