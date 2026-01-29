import { User, List } from '../models';
import { ApiError } from '../utils';
import { TokenService } from './token.service';
import type { UpdateProfileInput } from '../utils/validators';
import type { IUserResponse } from '../types';

export class UserService {
  static async getProfile(userId: string): Promise<IUserResponse> {
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
    return user.toJSON() as IUserResponse;
  }

  static async updateProfile(
    userId: string,
    data: UpdateProfileInput
  ): Promise<IUserResponse> {
    // Check if email is being changed and if it's already taken
    if (data.email) {
      const existingUser = await User.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw ApiError.conflict('Email already in use');
      }
      data.email = data.email.toLowerCase();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: data },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return user.toJSON() as IUserResponse;
  }

  static async deleteAccount(userId: string): Promise<void> {
    // Delete user's owned lists
    await List.deleteMany({ owner: userId });

    // Remove user from group lists
    await List.updateMany(
      { 'members.user': userId },
      { $pull: { members: { user: userId } } }
    );

    // Delete user's refresh tokens
    await TokenService.invalidateAllUserTokens(userId);

    // Delete user
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }
  }
}
