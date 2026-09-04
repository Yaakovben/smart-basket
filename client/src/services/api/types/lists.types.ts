export interface Member {
  user: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    avatarEmoji: string;
  };
  isAdmin: boolean;
  joinedAt: string;
}

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
  unit: 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
  category: 'מוצרי חלב' | 'מאפים' | 'אפייה' | 'ירקות' | 'פירות' | 'בשר' | 'משקאות' | 'ממתקים' | 'פיצוחים' | 'קפואים' | 'שימורים ויבשים' | 'תבלינים ורטבים' | 'ניקיון' | 'אחר';
  isPurchased: boolean;
  addedBy: string;
  updatedBy?: string | null;
  purchasedBy?: string | null;
  createdAt: string;
  updatedAt?: string;
  note?: string;
  image?: string;
  editHistory?: ProductEditEntry[];
}

export interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
    avatarEmoji: string;
    isAdmin: boolean;
  };
  members: Member[];
  products: Product[];
  inviteCode?: string;
  password?: string;
  hasPassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateListData {
  name: string;
  icon?: string;
  color?: string;
  isGroup?: boolean;
  password?: string;
}

export interface UpdateListData {
  name?: string;
  icon?: string;
  color?: string;
  password?: string | null;
  isGroup?: boolean;
}

export interface JoinGroupData {
  inviteCode: string;
  password?: string;
}
