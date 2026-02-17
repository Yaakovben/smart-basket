import { RefreshToken, type IRefreshToken } from '../models';
import { BaseDAL } from './base.dal';

class TokenDALClass extends BaseDAL<IRefreshToken> {
  constructor() {
    super(RefreshToken);
  }

  async findByToken(token: string): Promise<IRefreshToken | null> {
    return this.model.findOne({ token });
  }

  async findByUser(userId: string): Promise<IRefreshToken[]> {
    return this.model.find({ user: userId });
  }

  async createToken(userId: string, token: string, expiresAt: Date): Promise<IRefreshToken> {
    return this.model.create({
      token,
      user: userId,
      expiresAt,
    }) as Promise<IRefreshToken>;
  }

  async deleteByToken(token: string): Promise<boolean> {
    const result = await this.model.deleteOne({ token });
    return result.deletedCount > 0;
  }

  async deleteByUser(userId: string): Promise<number> {
    const result = await this.model.deleteMany({ user: userId });
    return result.deletedCount;
  }

  async deleteExpired(): Promise<number> {
    const result = await this.model.deleteMany({ expiresAt: { $lt: new Date() } });
    return result.deletedCount;
  }

  async findByTokenPopulated(token: string): Promise<IRefreshToken | null> {
    return this.model.findOne({ token }).populate('user');
  }

  async rotateToken(tokenId: string, oldToken: string, newToken: string, expiresAt: Date): Promise<IRefreshToken | null> {
    return this.model.findOneAndUpdate(
      { _id: tokenId, token: oldToken },
      { token: newToken, expiresAt },
      { new: true }
    );
  }
}

export const TokenDAL = new TokenDALClass();
