import { User, LoginActivity, type IUser } from '../models';
import { createBaseDal } from './base.dal';

export const UserDAL = {
  ...createBaseDal<IUser>(User),

  // שליפה קלה לאימות - רק שדות הכרחיים, בלי hydration של Mongoose
  async findForAuth(id: string): Promise<{ name: string; email: string; isAdmin: boolean } | null> {
    return User.findById(id).select('name email isAdmin').lean();
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

  async findAllSorted(): Promise<IUser[]> {
    return User.find().sort({ createdAt: -1 }).lean() as unknown as IUser[];
  },

  // מועמדים לתזכורת "שבת בפתח": לא נשלחה להם תזכורת (או שהתאפסה אחרי חזרה
  // לפעילות) + נרשמו מספיק מזמן, ובלי פעילות מ-LoginActivity מאז ה-cutoff.
  // שתי שאילתות נפרדות (לא $lookup) - עקבי עם הדפוס הקיים ב-admin.controller.getUsers.
  async findInactiveUnnotified(cutoff: Date): Promise<string[]> {
    const candidates = await User.find(
      { inactivityReminderSentAt: null, createdAt: { $lt: cutoff } },
      '_id'
    ).lean();
    if (candidates.length === 0) return [];

    const candidateIds = candidates.map(c => c._id);
    const activeUserIds = await LoginActivity.distinct('user', {
      user: { $in: candidateIds },
      createdAt: { $gte: cutoff },
    });
    const activeSet = new Set(activeUserIds.map(id => id.toString()));

    return candidateIds.map(id => id.toString()).filter(id => !activeSet.has(id));
  },

  async markInactivityReminderSent(userIds: string[]): Promise<void> {
    await User.updateMany({ _id: { $in: userIds } }, { inactivityReminderSentAt: new Date() });
  },

  // מאפס את דגל "נשלחה תזכורת" - נקרא בכל התחברות/פתיחת אפליקציה, כך
  // שהמשתמש חוזר להיות זכאי לתזכורת אם ייעדר שוב בעתיד.
  async clearInactivityReminderFlag(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { inactivityReminderSentAt: null });
  },
};
