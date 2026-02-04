import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App.tsx'

// Initialize Sentry error monitoring (only in production with DSN)
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
if (SENTRY_DSN && import.meta.env.PROD) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Only send errors in production
    enabled: import.meta.env.PROD,
    // Performance monitoring
    tracesSampleRate: 0.1,
    // Session replay for debugging
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
  })
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
