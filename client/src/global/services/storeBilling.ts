import { Capacitor } from '@capacitor/core';
import type { PurchasesPackage } from '@revenuecat/purchases-capacitor';

// ===== רכישה דרך App Store / Google Play =====
// באפליקציה הנייטיב אפל וגוגל מחייבות שמנוי דיגיטלי יירכש דרך מערכת התשלום
// שלהן. RevenueCat עוטף את שתיהן; השרת מאמת מולו ולא סומך על הלקוח.
// באתר (דפדפן/PWA) הפלאגין לא נטען בכלל, והתשלום נשאר כמו שהוא.

export type NativePlatform = 'ios' | 'android';

export function nativePlatform(): NativePlatform | null {
  const p = Capacitor.getPlatform();
  return p === 'ios' || p === 'android' ? p : null;
}

export const isNativeApp = (): boolean => nativePlatform() !== null;

// מפתחות ציבוריים של RevenueCat (לא סודיים, מיועדים לאפליקציה). מוגדרים
// במשתני הסביבה של ה-build. אם חסר מפתח לפלטפורמה, הרכישה לא מוצעת.
function publicKey(platform: NativePlatform): string | undefined {
  return platform === 'ios'
    ? import.meta.env.VITE_REVENUECAT_IOS_KEY
    : import.meta.env.VITE_REVENUECAT_ANDROID_KEY;
}

export const isStoreBillingAvailable = (): boolean => {
  const p = nativePlatform();
  return !!p && !!publicKey(p);
};

// הפלאגין נטען רק כשצריך, כדי שלא ייכנס לחבילה של האתר.
const loadPlugin = () => import('@revenuecat/purchases-capacitor');

let configuredFor: string | null = null;

async function ensureConfigured(appUserId: string) {
  const platform = nativePlatform();
  const apiKey = platform ? publicKey(platform) : undefined;
  if (!platform || !apiKey) throw new Error('STORE_UNAVAILABLE');
  const { Purchases } = await loadPlugin();
  if (configuredFor === appUserId) return Purchases;
  const { isConfigured } = await Purchases.isConfigured();
  if (!isConfigured) {
    await Purchases.configure({ apiKey, appUserID: appUserId });
  } else {
    await Purchases.logIn({ appUserID: appUserId });
  }
  configuredFor = appUserId;
  return Purchases;
}

export interface StorePackage {
  id: string;
  kind: 'monthly' | 'annual' | 'other';
  priceString: string;
  title: string;
  raw: PurchasesPackage;
}

export async function getStorePackages(appUserId: string): Promise<StorePackage[]> {
  const Purchases = await ensureConfigured(appUserId);
  const offerings = await Purchases.getOfferings();
  const pkgs = offerings.current?.availablePackages ?? [];
  return pkgs.map((p) => {
    const type = String(p.packageType);
    return {
      id: p.identifier,
      kind: type === 'MONTHLY' ? 'monthly' : type === 'ANNUAL' ? 'annual' : 'other',
      priceString: p.product.priceString,
      title: p.product.title,
      raw: p,
    } as StorePackage;
  });
}

export type PurchaseOutcome = 'purchased' | 'cancelled';

export async function purchaseStorePackage(appUserId: string, pkg: StorePackage): Promise<PurchaseOutcome> {
  const Purchases = await ensureConfigured(appUserId);
  try {
    await Purchases.purchasePackage({ aPackage: pkg.raw });
    return 'purchased';
  } catch (err) {
    const e = err as { code?: string; userCancelled?: boolean | null };
    if (e.userCancelled || e.code === '1' || e.code === 'PURCHASE_CANCELLED_ERROR') return 'cancelled';
    throw err;
  }
}

export async function restoreStorePurchases(appUserId: string): Promise<void> {
  const Purchases = await ensureConfigured(appUserId);
  await Purchases.restorePurchases();
}

// עמוד ניהול המנויים של החנות (ביטול, שינוי תקופה). הביטול לא נעשה אצלנו.
export async function openStoreSubscriptionManagement(appUserId: string): Promise<void> {
  let url: string | null = null;
  try {
    const Purchases = await ensureConfigured(appUserId);
    url = (await Purchases.getCustomerInfo()).customerInfo.managementURL;
  } catch { /* נופלים לכתובת הכללית של החנות */ }
  if (!url) {
    url = nativePlatform() === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  }
  window.open(url, '_blank');
}
