import mongoose from 'mongoose';
import { ListDAL, UserDAL, ProductDAL } from '../dal';
import { NotFoundError, ForbiddenError, ConflictError, AuthError } from '../errors';
import { NotificationService } from './notification.service';
import type { JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';

// Helper to transform list to response format (with products from separate collection)
const transformList = async (list: IList): Promise<IListResponse> => {
  await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
  ]);

  // Fetch products from separate collection
  const products = await ProductDAL.findByListId(list._id.toString());

  const json = list.toJSON() as Record<string, unknown>;

  // Add products to the response (transform addedBy to just the name string)
  json.products = products.map((p) => {
    const pJson = p.toJSON() as Record<string, unknown>;
    if (pJson.addedBy && typeof pJson.addedBy === 'object') {
      pJson.addedBy = (pJson.addedBy as { name?: string }).name || 'Unknown';
    }
    return pJson;
  });

  return json as unknown as IListResponse;
};

export class ListMembershipService {
  static async joinGroup(
    userId: string,
    data: JoinGroupInput
  ): Promise<IListResponse> {
    const list = await ListDAL.findByInviteCode(data.inviteCode);

    if (!list) {
      throw NotFoundError.inviteCode();
    }

    // Check if already a member or owner
    if (list.owner.toString() === userId) {
      throw ConflictError.isOwner();
    }

    if (list.members.some((m) => m.user.toString() === userId)) {
      throw ConflictError.alreadyMember();
    }

    // Check password if required
    if (list.password) {
      const isValidPassword = await list.comparePassword(data.password || '');
      if (!isValidPassword) {
        throw AuthError.invalidGroupPassword();
      }
    }

    // Get user info for notification
    const user = await UserDAL.findById(userId);
    if (!user) {
      throw NotFoundError.user();
    }

    // Add member
    list.members.push({
      user: new mongoose.Types.ObjectId(userId),
      isAdmin: false,
      joinedAt: new Date(),
    });

    await list.save();

    // Also save to new Notifications collection for all list members
    await NotificationService.createNotificationsForListMembers(
      list._id.toString(),
      'join',
      userId,
      {}
    );

    return transformList(list);
  }

  static async leaveGroup(listId: string, userId: string): Promise<void> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Owner cannot leave
    if (list.owner.toString() === userId) {
      throw new ForbiddenError('Owner cannot leave the list. Delete it instead.');
    }

    // Check if member
    const memberIndex = list.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      throw new NotFoundError('You are not a member of this list');
    }

    // Get user info for notification
    const user = await UserDAL.findById(userId);
    if (!user) {
      throw NotFoundError.user();
    }

    // Remove member
    list.members.splice(memberIndex, 1);

    await list.save();

    // Also save to new Notifications collection for all remaining list members
    await NotificationService.createNotificationsForListMembers(
      listId,
      'leave',
      userId,
      {}
    );
  }

  static async removeMember(
    listId: string,
    userId: string,
    memberId: string
  ): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Check if user is owner or admin
    const isOwner = list.owner.toString() === userId;
    const isAdmin = list.members.some(
      (m) => m.user.toString() === userId && m.isAdmin
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only owner or admin can remove members');
    }

    // Cannot remove owner
    if (list.owner.toString() === memberId) {
      throw new ForbiddenError('Cannot remove the owner');
    }

    // Remove member
    const memberIndex = list.members.findIndex(
      (m) => m.user.toString() === memberId
    );

    if (memberIndex === -1) {
      throw new NotFoundError('Member');
    }

    // Get member and actor info for notification (parallel queries)
    const [member, actor] = await Promise.all([
      UserDAL.findById(memberId),
      UserDAL.findById(userId),
    ]);

    list.members.splice(memberIndex, 1);

    await list.save();

    // Send 'member_removed' notification to the removed member
    if (member && actor) {
      await NotificationService.createNotification({
        type: 'member_removed',
        listId,
        listName: list.name,
        actorId: userId,
        actorName: actor.name,
        targetUserId: memberId,
      });
    }

    // Notify remaining list members about the removal
    if (member) {
      await NotificationService.createNotificationsForListMembers(
        listId,
        'removed',
        memberId,
        { excludeUserId: userId }
      );
    }

    return transformList(list);
  }

  static async toggleMemberAdmin(
    listId: string,
    userId: string,
    memberId: string
  ): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Only owner can toggle admin
    if (list.owner.toString() !== userId) {
      throw new ForbiddenError('Only owner can change admin status');
    }

    const member = list.members.find((m) => m.user.toString() === memberId);

    if (!member) {
      throw new NotFoundError('Member');
    }

    member.isAdmin = !member.isAdmin;
    await list.save();

    return transformList(list);
  }
}
