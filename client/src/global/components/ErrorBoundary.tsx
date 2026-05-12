import { Component, type ReactNode } from 'react';
import { Box, Typography, Button, Collapse, keyframes } from '@mui/material';
import { translations } from '../i18n/translations';
import type { Language } from '../types';

// אנימציות למסך 'מעדכן גרסה' - תחושת שדרוג עליז: רקטה שעולה, נקודות פסים
// מתפצלות מטה לתחושת מהירות, ופעימת halo מאחור.
const rocketRise = keyframes`
  0%   { transform: translateY(0) rotate(-4deg); }
  50%  { transform: translateY(-10px) rotate(0deg); }
  100% { transform: translateY(0) rotate(4deg); }
`;
const haloPulse = keyframes`
  0%, 100% { transform: scale(0.92); opacity: 0.55; }
  50%      { transform: scale(1.08); opacity: 0.9; }
`;
const sparkleDown = keyframes`
  0%   { transform: translateY(-8px); opacity: 0; }
  40%  { opacity: 1; }
  100% { transform: translateY(36px); opacity: 0; }
`;
const progressSlide = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(220%); }
`;
const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0) scale(0.6); opacity: 0.5; }
  40%           { transform: translateY(-5px) scale(1); opacity: 1; }
`;

// זיהוי שגיאות טעינת chunk (קורה כשגרסה חדשה נפרסת והקבצים הישנים נמחקו)
// מזהה רק שגיאות טעינת chunk אמיתיות. הבדיקה הגנרית של
// "TypeError: Failed to fetch" הוסרה כי היא תפסה גם כשלי רשת רגילים
// (חזרה מ-background, שיהוק רשת) וגרמה לחיווי שגוי של "מעדכן גרסה".
const isChunkLoadError = (error: Error): boolean => {
  const message = error.message || '';
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    message.includes('Importing a module script failed')
  );
};

const CHUNK_RELOAD_KEY = 'chunk_error_reload';

// קבלת שפה מ-localStorage (ברירת מחדל: עברית)
const getLanguage = (): Language => {
  try {
    const settings = localStorage.getItem('sb_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      return parsed.language || 'he';
    }
  } catch {
    // ignore
  }
  return 'he';
};

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
  copied: boolean;
  isReloading: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, copied: false, isReloading: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // שגיאת טעינת chunk = גרסה חדשה נפרסה → ניקוי cache וריענון אוטומטי
    if (isChunkLoadError(error)) {
      // מניעת לולאת reload אינסופית
      const lastReload = sessionStorage.getItem(CHUNK_RELOAD_KEY);
      if (lastReload && Date.now() - Number(lastReload) < 10_000) return;

      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      this.setState({ isReloading: true });
      this.handleClearCacheAndReload();
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, showDetails: false, copied: false });
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleClearCacheAndReload = async (): Promise<void> => {
    try {
      // ביטול רישום Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }
      // ניקוי cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      // ניקוי session storage
      sessionStorage.clear();
    } catch {
      // המשך ריענון גם אם הניקוי נכשל
    }
    window.location.href = '/?t=' + Date.now();
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDetails = async (): Promise<void> => {
    const { error } = this.state;
    if (!error) return;

    const errorDetails = `
Error: ${error.name}
Message: ${error.message}
Time: ${new Date().toISOString()}
${error.stack ? `\nStack:\n${error.stack}` : ''}
    `.trim();

    try {
      await navigator.clipboard.writeText(errorDetails);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
      // גיבוי לדפדפנים ללא תמיכה ב-clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = errorDetails;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // בזמן ריענון אוטומטי - מסך 'מעדכן גרסה' מעוצב במיוחד.
      // השראה: רקטה (שדרוג) + halo פועם + פס פרוגרס + נקודות מהבהבות.
      // נותן תחושה של "משהו טוב קורה" במקום loader גנרי.
      if (this.state.isReloading) {
        const t = translations[getLanguage()];
        return (
          <Box sx={{
            position: 'fixed', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: '#14B8A6',
            color: '#fff',
            zIndex: 99999,
            overflow: 'hidden',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
          }}>
            {/* Halo פועם מאחורי הרקטה - עומק + תנועה */}
            <Box sx={{
              position: 'absolute',
              width: 260, height: 260,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 70%)',
              animation: `${haloPulse} 2.4s ease-in-out infinite`,
            }} />

            {/* Container של הרקטה + ה-sparks שיורדים */}
            <Box sx={{ position: 'relative', mb: 4 }}>
              {/* פסי מהירות שיורדים מתחת לרקטה */}
              {[0, 1, 2].map(i => (
                <Box key={i} sx={{
                  position: 'absolute',
                  top: 56,
                  left: `${42 + i * 14}px`,
                  width: 3, height: 12,
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.75)',
                  animation: `${sparkleDown} 1.1s ease-in ${i * 0.18}s infinite`,
                }} />
              ))}
              {/* הרקטה עצמה - emoji גדול עם אנימציית עלייה רכה */}
              <Box sx={{
                fontSize: 88,
                lineHeight: 1,
                filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.25))',
                animation: `${rocketRise} 1.6s ease-in-out infinite`,
                position: 'relative',
                zIndex: 1,
              }}>
                🚀
              </Box>
            </Box>

            {/* טקסט ראשי */}
            <Typography sx={{
              fontSize: 22, fontWeight: 800, mb: 0.5,
              textShadow: '0 2px 8px rgba(0,0,0,0.18)',
              letterSpacing: 0.3,
            }}>
              {t.updatingVersion}
            </Typography>
            <Typography sx={{
              fontSize: 13, fontWeight: 500,
              color: 'rgba(255,255,255,0.88)',
              mb: 3,
              maxWidth: 280, textAlign: 'center', lineHeight: 1.5,
            }}>
              טוענים את הגרסה החדשה ביותר עבורך
            </Typography>

            {/* פס פרוגרס אינדיטרמיניסטי */}
            <Box sx={{
              position: 'relative',
              width: 180, height: 4,
              borderRadius: 999,
              bgcolor: 'rgba(255,255,255,0.25)',
              overflow: 'hidden',
              mb: 2,
            }}>
              <Box sx={{
                position: 'absolute',
                top: 0, left: 0,
                width: '45%', height: '100%',
                borderRadius: 999,
                bgcolor: '#fff',
                boxShadow: '0 0 12px rgba(255,255,255,0.6)',
                animation: `${progressSlide} 1.4s ease-in-out infinite`,
              }} />
            </Box>

            {/* שלוש נקודות מהבהבות מתחת */}
            <Box sx={{ display: 'flex', gap: 0.75 }}>
              {[0, 1, 2].map(i => (
                <Box key={i} sx={{
                  width: 6, height: 6, borderRadius: '50%',
                  bgcolor: '#fff',
                  animation: `${dotBounce} 1.2s ease-in-out ${i * 0.16}s infinite`,
                }} />
              ))}
            </Box>
          </Box>
        );
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const lang = getLanguage();
      const t = translations[lang];
      const { error, showDetails, copied } = this.state;

      return (
        <Box
          sx={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 3,
            textAlign: 'center',
            bgcolor: 'background.default',
            overflow: 'auto'
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '20px',
              bgcolor: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 3,
              fontSize: 40
            }}
          >
            😵
          </Box>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}
          >
            {t.errorTitle}
          </Typography>
          <Typography
            sx={{ color: 'text.secondary', mb: 3, maxWidth: 300 }}
          >
            {t.errorDescription}
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, width: '100%', maxWidth: 300 }}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={this.handleReset}
                sx={{ borderRadius: '12px', px: 3, flex: 1 }}
              >
                {t.tryAgain}
              </Button>
              <Button
                variant="contained"
                onClick={this.handleRefresh}
                sx={{ borderRadius: '12px', px: 3, flex: 1 }}
              >
                {t.refreshPage}
              </Button>
            </Box>
            <Button
              variant="contained"
              onClick={this.handleClearCacheAndReload}
              sx={{ borderRadius: '12px', px: 3, bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}
            >
              {t.clearCacheAndReload}
            </Button>
          </Box>

          {/* פרטי שגיאה לדיווח */}
          <Button
            variant="text"
            onClick={this.toggleDetails}
            sx={{ color: 'text.secondary', fontSize: 13, mb: 1 }}
          >
            {showDetails ? t.hideErrorDetails : t.showErrorDetails}
          </Button>

          <Collapse in={showDetails}>
            <Box
              sx={{
                bgcolor: 'rgba(0,0,0,0.05)',
                borderRadius: '12px',
                p: 2,
                maxWidth: 320,
                width: '100%',
                textAlign: 'left',
                mb: 2
              }}
            >
              <Typography sx={{ fontSize: 12, color: 'error.main', fontFamily: 'monospace', wordBreak: 'break-word' }}>
                {error?.name}: {error?.message}
              </Typography>
              {error?.stack && (
                <Typography sx={{ fontSize: 10, color: 'text.secondary', fontFamily: 'monospace', mt: 1, maxHeight: 100, overflow: 'auto', wordBreak: 'break-word' }}>
                  {error.stack.split('\n').slice(0, 5).join('\n')}
                </Typography>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={this.copyErrorDetails}
                sx={{ mt: 1.5, fontSize: 12, borderRadius: '8px' }}
              >
                {copied ? t.copiedToClipboard : t.copyErrorDetails}
              </Button>
              <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1 }}>
                {t.copyAndSendToSupport}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      );
    }

    return this.props.children;
  }
}
