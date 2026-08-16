import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Autocomplete } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { Modal } from '../../../global/components';
import { emailApi, type BroadcastEmailResult, type SendEmailResult } from '../../../services/api';
import type { UserWithLastLogin } from '../types';

interface EmailBroadcastManagerProps {
  isDark: boolean;
  users: UserWithLastLogin[];
  onClose: () => void;
}

type Mode = 'all' | 'no_push' | 'user';
type Result =
  | { type: 'broadcast'; data: BroadcastEmailResult }
  | { type: 'single'; data: SendEmailResult; name: string }
  | null;

const ACCENT = '#0D9488';

export const EmailBroadcastManager = ({ isDark, users, onClose }: EmailBroadcastManagerProps) => {
  const [mode, setMode] = useState<Mode>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithLastLogin | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
  const [confirming, setConfirming] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    emailApi.getEmailStatus().then(setEmailEnabled);
  }, []);

  const canSend = subject.trim() && body.trim() && (mode !== 'user' || selectedUser) && emailEnabled;

  const handleConfirm = async () => {
    setConfirming(false);
    setSending(true);
    setResult(null);
    try {
      if (mode === 'user' && selectedUser) {
        const data = await emailApi.sendEmailToUser(selectedUser.id, subject.trim(), body.trim());
        setResult({ type: 'single', data, name: selectedUser.name });
      } else {
        const data = await emailApi.broadcastEmail(subject.trim(), body.trim(), mode === 'no_push');
        setResult({ type: 'broadcast', data });
      }
      setSubject('');
      setBody('');
      setSelectedUser(null);
    } catch {
      setResult(null);
    } finally {
      setSending(false);
    }
  };

  const textFieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: '14px',
      bgcolor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFB',
      '& fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)' },
      '&:hover fieldset': { borderColor: ACCENT },
      '&.Mui-focused fieldset': { borderColor: ACCENT, borderWidth: 1.5 },
    },
  };

  const modeCard = (value: Mode, label: string, icon: React.ReactNode) => {
    const selected = mode === value;
    return (
      <Box
        onClick={() => { setMode(value); setResult(null); }}
        role="button"
        tabIndex={0}
        sx={{
          flex: 1,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
          py: 1.25, borderRadius: '14px', cursor: 'pointer',
          border: '1.5px solid',
          borderColor: selected ? ACCENT : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
          bgcolor: selected ? (isDark ? 'rgba(13,148,136,0.16)' : '#F0FDFA') : (isDark ? 'rgba(30,41,59,0.6)' : '#F8FAFB'),
          transition: 'all 0.15s',
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        {icon}
        <Typography sx={{ fontSize: 11.5, fontWeight: 700, textAlign: 'center', color: selected ? ACCENT : (isDark ? '#9CA3AF' : 'text.secondary') }}>
          {label}
        </Typography>
      </Box>
    );
  };

  const iconColor = (value: Mode) => mode === value ? ACCENT : (isDark ? '#6B7280' : '#9CA3AF');

  const resultSummary = () => {
    if (!result) return null;
    if (result.type === 'single') {
      const ok = result.data.sent;
      return { success: ok, msg: ok ? `נשלח בהצלחה ל-${result.name} (${result.data.email})` : `השליחה ל-${result.name} נכשלה` };
    }
    const { sent, failed, skipped, totalUsers } = result.data;
    const msg = `נשלח ל-${sent} מתוך ${totalUsers} משתמשים`
      + (skipped > 0 ? ` · דולג על ${skipped} (יש להם push)` : '')
      + (failed > 0 ? ` · ${failed} נכשלו` : '');
    return { success: sent > 0, msg };
  };

  const summary = resultSummary();

  return (
    <Modal title="שליחת מייל" onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', mt: -1 }}>
          המייל ייצא מהחשבון המוגדר בשרת
        </Typography>

        {emailEnabled === false && (
          <Box sx={{ px: 1.5, py: 1, borderRadius: '12px', bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', display: 'flex', gap: 1, alignItems: 'center' }}>
            <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 18, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#B91C1C' }}>
              שירות המייל לא מוגדר בשרת (GMAIL_USER / GMAIL_APP_PASSWORD חסרים)
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1 }}>
          {modeCard('all', 'כל המשתמשים', <GroupsIcon sx={{ color: iconColor('all'), fontSize: 20 }} />)}
          {modeCard('no_push', 'ללא push', <NotificationsOffIcon sx={{ color: iconColor('no_push'), fontSize: 20 }} />)}
          {modeCard('user', 'ספציפי', <PersonIcon sx={{ color: iconColor('user'), fontSize: 20 }} />)}
        </Box>

        {mode === 'user' && (
          <Autocomplete
            size="small"
            options={users}
            value={selectedUser}
            onChange={(_, v) => setSelectedUser(v)}
            getOptionLabel={(u) => `${u.name} (${u.email})`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            sx={{
              '& .MuiAutocomplete-endAdornment': { right: 'auto', left: 4 },
              '& .MuiAutocomplete-input': { paddingRight: '6px !important', paddingLeft: '84px !important' },
            }}
            renderInput={(params) => <TextField {...params} label="חיפוש משתמש" sx={textFieldSx} />}
          />
        )}

        <TextField
          label="נושא"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          inputProps={{ maxLength: 150 }}
          helperText={`${subject.length}/150`}
          fullWidth
          sx={textFieldSx}
        />
        <TextField
          label="תוכן המייל"
          value={body}
          onChange={e => setBody(e.target.value)}
          inputProps={{ maxLength: 2000 }}
          helperText={`${body.length}/2000`}
          multiline
          minRows={4}
          fullWidth
          sx={textFieldSx}
        />

        {!confirming ? (
          <Button
            fullWidth
            variant="contained"
            disabled={!canSend || sending}
            onClick={() => setConfirming(true)}
            startIcon={!sending && <SendIcon />}
            sx={{
              borderRadius: '14px', py: 1.3, fontWeight: 700, fontSize: 15, textTransform: 'none',
              background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
              boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' },
              '&.Mui-disabled': { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
              '& .MuiButton-startIcon': { marginRight: '-4px', marginLeft: '8px' },
            }}
          >
            {sending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'שלח מייל'}
          </Button>
        ) : (
          <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB', border: '1px solid', borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <WarningAmberIcon sx={{ color: '#D97706', fontSize: 20, mt: '1px', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.5 }}>
                {mode === 'user'
                  ? `בטוח שלשלוח מייל ל-${selectedUser?.name}?`
                  : mode === 'no_push'
                  ? 'בטוח? יישלח לכל מי שאין לו התראות push פעילות.'
                  : 'בטוח? יישלח לכל המשתמשים. לא ניתן לביטול.'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button fullWidth variant="contained" color="warning" onClick={handleConfirm} sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>כן, שלח</Button>
              <Button fullWidth variant="outlined" onClick={() => setConfirming(false)} sx={{ borderRadius: '10px', textTransform: 'none' }}>ביטול</Button>
            </Box>
          </Box>
        )}

        {summary && (
          <Box sx={{
            px: 1.5, py: 1.1, borderRadius: '12px',
            bgcolor: summary.success ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5') : (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2'),
            border: '1px solid',
            borderColor: summary.success ? (isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0') : (isDark ? 'rgba(239,68,68,0.35)' : '#FCA5A5'),
            display: 'flex', alignItems: 'center', gap: 1,
          }}>
            {summary.success
              ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18, flexShrink: 0 }} />
              : <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 18, flexShrink: 0 }} />}
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: summary.success ? '#0F766E' : '#B91C1C' }}>
              {summary.msg}
            </Typography>
          </Box>
        )}

        {result?.type === 'broadcast' && result.data.perUser.length > 0 && (
          <Box sx={{ borderRadius: '12px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto' }}>
            {result.data.perUser.map((u, i) => {
              const cfg = u.status === 'sent'
                ? { icon: <CheckCircleIcon sx={{ color: '#10B981', fontSize: 16 }} />, label: 'נשלח', color: '#0F766E' }
                : u.status === 'failed'
                ? { icon: <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 16 }} />, label: 'נכשל', color: '#B91C1C' }
                : { icon: <MailOutlineIcon sx={{ color: '#9CA3AF', fontSize: 16 }} />, label: 'דולג', color: '#6B7280' };
              return (
                <Box key={u.userId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.5, py: 0.8, borderTop: i === 0 ? 'none' : '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {cfg.icon}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>{cfg.label}</Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Modal>
  );
};
