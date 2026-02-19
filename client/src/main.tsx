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

// רינדור האפליקציה
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
