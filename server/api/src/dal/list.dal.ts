import crypto from 'crypto';
import mongoose, { type ClientSession } from 'mongoose';
import { List, type IList } from '../models';
import { createBaseDal } from './base.dal';
import { AppError } from '../errors';

export const ListDAL = {
  ...createBaseDal<IList>(List),

  async findUserLists(userId: string): Promise<IList[]> {
    const uid = new mongoose.Types.ObjectId(userId);
    return List.find({
      $or: [{ owner: uid }, { 'members.user': uid }],
    }).sort({ updatedAt: -1 });
  },

  // .lean() - הדשבורד הראשי (GET /lists) לא צריך מסמכי Mongoose מלאים
  // (change tracking, getters, save()) אלא רק קריאה; הידרציה מלאה של כל
  // הרשימות+חברים בכל טעינה הייתה overhead מיותר. transformListsWithProducts
  // (list-transform.helper.ts) משחזר ידנית את שינויי ה-toJSON (_id->id וכו')
  // שהיו קורים אוטומטית על Document.
  async findUserListsPopulated(userId: string) {
    const uid = new mongoose.Types.ObjectId(userId);
    return List
      .find({ $or: [{ owner: uid }, { 'members.user': uid }] })
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji')
      .sort({ updatedAt: -1 })
      .lean();
  },

  async findByIdPopulated(listId: string): Promise<IList | null> {
    return List
      .findById(listId)
      .populate('owner', 'name email avatarColor avatarEmoji isAdmin')
      .populate('members.user', 'name email avatarColor avatarEmoji');
  },

  async findByInviteCode(inviteCode: string): Promise<IList | null> {
    return List.findOne({ inviteCode: inviteCode.toUpperCase() });
  },

  async addMember(listId: string, userId: string, isAdmin = false): Promise<IList | null> {
    return List.findByIdAndUpdate(
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
  },

  async removeMember(listId: string, userId: string): Promise<IList | null> {
    return List.findByIdAndUpdate(
      listId,
      { $pull: { members: { user: new mongoose.Types.ObjectId(userId) } } },
      { new: true }
    );
  },

  async setMemberAdmin(listId: string, memberId: string, isAdmin: boolean): Promise<IList | null> {
    return List.findOneAndUpdate(
      { _id: listId, 'members.user': new mongoose.Types.ObjectId(memberId) },
      { $set: { 'members.$.isAdmin': isAdmin } },
      { new: true }
    );
  },

  async isMember(listId: string, userId: string): Promise<boolean> {
    const list = await List.findById(listId);
    if (!list) return false;
    return (
      list.owner.toString() === userId ||
      list.members.some((m) => m.user.toString() === userId)
    );
  },

  // יצירת קוד הזמנה ייחודי בן 6 תווים
  async generateUniqueInviteCode(): Promise<string> {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const MAX_RETRIES = 10; // הסיכוי להתנגשות זניח

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const bytes = crypto.randomBytes(6);
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(bytes[i] % chars.length);
      }
      const existing = await List.findOne({ inviteCode: code });
      if (!existing) return code;
    }

    throw new AppError('Failed to generate unique invite code after maximum retries', 500, 'INVITE_CODE_GENERATION_FAILED');
  },

  // עדכון updatedAt של הרשימה כשמוצרים משתנים (מוצרים בקולקשן נפרד)
  async touchUpdatedAt(listId: string): Promise<void> {
    await List.updateOne(
      { _id: listId },
      { $set: { updatedAt: new Date() } }
    );
  },

  // מתודות עם session לטרנזקציות
  async findPrivateListIds(ownerId: string, session: ClientSession): Promise<string[]> {
    const uid = new mongoose.Types.ObjectId(ownerId);
    const lists = await List.find({ owner: uid, isGroup: false }, { _id: 1 }).session(session).lean();
    return lists.map(l => l._id.toString());
  },

  async deletePrivateLists(ownerId: string, session: ClientSession): Promise<number> {
    const uid = new mongoose.Types.ObjectId(ownerId);
    const result = await List.deleteMany({ owner: uid, isGroup: false }, { session });
    return result.deletedCount;
  },

  async findOwnedGroups(ownerId: string, session: ClientSession): Promise<IList[]> {
    const uid = new mongoose.Types.ObjectId(ownerId);
    return List.find({ owner: uid, isGroup: true }).session(session);
  },

  async transferOwnership(listId: string, newOwnerId: mongoose.Types.ObjectId, session: ClientSession): Promise<IList | null> {
    return List.findByIdAndUpdate(listId, {
      $set: { owner: newOwnerId },
      $pull: { members: { user: newOwnerId } }
    }, { session, new: true });
  },

  async deleteByIdWithSession(listId: string, session: ClientSession): Promise<IList | null> {
    return List.findByIdAndDelete(listId, { session });
  },

  async removeUserFromAllLists(userId: string, session: ClientSession): Promise<void> {
    const uid = new mongoose.Types.ObjectId(userId);
    await List.updateMany(
      { 'members.user': uid },
      { $pull: { members: { user: uid } } },
      { session }
    );
  },
};
