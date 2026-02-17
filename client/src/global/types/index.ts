// ===== משתמש ואימות =====
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarColor?: string;
  avatarEmoji?: string;
}

// ===== מוצר =====
export type ProductUnit = "יח׳" | "ק״ג" | "גרם" | "ליטר";
export type ProductCategory =
  | "מוצרי חלב"
  | "מאפים"
  | "ירקות"
  | "פירות"
  | "בשר"
  | "משקאות"
  | "ממתקים"
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

// ===== רשימה =====
export interface Member {
  id: string;
  name: string;
  email: string;
  avatarColor?: string;
  avatarEmoji?: string;
  isAdmin?: boolean;
  joinedAt?: string;
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
  hasPassword?: boolean;
}

// ===== הודעות Toast =====
export type ToastType = "success" | "error" | "info" | "warning";

// ===== פעילות התחברות (פאנל ניהול) =====
export type LoginMethod = 'email' | 'google';

export interface LoginActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  loginMethod: LoginMethod;
}

export type ActivityFilterMode = 'all' | 'daily' | 'monthly' | 'hourly';

export interface ActivityFilters {
  filterMode: ActivityFilterMode;
  selectedMonth?: string;
  selectedDate?: string;
  selectedHour?: number;
}

// ===== הגדרות =====
export type Language = "he" | "en" | "ru";
export type ThemeMode = "light" | "dark";

export interface NotificationSettings {
  enabled: boolean;
  groupJoin: boolean;
  groupLeave: boolean;
  groupRemoved: boolean;
  groupDelete: boolean;
  listUpdate: boolean;
  productAdd: boolean;
  productDelete: boolean;
  productEdit: boolean;
  productPurchase: boolean;
  mutedGroupIds: string[];
}

export interface AppSettings {
  theme: ThemeMode;
  language: Language;
  notifications: NotificationSettings;
}