import { Request } from 'express';

// ===== טיפוסי אימות =====
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    isAdmin: boolean;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ===== טיפוסי משתמש =====
export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  isAdmin: boolean;
  createdAt: Date;
}

// ===== טיפוסי מוצר =====
export type ProductUnit = 'יח׳' | 'ק״ג' | 'גרם' | 'ליטר';
export type ProductCategory =
  | 'מוצרי חלב'
  | 'מאפים'
  | 'ירקות'
  | 'פירות'
  | 'בשר'
  | 'משקאות'
  | 'ממתקים'
  | 'ניקיון'
  | 'אחר';

export interface IProductResponse {
  id: string;
  name: string;
  quantity: number;
  unit: ProductUnit;
  category: ProductCategory;
  isPurchased: boolean;
  addedBy: string;
  createdAt: Date;
}

// ===== טיפוסי חבר =====
export interface IMemberResponse {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarEmoji: string;
  isAdmin: boolean;
  joinedAt: Date;
}

// ===== טיפוסי רשימה =====
export interface IListResponse {
  id: string;
  name: string;
  icon: string;
  color: string;
  isGroup: boolean;
  owner: IUserResponse;
  members: IMemberResponse[];
  products: IProductResponse[];
  inviteCode?: string;
  password?: string;
  hasPassword: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ===== טיפוסי תגובת API =====
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: { field: string; message: string }[];
}

// ===== טיפוסי עימוד =====
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}
