import mongoose from 'mongoose';
import { ListDAL, UserDAL, ProductDAL } from '../dal';
import { NotFoundError, ForbiddenError } from '../errors';
import { sanitizeText } from '../utils';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';
import { NotificationService } from './notification.service';
import { ListMembershipService } from './list-membership.service';

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

// Helper to transform multiple lists with their products
const transformListsWithProducts = async (lists: IList[]): Promise<IListResponse[]> => {
  // Process each list
  return Promise.all(lists.map(async (list) => {
    const products = await ProductDAL.findByListId(list._id.toString());
    const json = list.toJSON() as Record<string, unknown>;

    json.products = products.map((p) => {
      const pJson = p.toJSON() as Record<string, unknown>;
      if (pJson.addedBy && typeof pJson.addedBy === 'object') {
        pJson.addedBy = (pJson.addedBy as { name?: string }).name || 'Unknown';
      }
      return pJson;
    });

    return json as unknown as IListResponse;
  }));
};

export class ListService {
  // ==================== Core CRUD ====================

  static async getUserLists(userId: string): Promise<IListResponse[]> {
    const lists = await ListDAL.findUserListsPopulated(userId);
    return transformListsWithProducts(lists);
  }

  static async getList(listId: string, userId: string): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

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

    if (data.isGroup) {
      inviteCode = await ListDAL.generateUniqueInviteCode();
    }

    const list = await ListDAL.create({
      ...data,
      name: sanitizeText(data.name),
      owner: new mongoose.Types.ObjectId(userId),
      inviteCode,
      members: [],
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

    if (list.owner.toString() !== userId) {
      throw ForbiddenError.notOwner();
    }

    const sanitizedData = { ...data };
    if (sanitizedData.name) {
      sanitizedData.name = sanitizeText(sanitizedData.name);
    }

    const nameChanged = sanitizedData.name && sanitizedData.name !== list.name;
    const iconChanged = sanitizedData.icon && sanitizedData.icon !== list.icon;
    const colorChanged = sanitizedData.color && sanitizedData.color !== list.color;
    const hasChanges = nameChanged || iconChanged || colorChanged;

    Object.assign(list, sanitizedData);
    await list.save();

    if (list.isGroup && hasChanges && list.members.length > 0) {
      NotificationService.createNotificationsForListMembers(
        listId,
        'list_update',
        userId,
        {
          productName: nameChanged ? list.name : undefined,
          productId: nameChanged && (iconChanged || colorChanged) ? 'both'
                   : nameChanged ? 'name'
                   : 'design',
        }
      ).catch(() => {});
    }

    return transformList(list);
  }

  static async deleteList(listId: string, userId: string): Promise<{ memberIds: string[]; listName: string }> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    if (list.owner.toString() !== userId) {
      throw ForbiddenError.notOwner();
    }

    const memberIds = list.members.map(m => m.user.toString());
    const listName = list.name;

    const owner = await UserDAL.findById(userId);

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

    // Delete all products for this list
    await ProductDAL.deleteByListId(listId);
    await NotificationService.deleteNotificationsForList(listId);
    await ListDAL.deleteById(listId);

    return { memberIds, listName };
  }

  // ==================== Membership (delegates to ListMembershipService) ====================

  static joinGroup(userId: string, data: JoinGroupInput): Promise<IListResponse> {
    return ListMembershipService.joinGroup(userId, data);
  }

  static leaveGroup(listId: string, userId: string): Promise<void> {
    return ListMembershipService.leaveGroup(listId, userId);
  }

  static removeMember(listId: string, userId: string, memberId: string): Promise<IListResponse> {
    return ListMembershipService.removeMember(listId, userId, memberId);
  }

  static toggleMemberAdmin(listId: string, userId: string, memberId: string): Promise<IListResponse> {
    return ListMembershipService.toggleMemberAdmin(listId, userId, memberId);
  }

  // ==================== Notifications ====================

  static async markNotificationsRead(
    listId: string,
    userId: string
  ): Promise<IListResponse> {
    const list = await ListDAL.findById(listId);

    if (!list) {
      throw NotFoundError.list();
    }

    const hasAccess = await ListDAL.isMember(listId, userId);

    if (!hasAccess) {
      throw ForbiddenError.noAccess();
    }

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

    const hasAccess = await ListDAL.isMember(listId, userId);

    if (!hasAccess) {
      throw ForbiddenError.noAccess();
    }

    // Mark the notification as read in the Notification collection
    await NotificationService.markAsReadById(notificationId);

    return transformList(list);
  }
}
