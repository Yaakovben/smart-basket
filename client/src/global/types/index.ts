// ===== משתמש ואימות =====
export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  avatarColor?: string;
  avatarEmoji?: string;
  listOrder?: string[];
  // מוצרים שהמשתמש תמיד קונה - עצמאי מרשימה ספציפית, מוצג כצ'יפים
  // להוספה מהירה בתוך כל רשימה (ראו StaplesBar).
  staples?: string[];
}

// ===== מוצר =====
export type ProductUnit = "יח׳" | "ק״ג" | "גרם" | "ליטר";
export type ProductCategory =
  | "מוצרי חלב"
  | "מאפים"
  | "אפייה"
  | "ירקות"
  | "פירות"
  | "בשר"
  | "משקאות"
  | "ממתקים"
  | "פיצוחים"
  | "קפואים"
  | "שימורים ויבשים"
  | "תבלינים ורטבים"
  | "ניקיון"
  | "אחר";

export interface ProductEditChange {
  field: 'name' | 'quantity' | 'unit' | 'category' | 'note';
  oldValue: string | number;
  newValue: string | number;
}

export interface ProductEditEntry {
  editedBy: string;
  editedAt: string;
  changes: ProductEditChange[];
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: string;
  updatedBy?: string | null;
  purchasedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  note?: string;
  // לוג עריכות תוכן - עד 10 האחרונות (ראו MAX_EDIT_HISTORY בשרת). לא חובה
  // כי מוצר שמעולם לא נערך פשוט לא מכיל את השדה.
  editHistory?: ProductEditEntry[];
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
  createdAt: string;
  updatedAt: string;
}

// ===== הודעות Toast =====
export type ToastType = "success" | "error" | "info" | "warning";

// ===== פעילות התחברות (פאנל ניהול) =====
export type LoginMethod = 'email' | 'google' | 'app_open';

export interface LoginActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  timestamp: string;
  loginMethod: LoginMethod;
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