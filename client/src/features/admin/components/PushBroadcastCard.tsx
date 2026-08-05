import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Collapse, ToggleButtonGroup, ToggleButton, Autocomplete } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { pushApi } from '../../../services/api';
import type { UserWithLastLogin } from '../types';

interface PushBroadcastCardProps {
  isDark: boolean;
  users: UserWithLastLogin[];
}

type Mode = 'all' | 'user';

// שליחת הודעת push - לכל המשתמשים או למשתמש בודד. פעולה נדירה (הודעות מערכת/
// תמיכה פרטנית), לכן טופס פשוט ומתקפל ולא state מורם להורה כמו שאר המודלים באדמין.
export const PushBroadcastCard = ({ isDark, users }: PushBroadcastCardProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithLastLogin | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canSend = title.trim() && body.trim() && (mode === 'all' || selectedUser);

  const handleSendClick = () => {
    if (!canSend) return;
    setConfirming(true);
  };

  const handleConfirmSend = async () => {
    setConfirming(false);
    setSending(true);
    setResult(null);
    try {
      if (mode === 'all') {
        const sentCount = await pushApi.broadcastPush(title.trim(), body.trim());
        setResult(`נשלח בהצלחה ל-${sentCount} מכשירים`);
      } else if (selectedUser) {
        await pushApi.sendPushToUser(selectedUser.id, title.trim(), body.trim());
        setResult(`נשלח בהצלחה ל-${selectedUser.name}`);
      }
      setTitle('');
      setBody('');
      setSelectedUser(null);
    } catch {
      setResult('השליחה נכשלה - נסה שוב');
    } finally {
      setSending(false);
    }
  };

  return (
    <Paper
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 3,
        bgcolor: isDark ? 'rgba(30, 41, 59, 0.8)' : 'white',
        border: '1px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
      }}
    >
      <Box
        onClick={() => setOpen(o => !o)}
        sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }}
      >
        <CampaignIcon sx={{ color: 'primary.main' }} />
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: isDark ? '#E5E7EB' : 'text.primary' }}>
          שליחת הודעת push
        </Typography>
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <ToggleButtonGroup
            value={mode}
            exclusive
            size="small"
            onChange={(_, v: Mode | null) => { if (v) { setMode(v); setResult(null); } }}
            sx={{ alignSelf: 'flex-start' }}
          >
            <ToggleButton value="all" sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}>כל המשתמשים</ToggleButton>
            <ToggleButton value="user" sx={{ borderRadius: 2, textTransform: 'none', px: 2 }}>משתמש ספציפי</ToggleButton>
          </ToggleButtonGroup>

          {mode === 'user' && (
            <Autocomplete
              size="small"
              options={users}
              value={selectedUser}
              onChange={(_, v) => setSelectedUser(v)}
              getOptionLabel={(u) => `${u.name} (${u.email})`}
              isOptionEqualToValue={(a, b) => a.id === b.id}
              renderInput={(params) => <TextField {...params} label="חיפוש משתמש" />}
            />
          )}

          <TextField
            size="small"
            label="כותרת"
            value={title}
            onChange={e => setTitle(e.target.value)}
            inputProps={{ maxLength: 100 }}
            fullWidth
          />
          <TextField
            size="small"
            label="תוכן ההודעה"
            value={body}
            onChange={e => setBody(e.target.value)}
            inputProps={{ maxLength: 300 }}
            multiline
            minRows={2}
            fullWidth
          />

          {!confirming ? (
            <Button
              variant="contained"
              disabled={!canSend || sending}
              onClick={handleSendClick}
              sx={{ borderRadius: 2, alignSelf: 'flex-start' }}
            >
              {sending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : (mode === 'all' ? 'שלח לכולם' : 'שלח')}
            </Button>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 13, color: 'warning.main', fontWeight: 600 }}>
                {mode === 'all'
                  ? 'בטוח? זה נשלח לכל המשתמשים שיש להם התראות פעילות, אי אפשר לבטל.'
                  : `בטוח שלשלוח ל-${selectedUser?.name}?`}
              </Typography>
              <Button variant="contained" color="warning" size="small" onClick={handleConfirmSend} sx={{ borderRadius: 2 }}>
                כן, שלח
              </Button>
              <Button variant="text" size="small" onClick={() => setConfirming(false)} sx={{ borderRadius: 2 }}>
                ביטול
              </Button>
            </Box>
          )}

          {result && (
            <Typography sx={{ fontSize: 13, color: result.includes('נכשל') ? 'error.main' : 'success.main' }}>
              {result}
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};
