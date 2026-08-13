import { useEffect, useRef, useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Drawer, Typography, IconButton, Button, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';
import { aiAssistantApi } from '../../../../services/api';
import { useSettings } from '../../../../global/context/SettingsContext';

interface ListAnalysisDrawerProps {
  open: boolean;
  onClose: () => void;
  listName: string;
  productNames: string[];
}

function buildAnalysisPrompt(listName: string, productNames: string[]): string {
  const items = productNames.slice(0, 40).join(', ');
  return (
    `נתח את רשימת הקניות "${listName}" שמכילה: ${items}.\n` +
    `ענה בעברית בפורמט קצר ומובנה עם 3 סעיפים בלבד:\n` +
    `🛒 **סיכום**: קטגוריות עיקריות ומה בולט ברשימה (משפט אחד).\n` +
    `➕ **מה כדאי להוסיף**: עד 3 מוצרים שכנראה נשכחו לפי ההקשר (שורה קצרה לכל אחד).\n` +
    `💡 **טיפ לחיסכון**: המלצה אחת ספציפית וישימה.\n` +
    `אל תוסיף כותרות נוספות, אל תסביר את עצמך, רק את 3 הסעיפים.`
  );
}

export const ListAnalysisDrawer = memo(({ open, onClose, listName, productNames }: ListAnalysisDrawerProps) => {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const isDark = settings.theme === 'dark';

  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!open || ranRef.current) return;
    ranRef.current = true;
    setText('');
    setDone(false);
    setError(false);
    setLoading(true);

    const prompt = buildAnalysisPrompt(listName, productNames);
    aiAssistantApi.chatStream(
      [{ role: 'user', content: prompt }],
      (delta) => {
        setLoading(false);
        setText(prev => prev + delta);
      }
    )
      .then(() => setDone(true))
      .catch(() => { setError(true); setLoading(false); })
      .finally(() => setLoading(false));
  }, [open, listName, productNames]);

  // איפוס כשהdrawer נסגר - מוכן לפתיחה הבאה
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      ranRef.current = false;
      setText('');
      setDone(false);
      setError(false);
    }, 300);
  };

  const goToChat = () => {
    handleClose();
    navigate('/assistant', {
      state: { initialPrompt: `ספר לי עוד על הרשימה "${listName}" ואיך לשפר אותה` },
    });
  };

  // עיבוד טקסט פשוט: **bold** → מודגש, שורות ריקות → רווח
  const renderText = (raw: string) => {
    return raw.split('\n').map((line, i) => {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <Typography key={i} component="p" sx={{
          fontSize: 14.5, lineHeight: 1.75, color: 'text.primary',
          mb: line.trim() === '' ? 0.5 : 0,
        }}>
          {parts.map((part, j) =>
            j % 2 === 1
              ? <Box key={j} component="span" sx={{ fontWeight: 800 }}>{part}</Box>
              : part
          )}
        </Typography>
      );
    });
  };

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={handleClose}
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(2px)' } } }}
      PaperProps={{
        sx: {
          borderRadius: '24px 24px 0 0',
          maxHeight: '75dvh',
          bgcolor: isDark ? '#1E293B' : '#FAFAFA',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        },
      }}
    >
      {/* ידית גרירה */}
      <Box sx={{ pt: 1.25, pb: 0.5, display: 'flex', justifyContent: 'center' }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }} />
      </Box>

      {/* כותרת */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, pb: 1.5, gap: 1 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '12px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #8B5CF6 0%, #14B8A6 100%)',
        }}>
          <AutoAwesomeRoundedIcon sx={{ color: 'white', fontSize: 18 }} />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
            ניתוח הרשימה
          </Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
            {listName}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>

      {/* תוכן */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 2.5, pb: 1 }}>
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 3 }}>
            <CircularProgress size={18} sx={{ color: '#14B8A6' }} />
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>מנתח את הרשימה...</Typography>
          </Box>
        )}
        {error && (
          <Typography sx={{ fontSize: 14, color: 'error.main', py: 2 }}>
            לא הצלחתי לנתח את הרשימה. נסה שוב.
          </Typography>
        )}
        {text && (
          <Box sx={{
            bgcolor: isDark ? 'rgba(255,255,255,0.04)' : 'white',
            borderRadius: '16px',
            p: 2,
            border: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          }}>
            {renderText(text)}
            {!done && (
              <Box component="span" sx={{
                display: 'inline-block', width: 8, height: 15, bgcolor: '#14B8A6',
                borderRadius: 1, ml: 0.5, animation: 'blink 0.8s step-end infinite',
                '@keyframes blink': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0 } },
              }} />
            )}
          </Box>
        )}
      </Box>

      {/* כפתור המשך */}
      {done && (
        <Box sx={{ px: 2, py: 1.5, pb: 'max(16px, env(safe-area-inset-bottom))', borderTop: '1px solid', borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ChatRoundedIcon sx={{ fontSize: 17 }} />}
            onClick={goToChat}
            sx={{
              borderRadius: '14px', textTransform: 'none', fontWeight: 700, fontSize: 14,
              borderColor: isDark ? 'rgba(20,184,166,0.4)' : '#99F6E4',
              color: isDark ? '#5EEAD4' : '#0F766E',
              '&:hover': { bgcolor: isDark ? 'rgba(20,184,166,0.08)' : '#F0FDFA', borderColor: '#14B8A6' },
            }}
          >
            המשך שיחה עם העוזר
          </Button>
        </Box>
      )}
    </Drawer>
  );
});

ListAnalysisDrawer.displayName = 'ListAnalysisDrawer';
