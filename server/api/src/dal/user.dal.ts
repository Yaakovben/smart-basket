import { User, type IUser } from '../models';
import { BaseDAL } from './base.dal';

class UserDALClass extends BaseDAL<IUser> {
  constructor() {
    super(User);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.model.findOne({ email: email.toLowerCase() });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return this.model.findOne({ email: email.toLowerCase() }).select('+password');
  }

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return this.model.findOne({ googleId });
  }

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return this.model.findById(id).select('+password');
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.model.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  async updateProfile(userId: string, updates: Partial<Pick<IUser, 'name' | 'email' | 'avatarColor' | 'avatarEmoji'>>): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(userId, updates, { new: true });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
  }

  async setAdmin(userId: string, isAdmin: boolean): Promise<IUser | null> {
    return this.model.findByIdAndUpdate(userId, { isAdmin }, { new: true });
  }

  async getAllUsers(options?: { page?: number; limit?: number }): Promise<{ users: IUser[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.model.find().skip(skip).limit(limit).sort({ createdAt: -1 }),
      this.model.countDocuments(),
    ]);

    return { users, total };
  }
}

export const UserDAL = new UserDALClass();
