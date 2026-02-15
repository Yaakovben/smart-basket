import mongoose from 'mongoose';
import { ListDAL, UserDAL, ProductDAL } from '../dal';
import { logger } from '../config';
import { sanitizeText } from '../utils';
import type { CreateListInput, UpdateListInput, JoinGroupInput } from '../validators';
import type { IListResponse } from '../types';
import type { IList } from '../models';
import { NotificationService } from './notification.service';
import { ListMembershipService } from './list-membership.service';
import { transformList, transformListsWithProducts } from './list-transform.helper';
import { checkListAccess, checkListOwner } from './list-access.helper';

export class ListService {
  // ==================== Core CRUD ====================

  static async getUserLists(userId: string): Promise<IListResponse[]> {
    const lists = await ListDAL.findUserListsPopulated(userId);
    return transformListsWithProducts(lists);
  }

  static async getList(listId: string, userId: string): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);
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
    const list = await checkListOwner(listId, userId);

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
      // Encode change type and new name in productName (string field)
      // productId is ObjectId and can't hold string values like 'name'/'design'
      const changeType = nameChanged && (iconChanged || colorChanged) ? 'both'
                       : nameChanged ? 'name'
                       : 'design';
      const productName = nameChanged ? `${changeType}:${list.name}` : changeType;

      NotificationService.createNotificationsForListMembers(
        listId,
        'list_update',
        userId,
        { productName }
      ).catch((err) => logger.warn('List update notification failed:', err));
    }

    return transformList(list);
  }

  static async deleteList(listId: string, userId: string): Promise<{ memberIds: string[]; listName: string }> {
    const list = await checkListOwner(listId, userId);

    const memberIds = list.members.map(m => m.user.toString());
    const listName = list.name;

    // Delete all products and old notifications for this list first
    await ProductDAL.deleteByListId(listId);
    await NotificationService.deleteNotificationsForList(listId);

    // Then create list_deleted notifications (after cleanup so they aren't deleted)
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
    const list = await checkListAccess(listId, userId);
    await NotificationService.markAllAsRead(userId, listId);
    return transformList(list);
  }

  static async markNotificationRead(
    listId: string,
    userId: string,
    notificationId: string
  ): Promise<IListResponse> {
    const list = await checkListAccess(listId, userId);
    await NotificationService.markAsReadById(notificationId);
    return transformList(list);
  }
}
