import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { TokenDAL } from '../dal';
import { env } from '../config';
import type { TokenPayload, AuthTokens } from '../types';

export class TokenService {
  static generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  static async createTokens(userId: string, email: string, name: string): Promise<AuthTokens> {
    const payload: TokenPayload = { userId, email, name };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken();

    // תפוגה של refresh token - 30 יום
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await TokenDAL.createToken(userId, refreshToken, expiresAt);

    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    const tokenDoc = await TokenDAL.findByTokenPopulated(refreshToken);

    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      // מחיקת טוקן פג תוקף
      if (tokenDoc) await tokenDoc.deleteOne();
      return null;
    }

    const user = tokenDoc.user as unknown as { _id: string; email: string; name: string } | null;

    // המשתמש נמחק - ניקוי טוקן יתום
    if (!user) {
      await tokenDoc.deleteOne();
      return null;
    }
    const userId = user._id.toString();
    const email = user.email;
    const name = user.name;

    const newAccessToken = this.generateAccessToken({ userId, email, name });
    const newRefreshToken = this.generateRefreshToken();

    // עדכון אטומי - מצליח רק אם הטוקן הישן קיים (מניעת race conditions)
    const updated = await TokenDAL.rotateToken(
      tokenDoc._id.toString(),
      refreshToken,
      newRefreshToken,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 יום
    );

    // בקשה אחרת כבר החליפה את הטוקן
    if (!updated) return null;

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async invalidateRefreshToken(refreshToken: string): Promise<void> {
    await TokenDAL.deleteByToken(refreshToken);
  }

  static async invalidateAllUserTokens(userId: string): Promise<void> {
    await TokenDAL.deleteByUser(userId);
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }
}
