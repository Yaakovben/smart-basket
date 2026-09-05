import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { useSettings } from '../../../global/context/SettingsContext';
import { COMMON_STYLES, haptic } from '../../../global/helpers';
import { isInBrowser } from '../helpers/pwaDetection';

// דף נחיתה של קישור הצטרפות: /join?code=...&password=...
//
// כשנפתח בתוך ה-PWA המותקן (אנדרואיד: launch_handler 'navigate-existing'
// מנווט את החלון הקיים לכאן) - שומרים code+password ל-localStorage ומפנים
// הביתה מיד; useHome (useHome.ts) קורא את sb_join_code ופותח את מודאל
// ההצטרפות אוטומטית.
//
// כשנפתח בדפדפן (ב-iOS זה תמיד המצב - אין דרך לפתוח PWA מותקן מקישור
// https; באנדרואיד זה קורה כשהקישור נפתח מדפדפן-בתוך-אפליקציה כמו WhatsApp)
// מציגים מסך ביניים: הקוד והסיסמה גדולים + כפתור להעתיק ולפתוח את
// האפליקציה המותקנת ידנית, וכפתור משני "המשך כאן" שממשיך בזרימה הרגילה
// בדפדפן (הנתיב הנכון גם למי שעדיין לא התקין).
export const JoinLanding = () => {
  const { t } = useSettings();
  const params = new URLSearchParams(window.location.search);
  const code = (params.get('code') || '').trim();
  const password = (params.get('password') || '').trim();
  const [copied, setCopied] = useState(false);
  const [proceed, setProceed] = useState(false);

  const persist = () => {
    if (!code) return;
    try {
      localStorage.setItem('sb_join_code', code);
      if (password) localStorage.setItem('sb_join_password', password);
    } catch {
      // אחסון חסום (למשל Safari פרטי) - הקוד עדיין מוצג על המסך להעתקה ידנית.
    }
  };

  // אין קוד / כבר רצים באפליקציה המותקנת / המשתמש בחר להמשיך בדפדפן -
  // התנהגות המקור: שמור והפנה הביתה.
  if (!code || !isInBrowser() || proceed) {
    persist();
    return <Navigate to="/" replace />;
  }

  const handleCopy = () => {
    haptic('light');
    const text = password ? `${code} / ${password}` : code;
    navigator.clipboard?.writeText(text).catch(() => {});
    persist();
    setCopied(true);
  };

  const codeRowSx = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    px: 2, py: 1.25,
  } as const;
  const codeValueSx = {
    fontSize: 20, fontWeight: 800, color: 'primary.main',
    letterSpacing: 2, fontFamily: 'monospace',
  } as const;

  return (
    <Box sx={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      p: 3, bgcolor: 'background.default',
    }}>
      <Box sx={{ width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <Box sx={{
          width: 60, height: 60, borderRadius: '18px',
          background: COMMON_STYLES.gradients.header.light,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', mx: 'auto', mb: 2,
          boxShadow: '0 8px 24px rgba(20,184,166,0.3)',
        }}>
          <PersonAddIcon sx={{ fontSize: 30 }} />
        </Box>
        <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{t('joinLandingTitle')}</Typography>

        {/* קוד + סיסמה - גדולים וברורים להעתקה/הקלדה ידנית באפליקציה */}
        <Box sx={{
          mt: 2, mb: 2.5, borderRadius: '16px', overflow: 'hidden',
          border: '1.5px solid rgba(20,184,166,0.25)',
          background: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(20,184,166,0.03))',
        }}>
          <Box sx={{ ...codeRowSx, borderBottom: password ? '1px solid rgba(20,184,166,0.15)' : 'none' }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>{t('groupCode')}</Typography>
            <Typography sx={codeValueSx}>{code}</Typography>
          </Box>
          {password && (
            <Box sx={codeRowSx}>
              <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: 'text.secondary' }}>{t('password')}</Typography>
              <Typography sx={codeValueSx}>{password}</Typography>
            </Box>
          )}
        </Box>

        <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1 }}>{t('joinLandingHaveApp')}</Typography>
        <Button
          fullWidth
          onClick={handleCopy}
          startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
          sx={{
            background: 'linear-gradient(135deg, #14B8A6, #0D9488)', color: 'white',
            borderRadius: '12px', height: 46, fontWeight: 700, textTransform: 'none', fontSize: 14,
            '&:hover': { background: 'linear-gradient(135deg, #14B8A6, #0D9488)' },
          }}
        >
          {copied ? t('copied') : t('joinLandingOpenApp')}
        </Button>
        {copied && (
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 1, lineHeight: 1.5 }}>
            {t('joinLandingCopiedHint')}
          </Typography>
        )}

        <Button
          fullWidth
          onClick={() => { persist(); setProceed(true); }}
          sx={{ mt: 1.5, color: 'text.secondary', textTransform: 'none', fontWeight: 600, fontSize: 13.5 }}
        >
          {t('joinLandingContinueHere')}
        </Button>
      </Box>
    </Box>
  );
};

JoinLanding.displayName = 'JoinLanding';
