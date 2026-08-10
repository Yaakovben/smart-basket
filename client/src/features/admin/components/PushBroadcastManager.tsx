import { useState } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Autocomplete } from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import PersonIcon from '@mui/icons-material/Person';
import SendIcon from '@mui/icons-material/Send';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { Modal } from '../../../global/components';
import { pushApi, type UserDeliveryStatus } from '../../../services/api';
import type { UserWithLastLogin } from '../types';

interface PushBroadcastManagerProps {
  isDark: boolean;
  users: UserWithLastLogin[];
  onClose: () => void;
}

type Mode = 'all' | 'user';
type Result = { success: boolean; msg: string; perUser?: UserDeliveryStatus[] } | null;

const ACCENT = '#0D9488';

// טופס שליחת הודעת push - נפתח כמודל דרך אייקון בכותרת האדמין (לא תופס
// מקום קבוע בדף), לכל המשתמשים או למשתמש בודד.
export const PushBroadcastManager = ({ isDark, users, onClose }: PushBroadcastManagerProps) => {
  const [mode, setMode] = useState<Mode>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithLastLogin | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>(null);
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
        const r = await pushApi.broadcastPush(title.trim(), body.trim());
        if (r.usersWithPush === 0) {
          // אף משתמש לא הפעיל פוש בכלל - שום ניסיון שליחה לא בוצע
          setResult({ success: false, msg: `אף משתמש (מתוך ${r.totalUsers}) לא הפעיל התראות push - ההודעה לא נשלחה לאף אחד`, perUser: r.perUser });
        } else {
          setResult({
            success: r.delivered > 0,
            msg: `נשלח ל-${r.delivered} מכשירים אצל ${r.usersWithPush} מתוך ${r.totalUsers} משתמשים. `
              + `${r.usersWithoutPush} משתמשים לא הפעילו push ולא קיבלו את ההודעה`
              + (r.failed > 0 ? `, ${r.failed} שליחות נכשלו בפועל` : '') + '.',
            perUser: r.perUser,
          });
        }
      } else if (selectedUser) {
        const r = await pushApi.sendPushToUser(selectedUser.id, title.trim(), body.trim());
        if (!r.hasSubscription) {
          // אין למשתמש הזה שום מנוי push פעיל - שום ניסיון שליחה לא קרה
          // בכלל (למשל: לא אישר התראות בדפדפן, או לא התקין את ה-PWA).
          setResult({ success: false, msg: `${selectedUser.name} לא הפעיל/ה התראות push - ההודעה לא נשלחה` });
        } else if (r.delivered > 0) {
          setResult({ success: true, msg: `נשלח בהצלחה ל-${selectedUser.name} (${r.delivered} מכשיר${r.delivered > 1 ? 'ים' : ''})` });
        } else {
          setResult({ success: false, msg: `השליחה ל-${selectedUser.name} נכשלה בכל המכשירים שלו/ה` });
        }
      }
      setTitle('');
      setBody('');
      setSelectedUser(null);
    } catch {
      setResult({ success: false, msg: 'השליחה נכשלה - נסה שוב' });
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
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 0.5,
          py: 1.5,
          borderRadius: '14px',
          cursor: 'pointer',
          border: '1.5px solid',
          borderColor: selected ? ACCENT : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
          bgcolor: selected ? (isDark ? 'rgba(13,148,136,0.16)' : '#F0FDFA') : (isDark ? 'rgba(30,41,59,0.6)' : '#F8FAFB'),
          transition: 'all 0.15s',
          '&:active': { transform: 'scale(0.97)' },
        }}
      >
        {icon}
        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: selected ? ACCENT : (isDark ? '#9CA3AF' : 'text.secondary') }}>
          {label}
        </Typography>
      </Box>
    );
  };

  return (
    <Modal title="שליחת הודעת push" onClose={onClose}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', textAlign: 'center', mt: -1 }}>
          ההודעה תישלח כהתראת push למכשירים עם התראות פעילות
        </Typography>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {modeCard('all', 'כל המשתמשים', <GroupsIcon sx={{ color: mode === 'all' ? ACCENT : (isDark ? '#6B7280' : '#9CA3AF'), fontSize: 22 }} />)}
          {modeCard('user', 'משתמש ספציפי', <PersonIcon sx={{ color: mode === 'user' ? ACCENT : (isDark ? '#6B7280' : '#9CA3AF'), fontSize: 22 }} />)}
        </Box>

        {mode === 'user' && (
          <Autocomplete
            size="small"
            options={users}
            value={selectedUser}
            onChange={(_, v) => setSelectedUser(v)}
            getOptionLabel={(u) => `${u.name} (${u.email})`}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            // MUI ממקם את חץ הפתיחה/ה-X עם right קבוע (הנחת LTR) - באפליקציה
            // RTL בלי stylis-plugin-rtl (לא מותקן, שינוי גלובלי מסוכן מדי כאן)
            // זה נשאר קבוע מימין, שזה בדיוק הצד שבו טקסט RTL *מתחיל* - חופף
            // על השם שנבחר. מזיזים ידנית לצד השני, ספציפית לרכיב הזה בלבד.
            // הריווח השמור בפועל הוא לא על ה-root אלא על ה-input עצמו
            // (.MuiAutocomplete-input) - MUI מוסיף לו paddingRight מחושב לפי
            // מספר האייקונים (hasPopupIcon/hasClearIcon), עם specificity שגובר
            // על עקיפת ה-root. כיוון שהעברנו את האייקונים לשמאל, צריך לאפס את
            // ה-paddingRight המובנה ולהוסיף paddingLeft במקומו, עם !important
            // כי כלל ה-source של MUI ספציפי יותר מ-selector רגיל של sx.
            // 64px היה קרוב מדי לרוחב האמיתי של שני האייקונים (clear+popup,
            // כ-28px כל אחד) + היסט ה-left - שם ארוך עדיין חפף בכמה פיקסלים
            // בדיוק מתחת לחץ. הוגדל עם מרווח ביטחון אמיתי במקום מספר צמוד.
            sx={{
              '& .MuiAutocomplete-endAdornment': { right: 'auto', left: 4 },
              '& .MuiAutocomplete-input': { paddingRight: '6px !important', paddingLeft: '84px !important' },
            }}
            renderInput={(params) => <TextField {...params} label="חיפוש משתמש" sx={textFieldSx} />}
          />
        )}

        {/* חיווי מיידי אם יש לו/ה בכלל push פעיל - לפני שליחה, לא רק אחריה */}
        {mode === 'user' && selectedUser && (
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            px: 1.5, py: 1, borderRadius: '12px',
            bgcolor: selectedUser.hasPushSubscription
              ? (isDark ? 'rgba(16,185,129,0.12)' : '#ECFDF5')
              : (isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB'),
          }}>
            {selectedUser.hasPushSubscription
              ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18, flexShrink: 0 }} />
              : <WarningAmberIcon sx={{ color: '#D97706', fontSize: 18, flexShrink: 0 }} />}
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: selectedUser.hasPushSubscription ? '#0F766E' : '#92400E' }}>
              {selectedUser.hasPushSubscription
                ? `ל-${selectedUser.name} יש התראות push פעילות`
                : `ל-${selectedUser.name} אין התראות push פעילות - השליחה לא תגיע`}
            </Typography>
          </Box>
        )}

        <TextField
          label="כותרת"
          value={title}
          onChange={e => setTitle(e.target.value)}
          inputProps={{ maxLength: 100 }}
          helperText={`${title.length}/100`}
          fullWidth
          sx={textFieldSx}
        />
        <TextField
          label="תוכן ההודעה"
          value={body}
          onChange={e => setBody(e.target.value)}
          inputProps={{ maxLength: 300 }}
          helperText={`${body.length}/300`}
          multiline
          minRows={3}
          fullWidth
          sx={textFieldSx}
        />

        {!confirming ? (
          <Button
            fullWidth
            variant="contained"
            disabled={!canSend || sending}
            onClick={handleSendClick}
            startIcon={!sending && <SendIcon />}
            sx={{
              borderRadius: '14px',
              py: 1.3,
              fontWeight: 700,
              fontSize: 15,
              textTransform: 'none',
              background: 'linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)',
              boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
              '&:hover': { background: 'linear-gradient(135deg, #0D9488 0%, #14B8A6 100%)' },
              '&.Mui-disabled': { background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' },
              // MUI-startIcon משתמש ב-marginRight/marginLeft פיזיים (8px/-4px-),
              // בהנחת LTR: ב-flex row רגיל זה משאיר רווח בין האייקון לטקסט.
              // כאן ה-flex מתהפך ויזואלית בגלל dir="rtl" של הדף (בלי stylis-rtl,
              // ראו הערה זהה ב-Autocomplete למעלה) - אז ה-marginLeft השלילי
              // נופל בדיוק בין האייקון לטקסט ומדביק אותם, במקום על הצד החיצוני.
              // הופכים את שני הצדדים כדי לקבל את אותו מרווח ויזואלי שהתכוון אליו MUI.
              '& .MuiButton-startIcon': { marginRight: '-4px', marginLeft: '8px' },
            }}
          >
            {sending ? <CircularProgress size={20} sx={{ color: 'white' }} /> : (mode === 'all' ? 'שלח לכולם' : 'שלח הודעה')}
          </Button>
        ) : (
          <Box sx={{
            p: 1.5,
            borderRadius: '14px',
            bgcolor: isDark ? 'rgba(245,158,11,0.12)' : '#FFFBEB',
            border: '1px solid',
            borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#FDE68A',
            display: 'flex',
            flexDirection: 'column',
            gap: 1.25,
          }}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <WarningAmberIcon sx={{ color: '#D97706', fontSize: 20, mt: '1px', flexShrink: 0 }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: isDark ? '#FCD34D' : '#92400E', lineHeight: 1.5 }}>
                {mode === 'all'
                  ? 'בטוח? זה נשלח לכל המשתמשים שיש להם התראות פעילות, אי אפשר לבטל.'
                  : `בטוח שלשלוח ל-${selectedUser?.name}?`}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                fullWidth
                variant="contained"
                color="warning"
                onClick={handleConfirmSend}
                sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
              >
                כן, שלח
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => setConfirming(false)}
                sx={{ borderRadius: '10px', textTransform: 'none' }}
              >
                ביטול
              </Button>
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
            {result.success
              ? <CheckCircleIcon sx={{ color: '#10B981', fontSize: 18, flexShrink: 0 }} />
              : <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 18, flexShrink: 0 }} />}
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: result.success ? '#0F766E' : '#B91C1C' }}>
              {result.msg}
            </Typography>
          </Box>
        )}

        {/* פירוט per-user מסודר - למי נשלח ולמי לא, ולמי אין push בכלל.
            perUser כבר ממוין בשרת: no_subscription קודם, אחר-כך failed, אחר-כך delivered. */}
        {result?.perUser && result.perUser.length > 0 && (
          <Box sx={{
            borderRadius: '12px',
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            maxHeight: 220,
            overflowY: 'auto',
          }}>
            {result.perUser.map((u, i) => {
              const cfg = u.status === 'delivered'
                ? { icon: <CheckCircleIcon sx={{ color: '#10B981', fontSize: 16 }} />, color: '#0F766E', label: `נשלח (${u.delivered} מכשיר${u.delivered > 1 ? 'ים' : ''})` }
                : u.status === 'failed'
                ? { icon: <ErrorOutlineIcon sx={{ color: '#EF4444', fontSize: 16 }} />, color: '#B91C1C', label: 'נכשל' }
                : { icon: <WarningAmberIcon sx={{ color: '#D97706', fontSize: 16 }} />, color: '#92400E', label: 'אין push' };
              return (
                <Box
                  key={u.userId}
                  sx={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1,
                    px: 1.5, py: 0.9,
                    borderTop: i === 0 ? 'none' : '1px solid',
                    borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                    {cfg.icon}
                    <Typography sx={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {u.name}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                    {cfg.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Modal>
  );
};
