// ===== Sign in with Apple באתר ובאפליקציית אנדרואיד =====
// באפליקציית iOS ההתחברות עוברת דרך החלון המובנה של המכשיר (nativeSocialAuth).
// בכל מקום אחר (דפדפן, מסך הבית, אנדרואיד) עוברים לדף ההתחברות של אפל וחוזרים:
// אפל שולחת את התוצאה לשרת (/api/auth/apple/callback), השרת מאמת, קובע את
// ה-refresh cookie ומחזיר למסך הכניסה, שמשלים את ההתחברות. חלון קופץ היה
// נכשל במסך הבית של iOS ובאפליקציית אנדרואיד, ולכן מעבר מלא ולא חלון.
//
// מוצג רק כשהוגדר VITE_APPLE_WEB_CLIENT_ID (מזהה Services ID מ-developer.apple.com).
// את המזהה הזה צריך להוסיף גם ל-APPLE_CLIENT_IDS בשרת, אחרת האימות ייכשל.
import { detectAppPlatform } from '../helpers/appPlatform';
import { nativePlatform } from './storeBilling';

const APPLE_AUTHORIZE_URL = 'https://appleid.apple.com/auth/authorize';
const WEB_CLIENT_ID = (import.meta.env.VITE_APPLE_WEB_CLIENT_ID as string | undefined)?.trim() || '';
// חייבת להיות רשומה אצל אפל בדיוק כך (Return URLs). ברירת מחדל: נקודת החזרה בשרת
// דרך הפרוקסי של האתר הנוכחי.
const REDIRECT_URI = (import.meta.env.VITE_APPLE_WEB_REDIRECT_URI as string | undefined)?.trim() || '';

// שם ה-cookie ונתיבו חייבים להתאים לשרת (appleCallback ב-auth.controller.ts)
const STATE_COOKIE = 'sb_apple_state';
const STATE_COOKIE_PATH = '/api/auth/apple';

export const isWebAppleSignInAvailable = (): boolean => !!WEB_CLIENT_ID && nativePlatform() !== 'ios';

export function startWebAppleLogin(): void {
  if (!isWebAppleSignInAvailable()) throw new Error('APPLE_NOT_AVAILABLE');
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const random = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  // הפלטפורמה מצורפת ל-state, כי לבקשה שאפל שולחת לשרת אין את כותרת הפלטפורמה
  const state = `${random}.${detectAppPlatform()}`;
  // SameSite=None: הטופס שאפל שולחת בחזרה הוא בקשה מאתר אחר, ובלי זה ה-cookie לא היה נשלח
  document.cookie = `${STATE_COOKIE}=${state}; Path=${STATE_COOKIE_PATH}; Max-Age=600; Secure; SameSite=None`;
  const params = new URLSearchParams({
    client_id: WEB_CLIENT_ID,
    redirect_uri: REDIRECT_URI || `${window.location.origin}/api/auth/apple/callback`,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });
  window.location.assign(`${APPLE_AUTHORIZE_URL}?${params.toString()}`);
}

// תוצאת החזרה מאפל, מתוך כתובת מסך הכניסה. נקרא פעם אחת ומנקה את הכתובת.
export function consumeAppleRedirectResult(): 'ok' | 'cancelled' | 'failed' | null {
  const url = new URL(window.location.href);
  const result = url.searchParams.get('appleAuth');
  if (!result) return null;
  url.searchParams.delete('appleAuth');
  window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  return result === 'ok' || result === 'cancelled' ? result : 'failed';
}
