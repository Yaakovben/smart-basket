import { useEffect, useCallback, useRef } from 'react';
import type { Product, ToastType } from '../types';
import { getAllQueued, removeQueued } from '../../services/offlineQueue';
import { productsApi } from '../../services/api';

// בדיקה תקופתית נוספת מעבר לאירוע 'online' - מכסה מצב שבו navigator.onLine
// עדיין true אבל בקשות בפועל נכשלות (רשת רעועה, קרש רגעי בשרת/Render
// cold start) ואף אירוע online/offline לא נורה כדי להפעיל סנכרון מחדש.
const PERIODIC_RETRY_MS = 30_000;

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
          } else if (mutation.type === 'add') {
            const real = await productsApi.addProduct(
              mutation.listId,
              mutation.productData as Parameters<typeof productsApi.addProduct>[1],
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
        } catch {
          if (navigator.onLine) {
            // שגיאת שרת (לא רשת, למשל 400/404/409 - הרשומה כבר לא תקפה) -
            // מסירים כדי למנוע תקיעות, אבל מודיעים למשתמש שמשהו לא הסתנכרן
            // במקום לזרוק את זה בשקט.
            await removeQueued(mutation.id);
            anySynced = true;
            anyPermanentlyFailed = true;
          }
          // שגיאת רשת - נשמר לנסיון הבא
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
    const onOnline = () => { void runSync(); };
    window.addEventListener('online', onOnline);
    // גם בטעינה ראשונית אם כבר אונליין (למשל אחרי reload בזמן אופליין)
    if (navigator.onLine) void runSync();

    // בדיקה תקופתית - מכסה מצב שבו אנחנו "online" לפי הדפדפן אבל בקשות
    // בפועל נכשלות בלי שאף אירוע online/offline נורה (ראה PERIODIC_RETRY_MS).
    const intervalId = window.setInterval(() => {
      if (navigator.onLine) void runSync();
    }, PERIODIC_RETRY_MS);

    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(intervalId);
    };
  }, [runSync]);
}
