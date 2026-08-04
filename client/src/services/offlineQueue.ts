// תור פעולות שנכשלו בגלל חוסר קליטה, שמור ב-IndexedDB ומסתנכרן כשחוזרים לאונליין
const DB_NAME = 'sb_offline_queue';
const STORE = 'mutations';
const DB_VERSION = 1;

export type QueuedMutation =
  | { id: string; type: 'toggle'; listId: string; productId: string; isPurchased: boolean; timestamp: number }
  | { id: string; type: 'update'; listId: string; productId: string; changes: Record<string, unknown>; timestamp: number }
  | { id: string; type: 'delete'; listId: string; productId: string; timestamp: number }
  | { id: string; type: 'add'; listId: string; productData: { name: string; quantity: number; unit: string; category: string; note?: string }; tempId: string; pendingIsPurchased?: boolean; timestamp: number };

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// מנויים לשינויי ספירת התור (לבאנר)
const countSubs = new Set<(n: number) => void>();

async function broadcastCount() {
  try {
    const all = await getAllQueued();
    countSubs.forEach(cb => cb(all.length));
  } catch { /* ignore */ }
}

export function subscribeToQueueCount(cb: (n: number) => void): () => void {
  countSubs.add(cb);
  void broadcastCount();
  return () => countSubs.delete(cb);
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

type QueueInput =
  | { type: 'toggle'; listId: string; productId: string; isPurchased: boolean }
  | { type: 'update'; listId: string; productId: string; changes: Record<string, unknown> }
  | { type: 'delete'; listId: string; productId: string }
  | { type: 'add'; listId: string; productData: { name: string; quantity: number; unit: string; category: string; note?: string }; tempId: string; pendingIsPurchased?: boolean };

async function enqueue(mutation: QueueInput): Promise<void> {
  const db = await openDB();
  const entry = { ...mutation, id: makeId(), timestamp: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  void broadcastCount();
}

export async function getAllQueued(): Promise<QueuedMutation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as QueuedMutation[]).sort((a, b) => a.timestamp - b.timestamp));
    req.onerror = () => reject(req.error);
  });
}

export async function removeQueued(id: string): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  void broadcastCount();
}

export async function clearOfflineQueue(): Promise<void> {
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  void broadcastCount();
}

export const enqueueToggle = (listId: string, productId: string, isPurchased: boolean) =>
  enqueue({ type: 'toggle', listId, productId, isPurchased });

export const enqueueUpdate = (listId: string, productId: string, changes: Record<string, unknown>) =>
  enqueue({ type: 'update', listId, productId, changes });

export const enqueueDelete = (listId: string, productId: string) =>
  enqueue({ type: 'delete', listId, productId });

export const enqueueAdd = (
  listId: string,
  productData: { name: string; quantity: number; unit: string; category: string; note?: string },
  tempId: string,
  pendingIsPurchased?: boolean,
) => enqueue({ type: 'add', listId, productData, tempId, pendingIsPurchased });

// בדיקת שגיאת רשת (ולא שגיאת שרת) - כדי להחליט אם לתור או לחזור לסטייט הקודם
export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const e = error as { response?: unknown; code?: string; message?: string } | null;
  if (!e) return false;
  return !e.response && (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED' || e.message === 'Network Error');
}
