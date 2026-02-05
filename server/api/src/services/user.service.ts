import { List, PushSubscription } from '../models';
import { UserDAL } from '../dal';
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
    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await UserDAL.findByEmail(data.email);
      if (existingUser && existingUser._id.toString() !== userId) {
        throw new ConflictError('Email already in use');
      }
      data.email = data.email.toLowerCase();
    }

    // Sanitize name if provided
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
    // Find user with password field
    const user = await UserDAL.findByIdWithPassword(userId);

    if (!user) {
      throw NotFoundError.user();
    }

    // Check if user has a password (Google users might not have one)
    if (!user.password) {
      throw ValidationError.single('password', 'Cannot change password for Google-authenticated accounts');
    }

    // Verify current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw AuthError.invalidCredentials();
    }

    // Update password (will be hashed by pre-save hook)
    user.password = newPassword;
    await user.save();

    // Invalidate all refresh tokens (force re-login on all devices)
    await TokenService.invalidateAllUserTokens(userId);
  }

  static async deleteAccount(userId: string): Promise<void> {
    // 1. Delete only PRIVATE lists (not groups) that the user owns
    await List.deleteMany({ owner: userId, isGroup: false });

    // 2. Handle GROUP lists where user is owner
    const ownedGroups = await List.find({ owner: userId, isGroup: true });

    for (const group of ownedGroups) {
      // Find other members (excluding the owner)
      const otherMembers = group.members.filter(
        (m) => m.user.toString() !== userId
      );

      if (otherMembers.length > 0) {
        // Transfer ownership to the first member (prefer admin if exists)
        const newOwner = otherMembers.find((m) => m.isAdmin) || otherMembers[0];

        await List.findByIdAndUpdate(group._id, {
          $set: { owner: newOwner.user },
          // Remove the new owner from members (owner is not in members array)
          $pull: { members: { user: newOwner.user } }
        });
      } else {
        // No other members - safe to delete the empty group
        await List.findByIdAndDelete(group._id);
      }
    }

    // 3. Remove user from group lists where they are a member (not owner)
    await List.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // 4. Delete user's push subscriptions
    await PushSubscription.deleteMany({ userId });

    // 5. Delete user's refresh tokens
    await TokenService.invalidateAllUserTokens(userId);

    // 6. Delete user
    const user = await UserDAL.deleteById(userId);
    if (!user) {
      throw NotFoundError.user();
    }
  }
}
