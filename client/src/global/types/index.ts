// ===== User & Authentication =====
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarColor?: string;
  avatarEmoji?: string;
}

// ===== Product =====
export type ProductUnit = "יח׳" | "ק״ג" | "גרם" | "ליטר";
export type ProductCategory =
  | "מוצרי חלב"
  | "מאפים"
  | "ירקות"
  | "פירות"
  | "בשר"
  | "משקאות"
  | "ניקיון"
  | "אחר";

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: string;
  createdDate?: string;
  createdTime?: string;
}

// ===== List & Group =====
export interface Member {
  id: string;
  name: string;
  email: string;
}

export interface Notification {
  id: string;
  type: "join" | "leave";
  userId: string;
  userName: string;
  timestamp: string;
  read: boolean;
}

export interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: User;
  members: Member[];
  products: Product[];
  inviteCode?: string | null;
  password?: string | null;
  notifications?: Notification[];
}

// ===== Toast =====
export type ToastType = "success" | "error" | "info" | "warning";

// ===== Global Component Props =====
export interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
}

export interface MemberAvatarProps {
  member: Member | User;
  size?: number;
  index?: number;
}

export interface MembersButtonProps {
  members: (Member | User)[];
  onClick: () => void;
}

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export interface ToastProps {
  msg: string;
  type?: ToastType;
}
