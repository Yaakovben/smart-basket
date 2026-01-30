import type { Server } from 'socket.io';
import type {
  AuthenticatedSocket,
  ClientToServerEvents,
  ServerToClientEvents,
  ProductData,
} from '../types';

// Simple validation helpers
const isValidString = (val: unknown): val is string =>
  typeof val === 'string' && val.length > 0 && val.length < 500;

const isValidBoolean = (val: unknown): val is boolean => typeof val === 'boolean';

const isValidProduct = (product: unknown): product is ProductData =>
  product !== null &&
  typeof product === 'object' &&
  isValidString((product as ProductData).name);

export const registerProductHandlers = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  const userId = socket.userId!;

  // Product added
  socket.on('product:add', (data: { listId: string; product: ProductData & { id?: string }; userName: string }) => {
    // Validate input
    if (!isValidString(data?.listId) || !isValidProduct(data?.product) || !isValidString(data?.userName)) {
      console.warn('Invalid product:add data from user:', userId);
      return;
    }

    // Broadcast to all users in the list except sender
    socket.to(`list:${data.listId}`).emit('product:added', {
      listId: data.listId,
      product: { ...data.product, id: data.product.id || '' },
      userId,
      userName: data.userName,
      timestamp: new Date(),
    });
  });

  // Product updated
  socket.on('product:update', (data: { listId: string; product: ProductData & { id: string }; userName: string }) => {
    // Validate input
    if (!isValidString(data?.listId) || !isValidProduct(data?.product) || !isValidString(data?.userName)) {
      console.warn('Invalid product:update data from user:', userId);
      return;
    }

    socket.to(`list:${data.listId}`).emit('product:updated', {
      listId: data.listId,
      product: { ...data.product, id: data.product.id },
      userId,
      userName: data.userName,
      timestamp: new Date(),
    });
  });

  // Product toggled
  socket.on('product:toggle', (data: { listId: string; productId: string; productName: string; isPurchased: boolean; userName: string }) => {
    // Validate input
    if (!isValidString(data?.listId) || !isValidString(data?.productId) || !isValidBoolean(data?.isPurchased)) {
      console.warn('Invalid product:toggle data from user:', userId);
      return;
    }

    socket.to(`list:${data.listId}`).emit('product:toggled', {
      listId: data.listId,
      productId: data.productId,
      productName: data.productName || '',
      isPurchased: data.isPurchased,
      userId,
      userName: data.userName || '',
      timestamp: new Date(),
    });
  });

  // Product deleted
  socket.on('product:delete', (data: { listId: string; productId: string; productName: string; userName: string }) => {
    // Validate input
    if (!isValidString(data?.listId) || !isValidString(data?.productId)) {
      console.warn('Invalid product:delete data from user:', userId);
      return;
    }

    socket.to(`list:${data.listId}`).emit('product:deleted', {
      listId: data.listId,
      productId: data.productId,
      productName: data.productName || '',
      userId,
      userName: data.userName || '',
      timestamp: new Date(),
    });
  });
};

// Helper functions to broadcast events (called from API server)
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
