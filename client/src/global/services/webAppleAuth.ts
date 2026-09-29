// ===== Sign in with Apple באתר (דפדפן ומסך הבית) =====
// באפליקציית iOS ההתחברות עוברת דרך החלון המובנה של המכשיר (nativeSocialAuth).
// באתר משתמשים בספריית ה-JS הרשמית של אפל בחלון קופץ: היא מחזירה id token
// ישירות לדף, והשרת מאמת אותו בדיוק כמו באפליקציה (אותו endpoint).
//
// מוצג רק כשהוגדר VITE_APPLE_WEB_CLIENT_ID (מזהה Services ID מ-developer.apple.com).
// את המזהה הזה צריך להוסיף גם ל-APPLE_CLIENT_IDS בשרת, אחרת האימות ייכשל.
import { isNativeShell } from '../helpers/appPlatform';

const APPLE_JS_URL = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
const WEB_CLIENT_ID = (import.meta.env.VITE_APPLE_WEB_CLIENT_ID as string | undefined)?.trim() || '';
// כתובת החזרה חייבת להיות רשומה אצל אפל בדיוק כך. ברירת המחדל היא שורש האתר.
const REDIRECT_URI = (import.meta.env.VITE_APPLE_WEB_REDIRECT_URI as string | undefined)?.trim() || '';

interface AppleSignInResponse {
  authorization?: { id_token?: string };
  user?: { name?: { firstName?: string; lastName?: string } };
}

interface AppleIDGlobal {
  auth: {
    init: (config: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }) => void;
    signIn: () => Promise<AppleSignInResponse>;
  };
}

export type WebAppleResult = { idToken: string; name?: string } | { cancelled: true };

export const isWebAppleSignInAvailable = (): boolean => !!WEB_CLIENT_ID && !isNativeShell();

let scriptPromise: Promise<AppleIDGlobal> | null = null;

function loadAppleScript(): Promise<AppleIDGlobal> {
  const existing = (window as unknown as { AppleID?: AppleIDGlobal }).AppleID;
  if (existing) return Promise.resolve(existing);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<AppleIDGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = APPLE_JS_URL;
    script.async = true;
    script.onload = () => {
      const apple = (window as unknown as { AppleID?: AppleIDGlobal }).AppleID;
      if (apple) resolve(apple); else reject(new Error('APPLE_JS_MISSING'));
    };
    script.onerror = () => { scriptPromise = null; reject(new Error('APPLE_JS_LOAD_FAILED')); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

// טעינה מוקדמת כשמסך ההתחברות מוצג, כדי שהחלון ייפתח מיד בלחיצה
// (דפדפנים חוסמים חלון קופץ שנפתח אחרי המתנה ארוכה מהלחיצה)
export function preloadWebAppleSignIn(): void {
  if (isWebAppleSignInAvailable()) void loadAppleScript().catch(() => {});
}

export async function webAppleLogin(): Promise<WebAppleResult> {
  if (!isWebAppleSignInAvailable()) throw new Error('APPLE_NOT_AVAILABLE');
  const apple = await loadAppleScript();
  apple.auth.init({
    clientId: WEB_CLIENT_ID,
    scope: 'name email',
    redirectURI: REDIRECT_URI || `${window.location.origin}/`,
    usePopup: true,
  });
  try {
    const res = await apple.auth.signIn();
    const idToken = res.authorization?.id_token;
    if (!idToken) throw new Error('NO_ID_TOKEN');
    // השם מגיע רק בכניסה הראשונה, ואז נשמר אצלנו
    const name = [res.user?.name?.firstName, res.user?.name?.lastName].filter(Boolean).join(' ').trim();
    return { idToken, ...(name ? { name } : {}) };
  } catch (err) {
    const code = (err as { error?: string } | null)?.error;
    if (code === 'popup_closed_by_user' || code === 'user_cancelled_authorize') return { cancelled: true };
    throw err;
  }
}
