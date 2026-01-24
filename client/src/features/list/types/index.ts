import type { Product, List, User } from '../../../global/types';

export interface SwipeItemProps {
  product: Product;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
  isPurchased: boolean;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export interface ListScreenProps {
  list: List;
  onBack: () => void;
  onUpdateList: (list: List) => void;
  onLeaveList: (listId: string) => void;
  onDeleteList: (listId: string) => void;
  showToast: (message: string) => void;
  user: User;
}

export interface ProductFormData {
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
}

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
