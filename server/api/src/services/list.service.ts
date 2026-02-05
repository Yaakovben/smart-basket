import mongoose from 'mongoose';
import { ListDAL, UserDAL } from '../dal';
import { NotFoundError, ForbiddenError, ConflictError, AuthError } from '../errors';
import { sanitizeText, convertProductsAddedBy } from '../utils';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';
import { NotificationService } from './notification.service';

// Helper to transform list to response format
const transformList = async (list: IList): Promise<IListResponse> => {
  // Run all populate queries in parallel for better performance
  await Promise.all([
    list.populate('owner', 'name email avatarColor avatarEmoji isAdmin'),
    list.populate('members.user', 'name email avatarColor avatarEmoji'),
    list.populate('products.addedBy', 'name'),
  ]);

  const json = list.toJSON() as Record<string, unknown>;

  // Convert products.addedBy from object to string (just the name)
  if (json.products && Array.isArray(json.products)) {
    json.products = convertProductsAddedBy(json.products as Record<string, unknown>[]);
  }

  return json as unknown as IListResponse;
};

export class ListService {
  static async getUserLists(userId: string): Promise<IListResponse[]> {
    const lists = await ListDAL.findUserListsPopulated(userId);

    return lists.map((list) => {
      const json = list.toJSON() as Record<string, unknown>;
      if (json.products && Array.isArray(json.products)) {
        json.products = convertProductsAddedBy(json.products as Record<string, unknown>[]);
      }
      return json as unknown as IListResponse;
    });
  }

  static async getList(listId: string, userId: string): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Check access
    const hasAccess = await ListDAL.isMember(listId, userId);

    if (!hasAccess) {
      throw ForbiddenError.noAccess();
    }

    return transformList(list);
  }

  static async createList(
    userId: string,
    data: CreateListInput
  ): Promise<IListResponse> {
    let inviteCode: string | undefined;

    // Generate invite code for group lists
    if (data.isGroup) {
      inviteCode = await ListDAL.generateUniqueInviteCode();
    }

    const list = await ListDAL.create({
      ...data,
      name: sanitizeText(data.name), // Sanitize list name
      owner: new mongoose.Types.ObjectId(userId),
      inviteCode,
      members: [],
      products: [],
      notifications: [],
    } as Partial<IList>);

    return transformList(list);
  }

  static async updateList(
    listId: string,
    userId: string,
    data: UpdateListInput
  ): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Only owner can update list
    if (list.owner.toString() !== userId) {
      throw ForbiddenError.notOwner();
    }

    // Sanitize name if provided
    const sanitizedData = { ...data };
    if (sanitizedData.name) {
      sanitizedData.name = sanitizeText(sanitizedData.name);
    }

    // Track what changed for notification
    const nameChanged = sanitizedData.name && sanitizedData.name !== list.name;
    const iconChanged = sanitizedData.icon && sanitizedData.icon !== list.icon;
    const colorChanged = sanitizedData.color && sanitizedData.color !== list.color;
    const hasChanges = nameChanged || iconChanged || colorChanged;

    Object.assign(list, sanitizedData);
    await list.save();

    // Send notifications to group members if this is a group and something changed
    if (list.isGroup && hasChanges && list.members.length > 0) {
      // Create notifications for all members (not owner) in background
      // Pass what changed for more specific notification message
      NotificationService.createNotificationsForListMembers(
        listId,
        'list_update',
        userId,
        {
          // Use productName field to pass the new list name (or change type)
          productName: nameChanged ? list.name : undefined,
          // Use productId field to indicate what changed: 'name', 'design', or 'both'
          productId: nameChanged && (iconChanged || colorChanged) ? 'both'
                   : nameChanged ? 'name'
                   : 'design',
        }
      ).catch(() => {}); // Ignore notification errors
    }

    return transformList(list);
  }

  static async deleteList(listId: string, userId: string): Promise<{ memberIds: string[]; listName: string }> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Only owner can delete list
    if (list.owner.toString() !== userId) {
      throw ForbiddenError.notOwner();
    }

    // Get member IDs before deletion (for socket notification)
    const memberIds = list.members.map(m => m.user.toString());
    const listName = list.name;

    // Get owner info for notification
    const owner = await UserDAL.findById(userId);

    // Create "list_deleted" notifications for all members before deleting the list
    if (owner && list.isGroup && memberIds.length > 0) {
      await Promise.all(
        memberIds.map((memberId) =>
          NotificationService.createNotification({
            type: 'list_deleted',
            listId,
            listName,
            actorId: userId,
            actorName: owner.name,
            targetUserId: memberId,
          })
        )
      );
    }

    // Delete old notifications for this list
    await NotificationService.deleteNotificationsForList(listId);

    await ListDAL.deleteById(listId);

    // Return member IDs and list name for socket notification
    return { memberIds, listName };
  }

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
    if (list.password && list.password !== data.password) {
      throw AuthError.invalidGroupPassword();
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

    // Add notification to embedded (backward compatibility)
    list.notifications.push({
      _id: new mongoose.Types.ObjectId(),
      type: 'join',
      userId: new mongoose.Types.ObjectId(userId),
      userName: user.name,
      timestamp: new Date(),
      read: false,
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

    // Add notification to embedded (backward compatibility)
    list.notifications.push({
      _id: new mongoose.Types.ObjectId(),
      type: 'leave',
      userId: new mongoose.Types.ObjectId(userId),
      userName: user.name,
      timestamp: new Date(),
      read: false,
    });

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

    // Add notification to embedded (backward compatibility)
    // Use 'removed' type to match socket event (not 'leave' which is for voluntary leaving)
    if (member) {
      list.notifications.push({
        _id: new mongoose.Types.ObjectId(),
        type: 'removed',
        userId: new mongoose.Types.ObjectId(memberId),
        userName: member.name,
        timestamp: new Date(),
        read: false,
      });
    }

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
    // actorId = removed member (for notification content)
    // excludeUserId = the user who removed them (shouldn't get notified)
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

  static async markNotificationsRead(
    listId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Check access
    const hasAccess = await ListDAL.isMember(listId, userId);

    if (!hasAccess) {
      throw ForbiddenError.noAccess();
    }

    // Mark all as read in embedded (backward compatibility)
    list.notifications.forEach((n) => {
      n.read = true;
    });

    await list.save();

    // Also mark as read in new Notifications collection
    await NotificationService.markAllAsRead(userId, listId);

    return transformList(list);
  }

  static async markNotificationRead(
    listId: string,
    userId: string,
    notificationId: string
  ): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    // Check access
    const hasAccess = await ListDAL.isMember(listId, userId);

    if (!hasAccess) {
      throw ForbiddenError.noAccess();
    }

    const notification = list.notifications.find(
      (n) => n._id.toString() === notificationId
    );

    if (!notification) {
      throw NotFoundError.notification();
    }

    notification.read = true;
    await list.save();

    return transformList(list);
  }
}
