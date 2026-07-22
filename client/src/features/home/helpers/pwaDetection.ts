// בדיקה אם רץ בדפדפן (לא PWA מותקן)
export const isInBrowser = () => {
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return false;
  return true;
};

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

// מקש אחסון: דחייה לצמיתות
export const PWA_DISMISSED_KEY = 'pwa_install_seen';
