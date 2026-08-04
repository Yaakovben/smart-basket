import { useEffect } from 'react';
import { registerSW } from 'virtual:pwa-register';

/** רישום Service Worker מינימלי - נדרש רק עבור התראות push והוספה למסך הבית */
export function useServiceWorker(): void {
  useEffect(() => {
    let registration: ServiceWorkerRegistration | undefined;

    registerSW({
      immediate: true,
      onRegistered(reg) {
        registration = reg;
      },
      onRegisterError(error) {
        if (import.meta.env.DEV) {
          console.error('SW registration error:', error);
        }
      },
    });

    // בדיקת עדכון יזומה כשחוזרים לטאב - הבדיקה התקופתית המובנית של
    // vite-plugin-pwa לא בהכרח מספיק תכופה למשתמש שמשאיר את האפליקציה
    // פתוחה זמן רב ברקע. בלי זה, גרסה חדשה (כולל תיקוני באגים) יכולה
    // לחכות שעה+ עד שהטאב הפתוח בכלל שם לב שיש עדכון.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        registration?.update().catch(() => { /* לא קריטי - ינסה שוב בפעם הבאה */ });
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);
}
