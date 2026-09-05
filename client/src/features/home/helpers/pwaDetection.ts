// בדיקה אם רץ בדפדפן (לא PWA מותקן)
export const isInBrowser = () => {
  if ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone) return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return false;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return false;
  return true;
};

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

// דפדפן-בתוך-אפליקציה (WhatsApp/Instagram/Facebook/TikTok וכו') - WebView
// מוגבל שלא תמיד שומר localStorage בין הפעלות ולא יודע לפתוח PWA מותקן.
// isInBrowser() לבד לא מספיק כדי להחליט מתי להציג את מסך "העתק קוד ופתח
// את האפליקציה" (JoinLanding) - הוא true גם בכרום/ספארי רגילים, לא רק
// ב-WebView מוגבל, אז קישור הצטרפות שנפתח בכרום רגיל היה מציג את אותו
// מסך-ביניים מיותר במקום פשוט להמשיך ישר לזרימה הרגילה בדפדפן.
export const isInAppBrowser = () => {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|WhatsApp|Line\/|MicroMessenger|TikTok|BytedanceWebview|Snapchat/i.test(ua);
};

// מקש אחסון: דחייה לצמיתות
export const PWA_DISMISSED_KEY = 'pwa_install_seen';
