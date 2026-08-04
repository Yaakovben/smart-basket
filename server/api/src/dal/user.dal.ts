import { User, type IUser } from '../models';
import { createBaseDal } from './base.dal';

export const UserDAL = {
  ...createBaseDal<IUser>(User),

  // שליפה קלה לאימות - רק שדות הכרחיים, בלי hydration של Mongoose
  async findForAuth(id: string): Promise<{ name: string; email: string; isAdmin: boolean; tokenVersion: number } | null> {
    return User.findById(id).select('name email isAdmin tokenVersion').lean();
  },

  async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() });
  },

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() }).select('+password');
  },

  async findByGoogleId(googleId: string): Promise<IUser | null> {
    return User.findOne({ googleId });
  },

  async findByIdWithPassword(id: string): Promise<IUser | null> {
    return User.findById(id).select('+password');
  },

  async updateProfile(userId: string, updates: Partial<Pick<IUser, 'name' | 'email' | 'avatarColor' | 'avatarEmoji'>>): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, updates, { new: true });
  },

  async updatePassword(userId: string, hashedPassword: string): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
  },

  async setAdmin(userId: string, isAdmin: boolean): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, { isAdmin }, { new: true });
  },

  async toggleMutedGroup(userId: string, groupId: string): Promise<IUser | null> {
    // ניסיון הסרה (אם כבר מושתק)
    const pulled = await User.findOneAndUpdate(
      { _id: userId, mutedGroupIds: groupId },
      { $pull: { mutedGroupIds: groupId } },
      { new: true }
    );
    if (pulled) return pulled;

    // לא מושתק - הוספה
    return User.findByIdAndUpdate(
      userId,
      { $addToSet: { mutedGroupIds: groupId } },
      { new: true }
    );
  },

  async findUserIdsWhoMutedGroup(groupId: string, userIds: string[]): Promise<string[]> {
    const users = await User.find({
      _id: { $in: userIds },
      mutedGroupIds: groupId
    }).select('_id').lean();
    return users.map(u => u._id.toString());
  },

  async getAllUsers(options?: { page?: number; limit?: number }): Promise<{ users: IUser[]; total: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 50;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().skip(skip).limit(limit).sort({ createdAt: -1 }).lean() as unknown as IUser[],
      User.countDocuments(),
    ]);

    return { users, total };
  },

  async updateListOrder(userId: string, listOrder: string[]): Promise<IUser | null> {
    return User.findByIdAndUpdate(userId, { listOrder }, { new: true });
  },

  async getListOrder(userId: string): Promise<string[]> {
    const user = await User.findById(userId).select('listOrder').lean();
    return (user as { listOrder?: string[] })?.listOrder || [];
  },

  // מוגבל ל-5000 - טבלת האדמין טוענת את כל המשתמשים בבת אחת (אין UI
  // pagination כרגע). התקרה מונעת שאילתה/תגובה לא-חסומה אם בסיס המשתמשים
  // יגדל משמעותית; אם זה יקרה בפועל צריך UI pagination אמיתי, לא רק תקרה.
  async findAllSorted(): Promise<IUser[]> {
    return User.find().sort({ createdAt: -1 }).limit(5000).lean() as unknown as IUser[];
  },
};
