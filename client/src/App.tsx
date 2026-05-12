import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { OfflineBanner } from "./global/components/OfflineBanner";
import { ReconnectingBanner } from "./global/components/ReconnectingBanner";
import { useServiceWorker } from './global/hooks';

// ניקוי cache אוטומטי בפריסות חדשות (לא חוסם את הטעינה).
// גרסה ייחודית לכל build, מוזרקת ע"י Vite. הגנה: אם ההזרקה נכשלה
// (typeof === 'undefined') מדלגים על הלוגיקה כולה כדי למנוע סיכון
// ללולאת רענון אינסופית.
const handleNewVersion = () => {
  // הגנה: אם __BUILD_VERSION__ לא הוזרק (build בעייתי או runtime ישן),
  // לא מבצעים השוואה - הגרסה תיכתב ב-build הבא.
  if (typeof __BUILD_VERSION__ === 'undefined' || !__BUILD_VERSION__) {
    console.warn('[version] __BUILD_VERSION__ not injected - skipping cache cleanup');
    return;
  }
  const buildVersion = __BUILD_VERSION__;
  const storedVersion = localStorage.getItem('app_build_version');

  if (storedVersion === buildVersion) return;

  // מניעת לולאת רענון: אם כבר רעננו את הדף לגרסה הזו
  if (sessionStorage.getItem('version_reload_done') === buildVersion) {
    localStorage.setItem('app_build_version', buildVersion);
    return;
  }

  // רענון מיידי לגרסה חדשה אם הייתה גרסה קודמת
  if (storedVersion) {
    localStorage.setItem('app_build_version', buildVersion);
    sessionStorage.setItem('version_reload_done', buildVersion);
    // מסך עדכון: רקטה + halo, מסביר למשתמש שמתבצע עדכון לפני הרענון.
    // מוזרק כ-HTML גולמי כי זה רץ לפני שה-React מורכב.
    showUpdateOverlay();
    // ניקוי cache ברקע לפני רענון
    const cleanup = async () => {
      try {
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          await Promise.all(registrations.map(r => r.unregister()));
        }
      } catch (err) {
        console.warn('[version] cache/SW cleanup failed (non-fatal):', err);
      }
      window.location.reload();
    };
    cleanup();
    return;
  }

  // התקנה ראשונה: שמירת גרסה בלי חסימה
  localStorage.setItem('app_build_version', buildVersion);
};

// מסך עדכון גרסה: רקטה + halo פועם + טקסט "מעדכן גרסה..."
// מוזרק כ-DOM ישיר כי רץ לפני שה-React מורכב.
function showUpdateOverlay() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('app-version-update')) return;
  const overlay = document.createElement('div');
  overlay.id = 'app-version-update';
  overlay.setAttribute('dir', 'rtl');
  overlay.innerHTML = `
    <style>
      #app-version-update {
        position: fixed; inset: 0; z-index: 99999;
        background: radial-gradient(ellipse at top, #2DD4BF 0%, #14B8A6 55%, #0D9488 100%);
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        animation: vuFadeIn 0.25s ease-out;
      }
      @keyframes vuFadeIn { from { opacity: 0; } to { opacity: 1; } }
      #app-version-update .vu-halo {
        position: absolute;
        width: 260px; height: 260px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%);
        animation: vuHalo 2.6s ease-in-out infinite;
      }
      @keyframes vuHalo {
        0%,100% { transform: scale(0.95); opacity: 0.7; }
        50%     { transform: scale(1.1);  opacity: 1; }
      }
      #app-version-update .vu-rocket {
        font-size: 64px; line-height: 1;
        animation: vuFloat 2.2s ease-in-out infinite;
        filter: drop-shadow(0 10px 24px rgba(0,0,0,0.25));
      }
      @keyframes vuFloat {
        0%,100% { transform: translateY(0) rotate(-6deg); }
        50%     { transform: translateY(-10px) rotate(-12deg); }
      }
      #app-version-update .vu-title {
        margin-top: 36px;
        color: #fff;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 0.3px;
        text-shadow: 0 2px 12px rgba(0,0,0,0.18);
      }
      #app-version-update .vu-sub {
        margin-top: 8px;
        color: rgba(255,255,255,0.85);
        font-size: 13px;
        font-weight: 500;
      }
    </style>
    <div class="vu-halo"></div>
    <div class="vu-rocket">🚀</div>
    <div class="vu-title">מעדכן גרסה...</div>
    <div class="vu-sub">גרסה חדשה זמינה — טוען עדכון</div>
  `;
  (document.body || document.documentElement).appendChild(overlay);
}

handleNewVersion();

// ===== Warm-up early ping =====
// שולחים בקשה אסינכרונית ל-/health ברגע שה-JS נטען, במקביל לאתחול הקומפוננטות.
// זה מעיר את שרת Render Free מ-sleep כך שכשבקשות אמיתיות יוצאות (getProfile,
// getLists), השרת כבר חם. חוסך 30-50 שניות של cold-start בכניסה.
// fire-and-forget - לא ממתינים, כשלון שקט.
(() => {
  const apiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : '');
  if (!apiUrl) return;
  const healthUrl = apiUrl.replace(/\/api\/?$/, '') + '/health';
  try {
    fetch(healthUrl, { method: 'GET', cache: 'no-store', credentials: 'omit' }).catch(() => {});
  } catch { /* ignore */ }
})();

// הסתרת מסך הטעינה הראשוני - הסרה מיידית בלי fade כדי לחסוך 300ms של המתנה
export const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.remove();
    document.body.classList.add('app-loaded');
  }
};

const ThemedApp = () => {
  const { settings } = useSettings();

  useServiceWorker();

  const theme = useMemo(() =>
    createAppTheme(settings.theme, settings.language),
    [settings.theme, settings.language]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OfflineBanner />
      <ReconnectingBanner />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </ThemeProvider>
  );
};

const App = () => (
  <ErrorBoundary>
    <SettingsProvider>
      <ThemedApp />
    </SettingsProvider>
  </ErrorBoundary>
);

export default App;
