import { useEffect, useCallback, useRef } from 'react';
import type { Product, ToastType } from '../types';
import { getAllQueued, removeQueued, type QueuedMutation } from '../../services/offlineQueue';
import { productsApi } from '../../services/api';
import { subscribeNetworkWeak } from '../../services/networkQuality';

// בדיקה תקופתית נוספת מעבר לאירוע 'online' - מכסה מצב שבו navigator.onLine
// עדיין true אבל בקשות בפועל נכשלות (רשת רעועה, קרש רגעי בשרת/Render
// cold start) ואף אירוע online/offline לא נורה כדי להפעיל סנכרון מחדש.
const PERIODIC_RETRY_MS = 30_000;

// סטטוסים של תקלה זמנית: הפעולה נשארת בתור לניסיון הבא
const RETRYABLE_STATUSES = new Set([401, 408, 425, 429]);

// אחרי שהקליטה חוזרת הרשת לרוב עוד לא יציבה בשניות הראשונות, ולכן
// מנסים שוב כמה פעמים מהר במקום לחכות לבדיקה התקופתית
const RECONNECT_RETRY_DELAYS_MS = [2_000, 6_000, 15_000];

// זמן המתנה לכל בקשה בסנכרון. המשתמש לא מחכה לסנכרון, ובקליטה חלשה בקשה
// תקינה לוקחת יותר מ-8 השניות של בקשה רגילה. עם הזמן הקצר הבקשה נכשלה
// שוב ושוב, והשינויים נתקעו בתור גם כשהשרת בכלל קיבל אותם.
const SYNC_REQUEST_TIMEOUT_MS = 30_000;
const syncOpts = { timeout: SYNC_REQUEST_TIMEOUT_MS };

// אחרי סבב שנעצר בגלל תקלה: ניסיון נוסף תוך שניות, בהמתנה שגדלה בהדרגה
const FAILURE_BACKOFF_MS = [3_000, 6_000, 12_000, 24_000];

// שגיאת שרת שחוזרת שוב ושוב על אותה פעולה: אחרי כמה ניסיונות מוותרים עליה,
// אחרת פעולה אחת פגומה הייתה חוסמת לתמיד את כל מה שאחריה בתור
const MAX_SERVER_ERROR_ATTEMPTS = 5;

// אירוע שמבקש סנכרון מיידי (למשל רענון בגרירה)
export const SYNC_NOW_EVENT = 'sb:sync-now';

// פעולה שפעולה מאוחרת יותר בתור מייתרת: סימון שסומן שוב אחר כך, או סימון
// ועריכה של מוצר שנמחק אחר כך. מדלגים עליהן כדי לשלוח פחות בקשות.
function isSuperseded(m: QueuedMutation, later: QueuedMutation[]): boolean {
  if (m.type !== 'toggle' && m.type !== 'update') return false;
  return later.some(n =>
    n.listId === m.listId && 'productId' in n && n.productId === m.productId &&
    (n.type === 'delete' || (m.type === 'toggle' && n.type === 'toggle'))
  );
}

async function sendMutation(
  mutation: QueuedMutation,
  updateProductsForList: (listId: string, updater: (p: Product[]) => Product[]) => void,
): Promise<void> {
  if (mutation.type === 'toggle') {
    await productsApi.updateProduct(mutation.listId, mutation.productId, { isPurchased: mutation.isPurchased }, syncOpts);
  } else if (mutation.type === 'update') {
    await productsApi.updateProduct(mutation.listId, mutation.productId, mutation.changes, syncOpts);
  } else if (mutation.type === 'delete') {
    await productsApi.deleteProduct(mutation.listId, mutation.productId, syncOpts);
  } else if (mutation.type === 'clear') {
    await productsApi.clearProducts(mutation.listId, mutation.filter, syncOpts);
  } else if (mutation.type === 'reset') {
    await productsApi.resetProducts(mutation.listId, syncOpts);
  } else if (mutation.type === 'reorder') {
    // מוצרים שנוספו באופליין עוד מחזיקים מזהה זמני שהשרת לא מכיר
    const ids = mutation.productIds.filter(id => !id.startsWith('temp-'));
    if (ids.length > 0) await productsApi.reorderProducts(mutation.listId, ids, mutation.manual, syncOpts);
  } else if (mutation.type === 'add') {
    // clientId=tempId - idempotency: אם ניסיון קודם (לפני שהתור נשמר,
    // או ריצת סנכרון קודמת שנקטעה) כבר יצר את המוצר בפועל, השרת
    // מחזיר אותו הקיים במקום ליצור כפילות.
    const real = await productsApi.addProduct(
      mutation.listId,
      { ...mutation.productData, clientId: mutation.tempId } as Parameters<typeof productsApi.addProduct>[1],
      syncOpts,
    );
    // החלפת מזהה זמני במזהה אמיתי מהשרת
    updateProductsForList(mutation.listId, products =>
      products.map(p => p.id === mutation.tempId ? { ...p, id: real.id } : p)
    );
    // אם המשתמש סימן את המוצר כ"נקנה" בזמן שהוא עדיין היה temp id -
    // משלימים את זה עכשיו שיש id אמיתי. לא זורק אם נכשל: המוצר עצמו
    // כבר נשמר בהצלחה, ואי-אפשר לנסות את ההוספה שוב (ייצור כפילות).
    if (mutation.pendingIsPurchased) {
      try {
        await productsApi.updateProduct(mutation.listId, real.id, { isPurchased: true }, syncOpts);
        updateProductsForList(mutation.listId, products =>
          products.map(p => p.id === real.id ? { ...p, isPurchased: true } : p)
        );
      } catch { /* לא קריטי - המוצר עצמו נשמר, רק הסימון לא הושלם */ }
    }
  }
}

// מסנכרן את תור הפעולות הממתינות (מ-IndexedDB) עם השרת כשהקליטה חוזרת
export function useOfflineSync(
  userId: string | undefined,
  updateProductsForList: (listId: string, updater: (p: Product[]) => Product[]) => void,
  showToast?: (message: string, type?: ToastType) => void,
  syncFailedMessage?: string,
  syncedMessage?: string,
) {
  const runningRef = useRef(false);
  // ריצה שהתבקשה בזמן שריצה אחרת עדיין פעילה: מריצים שוב מיד בסיומה
  const rerunRef = useRef(false);
  const serverErrorsRef = useRef(new Map<string, number>());
  const backoffStepRef = useRef(0);
  const backoffTimerRef = useRef<number | null>(null);

  const runSync = useCallback(async (): Promise<void> => {
    if (!userId) return;
    // מונע ריצות חופפות (למשל טיימר תקופתי + אירוע online כמעט בו-זמנית)
    if (runningRef.current) { rerunRef.current = true; return; }
    runningRef.current = true;
    if (backoffTimerRef.current !== null) {
      window.clearTimeout(backoffTimerRef.current);
      backoffTimerRef.current = null;
    }

    let stoppedOnFailure = false;
    try {
      const mutations = await getAllQueued();
      if (mutations.length === 0) return;

      let anySynced = false;
      let anyPermanentlyFailed = false;

      for (let i = 0; i < mutations.length; i++) {
        const mutation = mutations[i];
        if (isSuperseded(mutation, mutations.slice(i + 1))) {
          await removeQueued(mutation.id);
          continue;
        }
        try {
          await sendMutation(mutation, updateProductsForList);
          await removeQueued(mutation.id);
          serverErrorsRef.current.delete(mutation.id);
          anySynced = true;
        } catch (err) {
          const status = (err as { response?: { status?: number } }).response?.status;
          // מחיקה של מוצר שכבר לא קיים (חבר אחר מחק אותו): המטרה הושגה
          if (mutation.type === 'delete' && status === 404) {
            await removeQueued(mutation.id);
            anySynced = true;
            continue;
          }
          // שגיאת לקוח קבועה: הפעולה לא תקפה (מוצר נמחק, קונפליקט וכו').
          // מסירים מהתור ומודיעים למשתמש. 401 לא נחשב קבוע: אחרי זמן ארוך
          // בלי קליטה הטוקן פג, וחידוש שלו יכול להיכשל רגעית בדיוק כשהקליטה
          // חוזרת. מחיקת התור במקרה כזה איבדה את כל השינויים של המשתמש.
          const permanentClientError = status !== undefined && status >= 400 && status < 500 && !RETRYABLE_STATUSES.has(status);
          let serverErrorLimit = false;
          if (status !== undefined && status >= 500) {
            const attempts = (serverErrorsRef.current.get(mutation.id) ?? 0) + 1;
            serverErrorsRef.current.set(mutation.id, attempts);
            serverErrorLimit = attempts >= MAX_SERVER_ERROR_ATTEMPTS;
          }
          if (permanentClientError || serverErrorLimit) {
            await removeQueued(mutation.id);
            serverErrorsRef.current.delete(mutation.id);
            anySynced = true;
            anyPermanentlyFailed = true;
            continue;
          }
          // תקלה זמנית (רשת, שרת, הרשאה): עוצרים כאן ומנסים שוב בקרוב,
          // כדי לשמור על סדר הפעולות (למשל מחיקה ואחריה שחזור של אותו מוצר)
          stoppedOnFailure = true;
          break;
        }
      }

      if (anySynced) {
        // טריגר לרענון רשימות אחרי הסנכרון
        window.dispatchEvent(new CustomEvent('sb:offline-synced'));
      }
      if (anyPermanentlyFailed && showToast && syncFailedMessage) {
        showToast(syncFailedMessage, 'warning');
      } else if (anySynced && !stoppedOnFailure && showToast && syncedMessage) {
        // אישור ברור שהכל נשלח, אחרי שפס החיבור הראה שינויים ממתינים
        showToast(syncedMessage, 'success');
      }
    } catch {
      // קריאה מהתור במכשיר נכשלה: ננסה שוב בסבב הבא
      stoppedOnFailure = true;
    } finally {
      runningRef.current = false;
      if (stoppedOnFailure) {
        const delay = FAILURE_BACKOFF_MS[Math.min(backoffStepRef.current, FAILURE_BACKOFF_MS.length - 1)];
        backoffStepRef.current++;
        if (backoffTimerRef.current !== null) window.clearTimeout(backoffTimerRef.current);
        backoffTimerRef.current = window.setTimeout(() => {
          backoffTimerRef.current = null;
          if (navigator.onLine) void runSync();
        }, delay);
      } else {
        backoffStepRef.current = 0;
      }
      if (rerunRef.current) {
        rerunRef.current = false;
        if (!stoppedOnFailure) void runSync();
      }
    }
  }, [userId, updateProductsForList, showToast, syncFailedMessage, syncedMessage]);

  useEffect(() => {
    const reconnectTimers: number[] = [];
    const onOnline = () => {
      backoffStepRef.current = 0;
      void runSync();
      reconnectTimers.splice(0).forEach(id => window.clearTimeout(id));
      for (const delay of RECONNECT_RETRY_DELAYS_MS) {
        reconnectTimers.push(window.setTimeout(() => { void runSync(); }, delay));
      }
    };
    window.addEventListener('online', onOnline);
    // חזרה לאפליקציה מהרקע: שולחים מיד את מה שממתין
    const onVisible = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) void runSync();
    };
    document.addEventListener('visibilitychange', onVisible);
    // בקשה מפורשת לסנכרון עכשיו (רענון בגרירה)
    const onSyncNow = () => {
      backoffStepRef.current = 0;
      if (navigator.onLine) void runSync();
    };
    window.addEventListener(SYNC_NOW_EVENT, onSyncNow);
    // גם בטעינה ראשונית אם כבר אונליין (למשל אחרי reload בזמן אופליין)
    if (navigator.onLine) void runSync();

    // בדיקה תקופתית - מכסה מצב שבו אנחנו "online" לפי הדפדפן אבל בקשות
    // בפועל נכשלות בלי שאף אירוע online/offline נורה (ראה PERIODIC_RETRY_MS).
    const intervalId = window.setInterval(() => {
      if (navigator.onLine) void runSync();
    }, PERIODIC_RETRY_MS);

    // הקליטה החלשה השתפרה (בקשה הצליחה): שולחים את התור מיד
    const unsubscribeWeak = subscribeNetworkWeak(weak => { if (!weak) void runSync(); });

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(SYNC_NOW_EVENT, onSyncNow);
      reconnectTimers.forEach(id => window.clearTimeout(id));
      if (backoffTimerRef.current !== null) {
        window.clearTimeout(backoffTimerRef.current);
        backoffTimerRef.current = null;
      }
      window.clearInterval(intervalId);
      unsubscribeWeak();
    };
  }, [runSync]);
}
