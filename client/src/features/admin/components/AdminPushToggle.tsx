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
      display: 'flex', alignItems: 'center', gap: 1.25, mb: 2, p: 1.5, borderRadius: '14px',
      bgcolor: 'background.paper',
      border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.07)',
    }}>
      <NotificationsActiveRoundedIcon sx={{ fontSize: 22, color: checked ? color : 'text.disabled' }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{label}</Typography>
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
          '& .MuiSwitch-switchBase.Mui-checked': { color },
          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: color, opacity: 0.5 },
        }}
      />
    </Box>
  );
};
