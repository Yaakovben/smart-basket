import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { OfflineBanner } from "./global/components/OfflineBanner";
import { useServiceWorker } from './global/hooks';

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
  localStorage.setItem('app_build_version', buildVersion);

  if (!storedVersion || storedVersion === buildVersion) return;

  (async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(r => r.unregister()));
      }
      showUpdateToast();
    } catch (err) {
      console.warn('[version] background cache/SW cleanup failed (non-fatal):', err);
    }
  })();
};

// הודעת "עודכן" קצרה ולא-חוסמת - לעומת מסך העדכון הישן, לא מונעת אינטראקציה
// ולא קשורה לשום reload. רק אישור ויזואלי שהניקוי ברקע קרה בפועל.
function showUpdateToast() {
  if (typeof document === 'undefined') return;
  const toast = document.createElement('div');
  toast.setAttribute('dir', 'rtl');
  toast.textContent = 'עודכן לגרסה חדשה ✓';
  toast.style.cssText = `
    position: fixed; top: max(16px, env(safe-area-inset-top)); left: 50%;
    transform: translateX(-50%) translateY(-20px);
    background: #0D9488; color: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 14px; font-weight: 600; padding: 10px 18px; border-radius: 999px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 99999; opacity: 0;
    transition: opacity 0.3s ease, transform 0.3s ease; pointer-events: none;
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => toast.remove(), 350);
  }, 3500);
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <OfflineBanner />
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
