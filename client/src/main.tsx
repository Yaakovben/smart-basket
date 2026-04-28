import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

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

// חייב להיות מוגדר במשתני סביבה
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

// ===== מסך לבן בחזרה מ-background (PWA / iOS Safari) =====
// כשהמשתמש עוזב ל-WhatsApp/Waze וחוזר, הדפדפן עלול להרוג את ה-JS
// (לחץ זיכרון) ואז לטעון את המסמך מ-BFCache בלי React. התוצאה - מסך לבן.
// פתרונות:
//  1. event 'pageshow' עם persisted=true ⇒ ה-DOM שוחזר מ-BFCache. נטען מחדש.
//  2. visibilitychange אחרי שהיינו מוסתרים יותר מ-30 דק' ⇒ נרענן ברקע
//     (ה-JS עלול להיות שגוי בגלל זמן רב מדי במצב suspended).
if (typeof window !== 'undefined') {
  let hiddenAt = 0;
  window.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) {
      // BFCache restore - נטען מחדש כדי שכל ה-JS ירוץ מההתחלה
      window.location.reload();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else if (document.visibilityState === 'visible' && hiddenAt > 0) {
      const awayMs = Date.now() - hiddenAt;
      hiddenAt = 0;
      // אחרי 30 דק' מחוץ לאפליקציה - רענון רך כדי למנוע מצב לא תקין
      if (awayMs > 30 * 60 * 1000) {
        window.location.reload();
      }
    }
  });
}

// רינדור האפליקציה
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
