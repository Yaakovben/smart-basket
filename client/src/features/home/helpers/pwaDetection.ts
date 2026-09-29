import { isNativeShell } from '../../../global/helpers/appPlatform';

// בדיקה אם רץ בדפדפן (לא PWA מותקן ולא האפליקציה מהחנות). באפליקציה מהחנות
// הצעת "הוסף למסך הבית" לא רלוונטית, והחנויות דוחות אפליקציה שמציגה אותה.
export const isInBrowser = () => {
  if (isNativeShell()) return false;
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return false;
  return true;
};

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

// מקש אחסון: דחייה לצמיתות
export const PWA_DISMISSED_KEY = 'pwa_install_seen';
