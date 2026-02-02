import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// App version - bump this to force cache clear for all users
const APP_VERSION = '2.0.0';
const VERSION_KEY = 'app_version';

// Auto-clear cache if version changed
const clearCacheIfNeeded = async () => {
  const storedVersion = localStorage.getItem(VERSION_KEY);

  if (storedVersion !== APP_VERSION) {
    console.log(`Version changed from ${storedVersion} to ${APP_VERSION}, clearing cache...`);

    // Clear all caches
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // Unregister all service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }

    // Update stored version
    localStorage.setItem(VERSION_KEY, APP_VERSION);

    // Reload to get fresh content (only if we actually cleared something)
    if (storedVersion !== null) {
      window.location.reload();
      return true;
    }
  }
  return false;
};

// Run cache clear before rendering
clearCacheIfNeeded();

// Google OAuth Client ID (public client ID - security is enforced via redirect URIs in Google Cloud Console)
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1098455194618-a0vvkbc3bfv94a4jqvr0g67s7q5jm73f.apps.googleusercontent.com'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
