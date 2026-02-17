import mongoose from 'mongoose';
import { ListDAL, UserDAL } from '../dal';
import { NotFoundError, ForbiddenError, ConflictError, AuthError } from '../errors';
import { NotificationService } from './notification.service';
import type { JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';
import { transformList } from './list-transform.helper';

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

    // Atomic add member - prevents duplicate members from concurrent requests.
    // The condition ensures the user isn't already in the members array.
    const updated = await ListDAL.updateOne(
      {
        _id: list._id,
        'members.user': { $ne: new mongoose.Types.ObjectId(userId) },
      },
      {
        $push: {
          members: {
            user: new mongoose.Types.ObjectId(userId),
            isAdmin: false,
            joinedAt: new Date(),
          },
        },
      }
    );

    if (!updated) {
      throw ConflictError.alreadyMember();
    }

    // Re-read for populated response
    const updatedList = await ListDAL.findById(list._id.toString());
    if (!updatedList) throw NotFoundError.list();

    // Also save to new Notifications collection for all list members
    await NotificationService.createNotificationsForListMembers(
      updatedList._id.toString(),
      'join',
      userId,
      {}
    );

    return transformList(updatedList);
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
    const isMember = list.members.some((m) => m.user.toString() === userId);
    if (!isMember) {
      throw new NotFoundError('You are not a member of this list');
    }

    // Atomic remove member
    await ListDAL.removeMember(listId, userId);

    // Also save to new Notifications collection for all remaining list members
    try {
      await NotificationService.createNotificationsForListMembers(
        listId,
        'leave',
        userId,
        {}
      );
    } catch {
      // Don't fail the leave operation if notification creation fails
    }
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

    // Only owner can remove admins
    const targetMember = list.members.find(m => m.user.toString() === memberId);
    if (targetMember?.isAdmin && !isOwner) {
      throw new ForbiddenError('Only owner can remove admins');
    }

    // Check member exists
    const memberExists = list.members.some((m) => m.user.toString() === memberId);
    if (!memberExists) {
      throw new NotFoundError('Member');
    }

    // Get member and actor info for notification first, then remove
    const [member, actor] = await Promise.all([
      UserDAL.findById(memberId),
      UserDAL.findById(userId),
    ]);

    await ListDAL.removeMember(listId, memberId);

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

    // Re-read for fresh data
    const updatedList = await ListDAL.findById(listId);
    if (!updatedList) throw NotFoundError.list();
    return transformList(updatedList);
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

    // Atomic toggle admin
    const updatedList = await ListDAL.setMemberAdmin(listId, memberId, !member.isAdmin);
    if (!updatedList) throw NotFoundError.list();

    return transformList(updatedList);
  }
}
