import { useState } from 'react';
import { Box, Paper, Typography, TextField, Button, CircularProgress, Collapse } from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { pushApi } from '../../../services/api';

interface PushBroadcastCardProps {
  isDark: boolean;
}

// שליחת הודעת push לכל המשתמשים הרשומים - פעולה חד-פעמית/נדירה (הודעות מערכת),
// לכן טופס פשוט ומתקפל ולא state מורם להורה כמו שאר המודלים באדמין.
export const PushBroadcastCard = ({ isDark }: PushBroadcastCardProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleSendClick = () => {
    if (!title.trim() || !body.trim()) return;
    setConfirming(true);
  };

  const handleConfirmSend = async () => {
    setConfirming(false);
    setSending(true);
    setResult(null);
    try {
      const sentCount = await pushApi.broadcastPush(title.trim(), body.trim());
      setResult(`נשלח בהצלחה ל-${sentCount} מכשירים`);
      setTitle('');
      setBody('');
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
          שליחת הודעה לכל המשתמשים
        </Typography>
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
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
              disabled={!title.trim() || !body.trim() || sending}
              onClick={handleSendClick}
              sx={{ borderRadius: 2, alignSelf: 'flex-start' }}
            >
              {sending ? <CircularProgress size={18} sx={{ color: 'white' }} /> : 'שלח לכולם'}
            </Button>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography sx={{ fontSize: 13, color: 'warning.main', fontWeight: 600 }}>
                בטוח? זה נשלח לכל המשתמשים שיש להם התראות פעילות, אי אפשר לבטל.
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
