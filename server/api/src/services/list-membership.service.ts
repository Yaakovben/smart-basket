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

    if (list.owner.toString() === userId) {
      throw ConflictError.isOwner();
    }

    if (list.members.some((m) => m.user.toString() === userId)) {
      throw ConflictError.alreadyMember();
    }

    if (list.password) {
      const isValidPassword = await list.comparePassword(data.password || '');
      if (!isValidPassword) {
        throw AuthError.invalidGroupPassword();
      }
    }

    const user = await UserDAL.findById(userId);
    if (!user) {
      throw NotFoundError.user();
    }

    // הוספה אטומית - מונעת כפילויות מבקשות מקבילות
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

    const updatedList = await ListDAL.findById(list._id.toString());
    if (!updatedList) throw NotFoundError.list();

    // שליחת התראות לחברי הרשימה
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

    // בעלים לא יכול לעזוב
    if (list.owner.toString() === userId) {
      throw new ForbiddenError('Owner cannot leave the list. Delete it instead.');
    }

    const isMember = list.members.some((m) => m.user.toString() === userId);
    if (!isMember) {
      throw new NotFoundError('You are not a member of this list');
    }

    await ListDAL.removeMember(listId, userId);

    try {
      await NotificationService.createNotificationsForListMembers(
        listId,
        'leave',
        userId,
        {}
      );
    } catch {
      // לא להכשיל את פעולת העזיבה אם יצירת ההתראה נכשלה
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

    const isOwner = list.owner.toString() === userId;
    const isAdmin = list.members.some(
      (m) => m.user.toString() === userId && m.isAdmin
    );

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('Only owner or admin can remove members');
    }

    // אי אפשר להסיר את הבעלים
    if (list.owner.toString() === memberId) {
      throw new ForbiddenError('Cannot remove the owner');
    }

    // רק בעלים יכול להסיר מנהלים
    const targetMember = list.members.find(m => m.user.toString() === memberId);
    if (targetMember?.isAdmin && !isOwner) {
      throw new ForbiddenError('Only owner can remove admins');
    }

    const memberExists = list.members.some((m) => m.user.toString() === memberId);
    if (!memberExists) {
      throw new NotFoundError('Member');
    }

    // שליפת פרטים להתראה לפני ההסרה
    const [member, actor] = await Promise.all([
      UserDAL.findById(memberId),
      UserDAL.findById(userId),
    ]);

    await ListDAL.removeMember(listId, memberId);

    // התראה לחבר שהוסר
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

    // התראה לשאר חברי הרשימה
    if (member) {
      await NotificationService.createNotificationsForListMembers(
        listId,
        'removed',
        memberId,
        { excludeUserId: userId }
      );
    }

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

    // רק בעלים יכול לשנות סטטוס מנהל
    if (list.owner.toString() !== userId) {
      throw new ForbiddenError('Only owner can change admin status');
    }

    const member = list.members.find((m) => m.user.toString() === memberId);

    if (!member) {
      throw new NotFoundError('Member');
    }

    const updatedList = await ListDAL.setMemberAdmin(listId, memberId, !member.isAdmin);
    if (!updatedList) throw NotFoundError.list();

    return transformList(updatedList);
  }
}
