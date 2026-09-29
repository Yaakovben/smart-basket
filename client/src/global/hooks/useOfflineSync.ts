import { useEffect, useCallback, useRef } from 'react';
import type { Product, ToastType } from '../types';
import { getAllQueued, removeQueued } from '../../services/offlineQueue';
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

// מסנכרן את תור הפעולות הממתינות (מ-IndexedDB) עם השרת כשהקליטה חוזרת
export function useOfflineSync(
  userId: string | undefined,
  updateProductsForList: (listId: string, updater: (p: Product[]) => Product[]) => void,
  showToast?: (message: string, type?: ToastType) => void,
  syncFailedMessage?: string,
) {
  const runningRef = useRef(false);

  const runSync = useCallback(async () => {
    if (!userId) return;
    // מונע ריצות חופפות (למשל טיימר תקופתי + אירוע online כמעט בו-זמנית)
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      const mutations = await getAllQueued();
      if (mutations.length === 0) return;

      let anySynced = false;
      let anyPermanentlyFailed = false;

      for (const mutation of mutations) {
        try {
          if (mutation.type === 'toggle') {
            await productsApi.updateProduct(mutation.listId, mutation.productId, { isPurchased: mutation.isPurchased });
          } else if (mutation.type === 'update') {
            await productsApi.updateProduct(mutation.listId, mutation.productId, mutation.changes);
          } else if (mutation.type === 'delete') {
            await productsApi.deleteProduct(mutation.listId, mutation.productId);
          } else if (mutation.type === 'clear') {
            await productsApi.clearProducts(mutation.listId, mutation.filter);
          } else if (mutation.type === 'reset') {
            await productsApi.resetProducts(mutation.listId);
          } else if (mutation.type === 'reorder') {
            // מוצרים שנוספו באופליין עוד מחזיקים מזהה זמני שהשרת לא מכיר
            const ids = mutation.productIds.filter(id => !id.startsWith('temp-'));
            if (ids.length > 0) await productsApi.reorderProducts(mutation.listId, ids, mutation.manual);
          } else if (mutation.type === 'add') {
            // clientId=tempId - idempotency: אם ניסיון קודם (לפני שהתור נשמר,
            // או ריצת סנכרון קודמת שנקטעה) כבר יצר את המוצר בפועל, השרת
            // מחזיר אותו הקיים במקום ליצור כפילות.
            const real = await productsApi.addProduct(
              mutation.listId,
              { ...mutation.productData, clientId: mutation.tempId } as Parameters<typeof productsApi.addProduct>[1],
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
                await productsApi.updateProduct(mutation.listId, real.id, { isPurchased: true });
                updateProductsForList(mutation.listId, products =>
                  products.map(p => p.id === real.id ? { ...p, isPurchased: true } : p)
                );
              } catch { /* לא קריטי - המוצר עצמו נשמר, רק הסימון לא הושלם */ }
            }
          }
          await removeQueued(mutation.id);
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
          if (status !== undefined && status >= 400 && status < 500 && !RETRYABLE_STATUSES.has(status)) {
            await removeQueued(mutation.id);
            anySynced = true;
            anyPermanentlyFailed = true;
            continue;
          }
          // תקלה זמנית (רשת, שרת, הרשאה): עוצרים כאן ומנסים שוב בריצה הבאה,
          // כדי לשמור על סדר הפעולות (למשל מחיקה ואחריה שחזור של אותו מוצר)
          break;
        }
      }

      if (anySynced) {
        // טריגר לרענון רשימות אחרי הסנכרון
        window.dispatchEvent(new CustomEvent('sb:offline-synced'));
      }
      if (anyPermanentlyFailed && showToast && syncFailedMessage) {
        showToast(syncFailedMessage, 'warning');
      }
    } finally {
      runningRef.current = false;
    }
  }, [userId, updateProductsForList, showToast, syncFailedMessage]);

  useEffect(() => {
    const reconnectTimers: number[] = [];
    const onOnline = () => {
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
      reconnectTimers.forEach(id => window.clearTimeout(id));
      window.clearInterval(intervalId);
      unsubscribeWeak();
    };
  }, [runSync]);
}
