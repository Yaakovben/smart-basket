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
  },
  backgroundColor: '#14B8A6',
  ios: {
    contentInset: 'always',
  },
  android: {
    backgroundColor: '#14B8A6',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: '#14B8A6',
    },
    // רק התחברות Google נכללת. בלי ספריות של פייסבוק או טוויטר, שמוסיפות משקל
    // ומעקב שהחנויות דורשות להצהיר עליו.
    SocialLogin: {
      providers: { google: true, facebook: false, apple: false, twitter: false },
      logLevel: 1,
    },
  },
};

export default config;
