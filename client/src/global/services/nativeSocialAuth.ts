import { nativePlatform } from './storeBilling';

// ===== התחברות חברתית באפליקציה הנייטיב (Google + Apple) =====
// גוגל חוסמת OAuth בתוך WebView, ולכן באפליקציה מהחנות משתמשים בחלון
// ההתחברות המובנה של המכשיר. ב-iOS יש גם Sign in with Apple, שאפל מחייבת
// בכל אפליקציה שמציעה כניסה עם גוגל (הנחיה 4.8). שתיהן מחזירות ID token
// שהשרת מאמת (כולל שהטוקן הונפק לאפליקציה שלנו). באתר הזרימה לא משתנה.
//
// הפלאגין מאותחל פעם אחת עם כל הספקים יחד: אתחול שני היה מחליף את הראשון.

let initPromise: Promise<void> | null = null;

async function ensureInitialized() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
    const isIOS = nativePlatform() === 'ios';
    const { SocialLogin } = await import('@capgo/capacitor-social-login');
    await SocialLogin.initialize({
      ...(webClientId && (!isIOS || iOSClientId) ? {
        google: {
          webClientId,
          iOSClientId,
          // כך גם ב-iOS הטוקן מונפק בשם ה-client של האתר, שהשרת כבר מכיר
          iOSServerClientId: webClientId,
          mode: 'online' as const,
        },
      } : {}),
      // ב-iOS אפל מטפלת בהכל במכשיר; מחרוזת ריקה = בלי הפניה לשרת
      ...(isIOS ? { apple: { redirectUrl: '' } } : {}),
    });
  })().catch((err) => { initPromise = null; throw err; });
  return initPromise;
}

const isCancel = (err: unknown) => {
  const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
  // ביטול של המשתמש (גוגל: "cancel", אפל: קוד 1001 / "canceled")
  return msg.includes('cancel') || msg.includes('1001');
};

export type NativeGoogleResult = { idToken: string } | { cancelled: true };

export async function nativeGoogleLogin(): Promise<NativeGoogleResult> {
  const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
  if (!webClientId) throw new Error('GOOGLE_NOT_CONFIGURED');
  if (nativePlatform() === 'ios' && !iOSClientId) throw new Error('GOOGLE_NOT_CONFIGURED');

  await ensureInitialized();
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  try {
    const res = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
    const result = res.result as { idToken?: string | null };
    if (!result.idToken) throw new Error('NO_ID_TOKEN');
    return { idToken: result.idToken };
  } catch (err) {
    if (isCancel(err)) return { cancelled: true };
    throw err;
  }
}

export type NativeAppleResult = { idToken: string; name?: string } | { cancelled: true };

// Sign in with Apple: רק באפליקציית iOS
export const isAppleSignInAvailable = (): boolean => nativePlatform() === 'ios';

export async function nativeAppleLogin(): Promise<NativeAppleResult> {
  if (!isAppleSignInAvailable()) throw new Error('APPLE_NOT_AVAILABLE');
  await ensureInitialized();
  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  try {
    const res = await SocialLogin.login({ provider: 'apple', options: { scopes: ['name', 'email'] } });
    const result = res.result as { idToken?: string | null; profile?: { givenName?: string | null; familyName?: string | null } };
    if (!result.idToken) throw new Error('NO_ID_TOKEN');
    // השם מגיע רק בכניסה הראשונה, ואז נשמר אצלנו
    const name = [result.profile?.givenName, result.profile?.familyName].filter(Boolean).join(' ').trim();
    return { idToken: result.idToken, ...(name ? { name } : {}) };
  } catch (err) {
    if (isCancel(err)) return { cancelled: true };
    throw err;
  }
}
