import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../config';
import type { AuthenticatedSocket, TokenPayload } from '../types';

export const authenticateSocket = (
  socket: Socket,
  next: (err?: Error) => void
) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    (socket as AuthenticatedSocket).userId = decoded.userId;
    (socket as AuthenticatedSocket).email = decoded.email;
    (socket as AuthenticatedSocket).userName = decoded.name;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'));
    }
    return next(new Error('Invalid token'));
  }
};
