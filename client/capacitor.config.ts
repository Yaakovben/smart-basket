import type { CapacitorConfig } from '@capacitor/cli';

// האפליקציה הנייטיב טוענת את האתר החי ולא עותק מקומי של הקבצים. כך הבקשות
// ל-/api עוברות באותו פרוקסי של Vercel כמו בדפדפן, ה-refresh cookie נשאר
// first-party, וכל עדכון באתר מגיע לאפליקציה בלי לעבור שוב סקירה בחנות.
// אפשר לדרוס עם CAP_SERVER_URL בזמן cap sync, למשל לבנות גרסת בדיקה מול
// סביבת non-prod.
const SERVER_URL = process.env.CAP_SERVER_URL || 'https://smart-basket.vercel.app';

const config: CapacitorConfig = {
  appId: 'com.smartbasket.app',
  appName: 'Smart Basket',
  webDir: 'dist',
  server: {
    url: SERVER_URL,
    cleartext: false,
    // בלי חיבור האתר החי לא נטען, והאפליקציה הייתה נפתחת על מסך שגיאה ריק
    // (סיבה נפוצה לדחייה: בודקי אפל פותחים גם במצב טיסה). במקום זה מוצג
    // מסך ממותג מתוך הקבצים שבאפליקציה, שחוזר לבד כשהחיבור חוזר.
    errorPath: 'offline.html',
  },
  backgroundColor: '#14B8A6',
  ios: {
    // התוכן נפרש גם מתחת לשורת הסטטוס, בדיוק כמו באתר המותקן
    // (black-translucent): הכותרות הצבעוניות ממשיכות מאחורי השעון, והמרווח
    // מגיע מ-safe-area בקוד. 'always' היה דוחף הכל למטה ומשאיר פס ריק למעלה.
    contentInset: 'never',
  },
  android: {
    backgroundColor: '#14B8A6',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#14B8A6',
    },
    // טקסט לבן בשורת הסטטוס, מעל הכותרות הצבעוניות (כמו באתר המותקן)
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true,
    },
    // אנדרואיד (מסך מלא מקצה לקצה): Capacitor מזריק את מידות השוליים
    // הנכונות כמשתני CSS, והקוד קורא אותם לפני env()
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
    },
    // רק התחברות Google נכללת. בלי ספריות של פייסבוק או טוויטר, שמוסיפות משקל
    // ומעקב שהחנויות דורשות להצהיר עליו.
    SocialLogin: {
      // Apple: Sign in with Apple באפליקציית iOS. אפל מחייבת אותה בכל אפליקציה
      // שמציעה כניסה עם גוגל (הנחיה 4.8), אחרת האפליקציה נדחית.
      providers: { google: true, facebook: false, apple: true, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
