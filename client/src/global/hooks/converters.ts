// המרות בין פורמט ה-API לפורמט הלקוח, משותפות ל-useLists וצרכנים חיצוניים
import type { List, Member, Product } from "../types";
import type { ApiList, ApiMember } from "../../services/api";

// המרת חבר מפורמט API לפורמט לקוח
const convertApiMember = (apiMember: ApiMember): Member => ({
  id: apiMember.user.id,
  name: apiMember.user.name,
  email: apiMember.user.email,
  avatarColor: apiMember.user.avatarColor,
  avatarEmoji: apiMember.user.avatarEmoji,
  isAdmin: apiMember.isAdmin,
  joinedAt: apiMember.joinedAt,
});

// המרת מוצר מפורמט API לפורמט לקוח
export const convertApiProduct = (p: ApiList['products'][0]): Product => ({
  id: p.id,
  name: p.name,
  quantity: p.quantity,
  unit: p.unit,
  category: p.category,
  isPurchased: p.isPurchased,
  addedBy: p.addedBy,
  updatedBy: p.updatedBy ?? null,
  purchasedBy: p.purchasedBy ?? null,
  createdAt: p.createdAt,
  updatedAt: p.updatedAt,
  note: p.note,
  editHistory: p.editHistory,
});

// המרת רשימה מפורמט API לפורמט לקוח
export const convertApiList = (apiList: ApiList): List => ({
  id: apiList.id,
  name: apiList.name,
  icon: apiList.icon,
  color: apiList.color,
  isGroup: apiList.isGroup,
  isPermanent: apiList.isPermanent,
  owner: {
    id: apiList.owner.id,
    name: apiList.owner.name,
    email: apiList.owner.email,
    avatarColor: apiList.owner.avatarColor,
    avatarEmoji: apiList.owner.avatarEmoji,
  },
  members: apiList.members.map(convertApiMember),
  products: apiList.products.map(convertApiProduct),
  inviteCode: apiList.inviteCode,
  password: apiList.password,
  hasPassword: apiList.hasPassword,
  createdAt: apiList.createdAt,
  updatedAt: apiList.updatedAt,
});
