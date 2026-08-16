import { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Autocomplete } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import { Modal } from '../../../global/components';
import { pushApi, emailApi, type UserDeliveryStatus, type BroadcastEmailResult } from '../../../services/api';
import type { UserWithLastLogin } from '../types';

interface PushBroadcastManagerProps {
  isDark: boolean;
  users: UserWithLastLogin[];
  onClose: () => void;
}

type Channel = 'push' | 'email';
type Mode = 'all' | 'user' | 'no_push'; // no_push רק בערוץ email
type PushResult = { success: boolean; msg: string; perUser?: UserDeliveryStatus[] } | null;
type EmailResult = { success: boolean; msg: string; perUser?: BroadcastEmailResult['perUser'] } | null;

const ACCENT = '#0D9488';

export const PushBroadcastManager = ({ isDark, users, onClose }: PushBroadcastManagerProps) => {
  const [channel, setChannel] = useState<Channel>('push');
  const [mode, setMode] = useState<Mode>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithLastLogin | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [sending, setSending] = useState(false);
  const [pushResult, setPushResult] = useState<PushResult>(null);
  const [emailResult, setEmailResult] = useState<EmailResult>(null);
  const [confirming, setConfirming] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    emailApi.getEmailStatus().then(setEmailEnabled);
  }, []);

  const isPush = channel === 'push';
  const isEmail = channel === 'email';

  const canSend = isPush
    ? title.trim() && body.trim() && (mode === 'all' || selectedUser)
    : subject.trim() && emailBody.trim() && (mode === 'all' || mode === 'no_push' || selectedUser) && emailEnabled;

  const handleChannelChange = (ch: Channel) => {
    setChannel(ch);
    setMode('all');
    setSelectedUser(null);
    setPushResult(null);
    setEmailResult(null);
    setConfirming(false);
  };

  const handleConfirm = async () => {
    setConfirming(false);
    setSending(true);
    setPushResult(null);
    setEmailResult(null);

    try {
      if (isPush) {
        if (mode === 'all') {
          const r = await pushApi.broadcastPush(title.trim(), body.trim());
          if (r.usersWithPush === 0) {
            setPushResult({ success: false, msg: `אף משתמש (מתוך ${r.totalUsers}) לא הפעיל התראות push`, perUser: r.perUser });
          } else {
            setPushResult({
              success: r.delivered > 0,
              msg: `נשלח ל-${r.delivered} מכשירים אצל ${r.usersWithPush} מתוך ${r.totalUsers} משתמשים. ${r.usersWithoutPush} ללא push`
                + (r.failed > 0 ? `, ${r.failed} נכשלו` : '') + '.',
              perUser: r.perUser,
            });
          }
        } else if (selectedUser) {
          const r = await pushApi.sendPushToUser(selectedUser.id, title.trim(), body.trim());
          if (!r.hasSubscription) {
            setPushResult({ success: false, msg: `${selectedUser.name} לא הפעיל/ה התראות push` });
          } else if (r.delivered > 0) {
            setPushResult({ success: true, msg: `נשלח בהצלחה ל-${selectedUser.name} (${r.delivered} מכשיר${r.delivered > 1 ? 'ים' : ''})` });
          } else {
            setPushResult({ success: false, msg: `השליחה ל-${selectedUser.name} נכשלה בכל המכשירים` });
          }
        }
        setTitle('');
        setBody('');
      } else {
        if (mode === 'user' && selectedUser) {
          const r = await emailApi.sendEmailToUser(selectedUser.id, subject.trim(), emailBody.trim());
          setEmailResult({ success: r.sent, msg: r.sent ? `נשלח ל-${selectedUser.name} (${r.email})` : `השליחה ל-${selectedUser.name} נכשלה` });
        } else {
          const r = await emailApi.broadcastEmail(subject.trim(), emailBody.trim(), mode === 'no_push');
          const msg = `נשלח ל-${r.sent} מתוך ${r.totalUsers}`
            + (r.skipped > 0 ? ` · דולג על ${r.skipped} (יש להם push)` : '')
            + (r.failed > 0 ? ` · ${r.failed} נכשלו` : '');
          setEmailResult({ success: r.sent > 0, msg, perUser: r.perUser });
        }
        setSubject('');
        setEmailBody('');
      }
      setSelectedUser(null);
    } catch (err: unknown) {
      const apiMsg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      const msg = apiMsg || 'שליחה נכשלה - נסה שוב';
      isPush ? setPushResult({ success: false, msg }) : setEmailResult({ success: false, msg });
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

  const channelTab = (value: Channel, label: string, icon: React.ReactNode) => {
    const selected = channel === value;
    return (
      <Box
        onClick={() => handleChannelChange(value)}
        role="button" tabIndex={0}
        sx={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75,
          py: 1, borderRadius: '12px', cursor: 'pointer',
          bgcolor: selected ? ACCENT : 'transparent',
          transition: 'all 0.15s',
          '&:active': { opacity: 0.8 },
        }}
      >
        {icon}
        <Typography sx={{ fontSize: 13, fontWeight: 700, color: selected ? 'white' : (isDark ? '#9CA3AF' : 'text.secondary') }}>
          {label}
        </Typography>
      </Box>
    );
  };

  const modeCard = (value: Mode, label: string, icon: React.ReactNode) => {
    const selected = mode === value;
    return (
      <Box
        onClick={() => { setMode(value); setPushResult(null); setEmailResult(null); }}
        role="button" tabIndex={0}
        sx={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
          py: 1.25, borderRadius: '14px', cursor: 'pointer', border: '1.5px solid',
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

  const ic = (value: Mode) => mode === value ? ACCENT : (isDark ? '#6B7280' : '#9CA3AF');

  const result = isPush ? pushResult : emailResult;

  return (
    <Modal title="שליחת הודעה" onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>

        {/* מתג ערוץ push / email */}
        <Box sx={{
          display: 'flex', gap: 0.5, p: 0.5, borderRadius: '14px',
          bgcolor: isDark ? 'rgba(30,41,59,0.8)' : 'rgba(0,0,0,0.05)',
        }}>
          {channelTab('push', 'Push', <NotificationsActiveIcon sx={{ fontSize: 18, color: channel === 'push' ? 'white' : (isDark ? '#9CA3AF' : '#6B7280') }} />)}
          {channelTab('email', 'מייל', <MailOutlineIcon sx={{ fontSize: 18, color: channel === 'email' ? 'white' : (isDark ? '#9CA3AF' : '#6B7280') }} />)}
        </Box>

        {isEmail && emailEnabled === false && (
          <Box sx={{ px: 1.5, py: 1, borderRadius: '12px', bgcolor: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', display: 'flex', gap: 1, alignItems: 'center' }}>
            <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 18, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: '#B91C1C' }}>
              שירות המייל לא מוגדר בשרת (RESEND_API_KEY חסר)
            </Typography>
          </Box>
        )}

        {/* קהל יעד */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {modeCard('all', 'כל המשתמשים', <GroupsIcon sx={{ color: ic('all'), fontSize: 20 }} />)}
          {isEmail && modeCard('no_push', 'ללא push', <NotificationsOffIcon sx={{ color: ic('no_push'), fontSize: 20 }} />)}
          {modeCard('user', 'משתמש ספציפי', <PersonIcon sx={{ color: ic('user'), fontSize: 20 }} />)}
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

        {/* חיווי push למשתמש ספציפי */}
        {isPush && mode === 'user' && selectedUser && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 1, borderRadius: '12px', bgcolor: selectedUser.hasPushSubscription ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5') : (isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB') }}>
            {selectedUser.hasPushSubscription
              ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18, flexShrink: 0 }} />
              : <WarningAmberIcon sx={{ color: '#D97706', fontSize: 18, flexShrink: 0 }} />}
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: selectedUser.hasPushSubscription ? '#0F766E' : '#92400E' }}>
              {selectedUser.hasPushSubscription ? `ל-${selectedUser.name} יש push פעיל` : `ל-${selectedUser.name} אין push - ההודעה לא תגיע`}
            </Typography>
          </Box>
        )}

        {/* שדות push */}
        {isPush && (
          <>
            <TextField label="כותרת" value={title} onChange={e => setTitle(e.target.value)} inputProps={{ maxLength: 100 }} helperText={`${title.length}/100`} fullWidth sx={textFieldSx} />
            <TextField label="תוכן ההודעה" value={body} onChange={e => setBody(e.target.value)} inputProps={{ maxLength: 300 }} helperText={`${body.length}/300`} multiline minRows={3} fullWidth sx={textFieldSx} />
          </>
        )}

        {/* שדות email */}
        {isEmail && (
          <>
            <TextField label="נושא" value={subject} onChange={e => setSubject(e.target.value)} inputProps={{ maxLength: 150 }} helperText={`${subject.length}/150`} fullWidth sx={textFieldSx} />
            <TextField label="תוכן המייל" value={emailBody} onChange={e => setEmailBody(e.target.value)} inputProps={{ maxLength: 2000 }} helperText={`${emailBody.length}/2000`} multiline minRows={4} fullWidth sx={textFieldSx} />
          </>
        )}

        {!confirming ? (
          <Button
            fullWidth variant="contained"
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
            {sending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : (mode === 'all' || mode === 'no_push' ? `שלח ${isPush ? 'push' : 'מייל'} לכולם` : `שלח ${isPush ? 'push' : 'מייל'}`)}
          </Button>
        ) : (
          <Box sx={{ p: 1.5, borderRadius: '14px', bgcolor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB', border: '1px solid', borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A', display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <WarningAmberIcon sx={{ color: '#D97706', fontSize: 20, mt: '1px', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.5 }}>
                {mode === 'user'
                  ? `בטוח שלשלוח ל-${selectedUser?.name}?`
                  : mode === 'no_push'
                  ? 'בטוח? יישלח לכל מי שאין לו push פעיל.'
                  : `בטוח? יישלח לכל המשתמשים. לא ניתן לביטול.`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button fullWidth variant="contained" color="warning" onClick={handleConfirm} sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}>כן, שלח</Button>
              <Button fullWidth variant="outlined" onClick={() => setConfirming(false)} sx={{ borderRadius: '10px', textTransform: 'none' }}>ביטול</Button>
            </Box>
          </Box>
        )}

        {result && (
          <Box sx={{
            px: 1.5, py: 1.1, borderRadius: '12px',
            bgcolor: result.success ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5') : (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2'),
            border: '1px solid',
            borderColor: result.success ? (isDark ? 'rgba(16,185,129,0.35)' : '#A7F3D0') : (isDark ? 'rgba(239,68,68,0.35)' : '#FCA5A5'),
            display: 'flex', alignItems: 'center', gap: 1,
          }}>
            {result.success ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18, flexShrink: 0 }} /> : <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 18, flexShrink: 0 }} />}
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: result.success ? '#0F766E' : '#B91C1C' }}>{result.msg}</Typography>
          </Box>
        )}

        {/* פירוט push per-user */}
        {isPush && pushResult?.perUser && pushResult.perUser.length > 0 && (
          <Box sx={{ borderRadius: '12px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', maxHeight: 220, overflowY: 'auto' }}>
            {pushResult.perUser.map((u, i) => {
              const cfg = u.status === 'delivered'
                ? { icon: <CheckCircleIcon sx={{ color: '#10B981', fontSize: 16 }} />, color: '#0F766E', label: `נשלח (${u.delivered})` }
                : u.status === 'failed'
                ? { icon: <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 16 }} />, color: '#B91C1C', label: 'נכשל' }
                : { icon: <WarningAmberIcon sx={{ color: '#D97706', fontSize: 16 }} />, color: '#92400E', label: 'אין push' };
              return (
                <Box key={u.userId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.5, py: 0.9, borderTop: i === 0 ? 'none' : '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
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

        {/* פירוט email per-user */}
        {isEmail && emailResult?.perUser && emailResult.perUser.length > 0 && (
          <Box sx={{ borderRadius: '12px', border: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', maxHeight: 200, overflowY: 'auto' }}>
            {emailResult.perUser.map((u, i) => {
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
