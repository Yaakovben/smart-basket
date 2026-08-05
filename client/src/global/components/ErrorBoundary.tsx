import { Component, type ReactNode } from 'react';
import { getTranslationsSync } from '../i18n/translations';
import type { Language } from '../types';
import { ErrorBoundaryReloadingScreen } from './ErrorBoundaryReloadingScreen';
import { ErrorBoundaryFallback } from './ErrorBoundaryFallback';

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

    // שגיאת טעינת chunk = גרסה חדשה נפרסה → ניקוי cache וריענון אוטומטי.
    // localStorage ולא sessionStorage: ב-PWA מותקן ב-iOS, sessionStorage
    // מתאפס בכל סגירה-פתיחה מלאה של האפליקציה (WKWebView standalone חדש) -
    // guard שמבוסס עליו לא מגן על התרחיש המדויק הזה (סגור-פתח שוב תוך
    // כמה שניות, בדיוק כשיש race מול ניקוי cache/SW ברקע של handleNewVersion).
    if (isChunkLoadError(error)) {
      console.log('[error-boundary] chunk load error caught:', error.message);
      let lastReload = 0;
      try { lastReload = Number(localStorage.getItem(CHUNK_RELOAD_KEY) || 0); } catch { /* ignore */ }
      if (lastReload && Date.now() - lastReload < 10_000) {
        console.log('[error-boundary] chunk error cooldown active - not reloading again');
        return;
      }

      try { localStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now())); } catch { /* ignore */ }
      console.log('[error-boundary] reloading to recover from chunk load error');
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
      // בזמן ריענון אוטומטי - מסך 'מעדכן גרסה' מעוצב במיוחד
      if (this.state.isReloading) {
        const t = getTranslationsSync(getLanguage());
        return <ErrorBoundaryReloadingScreen t={t} />;
      }

      if (this.props.fallback) {
        return this.props.fallback;
      }

      const lang = getLanguage();
      const t = getTranslationsSync(lang);
      const { error, showDetails, copied } = this.state;

      return (
        <ErrorBoundaryFallback
          t={t}
          error={error}
          showDetails={showDetails}
          copied={copied}
          onReset={this.handleReset}
          onRefresh={this.handleRefresh}
          onClearCacheAndReload={this.handleClearCacheAndReload}
          onToggleDetails={this.toggleDetails}
          onCopyErrorDetails={this.copyErrorDetails}
        />
      );
    }

    return this.props.children;
  }
}
