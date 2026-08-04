import { useMemo } from "react";
import { BrowserRouter } from "react-router-dom";
import { ThemeProvider, CssBaseline } from '@mui/material';
import { SettingsProvider, useSettings } from './global/context/SettingsContext';
import { createAppTheme } from './global/theme/theme';
import { AppRouter } from "./router";
import { ErrorBoundary } from "./global/components";
import { OfflineBanner } from "./global/components/OfflineBanner";
import { useServiceWorker } from './global/hooks';

// עדכון גרסה: רק רישום, בלי רענון כפוי.
//
// בעבר, כשה-build version (הזרקה ע"י Vite, hash-content) השתנה מאז
// הביקור הקודם, הפונקציה הזו עשתה window.location.reload() מיידי ובלתי-
// מותנה - לפני שה-React בכלל התרכב, בלי שום בדיקה אם יש בקשת רשת
// שרצה (checkAuth/רענון טוקן/סנכרון אופליין). זו הייתה הסיבה המרכזית
// למשתמשים שנזרקים ללוגין בלי סיבה נראית לעין אחרי כל deploy: הרענון
// קטע בקשות שרצו באותו רגע בדיוק. אין רגע "בטוח" לרענון כפוי שרץ כל כך
// מוקדם בטעינת הדף - אז ויתרנו עליו לגמרי, כמו שנעשה גם למנגנון המקביל
// ב-router/index.tsx. Cache-Control: no-cache על index.html/sw.js
// (vercel.json) כבר דואג שהטעינה הבאה (סגירה-פתיחה טבעית) תביא קוד טרי,
// בלי צורך ברענון יזום.
const handleNewVersion = () => {
  if (typeof __BUILD_VERSION__ === 'undefined' || !__BUILD_VERSION__) return;
  localStorage.setItem('app_build_version', __BUILD_VERSION__);
};

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
