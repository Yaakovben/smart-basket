import { nativePlatform } from './storeBilling';

// ===== התחברות Google באפליקציה הנייטיב =====
// גוגל חוסמת התחברות OAuth בתוך WebView, ולכן באפליקציה מהחנות משתמשים
// בחלון ההתחברות המובנה של המכשיר. הוא מחזיר ID token שהשרת מאמת (כולל
// בדיקה שהטוקן הונפק ל-client שלנו). באתר הזרימה נשארת בלי שינוי.

let initialized = false;

export type NativeGoogleResult = { idToken: string } | { cancelled: true };

export async function nativeGoogleLogin(): Promise<NativeGoogleResult> {
  const webClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const iOSClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID as string | undefined;
  if (!webClientId) throw new Error('GOOGLE_NOT_CONFIGURED');
  if (nativePlatform() === 'ios' && !iOSClientId) throw new Error('GOOGLE_NOT_CONFIGURED');

  const { SocialLogin } = await import('@capgo/capacitor-social-login');
  if (!initialized) {
    await SocialLogin.initialize({
      google: {
        webClientId,
        iOSClientId,
        // כך גם ב-iOS הטוקן מונפק בשם ה-client של האתר, שהשרת כבר מכיר
        iOSServerClientId: webClientId,
        mode: 'online',
      },
    });
    initialized = true;
  }

  try {
    const res = await SocialLogin.login({ provider: 'google', options: { scopes: ['email', 'profile'] } });
    const result = res.result as { idToken?: string | null };
    if (!result.idToken) throw new Error('NO_ID_TOKEN');
    return { idToken: result.idToken };
  } catch (err) {
    const msg = String((err as { message?: string })?.message ?? err).toLowerCase();
    if (msg.includes('cancel')) return { cancelled: true };
    throw err;
  }
}
