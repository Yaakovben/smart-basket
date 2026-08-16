import { useMemo, useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { useServiceWorker } from './global/hooks';
import { diagLog } from './global/helpers/crashLog';

// עדכון גרסה: ניקוי SW/caches ברקע, בלי רענון כפוי.
//
// בעבר, כשה-build version (הזרקה ע"י Vite, hash-content) השתנה מאז
// הביקור הקודם, הפונקציה הזו עשתה window.location.reload() מיידי ובלתי-
// מותנה - לפני שה-React בכלל התרכב, בלי שום בדיקה אם יש בקשת רשת
// שרצה (checkAuth/רענון טוקן/סנכרון אופליין). זו הייתה הסיבה המרכזית
// למשתמשים שנזרקים ללוגין בלי סיבה נראית לעין אחרי כל deploy: הרענון
// קטע בקשות שרצו באותו רגע בדיוק. אין רגע "בטוח" לרענון כפוי שרץ כל כך
// מוקדם בטעינת הדף - אז ויתרנו עליו לגמרי, כמו שנעשה גם למנגנון המקביל
// ב-router/index.tsx.
//
// עדיין רוצים לוודא שמכשירים עם SW/cache ישנים "יתנקו" בפועל ולא ייתקעו -
// אז מנקים caches + מבטלים רישום SW ברקע (לא חוסם, לא מרענן). ה-JS שכבר
// רץ בזיכרון ממשיך בלי הפרעה; הטעינה הבאה (סגירה-פתיחה טבעית, שלא עוברת
// דרך שום cache ישן יותר) מקבלת קוד טרי לגמרי.
const handleNewVersion = () => {
  if (typeof __BUILD_VERSION__ === 'undefined' || !__BUILD_VERSION__) return;
  const buildVersion = __BUILD_VERSION__;
  const storedVersion = localStorage.getItem('app_build_version');
  diagLog('version', `stored=${storedVersion} current=${buildVersion}`);
  localStorage.setItem('app_build_version', buildVersion);

  if (!storedVersion || storedVersion === buildVersion) return;

  diagLog('version', 'new version detected, starting background cache/SW cleanup');
  (async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        diagLog('version', `deleting ${cacheNames.length} caches`);
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        diagLog('version', `unregistering ${registrations.length} service worker(s)`);
        await Promise.all(registrations.map(r => r.unregister()));
      }
      diagLog('version', 'background cleanup done');
      showUpdateOverlay();
    } catch (err) {
      console.warn('[version] background cache/SW cleanup failed (non-fatal):', err);
      diagLog('version', `cleanup failed: ${String(err)}`);
    }
  })();
};

// מסך עדכון עם רקטה + halo - הצורה הוויזואלית המקורית, אבל בלי הסכנה
// שהייתה בגרסה הישנה: כאן זה נעלם לבד אחרי כמה שניות ולא מבצע שום
// window.location.reload() - הניקוי כבר קרה ברקע (caches/SW) בזמן שהמסך
// הזה מוצג, בלי לקטוע שום בקשת רשת פעילה.
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
        animation: vuFadeIn 0.25s ease-out, vuFadeOut 0.35s ease-in 2.65s forwards;
        pointer-events: none;
      }
      @keyframes vuFadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes vuFadeOut { from { opacity: 1; } to { opacity: 0; } }
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
    <div class="vu-title">עודכן לגרסה חדשה</div>
    <div class="vu-sub">גרסה חדשה זמינה — ההתקנה הושלמה</div>
  `;
  (document.body || document.documentElement).appendChild(overlay);
  setTimeout(() => overlay.remove(), 3200);
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

const ThemedApp = () => {
  const { settings } = useSettings();

  useServiceWorker();

  const theme = useMemo(() =>
    createAppTheme(settings.theme, settings.language),
    [settings.theme, settings.language]
  );

  useEffect(() => { diagLog('boot', 'ThemedApp mounted'); }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
