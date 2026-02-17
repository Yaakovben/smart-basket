import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  ProductData,
} from '../types';
import { ApiService } from '../services/api.service';
import { logger } from '../config';
import { checkRateLimit } from '../middleware/rateLimiter.middleware';
import { isValidString, isValidBoolean, isValidProduct } from '../utils/validation';

export const registerProductHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;
  const userName = socket.userName || 'Unknown';

  // הוספת מוצר
  socket.on('product:add', (data: { listId: string; product: ProductData & { id?: string }; userName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidProduct(data?.product)) {
        logger.warn('Invalid product:add data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      socket.to(`list:${data.listId}`).emit('product:added', {
        listId: data.listId,
        product: { ...data.product, id: data.product.id || '' },
        userId,
        userName, // מהטוקן
        timestamp: new Date(),
      });

      ApiService.broadcastNotification({
        listId: data.listId,
        type: 'product_add',
        actorId: userId,
        productId: data.product.id,
        productName: data.product.name,
      }, socket.accessToken!).catch((err) => logger.error('broadcastNotification failed:', err));
    } catch (error) {
      logger.error('Error in product:add handler:', error);
    }
  });

  // עדכון מוצר
  socket.on('product:update', (data: { listId: string; product: ProductData & { id: string }; userName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidProduct(data?.product)) {
        logger.warn('Invalid product:update data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      socket.to(`list:${data.listId}`).emit('product:updated', {
        listId: data.listId,
        product: { ...data.product, id: data.product.id },
        userId,
        userName, // מהטוקן
        timestamp: new Date(),
      });

      ApiService.broadcastNotification({
        listId: data.listId,
        type: 'product_update',
        actorId: userId,
        productId: data.product.id,
        productName: data.product.name,
      }, socket.accessToken!).catch((err) => logger.error('broadcastNotification failed:', err));
    } catch (error) {
      logger.error('Error in product:update handler:', error);
    }
  });

  // סימון מוצר (נקנה/לא נקנה)
  socket.on('product:toggle', (data: { listId: string; productId: string; productName: string; isPurchased: boolean; userName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidString(data?.productId) || !isValidBoolean(data?.isPurchased)) {
        logger.warn('Invalid product:toggle data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      socket.to(`list:${data.listId}`).emit('product:toggled', {
        listId: data.listId,
        productId: data.productId,
        productName: data.productName || '',
        isPurchased: data.isPurchased,
        userId,
        userName, // מהטוקן
        timestamp: new Date(),
      });

      ApiService.broadcastNotification({
        listId: data.listId,
        type: data.isPurchased ? 'product_purchase' : 'product_unpurchase',
        actorId: userId,
        productId: data.productId,
        productName: data.productName,
      }, socket.accessToken!).catch((err) => logger.error('broadcastNotification failed:', err));
    } catch (error) {
      logger.error('Error in product:toggle handler:', error);
    }
  });

  // מחיקת מוצר
  socket.on('product:delete', (data: { listId: string; productId: string; productName: string; userName: string }) => {
    try {
      if (!checkRateLimit(socket.id)) return;
      if (!isValidString(data?.listId) || !isValidString(data?.productId)) {
        logger.warn('Invalid product:delete data from user:', userId);
        return;
      }
      if (!socket.rooms.has(`list:${data.listId}`)) return;

      socket.to(`list:${data.listId}`).emit('product:deleted', {
        listId: data.listId,
        productId: data.productId,
        productName: data.productName || '',
        userId,
        userName, // מהטוקן
        timestamp: new Date(),
      });

      ApiService.broadcastNotification({
        listId: data.listId,
        type: 'product_delete',
        actorId: userId,
        productId: data.productId,
        productName: data.productName,
      }, socket.accessToken!).catch((err) => logger.error('broadcastNotification failed:', err));
    } catch (error) {
      logger.error('Error in product:delete handler:', error);
    }
  });
};

// פונקציות שידור (נקראות משרת ה-API דרך Redis)
export const broadcastProductAdded = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  listId: string,
  product: ProductData & { id: string },
  userId: string,
  userName: string
) => {
  io.to(`list:${listId}`).emit('product:added', {
    listId,
    product,
    userId,
    userName,
    timestamp: new Date(),
  });
};

export const broadcastProductToggled = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  listId: string,
  productId: string,
  isPurchased: boolean,
  userId: string,
  userName: string
) => {
  io.to(`list:${listId}`).emit('product:toggled', {
    listId,
    productId,
    isPurchased,
    userId,
    userName,
    timestamp: new Date(),
  });
};

export const broadcastProductDeleted = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  listId: string,
  productId: string,
  userId: string,
  userName: string
) => {
  io.to(`list:${listId}`).emit('product:deleted', {
    listId,
    productId,
    userId,
    userName,
    timestamp: new Date(),
  });
};
