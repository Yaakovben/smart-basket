import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { RefreshToken } from '../models';
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

    // Calculate expiration date for refresh token (7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save refresh token to database
    await RefreshToken.create({
      token: refreshToken,
      user: userId,
      expiresAt,
    });

    return { accessToken, refreshToken };
  }

  static async refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
    const tokenDoc = await RefreshToken.findOne({ token: refreshToken }).populate('user');

    if (!tokenDoc || tokenDoc.expiresAt < new Date()) {
      // Delete expired or invalid token
      if (tokenDoc) await tokenDoc.deleteOne();
      return null;
    }

    const user = tokenDoc.user as unknown as { _id: string; email: string; name: string } | null;

    // User was deleted — clean up the orphaned token
    if (!user) {
      await tokenDoc.deleteOne();
      return null;
    }
    const userId = user._id.toString();
    const email = user.email;
    const name = user.name;

    // Generate new tokens
    const newAccessToken = this.generateAccessToken({ userId, email, name });
    const newRefreshToken = this.generateRefreshToken();

    // Update refresh token in database
    tokenDoc.token = newRefreshToken;
    tokenDoc.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await tokenDoc.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  static async invalidateRefreshToken(refreshToken: string): Promise<void> {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  static async invalidateAllUserTokens(userId: string): Promise<void> {
    await RefreshToken.deleteMany({ user: userId });
  }

  static verifyAccessToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
    } catch {
      return null;
    }
  }
}
