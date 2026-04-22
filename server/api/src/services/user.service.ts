/**
 * user.service.ts
 *
 * לוגיקת המשתמש: פרופיל, שינוי סיסמה, השתקת קבוצות, ומחיקת חשבון.
 */

import mongoose from 'mongoose';
import { UserDAL, ListDAL, ProductDAL, NotificationDAL, PushSubscriptionDAL } from '../dal';
import { NotFoundError, ConflictError, AuthError, ValidationError } from '../errors';
import { sanitizeText } from '../utils';
import { invalidateAllUserTokens } from './token.service';
import type { UpdateProfileInput } from '../validators';
import type { IUserResponse } from '../types';

/**
 * שליפת פרופיל המשתמש המחובר.
 */
export async function getProfile(userId: string): Promise<IUserResponse> {
  const user = await UserDAL.findById(userId);
  if (!user) throw NotFoundError.user();
  return user.toJSON() as IUserResponse;
}

/**
 * עדכון פרופיל (שם/מייל/אמוג׳י).
 * אם ה-email שונה ובדיוק בדיוק בדיוק בבעלות משתמש אחר — זורק ConflictError.
 */
export async function updateProfile(
  userId: string,
  data: UpdateProfileInput
): Promise<IUserResponse> {
  if (data.email) {
    const existingUser = await UserDAL.findByEmail(data.email);
    if (existingUser && existingUser._id.toString() !== userId) {
      throw new ConflictError('Email already in use');
    }
    data.email = data.email.toLowerCase();
  }

  if (data.name) data.name = sanitizeText(data.name);
  if (data.avatarEmoji) data.avatarEmoji = sanitizeText(data.avatarEmoji);

  const user = await UserDAL.updateProfile(userId, data);
  if (!user) throw NotFoundError.user();

  return user.toJSON() as IUserResponse;
}

/**
 * שינוי סיסמה.
 * לא נתמך למשתמשי Google (אין להם סיסמה מקומית).
 * אחרי הצלחה - מבטל את כל הטוקנים של המשתמש (התחברות מחדש בכל המכשירים).
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await UserDAL.findByIdWithPassword(userId);
  if (!user) throw NotFoundError.user();

  // משתמשי Google לא יכולים לשנות סיסמה
  if (!user.password) {
    throw ValidationError.single('password', 'Cannot change password for Google-authenticated accounts');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) throw AuthError.invalidCredentials();

  // הסיסמה תוצפן ע"י pre-save hook של המודל
  user.password = newPassword;
  await user.save();

  // ביטול כל הטוקנים - מאלץ התחברות מחדש בכל המכשירים
  await invalidateAllUserTokens(userId);
}

/**
 * הוספה/הסרה של קבוצה מרשימת ההשתקה של המשתמש. מחזיר את הרשימה המעודכנת.
 */
export async function toggleMutedGroup(userId: string, groupId: string): Promise<string[]> {
  const updated = await UserDAL.toggleMutedGroup(userId, groupId);
  if (!updated) throw NotFoundError.user();
  return (updated.mutedGroupIds || []).map(id => id.toString());
}

/**
 * מחיקת חשבון בטוחה.
 * פעולה זו רצה בתוך טרנזקציה של Mongo:
 *  1. מחיקת רשימות פרטיות ומוצרים שלהן
 *  2. טיפול בקבוצות שבבעלות המשתמש (העברת בעלות או מחיקה אם אין חברים)
 *  3. הסרת המשתמש מקבוצות שהוא חבר בהן
 *  4. מחיקת Push subscriptions
 *  5. מחיקת התראות שלו
 *  6. מחיקת המשתמש עצמו
 * אחרי הטרנזקציה — ביטול כל הטוקנים.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // 1. רשימות פרטיות + המוצרים שלהן
      const privateListIds = await ListDAL.findPrivateListIds(userId, session);
      await ProductDAL.deleteByListIds(privateListIds, session);
      await ListDAL.deletePrivateLists(userId, session);

      // 2. קבוצות שבבעלות המשתמש
      const ownedGroups = await ListDAL.findOwnedGroups(userId, session);
      for (const group of ownedGroups) {
        const otherMembers = group.members.filter(m => m.user.toString() !== userId);

        if (otherMembers.length > 0) {
          // העברת בעלות לאדמין קיים, אחרת לחבר הראשון
          const newOwner = otherMembers.find(m => m.isAdmin) || otherMembers[0];
          await ListDAL.transferOwnership(group._id.toString(), newOwner.user, session);
        } else {
          // קבוצה ריקה → מוחקים אותה ואת מוצריה
          await ProductDAL.deleteByListIds([group._id.toString()], session);
          await ListDAL.deleteByIdWithSession(group._id.toString(), session);
        }
      }

      // 3. הסרה מרשימות קבוצתיות שהמשתמש חבר בהן
      await ListDAL.removeUserFromAllLists(userId, session);

      // 4. Push subscriptions
      await PushSubscriptionDAL.deleteByUserId(userId, session);

      // 5. התראות
      await NotificationDAL.deleteByUserId(userId, session);

      // 6. המשתמש עצמו
      const user = await UserDAL.deleteById(userId, { session });
      if (!user) throw NotFoundError.user();
    });
  } finally {
    await session.endSession();
  }

  // רץ אחרי הטרנזקציה — לא דורש rollback אם נכשל
  await invalidateAllUserTokens(userId);
}
