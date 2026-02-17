import mongoose from 'mongoose';
import { UserDAL, ListDAL, NotificationDAL, PushSubscriptionDAL } from '../dal';
import { NotFoundError, ConflictError, AuthError, ValidationError } from '../errors';
import { sanitizeText } from '../utils';
import { TokenService } from './token.service';
import type { UpdateProfileInput } from '../validators';
import type { IUserResponse } from '../types';

export class UserService {
  static async getProfile(userId: string): Promise<IUserResponse> {
    const user = await UserDAL.findById(userId);
    if (!user) {
      throw NotFoundError.user();
    }
    return user.toJSON() as IUserResponse;
  }

  static async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<IUserResponse> {
    // בדיקה אם המייל שונה ואם כבר תפוס
    if (data.email) {
      const existingUser = await UserDAL.findByEmail(data.email);
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new ConflictError('Email already in use');
      }
      data.email = data.email.toLowerCase();
    }

    if (data.name) {
      data.name = sanitizeText(data.name);
    }

    const user = await UserDAL.updateProfile(userId, data);

    if (!user) {
      throw NotFoundError.user();
    }

    return user.toJSON() as IUserResponse;
  }

  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    // שליפת המשתמש עם שדה הסיסמה
    const user = await UserDAL.findByIdWithPassword(userId);

    if (!user) {
      throw NotFoundError.user();
    }

    // משתמשי Google לא יכולים לשנות סיסמה
    if (!user.password) {
      throw ValidationError.single('password', 'Cannot change password for Google-authenticated accounts');
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw AuthError.invalidCredentials();
    }

    // הסיסמה תוצפן ע"י pre-save hook
    user.password = newPassword;
    await user.save();

    // ביטול כל הטוקנים - מאלץ התחברות מחדש בכל המכשירים
    await TokenService.invalidateAllUserTokens(userId);
  }

  static async toggleMutedGroup(userId: string, groupId: string): Promise<string[]> {
    const updated = await UserDAL.toggleMutedGroup(userId, groupId);
    if (!updated) {
      throw NotFoundError.user();
    }
    return (updated.mutedGroupIds || []).map(id => id.toString());
  }

  static async deleteAccount(userId: string): Promise<void> {
    // טרנזקציה - כל הפעולות מצליחות או נכשלות יחד
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        // 1. מחיקת רשימות פרטיות בלבד
        await ListDAL.deletePrivateLists(userId, session);

        // 2. טיפול ברשימות קבוצתיות שהמשתמש בעלים
        const ownedGroups = await ListDAL.findOwnedGroups(userId, session);

        for (const group of ownedGroups) {
          const otherMembers = group.members.filter(
            (m) => m.user.toString() !== userId
          );

          if (otherMembers.length > 0) {
            const newOwner = otherMembers.find((m) => m.isAdmin) || otherMembers[0];
            await ListDAL.transferOwnership(group._id.toString(), newOwner.user, session);
          } else {
            await ListDAL.deleteByIdWithSession(group._id.toString(), session);
          }
        }

        // 3. הסרה מרשימות שהוא חבר בהן
        await ListDAL.removeUserFromAllLists(userId, session);

        // 4. מחיקת מנויי push
        await PushSubscriptionDAL.deleteByUserId(userId, session);

        // 5. מחיקת התראות
        await NotificationDAL.deleteByUserId(userId, session);
      });
    } finally {
      await session.endSession();
    }

    // פעולות אלו רצות אחרי הטרנזקציה - לא דורשות rollback
    await TokenService.invalidateAllUserTokens(userId);

    const user = await UserDAL.deleteById(userId);
    if (!user) {
      throw NotFoundError.user();
    }
  }
}
