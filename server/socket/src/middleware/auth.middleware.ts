import jwt from 'jsonwebtoken';
import type { Socket } from 'socket.io';
import { env } from '../config';
import type { AuthenticatedSocket, TokenPayload } from '../types';
import { ApiService } from '../services/api.service';

export const authenticateSocket = async (
  socket: Socket,
  next: (err?: Error) => void
) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    // בדיקה מקומית מהירה קודם - תופסת טוקנים פגי-תוקף/מזויפים בלי round-trip
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;

    // אימות מול ה-API (ולא רק סמיכה על claims של ה-JWT) - ראו verifyUser
    const user = await ApiService.verifyUser(token);
    if (!user || user.id !== decoded.userId) {
      return next(new Error('Invalid or revoked token'));
    }

    (socket as AuthenticatedSocket).userId = user.id;
    (socket as AuthenticatedSocket).email = user.email;
    (socket as AuthenticatedSocket).userName = user.name;
    (socket as AuthenticatedSocket).accessToken = token;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'));
    }
    return next(new Error('Invalid token'));
  }
};
