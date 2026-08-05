import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'
import { initAnalytics } from './global/services/analytics'
import { diagLog } from './global/helpers/crashLog'

// שימו לב: הרוטציה של היומן + ה-heartbeat רצים אוטומטית ברמת המודול
// של crashLog.ts עצמו (לא כאן) - ראו הערה שם למה זה קריטי שזה ירוץ שם
// ולא בקריאה מפורשת מכאן.
diagLog('boot', 'main.tsx module evaluating');

// חיבור מוקדם לשרת ה-API: הדפדפן מתחיל DNS/TCP/TLS ברקע, מקביל לטעינת הקוד,
// כך שהבקשה הראשונה יוצאת מיד בלי לחכות ל-handshake. רמז בלבד - אם לא נצליח, אין נזק.
{
  const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (apiUrl && typeof document !== 'undefined') {
    try {
      const origin = new URL(apiUrl).origin;
      if (!document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = origin;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
        const dns = document.createElement('link');
        dns.rel = 'dns-prefetch';
        dns.href = origin;
        document.head.appendChild(dns);
      }
    } catch {
      // URL לא תקין - מתעלמים, אין השלכה על שאר הקוד
    }
  }
}

// אתחול מערכת דיווח שגיאות מושהה כדי לא לחסום את הצגת הדף
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN && import.meta.env.PROD) {
  // השהיית אתחול, שימוש בזמן סרק אם זמין
  const deferInit = () => {
    import('@sentry/react').then((Sentry) => {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: import.meta.env.MODE,
        enabled: import.meta.env.PROD,
        tracesSampleRate: 0.1,
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0.1,
      })
    })
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(deferInit, { timeout: 3000 })
  } else {
    setTimeout(deferInit, 1000)
  }
}

// אנליטיקס מוצרי (PostHog) - מושהה, no-op עד ש-VITE_POSTHOG_KEY יוגדר בסביבה
initAnalytics()

// חייב להיות מוגדר במשתני סביבה
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// ===== מסך לבן בחזרה מ-background (PWA / iOS Safari) =====
// כשהמשתמש עוזב ל-WhatsApp/Waze וחוזר, הדפדפן עלול להרוג את ה-JS
// (לחץ זיכרון) ואז לטעון את המסמך מ-BFCache בלי React. התוצאה - מסך לבן.
//
// בעבר זה רענן באופן בלתי-מותנה (מעבר לחלון-חסד של 20 שניות) בכל
// pageshow עם persisted=true, או אחרי 30 דק' ברקע - בדיוק כמו שני המנגנונים
// המקבילים (SW_ACTIVATED ב-router/index.tsx, handleNewVersion ב-App.tsx)
// שהוסרו מאותה סיבה בדיוק: רענון כפוי יכול לקטוע בקשת רשת שרצה באותו רגע
// (כולל רענון טוקן), וזו הייתה בפועל אחת הסיבות ל"נזרק ללוגין בלי סיבה" -
// bfcache restore על מובייל (חזרה מרקע) הוא בדיוק התרחיש של "פתיחה שנייה
// אחרי סגירה", וקורה בדיוק ברגע שה-auth-check הפרואקטיבי (client.ts,
// visibilitychange) רץ.
//
// עכשיו בודקים אם המסך *באמת* לבן (ה-root ריק) לפני שמרעננים בכלל -
// זה המקרה היחיד שבאמת דורש תיקון; bfcache restore רגיל משמר את מצב
// React במלואו ולא צריך שום התערבות.
function isRootEmpty(): boolean {
  const root = document.getElementById('root');
  return !root || root.childElementCount === 0;
}
if (typeof window !== 'undefined') {
  let hiddenAt = 0;
  window.addEventListener('pageshow', (e) => {
    const persisted = (e as PageTransitionEvent).persisted;
    const empty = isRootEmpty();
    diagLog('boot', `pageshow persisted=${persisted} rootEmpty=${empty}`);
    if (persisted && empty) {
      diagLog('boot', 'pageshow: reloading (bfcache restore + empty root)');
      window.location.reload();
    }
  });
  document.addEventListener('visibilitychange', () => {
    diagLog('boot', `visibilitychange -> ${document.visibilityState}`);
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (document.visibilityState === 'visible' && hiddenAt > 0) {
      const awayMs = Date.now() - hiddenAt;
      hiddenAt = 0;
      diagLog('boot', `visible again after ${Math.round(awayMs / 1000)}s away, rootEmpty=${isRootEmpty()}`);
      // אחרי 30 דק' מחוץ לאפליקציה, רק אם המסך באמת לבן - לא רענון גורף
      if (awayMs > 30 * 60 * 1000 && isRootEmpty()) {
        diagLog('boot', 'visibilitychange: reloading (long background + empty root)');
        window.location.reload();
      }
    }
  });
  window.addEventListener('pagehide', () => diagLog('boot', 'pagehide fired'));
  window.addEventListener('beforeunload', () => diagLog('boot', 'beforeunload fired'));
  window.addEventListener('unhandledrejection', (e) => diagLog('error', `unhandled promise rejection: ${String(e.reason)}`));
  window.addEventListener('error', (e) => diagLog('error', `window error: ${e.message} at ${e.filename}:${e.lineno}`));
}

diagLog('boot', 'about to render React app');

// רינדור האפליקציה
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)

diagLog('boot', 'render() call returned');
