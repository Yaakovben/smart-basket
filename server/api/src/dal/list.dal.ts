import mongoose from 'mongoose';
import { List, type IList, type IProduct } from '../models';
import { BaseDAL } from './base.dal';

class ListDALClass extends BaseDAL<IList> {
  constructor() {
    super(List);
  }

  async findByOwner(ownerId: string): Promise<IList[]> {
    return this.model.find({ owner: ownerId });
  }

  async findByMember(userId: string): Promise<IList[]> {
    return this.model.find({ 'members.user': userId });
  }

  async findUserLists(userId: string): Promise<IList[]> {
    return this.model.find({
      $or: [{ owner: userId }, { 'members.user': userId }],
    }).sort({ updatedAt: -1 });
  }

  async findUserListsPopulated(userId: string): Promise<IList[]> {
    return this.model
      .find({ $or: [{ owner: userId }, { 'members.user': userId }] })
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji')
      .populate('products.addedBy', 'name')
      .sort({ updatedAt: -1 });
  }

  async findByIdPopulated(listId: string): Promise<IList | null> {
    return this.model
      .findById(listId)
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji')
      .populate('products.addedBy', 'name');
  }

  async findByInviteCode(inviteCode: string): Promise<IList | null> {
    return this.model.findOne({ inviteCode: inviteCode.toUpperCase() });
  }

  async addMember(listId: string, userId: string, isAdmin = false): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      {
        $push: {
          members: {
            user: new mongoose.Types.ObjectId(userId),
            isAdmin,
            joinedAt: new Date(),
          },
        },
      },
      { new: true }
    );
  }

  async removeMember(listId: string, userId: string): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      { $pull: { members: { user: new mongoose.Types.ObjectId(userId) } } },
      { new: true }
    );
  }

  async setMemberAdmin(listId: string, memberId: string, isAdmin: boolean): Promise<IList | null> {
    return this.model.findOneAndUpdate(
      { _id: listId, 'members.user': memberId },
      { $set: { 'members.$.isAdmin': isAdmin } },
      { new: true }
    );
  }

  async addProduct(listId: string, product: Partial<IProduct>): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      { $push: { products: product } },
      { new: true }
    );
  }

  async updateProduct(listId: string, productId: string, updates: Partial<IProduct>): Promise<IList | null> {
    const setFields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      setFields[`products.$.${key}`] = value;
    }

    return this.model.findOneAndUpdate(
      { _id: listId, 'products._id': productId },
      { $set: setFields },
      { new: true }
    );
  }

  async removeProduct(listId: string, productId: string): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      { $pull: { products: { _id: new mongoose.Types.ObjectId(productId) } } },
      { new: true }
    );
  }

  async reorderProducts(listId: string, productIds: string[]): Promise<IList | null> {
    const list = await this.model.findById(listId);
    if (!list) return null;

    const productMap = new Map(list.products.map((p) => [p._id.toString(), p]));
    const reorderedProducts = productIds
      .map((id) => productMap.get(id))
      .filter((p): p is IProduct => p !== undefined);

    list.products = reorderedProducts;
    await list.save();
    return list;
  }

  async clearPurchasedProducts(listId: string): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      { $pull: { products: { isPurchased: true } } },
      { new: true }
    );
  }

  async addNotification(listId: string, notification: Partial<IList['notifications'][0]>): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      { $push: { notifications: notification } },
      { new: true }
    );
  }

  async markNotificationsRead(listId: string): Promise<IList | null> {
    return this.model.findByIdAndUpdate(
      listId,
      { $set: { 'notifications.$[].read': true } },
      { new: true }
    );
  }

  async markNotificationRead(listId: string, notificationId: string): Promise<IList | null> {
    return this.model.findOneAndUpdate(
      { _id: listId, 'notifications._id': notificationId },
      { $set: { 'notifications.$.read': true } },
      { new: true }
    );
  }

  async checkUserAccess(listId: string, userId: string): Promise<'owner' | 'admin' | 'member' | null> {
    const list = await this.model.findById(listId);
    if (!list) return null;

    if (list.owner.toString() === userId) return 'owner';

    const member = list.members.find((m) => m.user.toString() === userId);
    if (!member) return null;

    return member.isAdmin ? 'admin' : 'member';
  }

  async isOwner(listId: string, userId: string): Promise<boolean> {
    const list = await this.model.findById(listId);
    return list?.owner.toString() === userId;
  }

  async isMember(listId: string, userId: string): Promise<boolean> {
    const list = await this.model.findById(listId);
    if (!list) return false;
    return (
      list.owner.toString() === userId ||
      list.members.some((m) => m.user.toString() === userId)
    );
  }

  async getMemberIds(listId: string): Promise<string[]> {
    const list = await this.model.findById(listId);
    if (!list) return [];
    return list.members.map((m) => m.user.toString());
  }

  async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code: string;
    let isUnique = false;

    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await this.model.findOne({ inviteCode: code });
      isUnique = !existing;
    } while (!isUnique);

    return code;
  }
}

export const ListDAL = new ListDALClass();
