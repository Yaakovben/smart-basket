import mongoose from 'mongoose';
import { List, User, type IList } from '../models';
import { ApiError } from '../utils';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../utils/validators';
import type { IListResponse } from '../types';

// Helper to generate invite code
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Helper to check if a string looks like a MongoDB ObjectId
const isObjectIdString = (str: string): boolean => {
  return /^[a-f\d]{24}$/i.test(str);
};

// Helper to convert addedBy from object/ObjectId to string (name)
const convertProductsAddedBy = (products: Record<string, unknown>[]): Record<string, unknown>[] => {
  return products.map((p) => {
    let addedByName: string;

    if (typeof p.addedBy === 'object' && p.addedBy !== null) {
      // Populated user object - extract name
      addedByName = (p.addedBy as { name?: string }).name || 'Unknown';
    } else if (typeof p.addedBy === 'string') {
      // If it's a string that looks like an ObjectId, use 'Unknown'
      // Otherwise, assume it's already a name
      addedByName = isObjectIdString(p.addedBy) ? 'Unknown' : p.addedBy;
    } else {
      addedByName = 'Unknown';
    }

    return { ...p, addedBy: addedByName };
  });
};

// Helper to transform list to response format
const transformList = async (list: IList): Promise<IListResponse> => {
  await list.populate('owner', 'name email avatarColor avatarEmoji isAdmin');
  await list.populate('members.user', 'name email avatarColor avatarEmoji');
  await list.populate('products.addedBy', 'name');

  const json = list.toJSON() as Record<string, unknown>;

  // Convert products.addedBy from object to string (just the name)
  if (json.products && Array.isArray(json.products)) {
    json.products = convertProductsAddedBy(json.products as Record<string, unknown>[]);
  }

  return json as unknown as IListResponse;
};

export class ListService {
  static async getUserLists(userId: string): Promise<IListResponse[]> {
    const lists = await List.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    })
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji')
      .populate('products.addedBy', 'name')
      .sort({ updatedAt: -1 });

    return lists.map((list) => {
      const json = list.toJSON() as Record<string, unknown>;
      if (json.products && Array.isArray(json.products)) {
        json.products = convertProductsAddedBy(json.products as Record<string, unknown>[]);
      }
      return json as unknown as IListResponse;
    });
  }

  static async getList(listId: string, userId: string): Promise<IListResponse> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Check access
    const hasAccess =
      list.owner.toString() === userId ||
      list.members.some((m) => m.user.toString() === userId);

    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this list');
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
      let isUnique = false;
      while (!isUnique) {
        inviteCode = generateInviteCode();
        const existing = await List.findOne({ inviteCode });
        if (!existing) isUnique = true;
      }
    }

    const list = await List.create({
      ...data,
      owner: userId,
      inviteCode,
      members: [],
      products: [],
      notifications: [],
    });

    return transformList(list);
  }

  static async updateList(
    listId: string,
    userId: string,
    data: UpdateListInput
  ): Promise<IListResponse> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Only owner can update list
    if (list.owner.toString() !== userId) {
      throw ApiError.forbidden('Only the owner can update this list');
    }

    Object.assign(list, data);
    await list.save();

    return transformList(list);
  }

  static async deleteList(listId: string, userId: string): Promise<void> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Only owner can delete list
    if (list.owner.toString() !== userId) {
      throw ApiError.forbidden('Only the owner can delete this list');
    }

    await list.deleteOne();
  }

  static async joinGroup(
    userId: string,
    data: JoinGroupInput
  ): Promise<IListResponse> {
    const list = await List.findOne({ inviteCode: data.inviteCode.toUpperCase() });

    if (!list) {
      throw ApiError.notFound('Invalid invite code');
    }

    // Check if already a member or owner
    if (list.owner.toString() === userId) {
      throw ApiError.conflict('You are the owner of this list');
    }

    if (list.members.some((m) => m.user.toString() === userId)) {
      throw ApiError.conflict('You are already a member of this list');
    }

    // Check password if required
    if (list.password && list.password !== data.password) {
      throw ApiError.unauthorized('Invalid password');
    }

    // Get user info for notification
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Add member
    list.members.push({
      user: new mongoose.Types.ObjectId(userId),
      isAdmin: false,
      joinedAt: new Date(),
    });

    // Add notification
    list.notifications.push({
      _id: new mongoose.Types.ObjectId(),
      type: 'join',
      userId: new mongoose.Types.ObjectId(userId),
      userName: user.name,
      timestamp: new Date(),
      read: false,
    });

    await list.save();

    return transformList(list);
  }

  static async leaveGroup(listId: string, userId: string): Promise<void> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Owner cannot leave
    if (list.owner.toString() === userId) {
      throw ApiError.forbidden('Owner cannot leave the list. Delete it instead.');
    }

    // Check if member
    const memberIndex = list.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound('You are not a member of this list');
    }

    // Get user info for notification
    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Remove member
    list.members.splice(memberIndex, 1);

    // Add notification
    list.notifications.push({
      _id: new mongoose.Types.ObjectId(),
      type: 'leave',
      userId: new mongoose.Types.ObjectId(userId),
      userName: user.name,
      timestamp: new Date(),
      read: false,
    });

    await list.save();
  }

  static async removeMember(
    listId: string,
    userId: string,
    memberId: string
  ): Promise<IListResponse> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Check if user is owner or admin
    const isOwner = list.owner.toString() === userId;
    const isAdmin = list.members.some(
      (m) => m.user.toString() === userId && m.isAdmin
    );

    if (!isOwner && !isAdmin) {
      throw ApiError.forbidden('Only owner or admin can remove members');
    }

    // Cannot remove owner
    if (list.owner.toString() === memberId) {
      throw ApiError.forbidden('Cannot remove the owner');
    }

    // Remove member
    const memberIndex = list.members.findIndex(
      (m) => m.user.toString() === memberId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound('Member not found');
    }

    // Get member info for notification
    const member = await User.findById(memberId);

    list.members.splice(memberIndex, 1);

    // Add notification
    if (member) {
      list.notifications.push({
        _id: new mongoose.Types.ObjectId(),
        type: 'leave',
        userId: new mongoose.Types.ObjectId(memberId),
        userName: member.name,
        timestamp: new Date(),
        read: false,
      });
    }

    await list.save();

    return transformList(list);
  }

  static async toggleMemberAdmin(
    listId: string,
    userId: string,
    memberId: string
  ): Promise<IListResponse> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Only owner can toggle admin
    if (list.owner.toString() !== userId) {
      throw ApiError.forbidden('Only owner can change admin status');
    }

    const member = list.members.find((m) => m.user.toString() === memberId);

    if (!member) {
      throw ApiError.notFound('Member not found');
    }

    member.isAdmin = !member.isAdmin;
    await list.save();

    return transformList(list);
  }

  static async markNotificationsRead(
    listId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Check access
    const hasAccess =
      list.owner.toString() === userId ||
      list.members.some((m) => m.user.toString() === userId);

    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this list');
    }

    // Mark all as read
    list.notifications.forEach((n) => {
      n.read = true;
    });

    await list.save();

    return transformList(list);
  }

  static async markNotificationRead(
    listId: string,
    userId: string,
    notificationId: string
  ): Promise<IListResponse> {
    const list = await List.findById(listId);

    if (!list) {
      throw ApiError.notFound('List not found');
    }

    // Check access
    const hasAccess =
      list.owner.toString() === userId ||
      list.members.some((m) => m.user.toString() === userId);

    if (!hasAccess) {
      throw ApiError.forbidden('You do not have access to this list');
    }

    const notification = list.notifications.find(
      (n) => n._id.toString() === notificationId
    );

    if (!notification) {
      throw ApiError.notFound('Notification not found');
    }

    notification.read = true;
    await list.save();

    return transformList(list);
  }
}
