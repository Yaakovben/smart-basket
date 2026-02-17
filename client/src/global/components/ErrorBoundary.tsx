import { Component, type ReactNode } from 'react';
import { Box, Typography, Button, Collapse } from '@mui/material';
import { translations } from '../i18n/translations';
import type { Language } from '../types';

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
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false, copied: false };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
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
