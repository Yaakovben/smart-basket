import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// App version - bump this to force cache clear for all users
const APP_VERSION = '2.0.1';
const VERSION_KEY = 'app_version';

// Google OAuth Client ID (public client ID - security is enforced via redirect URIs in Google Cloud Console)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1098455194618-a0vvkbc3bfv94a4jqvr0g67s7q5jm73f.apps.googleusercontent.com'

// Render app immediately - don't wait for cache operations
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)

// Auto-clear cache if version changed (runs AFTER app renders - non-blocking)
const storedVersion = localStorage.getItem(VERSION_KEY);
if (storedVersion !== APP_VERSION) {
  // Update version immediately to prevent loops
  localStorage.setItem(VERSION_KEY, APP_VERSION);

  // Clear cache in background, then reload only if needed
  Promise.all([
    'caches' in window ? caches.keys().then(names => Promise.all(names.map(n => caches.delete(n)))) : Promise.resolve(),
    'serviceWorker' in navigator ? navigator.serviceWorker.getRegistrations().then(regs => Promise.all(regs.map(r => r.unregister()))) : Promise.resolve()
  ]).then(() => {
    // Only reload if there was a previous version (not first visit)
    if (storedVersion) {
      console.log(`Cache cleared: ${storedVersion} -> ${APP_VERSION}`);
      window.location.reload();
    }
  });
}
