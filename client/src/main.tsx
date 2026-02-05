import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// Initialize Sentry AFTER app renders (deferred to not block initial paint)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN && import.meta.env.PROD) {
  // Defer Sentry initialization - use requestIdleCallback if available, else setTimeout
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

// Google OAuth Client ID (public client ID - security is enforced via redirect URIs in Google Cloud Console)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1098455194618-a0vvkbc3bfv94a4jqvr0g67s7q5jm73f.apps.googleusercontent.com'

// Render app immediately
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
