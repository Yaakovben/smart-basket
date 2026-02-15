import crypto from 'crypto';
import mongoose from 'mongoose';
import { List, type IList } from '../models';
import { BaseDAL } from './base.dal';

class ListDALClass extends BaseDAL<IList> {
  constructor() {
    super(List);
  }

  async findByOwner(ownerId: string): Promise<IList[]> {
    return this.model.find({ owner: new mongoose.Types.ObjectId(ownerId) });
  }

  async findByMember(userId: string): Promise<IList[]> {
    return this.model.find({ 'members.user': new mongoose.Types.ObjectId(userId) });
  }

  async findUserLists(userId: string): Promise<IList[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    return this.model.find({
      $or: [{ owner: uid }, { 'members.user': uid }],
    }).sort({ updatedAt: -1 });
  }

  async findUserListsPopulated(userId: string): Promise<IList[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    return this.model
      .find({ $or: [{ owner: uid }, { 'members.user': uid }] })
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji')
      .sort({ updatedAt: -1 });
  }

  async findByIdPopulated(listId: string): Promise<IList | null> {
    return this.model
      .findById(listId)
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji');
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
      { _id: listId, 'members.user': new mongoose.Types.ObjectId(memberId) },
      { $set: { 'members.$.isAdmin': isAdmin } },
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
    const MAX_RETRIES = 10;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const bytes = crypto.randomBytes(6);
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(bytes[i] % chars.length);
      }
      const existing = await this.model.findOne({ inviteCode: code });
      if (!existing) return code;
    }

    throw new Error('Failed to generate unique invite code after maximum retries');
  }
}

export const ListDAL = new ListDALClass();
