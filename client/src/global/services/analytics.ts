import type posthogJs from 'posthog-js';

type PostHog = typeof posthogJs;

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

let instance: PostHog | null = null;

function load(): void {
  if (!POSTHOG_KEY || !import.meta.env.PROD) return;
  import('posthog-js').then(({ default: posthog }) => {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      capture_pageview: true,
      autocapture: true,
      session_recording: {
        maskAllInputs: true, // מסתיר שדות קלט (פרטיות)
        maskInputOptions: { password: true },
      },
    });
    instance = posthog;
  });
}

// אתחול מושהה (זמן סרק) - בדיוק כמו Sentry ב-main.tsx, לא לחסום את טעינת הדף.
// no-op בטוח אם VITE_POSTHOG_KEY עוד לא הוגדר (למשל עד שיוגדר חשבון PostHog אמיתי)
// או בסביבת פיתוח - כך שאפשר להשאיר את הקריאה הזו תמיד פעילה בקוד.
export const initAnalytics = (): void => {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(load, { timeout: 3000 });
  } else {
    setTimeout(load, 1000);
  }
};

// קישור אירועים למשתמש מזוהה - קריאה אחרי login/register מוצלחים
export const identifyUser = (userId: string): void => instance?.identify(userId);

// ניתוק זיהוי המשתמש - קריאה ב-logout
export const resetAnalyticsUser = (): void => instance?.reset();

// מעקב אירוע מוצרי - no-op בטוח אם עדיין לא אותחל (dev / אין מפתח / באמצע טעינה עצלה)
export const trackEvent = (event: string, properties?: Record<string, unknown>): void => {
  instance?.capture(event, properties);
};
