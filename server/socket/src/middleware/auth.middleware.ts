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

    // אימות מול ה-API (ולא רק סמיכה על claims של ה-JWT) - ראו verifyUser.
    // דוחים רק אם ה-API אמר בפירוש "לא מורשה" (unauthorized). אם לא הצלחנו
    // להגיע אליו בכלל (unreachable - timeout/cold-start/רשת) נופלים חזרה
    // לאימות ה-JWT המקומי שכבר עבר למעלה - בדיוק ההתנהגות שהייתה קיימת
    // לפני שהבדיקה הזו נוספה. בלי ה-fallback הזה, תקלת תשתית חולפת הייתה
    // מנתקת/דוחה משתמשים לגיטימיים מ-socket.
    const result = await ApiService.verifyUser(token);
    if (result.ok) {
      if (result.user.id !== decoded.userId) {
        return next(new Error('Invalid or revoked token'));
      }
      (socket as AuthenticatedSocket).userId = result.user.id;
      (socket as AuthenticatedSocket).email = result.user.email;
      (socket as AuthenticatedSocket).userName = result.user.name;
    } else if (result.reason === 'unauthorized') {
      return next(new Error('Invalid or revoked token'));
    } else {
      (socket as AuthenticatedSocket).userId = decoded.userId;
      (socket as AuthenticatedSocket).email = decoded.email;
      (socket as AuthenticatedSocket).userName = decoded.name;
    }

    (socket as AuthenticatedSocket).accessToken = token;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new Error('Token expired'));
    }
    return next(new Error('Invalid token'));
  }
};
