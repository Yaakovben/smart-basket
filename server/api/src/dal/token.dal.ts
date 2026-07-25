import { RefreshToken, type IRefreshToken } from '../models';
import { createBaseDal } from './base.dal';

export const TokenDAL = {
  ...createBaseDal<IRefreshToken>(RefreshToken),

  async findByToken(token: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ token });
  },

  async findByUser(userId: string): Promise<IRefreshToken[]> {
    return RefreshToken.find({ user: userId });
  },

  async createToken(userId: string, token: string, expiresAt: Date): Promise<IRefreshToken> {
    return RefreshToken.create({
      token,
      user: userId,
      expiresAt,
    }) as Promise<IRefreshToken>;
  },

  async deleteByToken(token: string): Promise<boolean> {
    const result = await RefreshToken.deleteOne({ token });
    return result.deletedCount > 0;
  },

  async deleteByUser(userId: string): Promise<number> {
    const result = await RefreshToken.deleteMany({ user: userId });
    return result.deletedCount;
  },

  async deleteExpired(): Promise<number> {
    const result = await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
    return result.deletedCount;
  },

  async findByTokenPopulated(token: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({ token }).populate('user');
  },

  // replay של טוקן שכבר הוחלף (rotation) אבל עדיין בתוך חלון ה-grace -
  // ראה הערה ב-RefreshToken.model.ts. מחזיר את המסמך הנוכחי (עם ה-token החדש).
  async findByPreviousToken(token: string): Promise<IRefreshToken | null> {
    return RefreshToken.findOne({
      previousToken: token,
      previousTokenGraceUntil: { $gt: new Date() },
    }).populate('user');
  },

  async rotateToken(tokenId: string, oldToken: string, newToken: string, expiresAt: Date, graceMs: number): Promise<IRefreshToken | null> {
    return RefreshToken.findOneAndUpdate(
      { _id: tokenId, token: oldToken },
      {
        token: newToken,
        expiresAt,
        previousToken: oldToken,
        previousTokenGraceUntil: new Date(Date.now() + graceMs),
      },
      { new: true }
    );
  },
};
