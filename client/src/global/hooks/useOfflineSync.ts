import { useEffect, useCallback } from 'react';
import type { Product } from '../types';
import { getAllQueued, removeQueued } from '../../services/offlineQueue';
import { productsApi } from '../../services/api';

// מסנכרן את תור הפעולות הממתינות (מ-IndexedDB) עם השרת כשהקליטה חוזרת
export function useOfflineSync(
  userId: string | undefined,
  updateProductsForList: (listId: string, updater: (p: Product[]) => Product[]) => void,
) {
  const runSync = useCallback(async () => {
    if (!userId) return;
    const mutations = await getAllQueued();
    if (mutations.length === 0) return;

    let anySynced = false;
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
        }
        await removeQueued(mutation.id);
        anySynced = true;
      } catch {
        if (navigator.onLine) {
          // שגיאת שרת (לא רשת) - מסירים כדי למנוע תקיעות
          await removeQueued(mutation.id);
          anySynced = true;
        }
        // שגיאת רשת - נשמר לנסיון הבא
      }
    }

    if (anySynced) {
      // טריגר לרענון רשימות אחרי הסנכרון
      window.dispatchEvent(new CustomEvent('sb:offline-synced'));
    }
  }, [userId, updateProductsForList]);

  useEffect(() => {
    const onOnline = () => { void runSync(); };
    window.addEventListener('online', onOnline);
    // גם בטעינה ראשונית אם כבר אונליין (למשל אחרי reload בזמן אופליין)
    if (navigator.onLine) void runSync();
    return () => window.removeEventListener('online', onOnline);
  }, [runSync]);
}
