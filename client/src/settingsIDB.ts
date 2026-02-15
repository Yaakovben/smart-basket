/**
 * Minimal IndexedDB wrapper for notification settings.
 * Used by both the main app (write) and the service worker (read).
 * Service workers cannot access localStorage, so IndexedDB is the bridge.
 */

const DB_NAME = 'sb-notif-settings';
const STORE_NAME = 'settings';
const SETTINGS_KEY = 'notification';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

export interface NotifSettingsIDB {
  enabled: boolean;
  groupJoin: boolean;
  groupLeave: boolean;
  groupRemoved: boolean;
  groupDelete: boolean;
  listUpdate: boolean;
  productAdd: boolean;
  productDelete: boolean;
  productEdit: boolean;
  productPurchase: boolean;
  mutedGroupIds: string[];
}

/** Write notification settings to IndexedDB (called from main app) */
export async function saveNotifSettingsToIDB(settings: NotifSettingsIDB): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(settings, SETTINGS_KEY);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/** Read notification settings from IndexedDB (called from service worker) */
export async function getNotifSettingsFromIDB(): Promise<NotifSettingsIDB | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(SETTINGS_KEY);
      request.onsuccess = () => { db.close(); resolve(request.result ?? null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch {
    return null;
  }
}

/**
 * Map server notification type to the corresponding settings key.
 * Returns null if the type doesn't have a toggle (should always show).
 */
export function getSettingsKeyForType(type: string): keyof NotifSettingsIDB | null {
  switch (type) {
    case 'join': return 'groupJoin';
    case 'leave': return 'groupLeave';
    case 'removed': return 'groupRemoved';
    case 'member_removed': return 'groupRemoved';
    case 'list_deleted': return 'groupDelete';
    case 'list_update': return 'listUpdate';
    case 'product_add': return 'productAdd';
    case 'product_update': return 'productEdit';
    case 'product_delete': return 'productDelete';
    case 'product_purchase': return 'productPurchase';
    case 'product_unpurchase': return 'productPurchase';
    default: return null;
  }
}
