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
  // ==================== CRUD ראשי ====================

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

    // המרת רשימה פרטית לקבוצה
    if (data.isGroup && !list.isGroup) {
      const inviteCode = await ListDAL.generateUniqueInviteCode();
      list.isGroup = true;
      list.inviteCode = inviteCode;
      if (data.password) {
        list.password = data.password;
      }
    }

    // הסרת isGroup מהנתונים לפני Object.assign (כבר טיפלנו בזה)
    const { isGroup: _isGroup, ...sanitizedData } = { ...data };
    if (sanitizedData.name) {
      sanitizedData.name = sanitizeText(sanitizedData.name);
    }
    if (sanitizedData.icon) {
      sanitizedData.icon = sanitizeText(sanitizedData.icon);
    }

    const nameChanged = sanitizedData.name && sanitizedData.name !== list.name;
    const iconChanged = sanitizedData.icon && sanitizedData.icon !== list.icon;
    const colorChanged = sanitizedData.color && sanitizedData.color !== list.color;
    const hasChanges = nameChanged || iconChanged || colorChanged;

    Object.assign(list, sanitizedData);
    await list.save();

    if (list.isGroup && hasChanges && list.members.length > 0) {
      // קידוד סוג השינוי בשדה productName
      const changeType = nameChanged && (iconChanged || colorChanged) ? 'both'
                       : nameChanged ? 'name'
                       : 'design';
      const productName = nameChanged ? `${changeType}:${list.name}` : changeType;

      NotificationService.createNotificationsForListMembers(
        listId,
        'list_update',
        userId,
        { productName }
      ).catch((err) => logger.error('List update notification failed:', err));
    }

    return transformList(list);
  }

  static async deleteList(listId: string, userId: string): Promise<{ memberIds: string[]; listName: string }> {
    const list = await checkListOwner(listId, userId);

    const memberIds = list.members.map(m => m.user.toString());
    const listName = list.name;

    // מחיקת מוצרים והתראות ישנות לפני מחיקת הרשימה
    await ProductDAL.deleteByListId(listId);
    await NotificationService.deleteNotificationsForList(listId);

    // יצירת התראות list_deleted אחרי הניקוי כדי שלא יימחקו
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

  // ==================== חברות ברשימה ====================

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

}
